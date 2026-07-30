import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calendar, Download, FileText, Landmark, TrendingDown, TrendingUp } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { useProjectChallenges, useProjectData, useProjectFinancialReports, useProjectReports } from "../ProjectDataContext";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./ui/skeleton";

const colors = ["#1a3a6b", "#0e7490", "#d97706", "#7c3aed", "#c0392b"];

function ReportsSkeleton() {
  return <div className="space-y-6" aria-busy="true">
    <Skeleton className="h-[300px] rounded-md" />
    <div className="grid grid-cols-2 gap-4"><Skeleton className="h-[280px] rounded-md" /><Skeleton className="h-[280px] rounded-md" /></div>
    <section className="rounded-md border border-border bg-card p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><Skeleton className="h-4 w-40" /><Skeleton className="h-9 w-36" /></div><div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-8 w-full" />)}</div></section>
  </div>;
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  budgetUtilizationPct: number;
  latestReportingDate: string | null;
}

export function Reports() {
  const { projectId, role, refresh } = useProjectData();
  const { data: financialReports, loading: financialLoading, error: financialError } = useProjectFinancialReports();
  const { data: challenges, loading: challengesLoading, error: challengesError } = useProjectChallenges();
  const { data: reports, loading: reportsLoading, error: reportsError, refresh: refreshReports } = useProjectReports();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = financialLoading || challengesLoading || reportsLoading || summaryLoading;
  const loadError = financialError || challengesError || reportsError || summaryError;
  const canReport = role === "supervisor" || role === "admin" || role === "finance";
  const reportSeries = useMemo(() => [...financialReports].sort((left, right) => new Date(left.reporting_date).getTime() - new Date(right.reporting_date).getTime()), [financialReports]);
  const currentBudget = summary?.totalBudget ?? 0;
  const latestReport = reportSeries.length ? reportSeries[reportSeries.length - 1] : null;
  const latestSpent = summary?.totalSpent ?? (latestReport ? Number(latestReport.cumulative_expenditure ?? 0) : 0);
  const remainingBudget = summary?.remainingBudget ?? Math.max(currentBudget - latestSpent, 0);
  const budgetUtilizationPct = summary?.budgetUtilizationPct ?? (currentBudget > 0 ? Math.round((latestSpent / currentBudget) * 100) : 0);

  useEffect(() => {
    let active = true;
    setSummaryLoading(true);
    setSummaryError(null);
    apiRequest<BudgetSummary>(`/projects/${projectId}/summary`)
      .then((payload) => {
        if (active) setSummary(payload);
      })
      .catch((loadError) => {
        if (!active) return;
        setSummary(null);
        setSummaryError(loadError instanceof Error ? loadError.message : "Unable to load budget summary");
      })
      .finally(() => {
        if (active) setSummaryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);
  const challengeData = Array.from(new Set(challenges.map((item) => item.challenge_type))).map((type, index) => ({ type, count: challenges.filter((item) => item.challenge_type === type).length, color: colors[index % colors.length] }));

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const year = new Date().getFullYear();
      const result = await apiRequest<{ url: string }>(`/projects/${projectId}/reports/generate`, { method: "POST", body: JSON.stringify({ type: "pdf", start_date: `${year}-01-01`, end_date: `${year}-12-31` }) });
      await Promise.all([refresh(), refreshReports()]);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate report");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <ReportsSkeleton />;
  return <div className="space-y-6">
    {(error || loadError) && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error || loadError}</p>}
    {summary && <p className="sr-only">Latest reporting date {summary.latestReportingDate || "not recorded"}</p>}
    <section className="rounded-md border border-border bg-card p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-md border border-border bg-secondary/40 p-4 shadow-sm">
          <div className="mb-3 inline-flex rounded-md bg-white p-2 text-slate-700"><Landmark className="h-5 w-5" /></div>
          <p className="text-2xl font-bold">{currentBudget.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Current budget</p>
        </div>
        <div className="rounded-md border border-border bg-secondary/40 p-4 shadow-sm">
          <div className="mb-3 inline-flex rounded-md bg-white p-2 text-slate-700"><TrendingUp className="h-5 w-5" /></div>
          <p className="text-2xl font-bold">{latestSpent.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Spent as of latest report</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{latestReport ? new Date(latestReport.reporting_date).toLocaleDateString() : "No reports yet"}</p>
        </div>
        <div className="rounded-md border border-border bg-secondary/40 p-4 shadow-sm">
          <div className="mb-3 inline-flex rounded-md bg-white p-2 text-slate-700"><TrendingDown className="h-5 w-5" /></div>
          <p className="text-2xl font-bold">{remainingBudget.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Remaining budget</p>
        </div>
        <div className="rounded-md border border-border bg-secondary/40 p-4 shadow-sm">
          <div className="mb-3 inline-flex rounded-md bg-white p-2 text-slate-700"><Calendar className="h-5 w-5" /></div>
          <p className="text-2xl font-bold">{budgetUtilizationPct}%</p>
          <p className="text-xs text-muted-foreground">Budget used</p>
        </div>
      </div>
      <div className="mt-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">Expenditure Over Time</h3>
        {reportSeries.length === 0 ? <EmptyState message="Add a financial report to begin tracking expenditure over time." /> : <ResponsiveContainer width="100%" height={260}><AreaChart data={reportSeries}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="reporting_date" tick={{ fontSize: 10 }} /><YAxis /><Tooltip formatter={(value) => `BWP ${Number(value).toLocaleString()}`} labelFormatter={(label) => `Reporting date: ${label}`} /><Area type="monotone" dataKey="cumulative_expenditure" stroke="#1a3a6b" fill="#bfdbfe" strokeWidth={2} /></AreaChart></ResponsiveContainer>}
      </div>
    </section>
    <div className="grid grid-cols-2 gap-4">
      <section className="rounded-md border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">Challenges by Type</h3>
        {challengeData.length === 0 ? <EmptyState /> : <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={challengeData} dataKey="count" nameKey="type" outerRadius={75}>{challengeData.map((item) => <Cell key={item.type} fill={item.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>}
      </section>
      <section className="rounded-md border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide">Financial Reporting History</h3>
          {canReport && <button onClick={generate} disabled={generating} className="flex items-center gap-2 rounded-md bg-[#1a3a6b] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"><Download className="h-4 w-4" />{generating ? "Generating..." : "Generate annual PDF"}</button>}
        </div>
        {financialReports.length === 0 ? <EmptyState message="Add a financial report to keep the expenditure trend current." /> : <table className="w-full text-sm"><thead className="bg-secondary"><tr>{["Reporting date", "Cumulative spend", "Notes", "Created"].map((item) => <th key={item} className="px-4 py-2 text-left text-xs uppercase">{item}</th>)}</tr></thead><tbody>{financialReports.map((item) => <tr key={item.id} className="border-t border-border"><td className="px-4 py-2 font-medium">{new Date(item.reporting_date).toLocaleDateString()}</td><td className="px-4 py-2">BWP {Number(item.cumulative_expenditure).toLocaleString()}</td><td className="px-4 py-2 text-xs text-muted-foreground">{item.notes || "No notes"}</td><td className="px-4 py-2 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</td></tr>)}</tbody></table>}
      </section>
    </div>
    <section className="rounded-md border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide">Generated Reports</h3>
        {canReport && <button onClick={generate} disabled={generating} className="flex items-center gap-2 rounded-md bg-[#1a3a6b] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"><Download className="h-4 w-4" />{generating ? "Generating..." : "Generate annual PDF"}</button>}
      </div>
      {reports.length === 0 ? <EmptyState message="Generate a report after entering project data." /> : <table className="w-full text-sm"><thead className="bg-secondary"><tr>{["Report", "Type", "Generated"].map((item) => <th key={item} className="px-4 py-2 text-left text-xs uppercase">{item}</th>)}</tr></thead><tbody>{reports.map((item) => <tr key={item.id} className="border-t border-border"><td className="flex items-center gap-2 px-4 py-2"><FileText className="h-4 w-4 text-red-500" />{item.name}</td><td className="px-4 py-2 uppercase">{item.report_type}</td><td className="px-4 py-2 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</td></tr>)}</tbody></table>}
    </section>
  </div>;
}
