import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../types/domain.js';

export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.context || !allowed.includes(req.context.roleInProject)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requireOrgAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isOrgAdmin) {
    res.status(403).json({ error: 'Organization administrator access required' });
    return;
  }
  next();
}
