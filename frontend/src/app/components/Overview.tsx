import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, ListTodo, Users } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./ui/skeleton";

const badge: Record<string, string> = { Completed: "bg-green-100 text-green-800", "In Progress": "bg-cyan-100 text-cyan-800", "Not Started": "bg-slate-100 text-slate-700", "On Hold": "bg-amber-100 text-amber-800" };

interface ProjectSummary {
  totalActivities: number;
  completedActivities: number;
  inProgressActivities: number;
  notStartedActivities: number;
  overdueActivities: number;
  unresolvedChallenges: number;
  totalBeneficiaries: number;
  totalBudget: number;
  totalSpent: number;
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
  totalBeneficiaries: 0,
  totalBudget: 0,
  totalSpent: 0,
  averageProgress: 0,
  activityStatusSummary: [],
  recentActivities: [],
  recentProgressUpdates: [],
  monthlyProgressSummary: [],
};

function OverviewSkeleton() {
  return <div className="space-y-6" aria-busy="true">
    <div className="grid grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="rounded-md border border-border bg-card p-4 shadow-sm"><Skeleton className="mb-3 h-9 w-9" /><Skeleton className="h-8 w-16" /><Skeleton className="mt-2 h-3 w-24" /></div>)}</div>
    <Skeleton className="h-24 rounded-md" />
    <div className="grid grid-cols-2 gap-4"><Skeleton className="h-[294px] rounded-md" /><Skeleton className="h-[294px] rounded-md" /></div>
    <section className="rounded-md border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4"><Skeleton className="h-4 w-40" /></div>
      <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-8 w-full" />)}</div>
    </section>
  </div>;
}

export function Overview({ projectId, onViewChallenges }: { projectId: string; onViewChallenges?: () => void }) {
  const [summary, setSummary] = useState<ProjectSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [projectId]);

  const completed = summary.completedActivities;
  const inProgress = summary.inProgressActivities;
  const unresolved = summary.unresolvedChallenges;
  const statusData = summary.activityStatusSummary;
  const monthlyData = summary.monthlyProgressSummary;
  const cards = [
    { label: "Activities", value: summary.totalActivities, icon: ListTodo, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Completed", value: completed, icon: CheckCircle2, color: "text-green-700", bg: "bg-green-50" },
    { label: "In Progress", value: inProgress, icon: Clock, color: "text-cyan-700", bg: "bg-cyan-50" },
    { label: "Open Challenges", value: unresolved, icon: AlertTriangle, color: "text-red-700", bg: "bg-red-50", onClick: onViewChallenges },
    { label: "Beneficiaries", value: summary.totalBeneficiaries, icon: Users, color: "text-violet-700", bg: "bg-violet-50" },
  ];

  if (loading) return <OverviewSkeleton />;
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
    <section className="overflow-hidden rounded-md border border-border bg-card shadow-sm"><h3 className="border-b border-border px-5 py-4 text-sm font-semibold uppercase tracking-wide">Recent Activities</h3>{summary.recentActivities.length === 0 ? <div className="p-5"><EmptyState /></div> : <table className="w-full text-sm"><thead className="bg-secondary"><tr>{["Code", "Activity", "District", "Status", "Progress"].map((item) => <th key={item} className="px-4 py-2 text-left text-xs uppercase">{item}</th>)}</tr></thead><tbody>{summary.recentActivities.map((item) => <tr key={item.id} className="border-t border-border"><td className="px-4 py-2 font-mono text-xs">{item.code}</td><td className="px-4 py-2">{item.name}</td><td className="px-4 py-2 text-muted-foreground">{item.district}</td><td className="px-4 py-2"><span className={`rounded px-2 py-1 text-xs ${badge[item.status] || "bg-slate-100"}`}>{item.status}</span></td><td className="px-4 py-2">{item.progress_pct}%</td></tr>)}</tbody></table>}</section>
  </div>;
}
