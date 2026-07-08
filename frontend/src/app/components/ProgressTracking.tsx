import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useProjectActivities, useProjectProgressUpdates } from "../ProjectDataContext";
import { EmptyState } from "./EmptyState";

const colors = ["#1a3a6b", "#0e7490", "#16a34a", "#d97706", "#c0392b"];

export function ProgressTracking() {
  const { data: activities, loading: activitiesLoading, error: activitiesError } = useProjectActivities();
  const { data: progress, loading: progressLoading, error: progressError } = useProjectProgressUpdates();
  const loading = activitiesLoading || progressLoading;
  const error = activitiesError || progressError;
  if (loading) return <p className="text-sm text-muted-foreground">Loading progress...</p>;
  if (error) return <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  const statusData = Array.from(new Set(progress.map((item) => item.status))).map((status, index) => ({ name: status, value: progress.filter((item) => item.status === status).length, color: colors[index % colors.length] }));
  const latest = [...progress].sort((a, b) => b.report_date.localeCompare(a.report_date));
  return <div className="space-y-5">
    <div className="grid grid-cols-3 gap-4"><div className="rounded-md border border-border bg-card p-5"><p className="text-2xl font-bold">{progress.length}</p><p className="text-xs text-muted-foreground">Progress updates</p></div><div className="rounded-md border border-border bg-card p-5"><p className="text-2xl font-bold">{progress.length ? Math.round(progress.reduce((sum, item) => sum + item.progress_pct, 0) / progress.length) : 0}%</p><p className="text-xs text-muted-foreground">Average reported progress</p></div><div className="rounded-md border border-border bg-card p-5"><p className="text-2xl font-bold">{activities.filter((item) => item.status === "Completed").length}</p><p className="text-xs text-muted-foreground">Completed activities</p></div></div>
    <div className="grid grid-cols-2 gap-4"><section className="rounded-md border border-border bg-card p-5"><h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">Updates by Status</h3>{statusData.length === 0 ? <EmptyState /> : <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80}>{statusData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>}</section><section className="rounded-md border border-border bg-card p-5"><h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">Activity Completion</h3>{activities.length === 0 ? <EmptyState /> : <div className="space-y-4">{activities.map((item) => <div key={item.id}><div className="mb-1 flex justify-between text-xs"><span>{item.code} · {item.name}</span><span>{item.progress_pct}%</span></div><div className="h-2 rounded bg-secondary"><div className="h-full rounded bg-[#1a3a6b]" style={{ width: `${item.progress_pct}%` }} /></div></div>)}</div>}</section></div>
    <section className="overflow-hidden rounded-md border border-border bg-card"><h3 className="border-b border-border px-5 py-4 text-sm font-semibold uppercase tracking-wide">Latest Progress Narratives</h3>{latest.length === 0 ? <div className="p-5"><EmptyState /></div> : <div className="divide-y divide-border">{latest.slice(0, 8).map((item) => <article key={item.id} className="p-4"><div className="mb-1 flex justify-between"><strong className="text-sm">{item.status} · {item.progress_pct}%</strong><time className="text-xs text-muted-foreground">{item.report_date}</time></div><p className="text-sm text-muted-foreground">{item.narrative}</p></article>)}</div>}</section>
  </div>;
}
