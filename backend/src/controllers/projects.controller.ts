import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { createProjectSchema, updateProjectSchema } from '../schemas/index.js';
import { auditLog } from '../services/auditLog.service.js';
import { getRecord } from '../services/access.service.js';
import { ApiError, parseBody, throwDb } from '../utils/http.js';

export async function listProjects(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabase.from('project_members').select('role, district, added_at, projects(*)').eq('user_id', req.user.id).order('added_at', { ascending: false });
  throwDb(error); res.json(data);
}

export async function getProject(req: Request, res: Response): Promise<void> {
  const project = await getRecord('projects', req.context.projectId);
  res.json({ ...project, membership: { role: req.context.roleInProject, district: req.context.district } });
}

export async function createProject(req: Request, res: Response): Promise<void> {
  const body = parseBody(createProjectSchema, req.body);
  const { source_project_id, ...projectInput } = body;
  if (!req.user.isOrgAdmin) {
    if (!source_project_id) throw new ApiError(403, 'Select a project where you are an admin or supervisor');
    const { data: sourceMembership, error: membershipError } = await supabase.from('project_members').select('role').eq('project_id', source_project_id).eq('user_id', req.user.id).maybeSingle();
    throwDb(membershipError);
    if (!sourceMembership || !['admin', 'supervisor'].includes(sourceMembership.role)) throw new ApiError(403, 'Project admin or supervisor access required');
  }
  const { data: project, error } = await supabase.from('projects').insert({ ...projectInput, created_by: req.user.id }).select().single(); throwDb(error);
  const { data: membership, error: memberError } = await supabase.from('project_members').insert({ project_id: project.id, user_id: req.user.id, role: 'admin', district: projectInput.district ?? null }).select().single();
  if (memberError) { await supabase.from('projects').delete().eq('id', project.id); throwDb(memberError); }
  await auditLog({ user_id: req.user.id, action: 'create', table_name: 'projects', record_id: project.id, details: { ...projectInput, project_id: project.id, source_project_id: source_project_id ?? null } });
  await auditLog({ user_id: req.user.id, action: 'create', table_name: 'project_members', record_id: membership.id, details: { project_id: project.id, user_id: req.user.id, role: 'admin' } });
  res.status(201).json({ ...project, membership });
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  const body = parseBody(updateProjectSchema, req.body);
  const current = await getRecord('projects', req.context.projectId);
  const startDate = body.start_date === undefined ? current.start_date : body.start_date;
  const endDate = body.end_date === undefined ? current.end_date : body.end_date;
  if (startDate && endDate && endDate < startDate) throw new ApiError(400, 'Validation failed', { end_date: ['Must be on or after start_date'] });
  const { data, error } = await supabase.from('projects').update(body).eq('id', req.context.projectId).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'update', table_name: 'projects', record_id: data.id, details: { ...body, project_id: data.id } }); res.json(data);
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  const project = await getRecord('projects', req.context.projectId);
  if (project.status === 'cancelled') throw new ApiError(409, 'Project is already removed');
  const { error } = await supabase.from('projects').update({ status: 'cancelled' }).eq('id', project.id).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'update', table_name: 'projects', record_id: project.id, details: { name: project.name, project_id: project.id, status: 'cancelled', reason: 'removed_from_project_switcher' } }); res.status(204).send();
}
