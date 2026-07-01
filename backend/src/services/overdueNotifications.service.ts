import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { throwDb } from '../utils/http.js';
import { sendEmail } from './email.service.js';

const completedStatuses = new Set(['completed', 'complete', 'closed', 'done']);

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  active: boolean;
}

interface Project {
  id: string;
  name: string;
  status: string;
  created_by: string | null;
}

interface Recipient {
  id: string;
  email: string;
  name: string;
}

interface OverdueItem {
  type: 'activity' | 'challenge';
  projectId: string;
  projectName: string;
  taskId: string;
  taskName: string;
  dueDate: string;
  completionPct: number;
  status: string;
  remarks: string | null;
  responsibleOfficer: string | null;
  fallbackProjectId: string;
}

interface ReminderResult {
  considered: number;
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{ task_id: string; notification_type: string; email: string; status: string; error_message?: string }>;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function todayStartIso(): string {
  return `${todayIso()}T00:00:00.000Z`;
}

function isIncomplete(status: string | null | undefined, completionPct: number | null | undefined): boolean {
  return (completionPct ?? 0) < 100 && !completedStatuses.has(String(status ?? '').trim().toLowerCase());
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}

function projectUrl(projectId: string): string {
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/?project=${encodeURIComponent(projectId)}`;
}

async function getProfiles(ids: string[]): Promise<Map<string, Profile>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();
  const { data, error } = await supabase.from('profiles').select('id,email,full_name,active').in('id', uniqueIds);
  throwDb(error);
  return new Map((data ?? []).map((profile) => [profile.id, profile as Profile]));
}

async function getFallbackRecipients(projectIds: string[], projects: Map<string, Project>): Promise<Map<string, Recipient>> {
  const { data, error } = await supabase
    .from('project_members')
    .select('project_id,user_id,role,profiles(id,email,full_name,active)')
    .in('project_id', [...new Set(projectIds)])
    .in('role', ['admin', 'supervisor'])
    .order('added_at', { ascending: true });
  throwDb(error);

  const fallback = new Map<string, Recipient>();
  for (const member of data ?? []) {
    if (fallback.has(member.project_id)) continue;
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
    if (!profile?.active || !profile.email) continue;
    fallback.set(member.project_id, { id: profile.id, email: profile.email, name: profile.full_name || profile.email });
  }

  const missingCreatorIds = [...new Set([...projects.values()].filter((project) => !fallback.has(project.id) && project.created_by).map((project) => project.created_by as string))];
  const creators = await getProfiles(missingCreatorIds);
  for (const project of projects.values()) {
    if (fallback.has(project.id) || !project.created_by) continue;
    const profile = creators.get(project.created_by);
    if (profile?.active && profile.email) fallback.set(project.id, { id: profile.id, email: profile.email, name: profile.full_name || profile.email });
  }

  return fallback;
}

async function alreadySentToday(item: OverdueItem, recipient: Recipient): Promise<boolean> {
  const { data, error } = await supabase
    .from('overdue_task_notifications')
    .select('id')
    .eq('project_id', item.projectId)
    .eq('task_id', item.taskId)
    .eq('user_id', recipient.id)
    .eq('notification_type', item.type)
    .eq('status', 'sent')
    .gte('sent_at', todayStartIso())
    .limit(1);
  throwDb(error);
  return Boolean(data?.length);
}

function buildEmail(item: OverdueItem): { subject: string; html: string; text: string } {
  const url = projectUrl(item.fallbackProjectId);
  const subject = `Overdue Task Reminder: ${item.taskName}`;
  const rows: Array<[string, string]> = [
    ['Project', item.projectName],
    ['Task/activity', item.taskName],
    ['Due date', item.dueDate],
    ['Completion', `${item.completionPct}%`],
    ['Current status', item.status],
    ['Remarks', item.remarks || 'None recorded'],
  ];
  const text = `${subject}

${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}
Open in Project Tracker: ${url}`;
  const htmlRows = rows.map(([label, value]) => `<tr><th align="left" style="padding:6px 12px 6px 0">${escapeHtml(label)}</th><td style="padding:6px 0">${escapeHtml(value)}</td></tr>`).join('');
  const html = `<p>This task is overdue and still incomplete.</p><table>${htmlRows}</table><p><a href="${escapeHtml(url)}">Open in Project Tracker</a></p>`;
  return { subject, text, html };
}

async function logNotification(item: OverdueItem, recipient: Recipient, status: string, errorMessage?: string): Promise<void> {
  const { error } = await supabase.from('overdue_task_notifications').insert({
    project_id: item.projectId,
    task_id: item.taskId,
    user_id: recipient.id,
    email: recipient.email,
    notification_type: item.type,
    status,
    error_message: errorMessage ?? null,
  });
  throwDb(error);
}

export async function runOverdueTaskNotifications(): Promise<ReminderResult> {
  const today = todayIso();
  const [projectsResult, activitiesResult, challengesResult] = await Promise.all([
    supabase.from('projects').select('id,name,status,created_by').neq('status', 'cancelled'),
    supabase.from('activities').select('id,project_id,name,end_date,status,progress_pct,remarks,responsible_officer').lt('end_date', today),
    supabase.from('challenges').select('id,project_id,description,due_date,resolved,mitigation_plan,responsible_officer,officer_id,activities(name)').lt('due_date', today).eq('resolved', false),
  ]);
  [projectsResult.error, activitiesResult.error, challengesResult.error].forEach(throwDb);

  const projects = new Map((projectsResult.data ?? []).map((project) => [project.id, project as Project]));
  const items: OverdueItem[] = [
    ...(activitiesResult.data ?? [])
      .filter((activity) => projects.has(activity.project_id) && isIncomplete(activity.status, activity.progress_pct))
      .map((activity) => ({
        type: 'activity' as const,
        projectId: activity.project_id,
        projectName: projects.get(activity.project_id)?.name ?? 'Project',
        taskId: activity.id,
        taskName: activity.name,
        dueDate: activity.end_date,
        completionPct: activity.progress_pct ?? 0,
        status: activity.status ?? 'Unknown',
        remarks: activity.remarks ?? null,
        responsibleOfficer: activity.responsible_officer ?? null,
        fallbackProjectId: activity.project_id,
      })),
    ...(challengesResult.data ?? [])
      .filter((challenge) => projects.has(challenge.project_id))
      .map((challenge) => {
        const activity = Array.isArray(challenge.activities) ? challenge.activities[0] : challenge.activities;
        return {
          type: 'challenge' as const,
          projectId: challenge.project_id,
          projectName: projects.get(challenge.project_id)?.name ?? 'Project',
          taskId: challenge.id,
          taskName: activity?.name ? `${activity.name}: ${challenge.description}` : challenge.description,
          dueDate: challenge.due_date,
          completionPct: 0,
          status: 'Open',
          remarks: challenge.mitigation_plan ?? null,
          responsibleOfficer: challenge.responsible_officer ?? challenge.officer_id ?? null,
          fallbackProjectId: challenge.project_id,
        };
      }),
  ];

  const responsibleProfiles = await getProfiles(items.map((item) => item.responsibleOfficer).filter((id): id is string => Boolean(id)));
  const fallbackRecipients = await getFallbackRecipients(items.map((item) => item.projectId), projects);

  const result: ReminderResult = { considered: items.length, sent: 0, skipped: 0, failed: 0, details: [] };
  for (const item of items) {
    const profile = item.responsibleOfficer ? responsibleProfiles.get(item.responsibleOfficer) : null;
    const recipient = profile?.active && profile.email
      ? { id: profile.id, email: profile.email, name: profile.full_name || profile.email }
      : fallbackRecipients.get(item.projectId);

    if (!recipient) {
      result.skipped += 1;
      result.details.push({ task_id: item.taskId, notification_type: item.type, email: '', status: 'skipped', error_message: 'No active responsible officer or project admin/supervisor email found' });
      continue;
    }

    if (await alreadySentToday(item, recipient)) {
      result.skipped += 1;
      result.details.push({ task_id: item.taskId, notification_type: item.type, email: recipient.email, status: 'skipped', error_message: 'Reminder already sent today' });
      continue;
    }

    const email = buildEmail(item);
    const sent = await sendEmail({ to: recipient.email, ...email });
    const status = sent.skipped ? 'skipped' : sent.error ? 'failed' : 'sent';
    await logNotification(item, recipient, status, sent.error);

    if (status === 'sent') result.sent += 1;
    else if (status === 'failed') result.failed += 1;
    else result.skipped += 1;
    result.details.push({ task_id: item.taskId, notification_type: item.type, email: recipient.email, status, error_message: sent.error });
  }

  return result;
}
