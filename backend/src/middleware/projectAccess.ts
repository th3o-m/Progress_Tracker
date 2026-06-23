import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import type { Role } from '../types/domain.js';

export async function projectAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  const projectId = String(req.params.projectId);
  if (!z.string().uuid().safeParse(projectId).success) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const { data, error } = await supabase
    .from('project_members')
    .select('project_id, role, district')
    .eq('project_id', projectId)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error || !data) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  req.context = { projectId: data.project_id, roleInProject: data.role as Role, district: data.district };
  next();
}
