import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { createActivitySchema, updateActivitySchema } from '../schemas/index.js';
import { applyReadScope, assertMemberOfProject, getProjectRecord } from '../services/access.service.js';
import { auditLog } from '../services/auditLog.service.js';
import { ApiError, parseBody, throwDb } from '../utils/http.js';

export async function listActivities(req: Request, res: Response): Promise<void> {
  let query = supabase.from('activities').select('*').eq('project_id', req.context.projectId).order('created_at', { ascending: false });
  query = applyReadScope(query, req);
  const { data, error } = await query; throwDb(error); res.json(data);
}

export async function getActivity(req: Request, res: Response): Promise<void> {
  const record = await getProjectRecord(req, 'activities', String(req.params.id));
  if (req.context.roleInProject === 'officer' && record.district !== req.context.district) throw new ApiError(403, 'Record is outside your district');
  res.json(record);
}

export async function createActivity(req: Request, res: Response): Promise<void> {
  const body = parseBody(createActivitySchema, req.body);
  await assertMemberOfProject(req.context.projectId, body.responsible_officer);
  const { data, error } = await supabase.from('activities').insert({ ...body, project_id: req.context.projectId }).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'create', table_name: 'activities', record_id: data.id, details: { ...body, project_id: req.context.projectId } });
  res.status(201).json(data);
}

export async function updateActivity(req: Request, res: Response): Promise<void> {
  const body = parseBody(updateActivitySchema, req.body);
  const current = await getProjectRecord(req, 'activities', String(req.params.id));
  if (req.context.roleInProject === 'officer') {
    if (current.responsible_officer !== req.user.id) throw new ApiError(403, 'Officers may only edit assigned activities');
    const forbidden = Object.keys(body).some((key) => !['status', 'progress_pct'].includes(key));
    if (forbidden) throw new ApiError(403, 'Officers may only update status and progress_pct');
  }
  if (body.responsible_officer) await assertMemberOfProject(req.context.projectId, body.responsible_officer);
  const { data, error } = await supabase.from('activities').update({ ...body, updated_at: new Date().toISOString() }).eq('id', current.id).eq('project_id', req.context.projectId).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'update', table_name: 'activities', record_id: data.id, details: { ...body, project_id: req.context.projectId } });
  res.json(data);
}

export async function deleteActivity(req: Request, res: Response): Promise<void> {
  const current = await getProjectRecord(req, 'activities', String(req.params.id));
  const { error } = await supabase.from('activities').delete().eq('id', current.id).eq('project_id', req.context.projectId); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'delete', table_name: 'activities', record_id: current.id, details: { code: current.code, project_id: req.context.projectId } });
  res.status(204).send();
}
