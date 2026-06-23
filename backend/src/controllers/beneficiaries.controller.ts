import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { createBeneficiarySchema, updateBeneficiarySchema } from '../schemas/index.js';
import { applyReadScope, assertDistrict, assertOfficerOwnership, getProjectRecord } from '../services/access.service.js';
import { auditLog } from '../services/auditLog.service.js';
import { parseBody, throwDb } from '../utils/http.js';

export async function listBeneficiaries(req: Request, res: Response): Promise<void> {
  let query = supabase.from('beneficiaries').select('*').eq('project_id', req.context.projectId).order('created_at', { ascending: false }); query = applyReadScope(query, req);
  const { data, error } = await query; throwDb(error); res.json(data);
}
export async function createBeneficiary(req: Request, res: Response): Promise<void> {
  const body = parseBody(createBeneficiarySchema, req.body); assertDistrict(req, body.district);
  const { data, error } = await supabase.from('beneficiaries').insert({ ...body, project_id: req.context.projectId, registered_by: req.user.id }).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'create', table_name: 'beneficiaries', record_id: data.id, details: { ...body, project_id: req.context.projectId } }); res.status(201).json(data);
}
export async function updateBeneficiary(req: Request, res: Response): Promise<void> {
  const body = parseBody(updateBeneficiarySchema, req.body); const current = await getProjectRecord(req, 'beneficiaries', String(req.params.id));
  assertOfficerOwnership(req, current, 'registered_by'); assertDistrict(req, body.district ?? current.district);
  const { data, error } = await supabase.from('beneficiaries').update(body).eq('id', current.id).eq('project_id', req.context.projectId).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'update', table_name: 'beneficiaries', record_id: data.id, details: { ...body, project_id: req.context.projectId } }); res.json(data);
}
export async function deleteBeneficiary(req: Request, res: Response): Promise<void> {
  const current = await getProjectRecord(req, 'beneficiaries', String(req.params.id)); assertOfficerOwnership(req, current, 'registered_by');
  const { error } = await supabase.from('beneficiaries').delete().eq('id', current.id).eq('project_id', req.context.projectId); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'delete', table_name: 'beneficiaries', record_id: current.id, details: { national_id: current.national_id, project_id: req.context.projectId } }); res.status(204).send();
}
