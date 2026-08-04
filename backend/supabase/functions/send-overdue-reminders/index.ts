import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

type NotificationType = 'activity' | 'challenge';
type NotificationStatus = 'sent' | 'failed' | 'skipped';
type Frequency = 'manual' | 'daily' | 'every_3_days' | 'weekly' | 'biweekly' | 'monthly';
type Mode = 'manual' | 'scheduled';

interface Project { id: string; name: string; status: string; }
interface ReminderSettings { project_id: string; email_enabled: boolean; frequency: Frequency; last_sent_at: string | null; }
interface Profile { id: string; email: string; full_name: string | null; active: boolean; }
interface Member { user_id: string; role: string; profiles: Profile | Profile[] | null; }
interface Recipient { id: string; email: string; name: string; }
interface OverdueItem { type: NotificationType; projectId: string; projectName: string; taskId: string; taskTitle: string; dueDate: string; priority: string; status: string; responsibleUserId: string | null; }
interface ReminderDetail { task_id: string; notification_type: NotificationType; user_id: string | null; email: string; status: NotificationStatus; error_message?: string; }
interface RunResult { considered: number; sent: number; skipped: number; failed: number; projectsProcessed: number; projectsSkipped: number; projectsFailed: number; details: ReminderDetail[]; }

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const completedStatuses = new Set(['completed', 'complete', 'closed', 'done', 'cancelled']);
const managerRoles = new Set(['admin', 'supervisor']);
const frequencyDays: Record<Exclude<Frequency, 'manual' | 'monthly'>, number> = { daily: 1, every_3_days: 3, weekly: 7, biweekly: 14 };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
function requireEnv(name: string): string { const value = Deno.env.get(name)?.trim(); if (!value) throw new Error(`${name} is not configured`); return value; }
function normalizeStatus(status: string | null | undefined): string { return String(status ?? '').trim().toLowerCase().replace(/[_-]+/g, ' '); }
function isIncomplete(status: string | null | undefined, progressPct: number | null | undefined): boolean { return (progressPct ?? 0) < 100 && !completedStatuses.has(normalizeStatus(status)); }
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char)); }
function formatDate(value: string): string { return new Intl.DateTimeFormat('en-BW', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)); }
function projectUrl(req: Request, projectId: string): string { const base = Deno.env.get('APP_URL')?.trim() || req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || ''; return `${base.replace(/\/$/, '')}/?project=${encodeURIComponent(projectId)}`; }
function profileFromMember(member: Member): Profile | null { return Array.isArray(member.profiles) ? member.profiles[0] ?? null : member.profiles; }
function recipientFromProfile(profile: Profile | null | undefined): Recipient | null { if (!profile?.active || !profile.email) return null; return { id: profile.id, email: profile.email, name: profile.full_name || profile.email }; }
function emptyResult(): RunResult { return { considered: 0, sent: 0, skipped: 0, failed: 0, projectsProcessed: 0, projectsSkipped: 0, projectsFailed: 0, details: [] }; }

function isDue(settings: ReminderSettings, now = new Date()): boolean {
  if (!settings.email_enabled || settings.frequency === 'manual') return false;
  if (!settings.last_sent_at) return true;
  const last = new Date(settings.last_sent_at);
  if (Number.isNaN(last.getTime())) return true;
  if (settings.frequency === 'monthly') { const due = new Date(last); due.setUTCMonth(due.getUTCMonth() + 1); return now >= due; }
  const days = frequencyDays[settings.frequency];
  return now.getTime() - last.getTime() >= days * 24 * 60 * 60 * 1000;
}

function buildEmail(item: OverdueItem, recipient: Recipient, link: string): { subject: string; html: string; text: string } {
  const rows: Array<[string, string]> = [['Recipient', recipient.name], ['Project', item.projectName], ['Task', item.taskTitle], ['Due date', formatDate(item.dueDate)], ['Priority', item.priority], ['Status', item.status]];
  const htmlRows = rows.map(([label, value]) => `<tr><th align="left" style="padding:8px 16px 8px 0;color:#334155">${escapeHtml(label)}</th><td style="padding:8px 0;color:#0f172a">${escapeHtml(value)}</td></tr>`).join('');
  return { subject: 'Overdue Task Reminder', text: `Hello ${recipient.name},\n\nThis is a reminder that the following task is overdue.\n\n${rows.slice(1).map(([label, value]) => `${label}: ${value}`).join('\n')}\n\nOpen project: ${link}`, html: `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a"><div style="max-width:640px;margin:0 auto;padding:24px"><div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:24px"><h1 style="margin:0 0 12px;font-size:20px;color:#0f172a">Overdue Task Reminder</h1><p style="margin:0 0 16px;color:#334155">Hello ${escapeHtml(recipient.name)}, this task is overdue and still incomplete.</p><table role="presentation" style="width:100%;border-collapse:collapse;margin:8px 0 20px">${htmlRows}</table><a href="${escapeHtml(link)}" style="display:inline-block;background:#1a3a6b;color:#fff;text-decoration:none;border-radius:6px;padding:11px 16px;font-weight:700">Open project</a></div></div></body></html>` };
}

