import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { createProfileSchema, updateProfileSchema } from '../schemas/index.js';
import { getRecord } from '../services/access.service.js';
import { auditLog } from '../services/auditLog.service.js';
import { ApiError, getPagination, paginatedResponse, parseBody, throwDb } from '../utils/http.js';

export async function listProfiles(req: Request, res: Response): Promise<void> {
  const pagination = getPagination(req);
  let query = supabase
    .from('profiles')
    .select('id, email, full_name, phone, is_org_admin, active, created_at', pagination ? { count: 'exact' } : undefined)
    .order('created_at', { ascending: false });
  if (pagination) query = query.range(pagination.from, pagination.to);
  const { data, error, count } = await query; throwDb(error); res.json(paginatedResponse(data, pagination, count));
}
export async function createProfile(req: Request, res: Response): Promise<void> {
  const body = parseBody(createProfileSchema, req.body);
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: body.full_name, phone: body.phone ?? null },
  });
  if (authError || !authData.user) throw new ApiError(400, authError?.message ?? 'Unable to create auth user');
  const { password: _password, ...profile } = body;
  const { data, error } = await supabase.from('profiles').upsert({ ...profile, id: authData.user.id }, { onConflict: 'id' }).select().single();
  if (error) { await supabase.auth.admin.deleteUser(authData.user.id); throwDb(error); }
  await auditLog({ user_id: req.user.id, action: 'create', table_name: 'profiles', record_id: data.id, details: profile }); res.status(201).json(data);
}
export async function updateProfile(req: Request, res: Response): Promise<void> {
  const body = parseBody(updateProfileSchema, req.body); const current = await getRecord('profiles', String(req.params.id));
  const { data, error } = await supabase.from('profiles').update(body).eq('id', current.id).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'update', table_name: 'profiles', record_id: data.id, details: body }); res.json(data);
}
export async function deleteProfile(req: Request, res: Response): Promise<void> {
  const current = await getRecord('profiles', String(req.params.id)); if (current.id === req.user.id) throw new ApiError(400, 'Organization administrators cannot delete their own account');
  const { error } = await supabase.auth.admin.deleteUser(current.id); if (error) throw new ApiError(400, error.message);
  await auditLog({ user_id: req.user.id, action: 'delete', table_name: 'profiles', record_id: current.id, details: { full_name: current.full_name } }); res.status(204).send();
}
