import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import type { Activity, ProjectMember, ProjectRole } from "../ProjectDataContext";

interface CurrentUserResponse {
  id: string;
  is_org_admin: boolean;
  projects: Array<{
    id: string;
    role: ProjectRole;
    district: string | null;
    projects: { id: string; name: string } | { id: string; name: string }[] | null;
  }>;
}

interface ActivityPageProps {
  projectId: string;
  activityId: string;
  fromPage?: string | null;
}

interface ActivityDraft {
  progressPct: string;
  status: string;
  description: string;
  responsibleOfficer: string;
  dueDate: string;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-BW", { year: "numeric", month: "short", day: "numeric" });
}

function formatText(value: string | null | undefined): string {
  return value && value.trim() ? value : "Not recorded";
}

function normalizeStatus(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function resolveOfficerName(activity: Activity, members: ProjectMember[]): string {
  if (!activity.responsible_officer) return "Unassigned";
  const member = members.find((item) => item.profiles?.id === activity.responsible_officer);
  if (member?.profiles?.full_name) return member.profiles.full_name;
  if (member?.profiles?.email) return member.profiles.email;
  return activity.responsible_officer;
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-10 w-40" />
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-[420px] rounded-md" />
          <Skeleton className="h-[420px] rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function ActivityPage({ projectId, activityId, fromPage }: ActivityPageProps) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [role, setRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<ActivityDraft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const currentUser = await apiRequest<CurrentUserResponse>("/users/me");
      setCurrentUserId(currentUser.id);
      const membership = currentUser.projects.find((item) => {
        const project = Array.isArray(item.projects) ? item.projects[0] : item.projects;
        return project?.id === projectId;
      });
      if (!membership) throw new Error("You do not have access to this project.");
      setRole(membership.role);

      const [activityPayload, projectMembers] = await Promise.all([
        apiRequest<Activity>(`/projects/${projectId}/activities/${activityId}`),
        membership.role === "admin" || membership.role === "supervisor"
          ? apiRequest<ProjectMember[]>(`/projects/${projectId}/members`)
          : Promise.resolve([] as ProjectMember[]),
      ]);

      setActivity(activityPayload);
      setMembers(projectMembers);
      setDraft({
        progressPct: String(activityPayload.progress_pct ?? 0),
        status: activityPayload.status ?? "",
        description: activityPayload.description ?? "",
        responsibleOfficer: activityPayload.responsible_officer ?? "",
        dueDate: activityPayload.end_date ?? "",
      });
    } catch (loadError) {
      setActivity(null);
      setMembers([]);
      setDraft(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load activity");
    } finally {
      setLoading(false);
    }
  }, [activityId, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canManage = role === "admin" || role === "supervisor";
  const canEditProgress = canManage || (role === "officer" && activity?.responsible_officer === currentUserId);
  const canEditDescription = canManage;
  const canEditResponsibleOfficer = canManage;
  const canEditDueDate = canManage;
  const returnUrl = fromPage ? `/?project=${encodeURIComponent(projectId)}&page=${encodeURIComponent(fromPage)}` : `/?project=${encodeURIComponent(projectId)}`;

  const summaryRows = useMemo(() => {
    if (!activity) return [];
    return [
      ["Code", formatText(activity.code)],
      ["Name", activity.name],
      ["Category", activity.category],
      ["District", activity.district],
      ["Status", activity.status],
      ["Progress", `${activity.progress_pct}%`],
      ["Start date", formatDate(activity.start_date)],
      ["Due date", formatDate(activity.end_date)],
      ["Responsible officer", resolveOfficerName(activity, members)],
      ["Description", formatText(activity.description)],
      ["Actual completion date", formatDate(activity.actual_completion_date)],
      ["Remarks", formatText(activity.remarks)],
      ["Created", formatDate(activity.created_at)],
      ["Import ID", formatText(activity.import_id)],
    ] as Array<[string, string]>;
  }, [activity, members]);

  async function saveActivity() {
    if (!draft || !activity) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        progress_pct: Number(draft.progressPct),
        status: draft.status,
      };
      if (canEditDescription) payload.description = draft.description.trim() === "" ? null : draft.description.trim();
      if (canEditResponsibleOfficer) payload.responsible_officer = draft.responsibleOfficer.trim() === "" ? null : draft.responsibleOfficer;
      if (canEditDueDate) payload.end_date = draft.dueDate;
      await apiRequest<Activity>(`/projects/${projectId}/activities/${activityId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      window.location.href = returnUrl;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save activity");
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    if (!draft || !activity) {
      window.location.href = returnUrl;
      return;
    }
    const dirty = draft.progressPct !== String(activity.progress_pct ?? 0)
      || draft.status !== (activity.status ?? "")
      || draft.description !== (activity.description ?? "")
      || draft.responsibleOfficer !== (activity.responsible_officer ?? "")
      || draft.dueDate !== (activity.end_date ?? "");
    if (dirty && !window.confirm("Discard unsaved changes and return to the project page?")) return;
    window.location.href = returnUrl;
  }

  if (loading) return <LoadingState />;

  if (error || !activity || !draft) {
    return (
      <main className="min-h-screen bg-background p-6">
        <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl items-center">
          <div className="w-full rounded-md border border-border bg-card p-6 shadow-sm">
            <h1 className="text-lg font-bold text-foreground">Activity unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error || "No activity data was returned."}</p>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
                Back to project
              </Button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button type="button" onClick={goBack} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to project
            </button>
            <h1 className="mt-4 text-2xl font-bold text-foreground">{activity.code ? `${activity.code} - ${activity.name}` : activity.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Project activity details and edit view</p>
          </div>
          <div className="rounded-md border border-border bg-card px-4 py-3 text-sm shadow-sm">
            <p className="font-semibold text-foreground">Current role</p>
            <p className="text-muted-foreground">{role ?? "Unknown"}</p>
          </div>
        </div>

        {message && (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-md border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide">Activity Information</h2>
                <p className="mt-1 text-xs text-muted-foreground">Existing record values and metadata.</p>
              </div>
              <span className="rounded px-2 py-1 text-xs font-semibold bg-secondary text-muted-foreground">{normalizeStatus(activity.status)}</span>
            </div>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {summaryRows.map(([label, value]) => (
                <div key={label} className="rounded-md border border-border bg-background p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-md border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide">Update Activity</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {canManage ? "Update all supported fields." : canEditProgress ? "You can update progress and status." : "This activity is view-only for your role."}
                </p>
              </div>
              {saving && (
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  Saving
                </span>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                Progress: {draft.progressPct}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={draft.progressPct}
                  onChange={(event) => setDraft((current) => current ? { ...current, progressPct: event.target.value } : current)}
                  disabled={!canEditProgress}
                  className="mt-2 w-full"
                />
              </label>

              <label className="block text-sm">
                Status *
                <select
                  required
                  value={draft.status}
                  onChange={(event) => setDraft((current) => current ? { ...current, status: event.target.value } : current)}
                  disabled={!canEditProgress}
                  className="mt-1 w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Select...</option>
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>On Hold</option>
                </select>
              </label>

              <label className="block text-sm">
                Description
                <textarea
                  rows={4}
                  value={draft.description}
                  onChange={(event) => setDraft((current) => current ? { ...current, description: event.target.value } : current)}
                  disabled={!canEditDescription}
                  className="mt-1 w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              <label className="block text-sm">
                Responsible Officer
                <select
                  value={draft.responsibleOfficer}
                  onChange={(event) => setDraft((current) => current ? { ...current, responsibleOfficer: event.target.value } : current)}
                  disabled={!canEditResponsibleOfficer}
                  className="mt-1 w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Unassigned</option>
                  {members.filter((member) => member.profiles?.active).map((member) => (
                    <option key={member.profiles!.id} value={member.profiles!.id}>
                      {member.profiles!.full_name || member.profiles!.email}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                Due Date
                <input
                  type="date"
                  required
                  value={draft.dueDate}
                  onChange={(event) => setDraft((current) => current ? { ...current, dueDate: event.target.value } : current)}
                  disabled={!canEditDueDate}
                  className="mt-1 w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={goBack} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void saveActivity()} disabled={saving || !canEditProgress}>
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </Button>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