async function sendEmail(apiKey: string, fromEmail: string, to: string, message: ReturnType<typeof buildEmail>): Promise<string | null> {
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: fromEmail, to: [to], subject: message.subject, html: message.html, text: message.text }) });
  const payload = await response.json().catch(() => null); return response.ok ? null : payload?.message || `Resend request failed with ${response.status}`;
}

async function processProject(adminClient: ReturnType<typeof createClient>, req: Request, project: Project, resendApiKey: string, fromEmail: string): Promise<RunResult> {
  const result = emptyResult();
  const today = new Date().toISOString().slice(0, 10);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [membersResult, activitiesResult, challengesResult] = await Promise.all([
    adminClient.from('project_members').select('user_id,role,profiles(id,email,full_name,active)').eq('project_id', project.id),
    adminClient.from('activities').select('id,project_id,name,end_date,status,progress_pct,responsible_officer').eq('project_id', project.id).lt('end_date', today),
    adminClient.from('challenges').select('id,project_id,description,due_date,resolved,responsible_officer,officer_id,activities(name)').eq('project_id', project.id).lt('due_date', today).eq('resolved', false),
  ]);
  if (membersResult.error) throw membersResult.error; if (activitiesResult.error) throw activitiesResult.error; if (challengesResult.error) throw challengesResult.error;
  const members = (membersResult.data ?? []) as Member[]; const recipientsByUserId = new Map<string, Recipient>();
  for (const member of members) { const recipient = recipientFromProfile(profileFromMember(member)); if (recipient) recipientsByUserId.set(member.user_id, recipient); }
  const managerRecipients = members.filter((member) => managerRoles.has(member.role)).map((member) => recipientsByUserId.get(member.user_id)).filter((recipient): recipient is Recipient => Boolean(recipient));
  const items: OverdueItem[] = [
    ...((activitiesResult.data ?? []) as Array<Record<string, any>>).filter((activity) => isIncomplete(activity.status, activity.progress_pct)).map((activity) => ({ type: 'activity' as const, projectId: project.id, projectName: project.name, taskId: activity.id, taskTitle: activity.name, dueDate: activity.end_date, priority: 'Normal', status: activity.status ?? 'Unknown', responsibleUserId: activity.responsible_officer ?? null })),
    ...((challengesResult.data ?? []) as Array<Record<string, any>>).filter((challenge) => Boolean(challenge.due_date)).map((challenge) => { const activity = Array.isArray(challenge.activities) ? challenge.activities[0] : challenge.activities; return { type: 'challenge' as const, projectId: project.id, projectName: project.name, taskId: challenge.id, taskTitle: activity?.name ? `${activity.name}: ${challenge.description}` : challenge.description, dueDate: challenge.due_date, priority: 'High', status: 'Open', responsibleUserId: challenge.responsible_officer ?? challenge.officer_id ?? null }; }),
  ];
  result.considered = items.length; const link = projectUrl(req, project.id);
  for (const item of items) {
    const responsible = item.responsibleUserId ? recipientsByUserId.get(item.responsibleUserId) : null; const recipients = responsible ? [responsible] : managerRecipients;
    if (!recipients.length) { result.skipped++; result.details.push({ task_id: item.taskId, notification_type: item.type, user_id: null, email: '', status: 'skipped', error_message: 'No active responsible project member or manager email found' }); continue; }
    for (const recipient of recipients) {
      try {
        const { data: duplicate, error: duplicateError } = await adminClient.from('overdue_task_notifications').select('id').eq('task_id', item.taskId).eq('user_id', recipient.id).eq('notification_type', item.type).eq('status', 'sent').gte('sent_at', twentyFourHoursAgo).limit(1);
        if (duplicateError) throw duplicateError;
        if ((duplicate ?? []).length) { const message = 'Reminder already sent within the last 24 hours'; const { error: logError } = await adminClient.from('overdue_task_notifications').insert({ project_id: item.projectId, task_id: item.taskId, user_id: recipient.id, email: recipient.email, notification_type: item.type, status: 'skipped', error_message: message }); if (logError) throw logError; result.skipped++; result.details.push({ task_id: item.taskId, notification_type: item.type, user_id: recipient.id, email: recipient.email, status: 'skipped', error_message: message }); continue; }
        let errorMessage: string | null = null; try { errorMessage = await sendEmail(resendApiKey, fromEmail, recipient.email, buildEmail(item, recipient, link)); } catch (error) { errorMessage = error instanceof Error ? error.message : 'Unable to send email'; }
        const status: NotificationStatus = errorMessage ? 'failed' : 'sent'; const { error: logError } = await adminClient.from('overdue_task_notifications').insert({ project_id: item.projectId, task_id: item.taskId, user_id: recipient.id, email: recipient.email, notification_type: item.type, status, error_message: errorMessage });
        if (logError) throw logError; if (status === 'sent') result.sent++; else result.failed++; result.details.push({ task_id: item.taskId, notification_type: item.type, user_id: recipient.id, email: recipient.email, status, error_message: errorMessage ?? undefined });
      } catch (error) { result.failed++; result.details.push({ task_id: item.taskId, notification_type: item.type, user_id: recipient.id, email: recipient.email, status: 'failed', error_message: error instanceof Error ? error.message : 'Unable to process reminder' }); }
    }
  }
  return result;
}

