import type { Request } from 'express';
import { supabase } from '../config/supabase.js';
import { ApiError, assertFound, throwDb } from '../utils/http.js';
import { z } from 'zod';

export async function getRecord(table: string, id: string, columns = '*'): Promise<Record<string, any>> {
  if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, 'Validation failed', { id: ['Expected a UUID'] });
  const { data, error } = await supabase.from(table).select(columns).eq('id', id).maybeSingle();
  throwDb(error);
  assertFound(data);
  return data;
}

export async function getProjectRecord(req: Request, table: string, id: string, columns = '*'): Promise<Record<string, any>> {
  if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, 'Validation failed', { id: ['Expected a UUID'] });
  const { data, error } = await supabase.from(table).select(columns).eq('id', id).eq('project_id', req.context.projectId).maybeSingle();
  throwDb(error);
  assertFound(data);
  return data;
}

export function assertOfficerOwnership(req: Request, record: Record<string, any>, ownerField: string): void {
  if (req.context.roleInProject === 'officer' && record[ownerField] !== req.user.id) throw new ApiError(403, 'Officers may only modify their own records');
}

export function assertDistrict(req: Request, district: string | null): void {
  if (req.context.roleInProject === 'officer' && (!req.context.district || district !== req.context.district)) throw new ApiError(403, 'Record is outside your district');
}

export function applyReadScope(query: any, req: Request, officerField?: string): any {
  if (req.context.roleInProject !== 'officer') return query;
  return officerField ? query.eq(officerField, req.user.id) : query.eq('district', req.context.district ?? '__none__');
}

export async function assertMemberOfProject(projectId: string, userId: string): Promise<void> {
  const { data, error } = await supabase.from('project_members').select('id').eq('project_id', projectId).eq('user_id', userId).maybeSingle();
  throwDb(error);
  if (!data) throw new ApiError(400, 'Selected user is not a member of this project');
}
