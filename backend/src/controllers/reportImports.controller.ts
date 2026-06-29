import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { reportImportSchema, updateReportImportReviewSchema } from '../schemas/index.js';
import { auditLog } from '../services/auditLog.service.js';
import { ApiError, parseBody, throwDb } from '../utils/http.js';

export async function listReportImports(req: Request, res: Response): Promise<void> {
  let query = supabase
    .from('project_report_imports')
    .select('*')
    .eq('project_id', req.context.projectId)
    .order('reporting_period', { ascending: false });

  if (req.query.reporting_period) query = query.eq('reporting_period', String(req.query.reporting_period));

  const { data, error } = await query;
  throwDb(error);
  res.json(data ?? []);
}

export async function createReportImport(req: Request, res: Response): Promise<void> {
  const body = parseBody(reportImportSchema, req.body);
  const { overwrite, ...input } = body;
  const payload = {
    ...input,
    project_id: req.context.projectId,
    selected_project_id: req.context.projectId,
    imported_by: req.user.id,
    milestones: Array.isArray(input.milestones) ? input.milestones : [input.milestones],
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
    .select('*')
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
    supabase.from('projects').select('*').eq('id', req.context.projectId).single(),
    supabase.from('activities').select('*').eq('project_id', req.context.projectId).eq('import_id', importId).order('created_at', { ascending: true }),
    supabase.from('progress_updates').select('*, activities(code,name,district)').eq('project_id', req.context.projectId).eq('import_id', importId).order('report_date', { ascending: true }),
    supabase.from('challenges').select('*, activities(code,name,district)').eq('project_id', req.context.projectId).eq('import_id', importId).order('created_at', { ascending: true }),
    supabase.from('financial_entries').select('*, activities(code,name,district)').eq('project_id', req.context.projectId).eq('import_id', importId).order('created_at', { ascending: true }),
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
