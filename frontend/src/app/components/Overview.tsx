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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section aria-labelledby="monthly-progress-heading" className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6 lg:col-span-8">
          <div className="mb-6">
            <h3 id="monthly-progress-heading" className="text-lg font-semibold tracking-tight text-foreground">Progress by reporting month</h3>
            <p className="mt-1 text-sm text-muted-foreground">Average reported progress (%) · grouped by calendar month across available history</p>
          </div>
          {monthlyData.length === 0 ? <EmptyState message="No progress updates are available for this view." /> : (
            <>
              <div aria-hidden="true" className="min-w-0">
                <ResponsiveContainer width="100%" height={256}>
                  <BarChart data={monthlyData} margin={{ top: 8, right: 8, bottom: 4, left: -14 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.35 }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)" }} labelStyle={{ color: "var(--popover-foreground)" }} itemStyle={{ color: "var(--popover-foreground)" }} formatter={(value) => [`${value}%`, "Average progress"]} />
                    <Bar dataKey="average" name="Average progress" fill="var(--chart-1)" radius={[5, 5, 0, 0]} maxBarSize={42} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <details className="mt-4 border-t border-border pt-3">
                <summary className="cursor-pointer text-sm font-medium text-primary">View chart data</summary>
                <table className="mt-3 w-full text-sm">
                  <caption className="sr-only">Average progress and number of updates by calendar month</caption>
                  <thead><tr className="text-muted-foreground"><th scope="col" className="py-2 text-left">Month</th><th scope="col" className="py-2 text-right">Updates</th><th scope="col" className="py-2 text-right">Average</th></tr></thead>
                  <tbody>{monthlyData.map((row) => <tr key={row.month} className="border-t border-border"><td className="py-2">{row.month}</td><td className="py-2 text-right tabular-nums">{row.updates}</td><td className="py-2 text-right tabular-nums">{row.average}%</td></tr>)}</tbody>
                </table>
              </details>
            </>
          )}
        </section>

        <section aria-labelledby="activity-status-heading" className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6 lg:col-span-4">
          <h3 id="activity-status-heading" className="text-lg font-semibold tracking-tight text-foreground">Activity breakdown</h3>
          <p className="mt-1 text-sm text-muted-foreground">Distribution by current status</p>
          {statusData.length === 0 ? <div className="mt-6"><EmptyState message="No activities to summarize." /></div> : (
            <ul className="mt-6 space-y-5">
              {[...statusData].sort((left, right) => right.count - left.count).map((row) => {
                const share = summary.totalActivities ? Math.min(100, Math.max(0, row.count / summary.totalActivities * 100)) : 0;
                const color = row.status === "Completed" ? "var(--chart-3)" : row.status === "In Progress" ? "var(--chart-1)" : row.status === "On Hold" ? "var(--chart-4)" : "var(--muted-foreground)";
                return (
                  <li key={row.status}>
                    <div className="mb-2 flex items-start justify-between gap-3 text-sm">
                      <span className="min-w-0 break-words font-medium text-foreground">{row.status}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{row.count} · {Math.round(share)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: color }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="recent-activities-heading" className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
          <div>
            <h3 id="recent-activities-heading" className="text-lg font-semibold tracking-tight text-foreground">Recent activities</h3>
            <p className="mt-1 text-sm text-muted-foreground">Latest recorded activities and their current progress</p>
          </div>
          <span className="rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">{summary.recentActivities.length} shown</span>
        </div>
        {summary.recentActivities.length === 0 ? (
          <div className="p-5"><EmptyState message="No recent activities for this project." /></div>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Recent activities table">
            <table className="w-full min-w-[650px] text-sm">
              <caption className="sr-only">Recent activities, status and completion progress</caption>
              <thead className="bg-secondary/40 text-muted-foreground">
                <tr>{["Activity", "District", "Status", "Progress"].map((item) => <th key={item} scope="col" className="px-5 py-3 text-left text-xs font-semibold">{item}</th>)}</tr>
              </thead>
              <tbody>
                {summary.recentActivities.map((item) => (
                  <tr key={item.id} className="border-t border-border transition-colors hover:bg-secondary/20">
                    <td className="px-5 py-3">
                      {onOpenActivity ? <button type="button" onClick={() => openActivity(item.id)} className="inline-flex min-h-11 items-center gap-2 text-left text-sm font-semibold text-primary hover:underline">{item.name}<ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /></button> : <p className="font-medium text-foreground">{item.name}</p>}
                      <p className="text-xs text-muted-foreground">{item.code || "No activity code"}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{item.district || "—"}</td>
                    <td className="px-5 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${badge[item.status] || "border border-border bg-secondary text-foreground"}`}>{item.status || "Unspecified"}</span></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, Number(item.progress_pct) || 0))}%` }} /></div>
                        <span className="tabular-nums font-medium text-foreground">{item.progress_pct}%</span>
                      </div>
                    </td>
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