function mergeResult(target: RunResult, source: RunResult): void { target.considered += source.considered; target.sent += source.sent; target.skipped += source.skipped; target.failed += source.failed; target.details.push(...source.details); }
function timingSafeEqual(left: string, right: string): boolean { if (left.length !== right.length) return false; let result = 0; for (let index = 0; index < left.length; index++) result |= left.charCodeAt(index) ^ right.charCodeAt(index); return result === 0; }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders }); if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  try {
    const supabaseUrl = requireEnv('SUPABASE_URL'); const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY'); const resendApiKey = requireEnv('RESEND_API_KEY'); const fromEmail = requireEnv('FROM_EMAIL');
    const body = await req.json().catch(() => ({})); const mode: Mode = body.mode === 'scheduled' ? 'scheduled' : 'manual'; const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    if (mode === 'scheduled') {
      const supplied = req.headers.get('X-Cron-Secret') ?? ''; const expected = requireEnv('REMINDER_CRON_SECRET'); if (!timingSafeEqual(supplied, expected)) return jsonResponse({ error: 'Invalid scheduler secret' }, 401);
      const { data: settings, error: settingsError } = await adminClient.from('project_reminder_settings').select('project_id,email_enabled,frequency,last_sent_at').eq('email_enabled', true); if (settingsError) throw settingsError;
      const result = emptyResult(); const now = new Date();
      for (const setting of (settings ?? []) as ReminderSettings[]) {
        if (!isDue(setting, now)) { result.projectsSkipped++; continue; }
        const { data: project, error: projectError } = await adminClient.from('projects').select('id,name,status').eq('id', setting.project_id).maybeSingle(); if (projectError) { result.projectsFailed++; result.failed++; continue; }
        if (!project || project.status === 'cancelled') { result.projectsSkipped++; continue; }
        try { const projectResult = await processProject(adminClient, req, project as Project, resendApiKey, fromEmail); mergeResult(result, projectResult); const { error: updateError } = await adminClient.from('project_reminder_settings').update({ last_sent_at: now.toISOString() }).eq('project_id', setting.project_id); if (updateError) throw updateError; result.projectsProcessed++; } catch { result.projectsFailed++; result.failed++; }
      }
      return jsonResponse(result);
    }
    const authHeader = req.headers.get('Authorization') ?? ''; const token = authHeader.replace(/^Bearer\s+/i, ''); const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    if (!token) return jsonResponse({ error: 'Missing authorization token' }, 401); if (!uuidPattern.test(projectId)) return jsonResponse({ error: 'projectId is required' }, 400);
    const { data: userData, error: userError } = await adminClient.auth.getUser(token); if (userError || !userData.user) return jsonResponse({ error: 'Invalid authorization token' }, 401);
    const { data: membership, error: membershipError } = await adminClient.from('project_members').select('role').eq('project_id', projectId).eq('user_id', userData.user.id).maybeSingle(); if (membershipError) throw membershipError; if (!membership || !managerRoles.has(membership.role)) return jsonResponse({ error: 'Project manager access required' }, 403);
    const { data: project, error: projectError } = await adminClient.from('projects').select('id,name,status').eq('id', projectId).maybeSingle(); if (projectError) throw projectError; if (!project) return jsonResponse({ error: 'Project not found' }, 404); if (project.status === 'cancelled') return jsonResponse({ ...emptyResult(), projectsSkipped: 1 });
    const result = await processProject(adminClient, req, project as Project, resendApiKey, fromEmail); result.projectsProcessed = 1; return jsonResponse(result);
  } catch (error) { return jsonResponse({ error: error instanceof Error ? error.message : 'Unable to send overdue reminders' }, 500); }
});
