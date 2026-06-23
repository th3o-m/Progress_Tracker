import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { createFinancialSchema, decisionSchema, updateFinancialSchema } from '../schemas/index.js';
import { applyReadScope, assertOfficerOwnership, getProjectRecord } from '../services/access.service.js';
import { auditLog } from '../services/auditLog.service.js';
import { ApiError, parseBody, throwDb } from '../utils/http.js';

export async function listFinancialEntries(req: Request, res: Response): Promise<void> {
  let query = supabase.from('financial_entries').select('*, activities(code,name,district)').eq('project_id', req.context.projectId).order('created_at', { ascending: false });
  query = applyReadScope(query, req, 'submitted_by');
  if (req.query.status) query = query.eq('status', String(req.query.status));
  const { data, error } = await query; throwDb(error); res.json(data);
}
export async function createFinancialEntry(req: Request, res: Response): Promise<void> {
  const body = parseBody(createFinancialSchema, req.body); const activity = await getProjectRecord(req, 'activities', body.activity_id);
  if (req.context.roleInProject === 'officer' && (activity.responsible_officer !== req.user.id || activity.district !== req.context.district)) throw new ApiError(403, 'Activity is not assigned to you in your district');
  const payload = { ...body, project_id: req.context.projectId, submitted_by: req.user.id, status: 'pending' };
  const { data, error } = await supabase.from('financial_entries').insert(payload).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'create', table_name: 'financial_entries', record_id: data.id, details: { ...body, project_id: req.context.projectId } }); res.status(201).json(data);
}
export async function updateFinancialEntry(req: Request, res: Response): Promise<void> {
  const body = parseBody(updateFinancialSchema, req.body); const current = await getProjectRecord(req, 'financial_entries', String(req.params.id));
  if (current.status !== 'pending') throw new ApiError(409, 'Only pending entries may be edited');
  if (['officer', 'finance'].includes(req.context.roleInProject) && current.submitted_by !== req.user.id) throw new ApiError(403, 'You may only edit your own financial entries');
  if (body.activity_id) {
    const activity = await getProjectRecord(req, 'activities', body.activity_id);
    if (req.context.roleInProject === 'officer' && (activity.responsible_officer !== req.user.id || activity.district !== req.context.district)) throw new ApiError(403, 'Activity is not assigned to you in your district');
  }
  const { data, error } = await supabase.from('financial_entries').update(body).eq('id', current.id).eq('project_id', req.context.projectId).eq('status', 'pending').select().maybeSingle(); throwDb(error);
  if (!data) throw new ApiError(409, 'Entry was already reviewed');
  await auditLog({ user_id: req.user.id, action: 'update', table_name: 'financial_entries', record_id: data.id, details: { ...body, project_id: req.context.projectId } }); res.json(data);
}
async function decide(req: Request, res: Response, status: 'approved' | 'rejected'): Promise<void> {
  const body = parseBody(decisionSchema, req.body); const current = await getProjectRecord(req, 'financial_entries', String(req.params.id));
  if (current.status !== 'pending') throw new ApiError(409, 'Only pending entries can be reviewed');
  const reviewed = { status, approved_by: req.user.id, approved_at: new Date().toISOString() };
  const { data, error } = await supabase.from('financial_entries').update(reviewed).eq('id', current.id).eq('project_id', req.context.projectId).eq('status', 'pending').select().maybeSingle(); throwDb(error);
  if (!data) throw new ApiError(409, 'Entry was already reviewed');
  await auditLog({ user_id: req.user.id, action: status === 'approved' ? 'approve' : 'reject', table_name: 'financial_entries', record_id: data.id, details: { ...reviewed, ...body, project_id: req.context.projectId } }); res.json(data);
}
export const approveFinancialEntry = (req: Request, res: Response) => decide(req, res, 'approved');
export const rejectFinancialEntry = (req: Request, res: Response) => decide(req, res, 'rejected');
export async function deleteFinancialEntry(req: Request, res: Response): Promise<void> {
  const current = await getProjectRecord(req, 'financial_entries', String(req.params.id)); assertOfficerOwnership(req, current, 'submitted_by');
  if (req.context.roleInProject !== 'admin' && current.status !== 'pending') throw new ApiError(409, 'Only pending entries may be deleted');
  const { error } = await supabase.from('financial_entries').delete().eq('id', current.id).eq('project_id', req.context.projectId); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'delete', table_name: 'financial_entries', record_id: current.id, details: { status: current.status, project_id: req.context.projectId } }); res.status(204).send();
}
