import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { createProgressSchema, updateProgressSchema } from '../schemas/index.js';
import { applyReadScope, assertOfficerOwnership, getProjectRecord } from '../services/access.service.js';
import { auditLog } from '../services/auditLog.service.js';
import { ApiError, getPagination, paginatedResponse, parseBody, throwDb } from '../utils/http.js';

export async function listProgress(req: Request, res: Response): Promise<void> {
  const pagination = getPagination(req);
  let query = supabase
    .from('progress_updates')
    .select('id, project_id, activity_id, officer_id, progress_pct, status, narrative, report_date, import_id, executive_summary, status_color, remarks, reporting_period, created_at, activities(code,name,district)', pagination ? { count: 'exact' } : undefined)
    .eq('project_id', req.context.projectId)
    .order('report_date', { ascending: false });
  query = applyReadScope(query, req, 'officer_id');
  if (req.query.activity_id) query = query.eq('activity_id', String(req.query.activity_id));
  if (pagination) query = query.range(pagination.from, pagination.to);
  const { data, error, count } = await query; throwDb(error); res.json(paginatedResponse(data, pagination, count));
}
export async function createProgress(req: Request, res: Response): Promise<void> {
  const body = parseBody(createProgressSchema, req.body);
  const activity = await getProjectRecord(req, 'activities', body.activity_id);
  if (req.context.roleInProject === 'officer' && (activity.responsible_officer !== req.user.id || activity.district !== req.context.district)) throw new ApiError(403, 'Activity is not assigned to you in your district');
  const payload = { ...body, project_id: req.context.projectId, officer_id: req.user.id };
  const { data, error } = await supabase.from('progress_updates').insert(payload).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'create', table_name: 'progress_updates', record_id: data.id, details: { ...body, project_id: req.context.projectId } });
  const { error: activityError } = await supabase.from('activities').update({ progress_pct: body.progress_pct, status: body.status, updated_at: new Date().toISOString() }).eq('id', body.activity_id).eq('project_id', req.context.projectId); throwDb(activityError);
  await auditLog({ user_id: req.user.id, action: 'update', table_name: 'activities', record_id: body.activity_id, details: { progress_pct: body.progress_pct, status: body.status, project_id: req.context.projectId, source: 'progress_update' } });
  res.status(201).json(data);
}
export async function updateProgress(req: Request, res: Response): Promise<void> {
  const body = parseBody(updateProgressSchema, req.body); const current = await getProjectRecord(req, 'progress_updates', String(req.params.id)); assertOfficerOwnership(req, current, 'officer_id');
  const { data, error } = await supabase.from('progress_updates').update(body).eq('id', current.id).eq('project_id', req.context.projectId).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'update', table_name: 'progress_updates', record_id: data.id, details: { ...body, project_id: req.context.projectId } }); res.json(data);
}
export async function deleteProgress(req: Request, res: Response): Promise<void> {
  const current = await getProjectRecord(req, 'progress_updates', String(req.params.id)); assertOfficerOwnership(req, current, 'officer_id');
  const { error } = await supabase.from('progress_updates').delete().eq('id', current.id).eq('project_id', req.context.projectId); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'delete', table_name: 'progress_updates', record_id: current.id, details: { project_id: req.context.projectId } }); res.status(204).send();
}
