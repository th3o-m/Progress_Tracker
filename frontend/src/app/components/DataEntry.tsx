import { useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { useProjectActivities, useProjectData, useProjectFinancialReports, useProjectMembers, type FinancialReport } from "../ProjectDataContext";
import { EmptyState } from "./EmptyState";
import { ImportSpreadsheet } from "./ImportSpreadsheet";
import { Skeleton } from "./ui/skeleton";
import type { ProjectMembership } from "./ProjectSwitcher";

type Tab = "activity" | "progress" | "challenge" | "financial" | "import";
const today = new Date().toISOString().slice(0, 10);
const blank = {
  activityId: "",
  code: "",
  name: "",
  category: "",
  district: "",
  responsibleOfficer: "",
  startDate: today,
  endDate: today,
  status: "",
  progressPct: "0",
  narrative: "",
  reportDate: today,
  challengeType: "",
  challengeDesc: "",
  mitigationPlan: "",
  amount: "",
  expenseCategory: "",
  description: "",
  reportingDate: today,
  amountSpent: "",
  financialNotes: "",
};

function EntryFormSkeleton() {
  return <div className="space-y-5 p-6" aria-busy="true">
    <div className="grid grid-cols-2 gap-4">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-10 w-full" /></div>)}</div>
    <div className="flex justify-end gap-3"><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-28" /></div>
  </div>;
}

export function DataEntry({ memberships = [] }: { memberships?: ProjectMembership[] }) {
  const { projectId, role, refresh } = useProjectData();
  const canCreateActivity = role === "admin" || role === "supervisor";
  const canCreateFinancialReport = role === "admin" || role === "supervisor" || role === "finance";
  const [tab, setTab] = useState<Tab>(canCreateFinancialReport && role === "finance" ? "financial" : canCreateActivity ? "activity" : "progress");
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: activities, loading: activitiesLoading, error: activitiesError, refresh: refreshActivities } = useProjectActivities(tab !== "import");
  const { data: members, loading: membersLoading, error: membersError, refresh: refreshMembers } = useProjectMembers(tab === "activity" && canCreateActivity);
  const { data: financialReports, loading: financialLoading, error: financialError, refresh: refreshFinancialReports } = useProjectFinancialReports(tab === "financial");
  const selectedProject = memberships.find((membership) => membership.projects.id === projectId)?.projects;
  const projectBudget = Number(selectedProject?.allocated_budget ?? selectedProject?.estimated_budget ?? 0);
  const latestReport = [...financialReports].sort((left, right) => `${right.reporting_date}${right.created_at}`.localeCompare(`${left.reporting_date}${left.created_at}`))[0];
  const previousTotalSpend = Number(latestReport?.cumulative_expenditure ?? 0);
  const amountSpent = Number(form.amountSpent || 0);
  const totalSpentToDate = previousTotalSpend + amountSpent;
  const remainingBudget = Math.max(projectBudget - totalSpentToDate, 0);
  const budgetUtilization = projectBudget > 0 ? (totalSpentToDate / projectBudget) * 100 : 0;
  const tabs = useMemo(() => [
    ...(canCreateActivity ? [{ id: "activity" as Tab, label: "New Activity" }] : []),
    ...(role !== "finance" ? [{ id: "progress" as Tab, label: "Activity Progress" }, { id: "challenge" as Tab, label: "Challenge" }] : []),
    ...(canCreateFinancialReport ? [{ id: "financial" as Tab, label: "Financial Report" }] : []),
    ...(canCreateActivity ? [{ id: "import" as Tab, label: "Import Spreadsheet" }] : []),
  ], [canCreateActivity, canCreateFinancialReport, role]);
  const requiresActivities = tab === "progress" || tab === "challenge";

  const set = (key: keyof typeof blank, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError(null); setMessage(null);
    const base = `/projects/${projectId}`;
    let path = ""; let body: Record<string, unknown> = {};
    if (tab === "activity") {
      path = `${base}/activities`; body = { code: form.code || null, name: form.name, category: form.category, district: form.district, responsible_officer: form.responsibleOfficer || null, start_date: form.startDate, end_date: form.endDate, status: form.status, progress_pct: Number(form.progressPct) };
    } else if (tab === "progress") {
      path = `${base}/progress-updates`; body = { activity_id: form.activityId, progress_pct: Number(form.progressPct), status: form.status, narrative: form.narrative, report_date: form.reportDate };
    } else if (tab === "challenge") {
      path = `${base}/challenges`; body = { activity_id: form.activityId, challenge_type: form.challengeType, description: form.challengeDesc, mitigation_plan: form.mitigationPlan || null, resolved: false };
    } else {
      path = `${base}/financial-reports`; body = { reporting_date: form.reportingDate, amount_spent: Number(form.amountSpent), notes: form.financialNotes || null };
    }
    try {
      await apiRequest(path, { method: "POST", body: JSON.stringify(body) });
      setMessage("Entry saved. Dashboard metrics have been refreshed.");
      setForm(blank);
      await Promise.all([refresh(), refreshActivities(), refreshFinancialReports(), canCreateActivity ? refreshMembers() : Promise.resolve()]);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to save entry"); }
    finally { setSubmitting(false); }
  }

  const input = "mt-1 w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent";
  const activitySelect = (
    <label className="block text-sm">Activity *
      <select required value={form.activityId} onChange={(event) => set("activityId", event.target.value)} className={input}>
        <option value="">Select activity...</option>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.code} — {activity.name}</option>)}
      </select>
    </label>
  );

  return <div className="space-y-5">
    <div className="rounded-md bg-[#1a3a6b] p-5 text-white"><p className="text-sm text-white/80">Entries are saved to the selected project and immediately update its metrics.</p></div>
    {message && <div className="flex gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-green-800"><CheckCircle2 className="h-5 w-5" />{message}</div>}
    {(error || activitiesError || membersError || financialError) && <div className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-800"><AlertCircle className="h-5 w-5" />{error || activitiesError || membersError || financialError}</div>}
    <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
      <div className="flex flex-wrap border-b border-border">{tabs.map((item) => <button key={item.id} type="button" onClick={() => { setTab(item.id); setError(null); setMessage(null); }} className={`px-5 py-3 text-sm font-semibold ${tab === item.id ? "bg-[#1a3a6b] text-white" : "text-muted-foreground hover:bg-secondary"}`}>{item.label}</button>)}</div>
      {tab === "import" ? (
        <div className="p-6"><ImportSpreadsheet memberships={memberships} /></div>
      ) : (activitiesLoading && requiresActivities || (tab === "activity" && canCreateActivity && membersLoading)) ? (
        <EntryFormSkeleton />
      ) : requiresActivities && activities.length === 0 ? (
        <div className="p-6"><EmptyState message="Create an activity before entering activity-linked data." /></div>
      ) : tab === "financial" && financialLoading ? <EntryFormSkeleton /> : (
      <form onSubmit={submit} className="space-y-5 p-6">
        {tab === "activity" && <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">Code (optional)<input value={form.code} onChange={(e) => set("code", e.target.value)} className={input} /></label>
          <label className="text-sm">Name *<input required value={form.name} onChange={(e) => set("name", e.target.value)} className={input} /></label>
          <label className="text-sm">Category *<input required value={form.category} onChange={(e) => set("category", e.target.value)} className={input} /></label>
          <label className="text-sm">District *<input required value={form.district} onChange={(e) => set("district", e.target.value)} className={input} /></label>
          <label className="text-sm">Responsible officer (optional)<select value={form.responsibleOfficer} onChange={(e) => set("responsibleOfficer", e.target.value)} className={input}><option value="">Select officer...</option>{members.filter((m) => m.role === "officer" && m.profiles?.active).map((m) => <option key={m.id} value={m.profiles!.id}>{m.profiles!.full_name}</option>)}</select></label>
          <label className="text-sm">Status *<select required value={form.status} onChange={(e) => set("status", e.target.value)} className={input}><option value="">Select...</option><option>Not Started</option><option>In Progress</option><option>Completed</option><option>On Hold</option></select></label>
          <label className="text-sm">Start date *<input type="date" required value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={input} /></label>
          <label className="text-sm">End date *<input type="date" required value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className={input} /></label>
        </div>}
        {tab === "progress" && <div className="space-y-4">{activitySelect}<label className="block text-sm">Progress: {form.progressPct}%<input type="range" min="0" max="100" value={form.progressPct} onChange={(e) => set("progressPct", e.target.value)} className="mt-2 w-full" /></label><label className="block text-sm">Status *<select required value={form.status} onChange={(e) => set("status", e.target.value)} className={input}><option value="">Select...</option><option>Not Started</option><option>In Progress</option><option>Completed</option><option>On Hold</option></select></label><label className="block text-sm">Narrative *<textarea required rows={4} value={form.narrative} onChange={(e) => set("narrative", e.target.value)} className={input} /></label><label className="block text-sm">Report date *<input type="date" required value={form.reportDate} onChange={(e) => set("reportDate", e.target.value)} className={input} /></label></div>}
        {tab === "challenge" && <div className="space-y-4">{activitySelect}<label className="block text-sm">Challenge type *<input required value={form.challengeType} onChange={(e) => set("challengeType", e.target.value)} className={input} /></label><label className="block text-sm">Description *<textarea required rows={4} value={form.challengeDesc} onChange={(e) => set("challengeDesc", e.target.value)} className={input} /></label><label className="block text-sm">Mitigation plan<textarea rows={3} value={form.mitigationPlan} onChange={(e) => set("mitigationPlan", e.target.value)} className={input} /></label></div>}
        {tab === "financial" && <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[["Project Budget", projectBudget], ["Previous Total Spend", previousTotalSpend], ["Remaining Budget", remainingBudget], ["Budget Utilization", `${budgetUtilization.toFixed(1)}%`]].map(([label, value]) => <div key={String(label)} className="rounded-md border border-border bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{typeof value === "number" ? `BWP ${value.toFixed(2)}` : value}</p></div>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Reporting date *<input type="date" required value={form.reportingDate} onChange={(e) => set("reportingDate", e.target.value)} className={input} /></label><label className="text-sm">Amount spent during this reporting period (BWP) *<input type="number" min="0" step="0.01" required value={form.amountSpent} onChange={(e) => set("amountSpent", e.target.value)} className={input} /></label></div>
          <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><span className="font-semibold">Calculated total spent to date:</span> BWP {totalSpentToDate.toFixed(2)} <span className="mx-2">·</span><span className="font-semibold">Remaining:</span> BWP {remainingBudget.toFixed(2)} <span className="mx-2">·</span><span className="font-semibold">Utilized:</span> {budgetUtilization.toFixed(1)}%</div>
          <label className="block text-sm">Notes / Description<textarea rows={3} value={form.financialNotes} onChange={(e) => set("financialNotes", e.target.value)} className={input} /></label>
          {financialReports.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">Financial history</h3><div className="overflow-x-auto rounded-md border border-border"><table className="w-full text-sm"><thead className="bg-secondary"><tr>{["Reporting date", "Period spend", "Total spent to date"].map((heading) => <th key={heading} className="px-3 py-2 text-left text-xs uppercase">{heading}</th>)}</tr></thead><tbody>{financialReports.map((report: FinancialReport) => <tr key={report.id} className="border-t border-border"><td className="px-3 py-2">{report.reporting_date}</td><td className="px-3 py-2">BWP {Number(report.amount_spent).toFixed(2)}</td><td className="px-3 py-2">BWP {Number(report.cumulative_expenditure).toFixed(2)}</td></tr>)}</tbody></table></div></div>}
        </div>}
        <div className="flex justify-end gap-3"><button type="button" onClick={() => setForm(blank)} className="rounded-md border border-border px-4 py-2 text-sm font-semibold">Clear</button><button type="submit" disabled={submitting} className="rounded-md bg-[#1a3a6b] px-6 py-2 text-sm font-semibold text-white disabled:opacity-60">{submitting ? "Saving..." : "Save Entry"}</button></div>
      </form>
      )}
    </div>
  </div>;
}
