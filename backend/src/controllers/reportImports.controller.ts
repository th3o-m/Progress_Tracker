import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { reportImportSchema, updateReportImportReviewSchema } from '../schemas/index.js';
import { auditLog } from '../services/auditLog.service.js';
import { ApiError, getPagination, paginatedResponse, parseBody, throwDb } from '../utils/http.js';

const projectReviewColumns = 'id, name, description, project_code, project_manager, planned_start_date, actual_start_date, planned_completion_date, actual_completion_date, estimated_budget, allocated_budget, district';
const activityReviewColumns = 'id, project_id, code, name, category, district, responsible_officer, start_date, end_date, status, progress_pct, import_id, description, status_color, remarks, actual_completion_date, created_at';
const progressReviewColumns = 'id, project_id, activity_id, officer_id, progress_pct, status, narrative, report_date, import_id, executive_summary, status_color, remarks, reporting_period, created_at, activities(code,name,district)';
const challengeReviewColumns = 'id, project_id, activity_id, officer_id, challenge_type, description, mitigation_plan, resolved, import_id, status_color, responsible_officer, due_date, created_at, activities(code,name,district)';
const financialReviewColumns = 'id, project_id, activity_id, expense_category, amount, description, receipt_url, status, submitted_by, approved_by, approved_at, import_id, approved_budget, balance, percentage_utilised, remarks, created_at, activities(code,name,district)';
const reportImportColumns = 'id, project_id, source_file_name, source_sheet_name, reporting_period, import_type, selected_project_id, selected_sheet, file_name, imported_rows_count, import_status, blocking_errors, warnings, preview_data, raw_data, raw_preview_json, review_status, reviewed_by, reviewed_at, imported_by, created_at, updated_at';

export async function listReportImports(req: Request, res: Response): Promise<void> {
  const pagination = getPagination(req);
  let query = supabase
    .from('project_report_imports')
    .select('id, project_id, source_file_name, source_sheet_name, reporting_period, import_type, selected_project_id, selected_sheet, file_name, imported_rows_count, import_status, blocking_errors, warnings, review_status, reviewed_by, reviewed_at, imported_by, created_at, updated_at', pagination ? { count: 'exact' } : undefined)
    .eq('project_id', req.context.projectId)
    .order('reporting_period', { ascending: false });

  if (req.query.reporting_period) query = query.eq('reporting_period', String(req.query.reporting_period));
  if (pagination) query = query.range(pagination.from, pagination.to);

  const { data, error, count } = await query;
  throwDb(error);
  res.json(paginatedResponse(data, pagination, count));
}

export async function createReportImport(req: Request, res: Response): Promise<void> {
  const body = parseBody(reportImportSchema, req.body);
  const { overwrite, ...input } = body;
  const payload = {
    project_id: req.context.projectId,
    selected_project_id: req.context.projectId,
    imported_by: req.user.id,
    source_file_name: input.source_file_name,
    source_sheet_name: input.source_sheet_name,
    reporting_period: input.reporting_period,
    import_type: input.import_type,
    selected_sheet: input.selected_sheet,
    file_name: input.file_name,
    imported_rows_count: input.imported_rows_count,
    import_status: input.import_status,
    blocking_errors: input.blocking_errors,
    warnings: input.warnings,
    preview_data: input.preview_data,
    raw_data: input.raw_data,
    raw_preview_json: input.raw_preview_json,
  };

  const { data: existing, error: lookupError } = input.reporting_period
    ? await supabase
      .from('project_report_imports')
      .select('id')
      .eq('project_id', req.context.projectId)
      .eq('reporting_period', input.reporting_period)
      .maybeSingle()
    : { data: null, error: null };
  throwDb(lookupError);

  if (existing && !overwrite) {
    throw new ApiError(409, 'Imported data already exists for this project and reporting period');
  }

  const { data, error } = existing
    ? await supabase
      .from('project_report_imports')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .eq('project_id', req.context.projectId)
      .select()
      .single()
    : await supabase
      .from('project_report_imports')
      .insert(payload)
      .select()
      .single();
  throwDb(error);

  await auditLog({
    user_id: req.user.id,
    action: existing ? 'update' : 'create',
    table_name: 'project_report_imports',
    record_id: data.id,
    details: { project_id: req.context.projectId, reporting_period: input.reporting_period, source_sheet_name: input.source_sheet_name, selected_sheet: input.selected_sheet },
  });

  res.status(existing ? 200 : 201).json(data);
}

async function getImport(req: Request, importId: string) {
  const { data, error } = await supabase
    .from('project_report_imports')
    .select(reportImportColumns)
    .eq('id', importId)
    .eq('project_id', req.context.projectId)
    .maybeSingle();
  throwDb(error);
  if (!data) throw new ApiError(404, 'Import not found');
  return data;
}

export async function getReportImportReview(req: Request, res: Response): Promise<void> {
  const importId = String(req.params.importId);
  const reportImport = await getImport(req, importId);
  const [projectResult, activitiesResult, progressResult, challengesResult, financialResult, membersResult] = await Promise.all([
    supabase.from('projects').select(projectReviewColumns).eq('id', req.context.projectId).single(),
    supabase.from('activities').select(activityReviewColumns).eq('project_id', req.context.projectId).eq('import_id', importId).order('created_at', { ascending: true }),
    supabase.from('progress_updates').select(progressReviewColumns).eq('project_id', req.context.projectId).eq('import_id', importId).order('report_date', { ascending: true }),
    supabase.from('challenges').select(challengeReviewColumns).eq('project_id', req.context.projectId).eq('import_id', importId).order('created_at', { ascending: true }),
    supabase.from('financial_entries').select(financialReviewColumns).eq('project_id', req.context.projectId).eq('import_id', importId).order('created_at', { ascending: true }),
    supabase.from('project_members').select('id, role, district, profiles(id,email,full_name,phone,active)').eq('project_id', req.context.projectId).order('added_at', { ascending: false }),
  ]);
  [projectResult.error, activitiesResult.error, progressResult.error, challengesResult.error, financialResult.error, membersResult.error].forEach(throwDb);
  res.json({
    import: reportImport,
    project: projectResult.data,
    activities: activitiesResult.data ?? [],
    progress: progressResult.data ?? [],
    challenges: challengesResult.data ?? [],
    financial: financialResult.data ?? [],
    members: membersResult.data ?? [],
  });
}

export async function updateReportImportReviewStatus(req: Request, res: Response): Promise<void> {
  const importId = String(req.params.importId);
  await getImport(req, importId);
  const body = parseBody(updateReportImportReviewSchema, req.body);
  const payload = {
    review_status: body.review_status,
    reviewed_by: ['corrected', 'approved'].includes(body.review_status) ? req.user.id : null,
    reviewed_at: ['corrected', 'approved'].includes(body.review_status) ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('project_report_imports')
    .update(payload)
    .eq('id', importId)
    .eq('project_id', req.context.projectId)
    .select()
    .single();
  throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'update', table_name: 'project_report_imports', record_id: data.id, details: { project_id: req.context.projectId, review_status: body.review_status } });
  res.json(data);
}
