import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { runOverdueTaskNotifications } from '../services/overdueNotifications.service.js';
import { ApiError } from '../utils/http.js';

function hasCronSecret(req: Request): boolean {
  const secretHeader = req.header('x-cron-secret') || req.header('cron-secret');
  const authHeader = req.header('authorization');
  return Boolean(env.CRON_SECRET && (secretHeader === env.CRON_SECRET || authHeader === `Bearer ${env.CRON_SECRET}`));
}

export async function runOverdueTaskNotificationsForCron(req: Request, res: Response): Promise<void> {
  if (!hasCronSecret(req)) throw new ApiError(401, 'Invalid CRON_SECRET');
  const result = await runOverdueTaskNotifications();
  res.json(result);
}

export async function runOverdueTaskNotificationsForAdmin(_req: Request, res: Response): Promise<void> {
  const result = await runOverdueTaskNotifications();
  res.json(result);
}
