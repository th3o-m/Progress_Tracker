import { useState } from "react";
import { LoaderCircle, Pencil, Save } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { apiRequest } from "../../lib/api";
import { useProjectActivities, useProjectData, useProjectProgressUpdates, type ProgressUpdate } from "../ProjectDataContext";
import { EmptyState } from "./EmptyState";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Skeleton } from "./ui/skeleton";

const colors = ["#1a3a6b", "#0e7490", "#16a34a", "#d97706", "#c0392b"];

interface ProgressTrackingProps {
  onOpenActivity: (activityId: string) => void;
}

function ProgressSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => <div key={index} className="rounded-md border border-border bg-card p-5"><Skeleton className="h-8 w-16" /><Skeleton className="mt-2 h-3 w-32" /></div>)}
      </div>
      <div className="grid grid-cols-2 gap-4"><Skeleton className="h-[296px] rounded-md" /><Skeleton className="h-[296px] rounded-md" /></div>
      <section className="rounded-md border border-border bg-card p-5"><Skeleton className="mb-5 h-4 w-48" /><div className="space-y-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div></section>
    </div>
  );
}

export function ProgressTracking({ onOpenActivity }: ProgressTrackingProps) {
  const { projectId, role } = useProjectData();
  const { data: activities, loading: activitiesLoading, error: activitiesError, refresh: refreshActivities } = useProjectActivities();
  const { data: progress, loading: progressLoading, error: progressError, refresh: refreshProgress } = useProjectProgressUpdates();
  const [selectedUpdate, setSelectedUpdate] = useState<ProgressUpdate | null>(null);
  const [newCompletion, setNewCompletion] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const loading = activitiesLoading || progressLoading;
  const error = activitiesError || progressError;

  if (loading) return <ProgressSkeleton />;
  if (error) return <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>;

  const statusData = Array.from(new Set(progress.map((item) => item.status))).map((status, index) => ({ name: status, value: progress.filter((item) => item.status === status).length, color: colors[index % colors.length] }));
  const latest = [...progress].sort((a, b) => b.report_date.localeCompare(a.report_date));
  const parsedCompletion = Number(newCompletion);
  const completionIsValid = newCompletion.trim() !== "" && Number.isInteger(parsedCompletion) && parsedCompletion >= 0 && parsedCompletion <= 100;

  function canEditUpdate(update: ProgressUpdate): boolean {
    if (role === "admin" || role === "supervisor") return true;
    const activity = activities.find((item) => item.id === update.activity_id);
    return role === "officer" && activity?.responsible_officer === update.officer_id;
  }

  function openUpdate(update: ProgressUpdate) {
    if (!canEditUpdate(update)) return;
    setSelectedUpdate(update);
    setNewCompletion(String(update.progress_pct));
    setSaveError(null);
  }

  function closeUpdate() {
    if (saving) return;
    setSelectedUpdate(null);
    setNewCompletion("");
    setSaveError(null);
  }

  async function saveUpdate() {
    if (!selectedUpdate || !completionIsValid) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiRequest<ProgressUpdate>(`/projects/${projectId}/progress-updates/${selectedUpdate.id}`, {
        method: "PATCH",
        body: JSON.stringify({ progress_pct: parsedCompletion }),
      });
      setSelectedUpdate(null);
      setNewCompletion("");
      await Promise.all([refreshProgress(), refreshActivities()]);
    } catch (requestError) {
      setSaveError(requestError instanceof Error ? requestError.message : "Unable to update progress");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-md border border-border bg-card p-5"><p className="text-2xl font-bold">{progress.length}</p><p className="text-xs text-muted-foreground">Progress updates</p></div>
        <div className="rounded-md border border-border bg-card p-5"><p className="text-2xl font-bold">{progress.length ? Math.round(progress.reduce((sum, item) => sum + item.progress_pct, 0) / progress.length) : 0}%</p><p className="text-xs text-muted-foreground">Average reported progress</p></div>
        <div className="rounded-md border border-border bg-card p-5"><p className="text-2xl font-bold">{activities.filter((item) => item.status === "Completed").length}</p><p className="text-xs text-muted-foreground">Completed activities</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <section className="rounded-md border border-border bg-card p-5"><h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">Updates by Status</h3>{statusData.length === 0 ? <EmptyState /> : <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80}>{statusData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>}</section>
        <section className="rounded-md border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">Activity Completion</h3>
          {activities.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {activities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenActivity(item.id)}
                  className="w-full rounded-md border border-border bg-background p-3 text-left transition-colors hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{item.code} - {item.name}</span>
                    <span>{item.progress_pct}%</span>
                  </div>
                  <div className="h-2 rounded bg-secondary">
                    <div className="h-full rounded bg-[#1a3a6b]" style={{ width: `${item.progress_pct}%` }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
      <section className="overflow-hidden rounded-md border border-border bg-card">
        <h3 className="border-b border-border px-5 py-4 text-sm font-semibold uppercase tracking-wide">Progress Updates</h3>
        {latest.length === 0 ? <div className="p-5"><EmptyState /></div> : (
          <div className="divide-y divide-border">
            {latest.map((item) => {
              const editable = canEditUpdate(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openUpdate(item)}
                  disabled={!editable}
                  className="group w-full p-4 text-left transition-colors enabled:cursor-pointer enabled:hover:bg-secondary/50 enabled:focus:outline-none enabled:focus:ring-2 enabled:focus:ring-inset enabled:focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-70"
                  aria-label={editable ? `Edit ${item.activities?.name || "progress update"} completion` : undefined}
                >
                  <div className="mb-1 flex items-start justify-between gap-4">
                    <div>
                      <strong className="text-sm">{item.activities?.name || "Progress update"}</strong>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.status} - {item.progress_pct}%</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <time className="text-xs text-muted-foreground">{item.report_date}</time>
                      {editable && <Pencil className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.narrative}</p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={Boolean(selectedUpdate)} onOpenChange={(open) => { if (!open) closeUpdate(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit progress update</DialogTitle>
            <DialogDescription>
              Update the completion percentage for this individual progress record.
            </DialogDescription>
          </DialogHeader>

          {selectedUpdate && (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-secondary/30 p-3">
                <p className="text-sm font-semibold">{selectedUpdate.activities?.name || "Progress update"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{selectedUpdate.report_date} · {selectedUpdate.status}</p>
                <p className="mt-2 text-sm text-muted-foreground">{selectedUpdate.narrative}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current completion</p>
                  <p className="mt-1 text-xl font-bold">{selectedUpdate.progress_pct}%</p>
                </div>
                <label className="rounded-md border border-border p-3 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">New completion</span>
                  <div className="mt-1 flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      required
                      value={newCompletion}
                      onChange={(event) => setNewCompletion(event.target.value)}
                      className="w-full rounded-md border border-border bg-input-background px-2 py-1 text-lg font-bold outline-none focus:ring-2 focus:ring-accent"
                      aria-describedby="completion-help"
                    />
                    <span className="font-semibold">%</span>
                  </div>
                </label>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={completionIsValid ? parsedCompletion : 0}
                onChange={(event) => setNewCompletion(event.target.value)}
                className="w-full"
                aria-label="New completion percentage"
              />
              <p id="completion-help" className={`text-xs ${newCompletion && !completionIsValid ? "text-red-700" : "text-muted-foreground"}`}>
                {newCompletion && !completionIsValid ? "Completion must be a whole number from 0 to 100." : "Enter a whole number from 0 to 100%."}
              </p>
              {saveError && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeUpdate} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={() => void saveUpdate()} disabled={saving || !completionIsValid || parsedCompletion === selectedUpdate?.progress_pct}>
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
