import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { createChallengeSchema, updateChallengeSchema } from '../schemas/index.js';
import { applyReadScope, assertOfficerOwnership, getProjectRecord } from '../services/access.service.js';
import { auditLog } from '../services/auditLog.service.js';
import { ApiError, parseBody, throwDb } from '../utils/http.js';

export async function listChallenges(req: Request, res: Response): Promise<void> {
  let query = supabase.from('challenges').select('*, activities(code,name,district)').eq('project_id', req.context.projectId).order('created_at', { ascending: false });
  query = applyReadScope(query, req, 'officer_id');
  if (req.query.activity_id) query = query.eq('activity_id', String(req.query.activity_id));
  const { data, error } = await query; throwDb(error); res.json(data);
}
export async function createChallenge(req: Request, res: Response): Promise<void> {
  const body = parseBody(createChallengeSchema, req.body); const activity = await getProjectRecord(req, 'activities', body.activity_id);
  if (req.context.roleInProject === 'officer' && (activity.responsible_officer !== req.user.id || activity.district !== req.context.district)) throw new ApiError(403, 'Activity is not assigned to you in your district');
  const { data, error } = await supabase.from('challenges').insert({ ...body, project_id: req.context.projectId, officer_id: req.user.id }).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'create', table_name: 'challenges', record_id: data.id, details: { ...body, project_id: req.context.projectId } }); res.status(201).json(data);
}
export async function updateChallenge(req: Request, res: Response): Promise<void> {
  const body = parseBody(updateChallengeSchema, req.body); const current = await getProjectRecord(req, 'challenges', String(req.params.id)); assertOfficerOwnership(req, current, 'officer_id');
  const { data, error } = await supabase.from('challenges').update(body).eq('id', current.id).eq('project_id', req.context.projectId).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'update', table_name: 'challenges', record_id: data.id, details: { ...body, project_id: req.context.projectId } }); res.json(data);
}
export async function deleteChallenge(req: Request, res: Response): Promise<void> {
  const current = await getProjectRecord(req, 'challenges', String(req.params.id)); assertOfficerOwnership(req, current, 'officer_id');
  const { error } = await supabase.from('challenges').delete().eq('id', current.id).eq('project_id', req.context.projectId); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'delete', table_name: 'challenges', record_id: current.id, details: { project_id: req.context.projectId } }); res.status(204).send();
}
