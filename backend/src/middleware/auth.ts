import type { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

export async function auth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization');
  const match = header?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    res.status(401).json({ error: 'Missing Bearer token' });
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(match[1]);
  if (authError || !authData.user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const { data: profile, error } = await supabase.from('profiles').select('id, email, is_org_admin, active').eq('id', authData.user.id).single();
  if (error || !profile || !profile.active) {
    res.status(401).json({ error: 'User profile is missing or inactive' });
    return;
  }

  req.user = { id: profile.id, email: profile.email, isOrgAdmin: profile.is_org_admin };
  next();
}
