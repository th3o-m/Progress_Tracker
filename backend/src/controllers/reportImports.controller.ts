import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { reportImportSchema } from '../schemas/index.js';
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
    details: { project_id: req.context.projectId, reporting_period: input.reporting_period, source_sheet_name: input.source_sheet_name },
  });

  res.status(existing ? 200 : 201).json(data);
}
