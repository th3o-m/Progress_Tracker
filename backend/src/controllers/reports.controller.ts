import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { generateReportSchema } from '../schemas/index.js';
import { auditLog } from '../services/auditLog.service.js';
import { buildExcel, buildPdf, type ReportData } from '../services/report.service.js';
import { ApiError, parseBody, throwDb } from '../utils/http.js';

export async function listReports(_req: Request, res: Response): Promise<void> {
  const { data, error } = await supabase.from('reports').select('*').eq('project_id', _req.context.projectId).order('created_at', { ascending: false }); throwDb(error); res.json(data);
}

export async function generateReport(req: Request, res: Response): Promise<void> {
  const body = parseBody(generateReportSchema, req.body);
  const endTimestamp = `${body.end_date}T23:59:59.999Z`;
  const [activities, progress, challenges, beneficiaries, financial] = await Promise.all([
    supabase.from('activities').select('*').eq('project_id', req.context.projectId).lte('start_date', body.end_date).gte('end_date', body.start_date).order('code'),
    supabase.from('progress_updates').select('*').eq('project_id', req.context.projectId).gte('report_date', body.start_date).lte('report_date', body.end_date).order('report_date'),
    supabase.from('challenges').select('*').eq('project_id', req.context.projectId).gte('created_at', `${body.start_date}T00:00:00Z`).lte('created_at', endTimestamp).order('created_at'),
    supabase.from('beneficiaries').select('*').eq('project_id', req.context.projectId).gte('created_at', `${body.start_date}T00:00:00Z`).lte('created_at', endTimestamp).order('created_at'),
    supabase.from('financial_entries').select('*').eq('project_id', req.context.projectId).gte('created_at', `${body.start_date}T00:00:00Z`).lte('created_at', endTimestamp).order('created_at'),
  ]);
  for (const result of [activities, progress, challenges, beneficiaries, financial]) throwDb(result.error);
  const reportData: ReportData = {
    activities: activities.data ?? [], progress_updates: progress.data ?? [], challenges: challenges.data ?? [],
    beneficiaries: beneficiaries.data ?? [], financial_entries: financial.data ?? [],
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
