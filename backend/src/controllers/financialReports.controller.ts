import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { createFinancialReportSchema } from '../schemas/index.js';
import { auditLog } from '../services/auditLog.service.js';
import { ApiError, getPagination, paginatedResponse, parseBody, throwDb } from '../utils/http.js';

function normalizeReport(row: Record<string, any>) {
  return {
    ...row,
    amount_spent: Number(row.amount_spent ?? 0),
    cumulative_expenditure: Number(row.cumulative_expenditure ?? 0),
  };
}

export async function listFinancialReports(req: Request, res: Response): Promise<void> {
  const pagination = getPagination(req);
  let query = supabase
    .from('project_financial_reports')
    .select('id, project_id, reporting_date, amount_spent, cumulative_expenditure, notes, created_by, created_at', pagination ? { count: 'exact' } : undefined)
    .eq('project_id', req.context.projectId)
    .order('reporting_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (pagination) query = query.range(pagination.from, pagination.to);
  const { data, error, count } = await query;
  throwDb(error);
  res.json(paginatedResponse((data ?? []).map(normalizeReport), pagination, count));
}

export async function createFinancialReport(req: Request, res: Response): Promise<void> {
  const body = parseBody(createFinancialReportSchema, req.body);
  if (!['supervisor', 'finance', 'admin'].includes(req.context.roleInProject)) {
    throw new ApiError(403, 'Manager access required to add financial reports');
  }
  const { data: previousReport, error: previousError } = await supabase
    .from('project_financial_reports')
    .select('cumulative_expenditure')
    .eq('project_id', req.context.projectId)
    .order('reporting_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwDb(previousError);
  const payload = {
    project_id: req.context.projectId,
    reporting_date: body.reporting_date,
    amount_spent: body.amount_spent,
    cumulative_expenditure: Math.round((Number(previousReport?.cumulative_expenditure ?? 0) + body.amount_spent) * 100) / 100,
    notes: body.notes ?? null,
    created_by: req.user.id,
  };
  const { data, error } = await supabase.from('project_financial_reports').insert(payload).select('id, project_id, reporting_date, amount_spent, cumulative_expenditure, notes, created_by, created_at').single();
  throwDb(error);
  const report = data;
  if (!report) throw new ApiError(500, 'Unable to create financial report');
  await auditLog({
    user_id: req.user.id,
    action: 'create',
    table_name: 'project_financial_reports',
    record_id: report.id,
    details: { ...payload, project_id: req.context.projectId },
  });
  res.status(201).json(normalizeReport(report));
}
