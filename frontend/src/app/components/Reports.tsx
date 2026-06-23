import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, FileText } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { useProjectData } from "../ProjectDataContext";
import { EmptyState } from "./EmptyState";

const colors = ["#1a3a6b", "#0e7490", "#d97706", "#7c3aed", "#c0392b"];

export function Reports() {
  const { projectId, role, financial, challenges, beneficiaries, reports, loading, refresh } = useProjectData();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canReport = role === "supervisor" || role === "admin";
  const expenseData = Array.from(new Set(financial.map((item) => item.expense_category))).map((category) => ({ category, amount: financial.filter((item) => item.expense_category === category).reduce((sum, item) => sum + Number(item.amount), 0) }));
  const challengeData = Array.from(new Set(challenges.map((item) => item.challenge_type))).map((type, index) => ({ type, count: challenges.filter((item) => item.challenge_type === type).length, color: colors[index % colors.length] }));
  const beneficiaryData = Array.from({ length: 12 }, (_, index) => ({ month: new Date(2026, index).toLocaleString("en", { month: "short" }), registered: beneficiaries.filter((item) => new Date(item.created_at).getMonth() === index).length })).filter((item) => item.registered > 0);

  async function generate() {
    setGenerating(true); setError(null);
    try {
      const year = new Date().getFullYear();
      const result = await apiRequest<{ url: string }>(`/projects/${projectId}/reports/generate`, { method: "POST", body: JSON.stringify({ type: "pdf", start_date: `${year}-01-01`, end_date: `${year}-12-31` }) });
      await refresh(); window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to generate report"); }
    finally { setGenerating(false); }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading reports...</p>;
  return <div className="space-y-6">
    {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="rounded-md border border-border bg-card p-5 shadow-sm"><h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">Expenditure by Category (BWP)</h3>{expenseData.length === 0 ? <EmptyState /> : <ResponsiveContainer width="100%" height={240}><BarChart data={expenseData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="category" tick={{ fontSize: 10 }} /><YAxis /><Tooltip formatter={(value) => `BWP ${Number(value).toLocaleString()}`} /><Bar dataKey="amount" fill="#1a3a6b" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>}</section>
    <div className="grid grid-cols-2 gap-4"><section className="rounded-md border border-border bg-card p-5"><h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">Challenges by Type</h3>{challengeData.length === 0 ? <EmptyState /> : <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={challengeData} dataKey="count" nameKey="type" outerRadius={75}>{challengeData.map((item) => <Cell key={item.type} fill={item.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>}</section><section className="rounded-md border border-border bg-card p-5"><h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">Beneficiary Registrations</h3>{beneficiaryData.length === 0 ? <EmptyState /> : <ResponsiveContainer width="100%" height={220}><LineChart data={beneficiaryData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="registered" stroke="#16a34a" strokeWidth={3} /></LineChart></ResponsiveContainer>}</section></div>
    <section className="overflow-hidden rounded-md border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-5 py-4"><h3 className="text-sm font-semibold uppercase tracking-wide">Generated Reports</h3>{canReport && <button onClick={generate} disabled={generating} className="flex items-center gap-2 rounded-md bg-[#1a3a6b] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"><Download className="h-4 w-4" />{generating ? "Generating..." : "Generate annual PDF"}</button>}</div>{reports.length === 0 ? <div className="p-5"><EmptyState message="Generate a report after entering project data." /></div> : <table className="w-full text-sm"><thead className="bg-secondary"><tr>{["Report", "Type", "Generated"].map((item) => <th key={item} className="px-4 py-2 text-left text-xs uppercase">{item}</th>)}</tr></thead><tbody>{reports.map((item) => <tr key={item.id} className="border-t border-border"><td className="flex items-center gap-2 px-4 py-2"><FileText className="h-4 w-4 text-red-500" />{item.name}</td><td className="px-4 py-2 uppercase">{item.report_type}</td><td className="px-4 py-2 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</td></tr>)}</tbody></table>}</section>
  </div>;
}
