import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarClock,
  Check,
  Copy,
  Link2,
  LoaderCircle,
  MailWarning,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { useProjectData, useProjectMembers, type ProjectMember, type ProjectRole } from "../ProjectDataContext";
import { Skeleton } from "./ui/skeleton";

const roles: ProjectRole[] = ["officer", "supervisor", "finance", "admin"];
const roleLabel: Record<ProjectRole, string> = {
  officer: "Officer",
  supervisor: "Supervisor",
  finance: "Finance",
  admin: "Project Manager",
};
const permissions: Record<ProjectRole, string[]> = {
  officer: ["View district-scoped data", "Submit project updates", "Register beneficiaries"],
  supervisor: ["View all project operations", "Create activities", "Generate reports"],
  finance: ["View project activities", "Submit expenses", "Review financial entries"],
  admin: ["Full project access", "Manage members and roles", "Manage all project records"],
};

interface ProjectInvitation {
  id: string;
  token: string;
  role: ProjectRole;
  status: "Pending" | "Accepted" | "Expired" | "Revoked";
  expires_at: string;
  expiresAt?: string;
  invitationUrl: string;
}

interface OverdueReminderResult {
  considered: number;
  sent: number;
  skipped: number;
  failed: number;
}

interface OverdueReminderHistoryItem {
  id: string;
  task_id: string;
  user_id: string;
  email: string;
  notification_type: "activity" | "challenge";
  sent_at: string;
  status: "sent" | "failed" | "skipped";
  error_message: string | null;
}

function MembersSkeleton() {
  return <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">{Array.from({ length: 4 }).map((_, index) => <article key={index} className="rounded-lg border border-border bg-card p-4 shadow-sm"><div className="flex items-start gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div><Skeleton className="h-6 w-24 rounded-full" /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></div></article>)}</div>;
}

interface MemberDraft {
  role: ProjectRole;
  district: string;
}

function getDraft(member: ProjectMember): MemberDraft {
  return { role: member.role, district: member.district ?? "" };
}

