import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, ListTodo } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./ui/skeleton";

const badge: Record<string, string> = {
  Completed: "border border-chart-3/30 bg-chart-3/10 text-foreground",
  "In Progress": "border border-accent/30 bg-accent/10 text-foreground",
  "Not Started": "border border-border bg-secondary text-foreground",
  "On Hold": "border border-chart-4/30 bg-chart-4/10 text-foreground",
};

interface ProjectSummary {
  totalActivities: number;
  completedActivities: number;
  inProgressActivities: number;
  notStartedActivities: number;
  overdueActivities: number;
  unresolvedChallenges: number;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  budgetUtilizationPct: number;
  latestReportingDate: string | null;
  averageProgress: number;
  activityStatusSummary: Array<{ status: string; count: number }>;
  recentActivities: Array<{ id: string; code: string; name: string; district: string; status: string; progress_pct: number; created_at: string }>;
  recentProgressUpdates: Array<{ id: string; title: string | null; narrative: string | null; progress_pct: number; report_date: string | null; created_at: string | null }>;
  monthlyProgressSummary: Array<{ month: string; updates: number; average: number }>;
}

const emptySummary: ProjectSummary = {
  totalActivities: 0,
  completedActivities: 0,
  inProgressActivities: 0,
  notStartedActivities: 0,
  overdueActivities: 0,
  unresolvedChallenges: 0,
  totalBudget: 0,
  totalSpent: 0,
  remainingBudget: 0,
  budgetUtilizationPct: 0,
  latestReportingDate: null,
  averageProgress: 0,
  activityStatusSummary: [],
  recentActivities: [],
  recentProgressUpdates: [],
  monthlyProgressSummary: [],
};

interface OverviewProps {
  projectId: string;
  onViewChallenges?: () => void;
  onOpenActivity?: (activityId: string) => void;
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 5 }).map((_, index) => <div key={index} className="rounded-md border border-border bg-card p-4 shadow-sm"><Skeleton className="mb-3 h-9 w-9" /><Skeleton className="h-8 w-16" /><Skeleton className="mt-2 h-3 w-24" /></div>)}
      </div>
      <Skeleton className="h-24 rounded-md" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><Skeleton className="h-[294px] rounded-md" /><Skeleton className="h-[294px] rounded-md" /></div>
      <section className="rounded-md border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4"><Skeleton className="h-4 w-40" /></div>
        <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-8 w-full" />)}</div>
      </section>
    </div>
  );
}

export function Overview({ projectId, onViewChallenges, onOpenActivity }: OverviewProps) {
  const [summary, setSummary] = useState<ProjectSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiRequest<ProjectSummary>(`/projects/${projectId}/summary`)
      .then((payload) => { if (active) setSummary({ ...emptySummary, ...payload }); })
      .catch((loadError) => {
        if (!active) return;
        setSummary(emptySummary);
        setError(loadError instanceof Error ? loadError.message : "Unable to load project summary");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, retryKey]);

  const completed = summary.completedActivities;
  const inProgress = summary.inProgressActivities;
  const unresolved = summary.unresolvedChallenges;
  const statusData = summary.activityStatusSummary;
  const monthlyData = summary.monthlyProgressSummary;
  const cards = [
    { label: "Activities", value: summary.totalActivities, icon: ListTodo, color: "text-primary", bg: "bg-primary/10" },
    { label: "Completed", value: completed, icon: CheckCircle2, color: "text-chart-3", bg: "bg-chart-3/10" },
    { label: "In Progress", value: inProgress, icon: Clock, color: "text-accent", bg: "bg-accent/10" },
    { label: "Open Challenges", value: unresolved, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", onClick: onViewChallenges },
  ];

  function openActivity(activityId: string) {
    onOpenActivity?.(activityId);
  }

  if (loading) return <OverviewSkeleton />;

  if (error) {
    return (
      <section role="alert" className="rounded-lg border border-destructive/30 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Unable to load project dashboard</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => setRetryKey((value) => value + 1)}
          className="mt-4 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try again
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold tracking-tight text-foreground">Performance snapshot</h2><p className="mt-1 text-sm text-muted-foreground">Key metrics and recent activity for your selected project.</p></div><span className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">Project overview</span></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const content = (
            <>
              <div className={`mb-3 inline-flex rounded-md p-2 ${card.bg}`}><card.icon className={`h-5 w-5 ${card.color}`} /></div>
              <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </>
          );
          return card.onClick
            ? <button key={card.label} type="button" onClick={card.onClick} className="rounded-lg border border-border bg-card p-5 text-left shadow-sm transition-colors hover:border-accent/40 hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring">{content}</button>
            : <div key={card.label} className="rounded-lg border border-border bg-card p-5 shadow-sm">{content}</div>;
        })}
      </div>
      <section className="rounded-md border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide">Current Challenges</h3>
            <p className="mt-1 text-xs text-muted-foreground">{unresolved} unresolved challenge{unresolved === 1 ? "" : "s"} need attention.</p>
          </div>
          <button type="button" onClick={onViewChallenges} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary">
            View challenges <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-md border border-border bg-card p-5 shadow-sm"><h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">Activities by Status</h3>{statusData.length === 0 ? <EmptyState /> : <ResponsiveContainer width="100%" height={230}><BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="status" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="var(--chart-1)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>}</section>
        <section className="rounded-md border border-border bg-card p-5 shadow-sm"><h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">Progress Updates by Month</h3>{monthlyData.length === 0 ? <EmptyState /> : <ResponsiveContainer width="100%" height={230}><BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="month" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="average" name="Average progress %" fill="var(--chart-2)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>}</section>
      </div>
      <section className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
        <h3 className="border-b border-border px-5 py-4 text-sm font-semibold uppercase tracking-wide">Recent Activities</h3>
        {summary.recentActivities.length === 0 ? (
          <div className="p-5"><EmptyState message="No recent activities for this project." /></div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-sm">
            <thead className="bg-secondary">
              <tr>{["Code", "Activity", "District", "Status", "Progress"].map((item) => <th key={item} className="px-4 py-2 text-left text-xs uppercase">{item}</th>)}</tr>
            </thead>
            <tbody>
              {summary.recentActivities.map((item) => (
                <tr
                  key={item.id}
                  role={onOpenActivity ? "link" : undefined}
                  tabIndex={onOpenActivity ? 0 : undefined}
                  onClick={() => openActivity(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openActivity(item.id);
                    }
                  }}
                  className={`border-t border-border transition-colors ${onOpenActivity ? "cursor-pointer hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-ring/40" : ""}`}
                >
                  <td className="px-4 py-2 font-mono text-xs">{item.code}</td>
                  <td className="px-4 py-2">{item.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{item.district}</td>
                  <td className="px-4 py-2"><span className={`rounded px-2 py-1 text-xs ${badge[item.status] || "border border-border bg-secondary text-foreground"}`}>{item.status}</span></td>
                  <td className="px-4 py-2">{item.progress_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </div>
  );
}
