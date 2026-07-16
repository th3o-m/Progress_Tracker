import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

type NotificationType = 'activity' | 'challenge';
type NotificationStatus = 'sent' | 'failed' | 'skipped';

interface Project {
  id: string;
  name: string;
  status: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  active: boolean;
}

interface Member {
  user_id: string;
  role: string;
  profiles: Profile | Profile[] | null;
}

interface Recipient {
  id: string;
  email: string;
  name: string;
}

interface OverdueItem {
  type: NotificationType;
  projectId: string;
  projectName: string;
  taskId: string;
  taskTitle: string;
  dueDate: string;
  priority: string;
  status: string;
  responsibleUserId: string | null;
}

interface ReminderDetail {
  task_id: string;
  notification_type: NotificationType;
  user_id: string | null;
  email: string;
  status: NotificationStatus;
  error_message?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const completedStatuses = new Set(['completed', 'complete', 'closed', 'done', 'cancelled']);
const managerRoles = new Set(['admin', 'supervisor']);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function normalizeStatus(status: string | null | undefined): string {
  return String(status ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
}

function isIncomplete(status: string | null | undefined, progressPct: number | null | undefined): boolean {
  return (progressPct ?? 0) < 100 && !completedStatuses.has(normalizeStatus(status));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-BW', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function projectUrl(req: Request, projectId: string): string {
  const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
  return `${origin.replace(/\/$/, '')}/?project=${encodeURIComponent(projectId)}`;
}

function profileFromMember(member: Member): Profile | null {
  return Array.isArray(member.profiles) ? member.profiles[0] ?? null : member.profiles;
}

function recipientFromProfile(profile: Profile | null | undefined): Recipient | null {
  if (!profile?.active || !profile.email) return null;
  return { id: profile.id, email: profile.email, name: profile.full_name || profile.email };
}

function buildEmail(item: OverdueItem, recipient: Recipient, link: string): { subject: string; html: string; text: string } {
  const subject = 'Overdue Task Reminder';
  const rows: Array<[string, string]> = [
    ['Recipient', recipient.name],
    ['Project', item.projectName],
    ['Task', item.taskTitle],
    ['Due date', formatDate(item.dueDate)],
    ['Priority', item.priority],
    ['Status', item.status],
  ];
  const htmlRows = rows
    .map(([label, value]) => `<tr><th align="left" style="padding:8px 16px 8px 0;color:#334155">${escapeHtml(label)}</th><td style="padding:8px 0;color:#0f172a">${escapeHtml(value)}</td></tr>`)
    .join('');

  return {
    subject,
    text: `Hello ${recipient.name},

This is a reminder that the following task is overdue.

${rows.slice(1).map(([label, value]) => `${label}: ${value}`).join('\n')}

Open project: ${link}`,
    html: `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:640px;margin:0 auto;padding:24px">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:24px">
        <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#0f172a">Overdue Task Reminder</h1>
        <p style="margin:0 0 16px;color:#334155">Hello ${escapeHtml(recipient.name)}, this task is overdue and still incomplete.</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;margin:8px 0 20px">${htmlRows}</table>
        <a href="${escapeHtml(link)}" style="display:inline-block;background:#1a3a6b;color:#ffffff;text-decoration:none;border-radius:6px;padding:11px 16px;font-weight:700">Open project</a>
      </div>
    </div>
  </body>
</html>`,
  };
}

async function sendEmail(apiKey: string, fromEmail: string, to: string, message: { subject: string; html: string; text: string }): Promise<string | null> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return payload?.message || `Resend request failed with ${response.status}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = requireEnv('SUPABASE_URL');
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = requireEnv('RESEND_API_KEY');
    const fromEmail = requireEnv('FROM_EMAIL');
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return jsonResponse({ error: 'Missing authorization token' }, 401);

    const body = await req.json().catch(() => ({}));
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) {
      return jsonResponse({ error: 'projectId is required' }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData.user) return jsonResponse({ error: 'Invalid authorization token' }, 401);

    const { data: callerMembership, error: callerError } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (callerError) throw callerError;
    if (!callerMembership || !managerRoles.has(callerMembership.role)) {
      return jsonResponse({ error: 'Project manager access required' }, 403);
    }

    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('id,name,status')
      .eq('id', projectId)
      .maybeSingle();
    if (projectError) throw projectError;
    if (!project) return jsonResponse({ error: 'Project not found' }, 404);
    if ((project as Project).status === 'cancelled') return jsonResponse({ considered: 0, sent: 0, skipped: 0, failed: 0, details: [] });

    const today = new Date().toISOString().slice(0, 10);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [membersResult, activitiesResult, challengesResult] = await Promise.all([
      adminClient
        .from('project_members')
        .select('user_id,role,profiles(id,email,full_name,active)')
        .eq('project_id', projectId),
      adminClient
        .from('activities')
        .select('id,project_id,name,end_date,status,progress_pct,responsible_officer')
        .eq('project_id', projectId)
        .lt('end_date', today),
      adminClient
        .from('challenges')
        .select('id,project_id,description,due_date,resolved,responsible_officer,officer_id,activities(name)')
        .eq('project_id', projectId)
        .lt('due_date', today)
        .eq('resolved', false),
    ]);
    if (membersResult.error) throw membersResult.error;
    if (activitiesResult.error) throw activitiesResult.error;
    if (challengesResult.error) throw challengesResult.error;

    const members = (membersResult.data ?? []) as Member[];
    const recipientsByUserId = new Map<string, Recipient>();
    for (const member of members) {
      const recipient = recipientFromProfile(profileFromMember(member));
      if (recipient) recipientsByUserId.set(member.user_id, recipient);
    }
    const managerRecipients = members
      .filter((member) => managerRoles.has(member.role))
      .map((member) => recipientsByUserId.get(member.user_id))
      .filter((recipient): recipient is Recipient => Boolean(recipient));

    const projectRow = project as Project;
    const items: OverdueItem[] = [
      ...((activitiesResult.data ?? []) as Array<Record<string, any>>)
        .filter((activity) => isIncomplete(activity.status, activity.progress_pct))
        .map((activity) => ({
          type: 'activity' as const,
          projectId,
          projectName: projectRow.name,
          taskId: activity.id,
          taskTitle: activity.name,
          dueDate: activity.end_date,
          priority: 'Normal',
          status: activity.status ?? 'Unknown',
          responsibleUserId: activity.responsible_officer ?? null,
        })),
      ...((challengesResult.data ?? []) as Array<Record<string, any>>)
        .filter((challenge) => Boolean(challenge.due_date))
        .map((challenge) => {
          const activity = Array.isArray(challenge.activities) ? challenge.activities[0] : challenge.activities;
          return {
            type: 'challenge' as const,
            projectId,
            projectName: projectRow.name,
            taskId: challenge.id,
            taskTitle: activity?.name ? `${activity.name}: ${challenge.description}` : challenge.description,
            dueDate: challenge.due_date,
            priority: 'High',
            status: 'Open',
            responsibleUserId: challenge.responsible_officer ?? challenge.officer_id ?? null,
          };
        }),
    ];

    const result = { considered: items.length, sent: 0, skipped: 0, failed: 0, details: [] as ReminderDetail[] };
    const link = projectUrl(req, projectId);

    for (const item of items) {
      const responsible = item.responsibleUserId ? recipientsByUserId.get(item.responsibleUserId) : null;
      const recipients = responsible ? [responsible] : managerRecipients;
      if (recipients.length === 0) {
        result.skipped += 1;
        result.details.push({ task_id: item.taskId, notification_type: item.type, user_id: null, email: '', status: 'skipped', error_message: 'No active responsible project member or manager email found' });
        continue;
      }

      for (const recipient of recipients) {
        const { data: duplicate, error: duplicateError } = await adminClient
          .from('overdue_task_notifications')
          .select('id')
          .eq('task_id', item.taskId)
          .eq('user_id', recipient.id)
          .eq('notification_type', item.type)
          .eq('status', 'sent')
          .gte('sent_at', twentyFourHoursAgo)
          .limit(1);
        if (duplicateError) throw duplicateError;

        if ((duplicate ?? []).length > 0) {
          const errorMessage = 'Reminder already sent within the last 24 hours';
          const { error: logError } = await adminClient.from('overdue_task_notifications').insert({
            project_id: item.projectId,
            task_id: item.taskId,
            user_id: recipient.id,
            email: recipient.email,
            notification_type: item.type,
            sent_at: new Date().toISOString(),
            status: 'skipped',
            error_message: errorMessage,
          });
          if (logError) throw logError;
          result.skipped += 1;
          result.details.push({ task_id: item.taskId, notification_type: item.type, user_id: recipient.id, email: recipient.email, status: 'skipped', error_message: errorMessage });
          continue;
        }

        let status: NotificationStatus = 'sent';
        let errorMessage: string | null = null;
        try {
          errorMessage = await sendEmail(resendApiKey, fromEmail, recipient.email, buildEmail(item, recipient, link));
          if (errorMessage) status = 'failed';
        } catch (sendError) {
          status = 'failed';
          errorMessage = sendError instanceof Error ? sendError.message : 'Unable to send email';
        }

        const { error: logError } = await adminClient.from('overdue_task_notifications').insert({
          project_id: item.projectId,
          task_id: item.taskId,
          user_id: recipient.id,
          email: recipient.email,
          notification_type: item.type,
          sent_at: new Date().toISOString(),
          status,
          error_message: errorMessage,
        });
        if (logError) throw logError;

        if (status === 'sent') result.sent += 1;
        else result.failed += 1;
        result.details.push({ task_id: item.taskId, notification_type: item.type, user_id: recipient.id, email: recipient.email, status, error_message: errorMessage ?? undefined });
      }
    }

    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unable to send overdue reminders' }, 500);
  }
});