function isDraftChanged(member: ProjectMember, draft: MemberDraft): boolean {
  return draft.role !== member.role || draft.district.trim() !== (member.district ?? "");
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function MemberCard({
  member,
  draft,
  canManage,
  isCurrentUser,
  busy,
  onDraftChange,
  onReset,
  onSave,
  onRemove,
}: {
  member: ProjectMember;
  draft: MemberDraft;
  canManage: boolean;
  isCurrentUser: boolean;
  busy: boolean;
  onDraftChange: (draft: MemberDraft) => void;
  onReset: () => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  const name = member.profiles?.full_name || "Unknown employee";
  const changed = isDraftChanged(member, draft);

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a3a6b]/10 text-xs font-bold text-[#1a3a6b]">
            {initials(name)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-sm font-semibold text-foreground">{name}</h4>
              {isCurrentUser && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">You</span>}
              {!member.profiles?.active && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">Inactive</span>}
            </div>
            <p className="truncate text-xs text-muted-foreground">{member.profiles?.email || "Email unavailable"}</p>
          </div>
        </div>
        <span className="rounded-full bg-[#1a3a6b]/10 px-2.5 py-1 text-[11px] font-semibold text-[#1a3a6b]">{roleLabel[member.role]}</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-muted-foreground">
          Project role
          <select
            value={draft.role}
            onChange={(event) => onDraftChange({ ...draft, role: event.target.value as ProjectRole })}
            disabled={!canManage || isCurrentUser || busy}
            className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {roles.map((item) => <option key={item} value={item}>{roleLabel[item]}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          District scope
          <input
            value={draft.district}
            onChange={(event) => onDraftChange({ ...draft, district: event.target.value })}
            disabled={!canManage || isCurrentUser || busy}
            placeholder="All districts"
            maxLength={100}
            className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">{permissions[draft.role].join(" · ")}</p>

      {canManage && !isCurrentUser && (
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
          {changed && (
            <button type="button" onClick={onReset} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary disabled:opacity-50">
              <X className="h-3.5 w-3.5" />Discard
            </button>
          )}
          <button type="button" onClick={onRemove} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" />Remove
          </button>
          <button type="button" onClick={onSave} disabled={busy || !changed} className="inline-flex items-center gap-1.5 rounded-md bg-[#1a3a6b] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save access
          </button>
        </div>
      )}
    </article>
  );
}

export function Settings({ currentUserId }: { currentUserId?: string | null }) {
  const { projectId, role, refresh } = useProjectData();
  const { data: members, loading, error: projectDataError, refresh: refreshMembers } = useProjectMembers();
  const canManage = role === "admin";
  const canSendReminders = role === "admin" || role === "supervisor";
  const canViewMembers = canManage;
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<ProjectRole>("officer");
  const [district, setDistrict] = useState("");
  const [drafts, setDrafts] = useState<Record<string, MemberDraft>>({});
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | ProjectRole>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [remindersBusy, setRemindersBusy] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<"idle" | "sending" | "success" | "failure">("idle");
  const [reminderHistory, setReminderHistory] = useState<OverdueReminderHistoryItem[]>([]);
  const [reminderHistoryLoading, setReminderHistoryLoading] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<ProjectRole>("officer");
  const [inviteDays, setInviteDays] = useState(7);
  const [invitation, setInvitation] = useState<ProjectInvitation | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(Object.fromEntries(members.map((member) => [member.id, getDraft(member)])));
  }, [members]);

  useEffect(() => {
    setSearch("");
    setRoleFilter("all");
    setError(null);
    setMessage(null);
    setReminderStatus("idle");
    setReminderHistory([]);
    setInvitation(null);
    setInviteOpen(false);
  }, [projectId]);

  async function loadReminderHistory(silent = false) {
    if (!supabase || !canSendReminders) return;
    setReminderHistoryLoading(true);
    try {
      const { data, error: historyError } = await supabase
        .from("overdue_task_notifications")
        .select("id, task_id, user_id, email, notification_type, sent_at, status, error_message")
        .eq("project_id", projectId)
        .order("sent_at", { ascending: false })
        .limit(10);
      if (historyError) throw historyError;
      setReminderHistory((data ?? []) as OverdueReminderHistoryItem[]);
    } catch (requestError) {
      if (!silent) showError(requestError, "Unable to load reminder history");
    } finally {
      setReminderHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (canSendReminders) void loadReminderHistory();
  }, [projectId, canSendReminders]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return members.filter((member) => {
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      const matchesQuery = !query || [member.profiles?.full_name, member.profiles?.email, member.district, roleLabel[member.role]]
        .some((value) => value?.toLowerCase().includes(query));
      return matchesRole && matchesQuery;
    });
  }, [members, roleFilter, search]);

  const roleCounts = useMemo(() => Object.fromEntries(roles.map((item) => [item, members.filter((member) => member.role === item).length])) as Record<ProjectRole, number>, [members]);

  function showError(requestError: unknown, fallback: string) {
    setError(requestError instanceof Error ? requestError.message : fallback);
    setMessage(null);
  }

  async function addMember(event: FormEvent) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || busy) return;
    setBusy("add");
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail, role: newRole, district: district.trim() || null }),
      });
      setEmail("");
      setDistrict("");
      setNewRole("officer");
      await Promise.all([refresh(), refreshMembers()]);
      setMessage(`${normalizedEmail} now has access to this project.`);
    } catch (requestError) {
      showError(requestError, "Unable to add the employee");
    } finally {
      setBusy(null);
    }
  }

  async function saveMember(member: ProjectMember) {
    const draft = drafts[member.id];
    if (!draft || !isDraftChanged(member, draft) || busy) return;
    setBusy(member.id);
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/projects/${projectId}/members/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: draft.role, district: draft.district.trim() || null }),
      });
      await Promise.all([refresh(), refreshMembers()]);
      setMessage(`${member.profiles?.full_name || "Employee"}'s access was updated.`);
    } catch (requestError) {
      showError(requestError, "Unable to update the employee's access");
    } finally {
      setBusy(null);
    }
  }

  async function removeMember(member: ProjectMember) {
    const name = member.profiles?.full_name || member.profiles?.email || "this employee";
    if (!window.confirm(`Remove ${name} from this project? They will immediately lose access to all project data.`)) return;
    setBusy(member.id);
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/projects/${projectId}/members/${member.id}`, { method: "DELETE" });
      await Promise.all([refresh(), refreshMembers()]);
      setMessage(`${name} no longer has access to this project.`);
    } catch (requestError) {
      showError(requestError, "Unable to remove the employee");
    } finally {
      setBusy(null);
    }
  }

  async function reloadMembers() {
    if (busy) return;
    setBusy("refresh");
    setError(null);
    try { await Promise.all([refresh(), refreshMembers()]); }
    catch (requestError) { showError(requestError, "Unable to refresh project access"); }
    finally { setBusy(null); }
  }

  async function sendOverdueReminders() {
    if (remindersBusy || !supabase) return;
    setRemindersBusy(true);
    setReminderStatus("sending");
    setError(null);
    setMessage(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<OverdueReminderResult>("send-overdue-reminders", {
        body: { projectId },
      });
      if (invokeError) throw invokeError;
      const result = data ?? { considered: 0, sent: 0, skipped: 0, failed: 0 };
      setReminderStatus("success");
      setMessage(`Overdue reminder check complete. Considered ${result.considered}, sent ${result.sent}, skipped ${result.skipped}, failed ${result.failed}.`);
      await loadReminderHistory(true);
    } catch (requestError) {
      setReminderStatus("failure");
      showError(requestError, "Unable to send overdue reminders");
    } finally {
      setRemindersBusy(false);
    }
  }

  async function generateInvitation() {
    if (inviteBusy) return;
    setInviteBusy(true);
    setError(null);
    setCopied(false);
    try {
      const result = await apiRequest<ProjectInvitation>(`/projects/${projectId}/invitations`, {
        method: "POST",
        body: JSON.stringify({ role: inviteRole, expiresInDays: inviteDays }),
      });
      setInvitation(result);
      setMessage("Invitation link generated.");
    } catch (requestError) {
      showError(requestError, "Unable to generate invitation link");
    } finally {
      setInviteBusy(false);
    }
  }

  async function copyInvitation() {
    if (!invitation?.invitationUrl) return;
    await navigator.clipboard.writeText(invitation.invitationUrl);
    setCopied(true);
  }

  async function revokeInvitation() {
    if (!invitation || inviteBusy) return;
    setInviteBusy(true);
    setError(null);
    try {
      await apiRequest(`/invitations/${invitation.token}`, { method: "DELETE" });
      setInvitation({ ...invitation, status: "Revoked" });
      setMessage("Invitation link revoked.");
    } catch (requestError) {
      showError(requestError, "Unable to revoke invitation");
    } finally {
      setInviteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#1a3a6b]/10 p-2.5"><ShieldCheck className="h-5 w-5 text-[#1a3a6b]" /></div>
            <div>
              <h2 className="font-bold text-foreground">Project access management</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Access and roles apply only to the selected project. {canManage ? "Add employees and maintain their permissions here." : "Your project manager controls team access."}
              </p>
            </div>
          </div>
          {canViewMembers && (
            <div className="flex flex-wrap items-center gap-2">
              {canManage && (
                <button type="button" onClick={() => setInviteOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-[#1a3a6b] px-3 py-2 text-xs font-semibold text-white">
                  <Link2 className="h-3.5 w-3.5" />Invite Member
                </button>
              )}
              <button type="button" onClick={reloadMembers} disabled={Boolean(busy) || loading} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${busy === "refresh" || loading ? "animate-spin" : ""}`} />Refresh
              </button>
            </div>
          )}
        </div>
        {(error || projectDataError) && <div role="alert" className="mt-4 flex items-start justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{error || projectDataError}</span>{error && <button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><X className="h-4 w-4" /></button>}</div>}
        {message && <div role="status" className="mt-4 flex items-start justify-between gap-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"><span className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />{message}</span><button type="button" onClick={() => setMessage(null)} aria-label="Dismiss message"><X className="h-4 w-4" /></button></div>}
      </section>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="invite-member-title">
          <section className="w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="invite-member-title" className="flex items-center gap-2 font-semibold text-foreground"><Link2 className="h-4 w-4 text-[#1a3a6b]" />Invite Member</h3>
                <p className="mt-1 text-xs text-muted-foreground">Generate a project-specific link for a new member.</p>
              </div>
              <button type="button" onClick={() => setInviteOpen(false)} aria-label="Close invite modal" className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-muted-foreground">
                Role
                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as ProjectRole)} disabled={inviteBusy} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60">
                  {roles.map((item) => <option key={item} value={item}>{roleLabel[item]}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Expiration
                <select value={inviteDays} onChange={(event) => setInviteDays(Number(event.target.value))} disabled={inviteBusy} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60">
                  <option value={1}>1 day</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
              </label>
            </div>

            <button type="button" onClick={generateInvitation} disabled={inviteBusy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#1a3a6b] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">
              {inviteBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {invitation ? "Generate new invite" : "Generate Invite"}
            </button>

            {invitation && (
              <div className="mt-4 rounded-md border border-border bg-secondary/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-foreground"><CalendarClock className="h-3.5 w-3.5" />Expires {new Date(invitation.expiresAt ?? invitation.expires_at).toLocaleString()}</span>
                  <span className="rounded-full bg-card px-2 py-0.5 font-semibold text-muted-foreground">{invitation.status}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <input readOnly value={invitation.invitationUrl} className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground" />
                  <button type="button" onClick={copyInvitation} disabled={invitation.status !== "Pending"} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-card disabled:opacity-50">
                    <Copy className="h-3.5 w-3.5" />{copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={revokeInvitation} disabled={inviteBusy || invitation.status !== "Pending"} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                    <X className="h-3.5 w-3.5" />Revoke link
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {roles.map((item) => (
          <button key={item} type="button" onClick={() => canViewMembers && setRoleFilter(roleFilter === item ? "all" : item)} className={`rounded-lg border bg-card p-4 text-left transition-colors ${roleFilter === item ? "border-[#1a3a6b] ring-1 ring-[#1a3a6b]" : "border-border hover:border-[#1a3a6b]/40"}`}>
            <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-[#1a3a6b]">{roleLabel[item]}</h3>{canViewMembers && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-foreground">{roleCounts[item]}</span>}</div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{permissions[item].join(" · ")}</p>
          </button>
        ))}
      </section>

      {canSendReminders && (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-foreground"><MailWarning className="h-4 w-4 text-[#1a3a6b]" />Overdue reminders</h3>
              <p className="mt-1 text-xs text-muted-foreground">Run the daily overdue task email check now.</p>
              {reminderStatus !== "idle" && (
                <p className={`mt-2 text-xs font-semibold ${reminderStatus === "failure" ? "text-red-700" : reminderStatus === "success" ? "text-green-700" : "text-muted-foreground"}`}>
                  {reminderStatus === "sending" ? "Sending..." : reminderStatus === "success" ? "Success" : "Failure"}
                </p>
              )}
            </div>
            <button type="button" onClick={sendOverdueReminders} disabled={remindersBusy} className="inline-flex items-center gap-2 rounded-md bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">
              {remindersBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MailWarning className="h-4 w-4" />}
              {remindersBusy ? "Sending..." : "Send Reminder"}
            </button>
          </div>
          <div className="mt-5 overflow-hidden rounded-md border border-border">
            <div className="flex items-center justify-between border-b border-border bg-secondary px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reminder history</span>
              <button type="button" onClick={loadReminderHistory} disabled={reminderHistoryLoading} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-foreground hover:bg-card disabled:cursor-wait disabled:opacity-60">
                <RefreshCw className={`h-3.5 w-3.5 ${reminderHistoryLoading ? "animate-spin" : ""}`} />Refresh
              </button>
            </div>
            {reminderHistory.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">{reminderHistoryLoading ? "Loading reminder history..." : "No reminder attempts logged yet."}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/70 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Sent at</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reminderHistory.map((item) => (
                      <tr key={item.id} className="border-t border-border">
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{new Date(item.sent_at).toLocaleString()}</td>
                        <td className="px-3 py-2">{item.email}</td>
                        <td className="px-3 py-2 capitalize">{item.notification_type}</td>
                        <td className="px-3 py-2 capitalize">{item.status}</td>
                        <td className="max-w-xs truncate px-3 py-2 text-xs text-muted-foreground" title={item.error_message ?? ""}>{item.error_message ?? "None"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {canManage && (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-semibold text-foreground"><UserPlus className="h-4 w-4 text-[#1a3a6b]" />Add an existing employee</h3>
          <p className="mt-1 text-xs text-muted-foreground">The employee must already have an active Projectt Tracker account.</p>
          <form onSubmit={addMember} className="mt-4 grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_auto]">
            <label className="text-xs font-medium text-muted-foreground">Employee email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="employee@example.org" className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>
            <label className="text-xs font-medium text-muted-foreground">Project role<select value={newRole} onChange={(event) => setNewRole(event.target.value as ProjectRole)} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">{roles.map((item) => <option key={item} value={item}>{roleLabel[item]}</option>)}</select></label>
            <label className="text-xs font-medium text-muted-foreground">District scope<input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="All districts" maxLength={100} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>
            <button disabled={busy === "add" || !email.trim()} className="inline-flex h-[38px] items-center justify-center gap-2 rounded-md bg-[#1a3a6b] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {busy === "add" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{busy === "add" ? "Adding..." : "Grant access"}
            </button>
          </form>
        </section>
      )}

      {canViewMembers && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="flex items-center gap-2 font-semibold text-foreground"><Users className="h-4 w-4 text-[#1a3a6b]" />Project members <span className="text-sm font-normal text-muted-foreground">({filteredMembers.length})</span></h3></div>
            <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, district..." className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground" /></div>
          </div>

          {loading && members.length === 0 ? (
            <MembersSkeleton />
          ) : filteredMembers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center"><Users className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-medium text-foreground">{members.length === 0 ? "No project members found" : "No members match your filters"}</p><p className="mt-1 text-xs text-muted-foreground">{members.length === 0 ? "Grant access to an existing employee to build this project team." : "Try a different search or role filter."}</p>{members.length > 0 && <button type="button" onClick={() => { setSearch(""); setRoleFilter("all"); }} className="mt-3 text-xs font-semibold text-[#1a3a6b]">Clear filters</button>}</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredMembers.map((member) => {
                const draft = drafts[member.id] ?? getDraft(member);
                return <MemberCard key={member.id} member={member} draft={draft} canManage={canManage} isCurrentUser={member.profiles?.id === currentUserId} busy={busy === member.id} onDraftChange={(nextDraft) => setDrafts((current) => ({ ...current, [member.id]: nextDraft }))} onReset={() => setDrafts((current) => ({ ...current, [member.id]: getDraft(member) }))} onSave={() => void saveMember(member)} onRemove={() => void removeMember(member)} />;
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
