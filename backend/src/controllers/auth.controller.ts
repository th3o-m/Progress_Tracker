import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { addProjectMemberSchema, updateProjectMemberSchema } from '../schemas/index.js';
import { auditLog } from '../services/auditLog.service.js';
import { getRecord } from '../services/access.service.js';
import { ApiError, getPagination, paginatedResponse, parseBody, throwDb } from '../utils/http.js';

export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  const profile = await getRecord('profiles', req.user.id);
  const { data: memberships, error } = await supabase.from('project_members').select('id, role, district, added_at, projects(id,name,description,district,sector,start_date,end_date,status,created_by,created_at,project_code,project_manager,planned_start_date,actual_start_date,planned_completion_date,actual_completion_date,estimated_budget,allocated_budget)').eq('user_id', req.user.id).order('added_at', { ascending: false });
  throwDb(error); res.json({ ...profile, projects: memberships ?? [] });
}

export async function addProjectMember(req: Request, res: Response): Promise<void> {
  const body = parseBody(addProjectMemberSchema, req.body);
  const { data: profile, error: lookupError } = await supabase.from('profiles').select('id, email, full_name, active').eq('email', body.email).maybeSingle(); throwDb(lookupError);
  if (!profile) throw new ApiError(404, 'No employee account exists for that email address');
  if (!profile.active) throw new ApiError(409, 'The employee account is inactive');
  const { data, error } = await supabase.from('project_members').insert({ project_id: req.context.projectId, user_id: profile.id, role: body.role, district: body.district ?? null }).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'create', table_name: 'project_members', record_id: data.id, details: { project_id: req.context.projectId, user_id: profile.id, role: body.role, district: body.district ?? null } });
  res.status(201).json({ ...data, profile: { id: profile.id, email: profile.email, full_name: profile.full_name } });
}

export async function listProjectMembers(req: Request, res: Response): Promise<void> {
  const pagination = getPagination(req);
  let query = supabase
    .from('project_members')
    .select('id, role, district, added_at, profiles(id,email,full_name,phone,active)', pagination ? { count: 'exact' } : undefined)
    .eq('project_id', req.context.projectId)
    .order('added_at');
  if (pagination) query = query.range(pagination.from, pagination.to);
  const { data, error, count } = await query; throwDb(error); res.json(paginatedResponse(data, pagination, count));
}

export async function removeProjectMember(req: Request, res: Response): Promise<void> {
  const membership = await getRecord('project_members', String(req.params.memberId));
  if (membership.project_id !== req.context.projectId) throw new ApiError(404, 'Membership not found');
  if (membership.user_id === req.user.id) throw new ApiError(400, 'Organization administrators cannot remove their own current-project membership');
  const { error } = await supabase.from('project_members').delete().eq('id', membership.id).eq('project_id', req.context.projectId); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'delete', table_name: 'project_members', record_id: membership.id, details: { project_id: req.context.projectId, user_id: membership.user_id } }); res.status(204).send();
}

export async function updateProjectMember(req: Request, res: Response): Promise<void> {
  const body = parseBody(updateProjectMemberSchema, req.body);
  const membership = await getRecord('project_members', String(req.params.memberId));
  if (membership.project_id !== req.context.projectId) throw new ApiError(404, 'Membership not found');
  if (membership.user_id === req.user.id && body.role && body.role !== 'admin') throw new ApiError(400, 'Organization administrators cannot remove their own current-project admin role');
  const { data, error } = await supabase.from('project_members').update(body).eq('id', membership.id).eq('project_id', req.context.projectId).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'update', table_name: 'project_members', record_id: data.id, details: { ...body, project_id: req.context.projectId, user_id: membership.user_id } }); res.json(data);
}
