import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, ListTodo, Users } from "lucide-react";
import { useProjectData } from "../ProjectDataContext";
import { EmptyState } from "./EmptyState";

const badge: Record<string, string> = { Completed: "bg-green-100 text-green-800", "In Progress": "bg-cyan-100 text-cyan-800", "Not Started": "bg-slate-100 text-slate-700", "On Hold": "bg-amber-100 text-amber-800" };

export function Overview({ onViewChallenges }: { onViewChallenges?: () => void }) {
  const { activities, progress, challenges, beneficiaries, loading, error } = useProjectData();
  const completed = activities.filter((item) => item.status.toLowerCase() === "completed").length;
  const inProgress = activities.filter((item) => item.status.toLowerCase() === "in progress").length;
  const currentChallenges = challenges.filter((item) => !item.resolved);
  const unresolved = currentChallenges.length;
  const statusData = Array.from(new Set(activities.map((item) => item.status))).map((status) => ({ status, count: activities.filter((item) => item.status === status).length }));
  const monthlyData = Array.from({ length: 12 }, (_, index) => {
    const rows = progress.filter((item) => new Date(item.report_date).getMonth() === index);
    return { month: new Date(2026, index).toLocaleString("en", { month: "short" }), updates: rows.length, average: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.progress_pct, 0) / rows.length) : 0 };
  }).filter((item) => item.updates > 0);
  const cards = [
    { label: "Activities", value: activities.length, icon: ListTodo, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Completed", value: completed, icon: CheckCircle2, color: "text-green-700", bg: "bg-green-50" },
    { label: "In Progress", value: inProgress, icon: Clock, color: "text-cyan-700", bg: "bg-cyan-50" },
    { label: "Open Challenges", value: unresolved, icon: AlertTriangle, color: "text-red-700", bg: "bg-red-50", onClick: onViewChallenges },
    { label: "Beneficiaries", value: beneficiaries.length, icon: Users, color: "text-violet-700", bg: "bg-violet-50" },
  ];

  if (loading) return <p className="text-sm text-muted-foreground">Loading project metrics...</p>;
  return <div className="space-y-6">
    {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid grid-cols-5 gap-4">{cards.map((card) => {
      const content = <><div className={`mb-3 inline-flex rounded-md p-2 ${card.bg}`}><card.icon className={`h-5 w-5 ${card.color}`} /></div><p className="text-2xl font-bold">{card.value}</p><p className="text-xs text-muted-foreground">{card.label}</p></>;
      return card.onClick ? <button key={card.label} type="button" onClick={card.onClick} className="rounded-md border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-secondary/60 focus:outline-none focus:ring-2 focus:ring-ring/40">{content}</button> : <div key={card.label} className="rounded-md border border-border bg-card p-4 shadow-sm">{content}</div>;
    })}</div>
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
    <div className="grid grid-cols-2 gap-4">
      <section className="rounded-md border border-border bg-card p-5 shadow-sm"><h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">Activities by Status</h3>{statusData.length === 0 ? <EmptyState /> : <ResponsiveContainer width="100%" height={230}><BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="status" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#1a3a6b" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>}</section>
      <section className="rounded-md border border-border bg-card p-5 shadow-sm"><h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">Progress Updates by Month</h3>{monthlyData.length === 0 ? <EmptyState /> : <ResponsiveContainer width="100%" height={230}><BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="month" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="average" name="Average progress %" fill="#0e7490" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>}</section>
    </div>
    <section className="overflow-hidden rounded-md border border-border bg-card shadow-sm"><h3 className="border-b border-border px-5 py-4 text-sm font-semibold uppercase tracking-wide">Recent Activities</h3>{activities.length === 0 ? <div className="p-5"><EmptyState /></div> : <table className="w-full text-sm"><thead className="bg-secondary"><tr>{["Code", "Activity", "District", "Status", "Progress"].map((item) => <th key={item} className="px-4 py-2 text-left text-xs uppercase">{item}</th>)}</tr></thead><tbody>{[...activities].slice(0, 6).map((item) => <tr key={item.id} className="border-t border-border"><td className="px-4 py-2 font-mono text-xs">{item.code}</td><td className="px-4 py-2">{item.name}</td><td className="px-4 py-2 text-muted-foreground">{item.district}</td><td className="px-4 py-2"><span className={`rounded px-2 py-1 text-xs ${badge[item.status] || "bg-slate-100"}`}>{item.status}</span></td><td className="px-4 py-2">{item.progress_pct}%</td></tr>)}</tbody></table>}</section>
  </div>;
}
