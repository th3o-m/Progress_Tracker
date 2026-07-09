import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { createNotificationSchema, markAllNotificationsReadSchema } from '../schemas/index.js';
import { runOverdueTaskNotifications } from '../services/overdueNotifications.service.js';
import { ApiError, parseBody, throwDb } from '../utils/http.js';

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

async function assertProjectAccess(userId: string, projectId: string): Promise<void> {
  const { data, error } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  throwDb(error);
  if (!data) throw new ApiError(404, 'Project not found');
}

function requireProjectId(req: Request): string {
  const projectId = String(req.query.projectId ?? '');
  if (!projectId) throw new ApiError(400, 'projectId is required');
  return projectId;
}

const completedActivityStatuses = new Set(['completed', 'complete', 'done', 'cancelled']);

function normalizeStatus(status: string | null): string {
  return (status ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
}

function formatDueDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-BW', { year: 'numeric', month: 'short', day: 'numeric' });
}

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const projectId = requireProjectId(req);
  await assertProjectAccess(req.user.id, projectId);
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, project_id, type, title, message, entity_type, entity_id, severity, is_read, created_at, read_at')
    .eq('user_id', req.user.id)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  throwDb(error);
  res.json({ notifications: data ?? [] });
}

export async function getUnreadNotificationCount(req: Request, res: Response): Promise<void> {
  const projectId = requireProjectId(req);
  await assertProjectAccess(req.user.id, projectId);
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', req.user.id)
    .eq('project_id', projectId)
    .eq('is_read', false);
  throwDb(error);
  res.json({ count: count ?? 0 });
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  const notificationId = String(req.params.notificationId);
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', req.user.id)
    .select('id')
    .maybeSingle();
  throwDb(error);
  if (!data) throw new ApiError(404, 'Notification not found');
  res.json({ success: true });
}

export async function markAllNotificationsRead(req: Request, res: Response): Promise<void> {
  const body = parseBody(markAllNotificationsReadSchema, req.body);
  await assertProjectAccess(req.user.id, body.projectId);
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', req.user.id)
    .eq('project_id', body.projectId)
    .eq('is_read', false);
  throwDb(error);
  res.json({ success: true });
}

export async function createNotification(req: Request, res: Response): Promise<void> {
  const body = parseBody(createNotificationSchema, req.body);
  await assertProjectAccess(req.user.id, body.projectId);
  const payload = {
    user_id: req.user.id,
    project_id: body.projectId,
    type: body.type,
    title: body.title,
    message: body.message,
    entity_type: body.entityType ?? null,
    entity_id: body.entityId ?? null,
    severity: body.severity,
  };
  const { data, error } = await supabase
    .from('notifications')
    .upsert(payload, { onConflict: 'user_id,project_id,type,entity_type,entity_id', ignoreDuplicates: false })
    .select('id, user_id, project_id, type, title, message, entity_type, entity_id, severity, is_read, created_at, read_at')
    .single();
  throwDb(error);
  res.status(201).json(data);
}

export async function generateOverdueActivityNotifications(req: Request, res: Response): Promise<void> {
  const projectId = requireProjectId(req);
  await assertProjectAccess(req.user.id, projectId);

  const today = new Date().toISOString().slice(0, 10);
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('id, name, end_date, status')
    .eq('project_id', projectId)
    .lt('end_date', today)
    .order('end_date', { ascending: true });
  throwDb(activitiesError);

  const overdueActivities = (activities ?? []).filter((activity) => (
    activity.end_date && !completedActivityStatuses.has(normalizeStatus(activity.status))
  ));

  if (overdueActivities.length === 0) {
    res.json({ created: 0, skipped: 0, totalOverdue: 0 });
    return;
  }

  const payload = overdueActivities.map((activity) => ({
    user_id: req.user.id,
    project_id: projectId,
    type: 'overdue_activity',
    title: 'Overdue activity',
    message: `${activity.name} was due on ${formatDueDate(activity.end_date)} and is still not completed.`,
    entity_type: 'activity',
    entity_id: activity.id,
    severity: 'warning',
  }));

  const { data, error } = await supabase
    .from('notifications')
    .upsert(payload, { onConflict: 'user_id,project_id,type,entity_type,entity_id', ignoreDuplicates: true })
    .select('id');
  throwDb(error);

  const created = data?.length ?? 0;
  res.json({
    created,
    skipped: overdueActivities.length - created,
    totalOverdue: overdueActivities.length,
  });
}
