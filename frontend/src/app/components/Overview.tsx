import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, ListTodo } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { EmptyState } from "./EmptyState";
import { LoadingScreen } from "./LoadingScreen";

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
  const progress = Math.min(100, Math.max(0, Number(summary.averageProgress) || 0));
  const completionRate = summary.totalActivities > 0
    ? Math.round(completed / summary.totalActivities * 100)
    : 0;
  const reportDate = summary.latestReportingDate
    ? new Date(summary.latestReportingDate)
    : null;
  const reportLabel = reportDate && !Number.isNaN(reportDate.getTime())
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(reportDate)
    : "No reporting date recorded";
  const cards = [
    { label: "Total activities", value: summary.totalActivities, detail: "Activities in scope", icon: ListTodo, color: "text-primary", bg: "bg-primary/10" },
    { label: "Completed", value: completed, detail: `${completionRate}% of all activities`, icon: CheckCircle2, color: "text-chart-3", bg: "bg-chart-3/10" },
    { label: "In progress", value: inProgress, detail: `${summary.notStartedActivities} not started`, icon: Clock, color: "text-accent", bg: "bg-accent/10" },
    { label: "Open challenges", value: unresolved, detail: unresolved ? "Requires attention" : "No unresolved challenges", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", onClick: onViewChallenges },
  ];

  function openActivity(activityId: string) {
    onOpenActivity?.(activityId);
  }

  if (loading) return <LoadingScreen embedded message="Loading project overview…" />;

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
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      <section aria-labelledby="dashboard-heading" className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Project intelligence</p>
          <h2 id="dashboard-heading" className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">Performance at a glance</h2>
          <p className="mt-2 text-sm text-muted-foreground">Monitor delivery, track progress and identify work that needs attention.</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Latest financial reporting date</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{reportLabel}</p>
        </div>
      </section>

      <section aria-label="Key project metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                <span className={`inline-flex shrink-0 rounded-lg p-2 ${card.bg}`}><card.icon aria-hidden="true" className={`h-4 w-4 ${card.color}`} /></span>
              </div>
              <p className="mt-3 text-3xl font-semibold leading-tight tracking-tight tabular-nums text-foreground">{card.value.toLocaleString()}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{card.detail}</p>
                {card.onClick && <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />}
              </div>
            </>
          );
          const classes = "min-w-0 rounded-xl border border-border bg-card p-5 text-left";
          return card.onClick
            ? <button key={card.label} type="button" onClick={card.onClick} className={`${classes} transition-colors hover:border-primary/40 hover:bg-secondary/30 focus-visible:ring-2 focus-visible:ring-ring`}>{content}</button>
            : <div key={card.label} className={classes}>{content}</div>;
        })}
      </section>

      <section aria-label="Delivery overview" className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6 lg:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">Overall delivery</h3>
              <p className="mt-1 text-sm text-muted-foreground">Average recorded activity progress</p>
            </div>
            <p className="text-4xl font-semibold leading-none tracking-tight tabular-nums text-primary">{summary.totalActivities ? `${Math.round(progress)}%` : "—"}</p>
          </div>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Average activity progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.totalActivities ? progress : undefined} aria-valuetext={summary.totalActivities ? `${progress}%` : "No activities recorded"}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${summary.totalActivities ? progress : 0}%` }} />
          </div>
          <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>{completed} completed of {summary.totalActivities} activities</span>
            <span>{summary.totalActivities ? "Based on recorded progress" : "Add activities to start tracking"}</span>
          </div>
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6 lg:col-span-4">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Needs attention</h3>
          <div className="mt-4 divide-y divide-border">
            <div className="flex items-center justify-between gap-3 pb-3 text-sm"><span className="text-muted-foreground">Overdue activities</span><span className="font-semibold tabular-nums text-foreground">{summary.overdueActivities}</span></div>
            <div className="flex items-center justify-between gap-3 pt-3 text-sm"><span className="text-muted-foreground">Unresolved challenges</span><span className="font-semibold tabular-nums text-foreground">{unresolved}</span></div>
          </div>
          {onViewChallenges && <button type="button" onClick={onViewChallenges} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline">Review challenges <ArrowRight aria-hidden="true" className="h-4 w-4" /></button>}
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
