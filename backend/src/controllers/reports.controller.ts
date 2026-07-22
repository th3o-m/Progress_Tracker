import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { generateReportSchema } from '../schemas/index.js';
import { auditLog } from '../services/auditLog.service.js';
import { buildExcel, buildPdf, type ReportData } from '../services/report.service.js';
import { ApiError, getPagination, paginatedResponse, parseBody, throwDb } from '../utils/http.js';

const reportActivityColumns = 'id, code, name, category, district, responsible_officer, start_date, end_date, status, progress_pct, description, remarks, actual_completion_date, created_at';
const reportProgressColumns = 'id, activity_id, officer_id, progress_pct, status, narrative, report_date, executive_summary, remarks, reporting_period, created_at';
const reportChallengeColumns = 'id, activity_id, officer_id, challenge_type, description, mitigation_plan, resolved, responsible_officer, due_date, created_at';
const reportFinancialColumns = 'id, activity_id, expense_category, amount, description, status, approved_budget, balance, percentage_utilised, remarks, created_at';

export async function listReports(req: Request, res: Response): Promise<void> {
  const pagination = getPagination(req);
  let query = supabase
    .from('reports')
    .select('id, project_id, name, report_type, file_url, generated_by, created_at', pagination ? { count: 'exact' } : undefined)
    .eq('project_id', req.context.projectId)
    .order('created_at', { ascending: false });
  if (pagination) query = query.range(pagination.from, pagination.to);
  const { data, error, count } = await query; throwDb(error); res.json(paginatedResponse(data, pagination, count));
}

export async function generateReport(req: Request, res: Response): Promise<void> {
  const body = parseBody(generateReportSchema, req.body);
  const endTimestamp = `${body.end_date}T23:59:59.999Z`;
  const [activities, progress, challenges, financial] = await Promise.all([
    supabase.from('activities').select(reportActivityColumns).eq('project_id', req.context.projectId).lte('start_date', body.end_date).gte('end_date', body.start_date).order('code'),
    supabase.from('progress_updates').select(reportProgressColumns).eq('project_id', req.context.projectId).gte('report_date', body.start_date).lte('report_date', body.end_date).order('report_date'),
    supabase.from('challenges').select(reportChallengeColumns).eq('project_id', req.context.projectId).gte('created_at', `${body.start_date}T00:00:00Z`).lte('created_at', endTimestamp).order('created_at'),
    supabase.from('financial_entries').select(reportFinancialColumns).eq('project_id', req.context.projectId).gte('created_at', `${body.start_date}T00:00:00Z`).lte('created_at', endTimestamp).order('created_at'),
  ]);
  for (const result of [activities, progress, challenges, financial]) throwDb(result.error);
  const reportData: ReportData = {
    activities: activities.data ?? [], progress_updates: progress.data ?? [], challenges: challenges.data ?? [],
    financial_entries: financial.data ?? [],
  };
  const file = body.type === 'pdf' ? await buildPdf(reportData, body.start_date, body.end_date) : await buildExcel(reportData, body.start_date, body.end_date);
  const extension = body.type === 'pdf' ? 'pdf' : 'xlsx';
  const contentType = body.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const storagePath = `${req.context.projectId}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}-${body.start_date}-${body.end_date}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('reports').upload(storagePath, file, { contentType, upsert: false });
  if (uploadError) throw new ApiError(500, uploadError.message);
  const { data: signed, error: signedError } = await supabase.storage.from('reports').createSignedUrl(storagePath, env.REPORT_URL_TTL_SECONDS);
  if (signedError || !signed?.signedUrl) {
    await supabase.storage.from('reports').remove([storagePath]);
    throw new ApiError(500, signedError?.message ?? 'Unable to sign report URL');
  }
  const name = `Monitoring report ${body.start_date} to ${body.end_date}.${extension}`;
  const { data: report, error } = await supabase.from('reports').insert({ project_id: req.context.projectId, name, report_type: body.type, file_url: storagePath, generated_by: req.user.id }).select().single();
  if (error) { await supabase.storage.from('reports').remove([storagePath]); throwDb(error); }
  await auditLog({ user_id: req.user.id, action: 'generate', table_name: 'reports', record_id: report.id, details: { ...body, project_id: req.context.projectId, storage_path: storagePath } });
  res.status(201).json({ ...report, url: signed.signedUrl, expires_in: env.REPORT_URL_TTL_SECONDS });
}
