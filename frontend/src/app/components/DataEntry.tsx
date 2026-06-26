import { useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { useProjectData } from "../ProjectDataContext";
import { EmptyState } from "./EmptyState";
import { ImportSpreadsheet } from "./ImportSpreadsheet";
import type { ProjectMembership } from "./ProjectSwitcher";

type Tab = "activity" | "progress" | "challenge" | "beneficiary" | "financial" | "import";
const today = new Date().toISOString().slice(0, 10);
const blank = { activityId: "", code: "", name: "", category: "", district: "", responsibleOfficer: "", startDate: today, endDate: today, status: "", progressPct: "0", narrative: "", reportDate: today, challengeType: "", challengeDesc: "", mitigationPlan: "", beneficiaryName: "", nationalId: "", beneficiaryType: "", contactNumber: "", amount: "", expenseCategory: "", description: "" };

export function DataEntry({ memberships = [] }: { memberships?: ProjectMembership[] }) {
  const { projectId, role, activities, members, refresh } = useProjectData();
  const canCreateActivity = role === "admin" || role === "supervisor";
  const [tab, setTab] = useState<Tab>(role === "finance" ? "financial" : canCreateActivity ? "activity" : "progress");
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tabs = useMemo(() => [
    ...(canCreateActivity ? [{ id: "activity" as Tab, label: "New Activity" }] : []),
    ...(role !== "finance" ? [{ id: "progress" as Tab, label: "Activity Progress" }, { id: "challenge" as Tab, label: "Challenge" }, { id: "beneficiary" as Tab, label: "Beneficiary" }] : []),
    { id: "financial" as Tab, label: "Financial Entry" },
    ...(canCreateActivity ? [{ id: "import" as Tab, label: "Import Spreadsheet" }] : []),
  ], [canCreateActivity, role]);

  const set = (key: keyof typeof blank, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError(null); setMessage(null);
    const base = `/projects/${projectId}`;
    let path = ""; let body: Record<string, unknown> = {};
    if (tab === "activity") {
      path = `${base}/activities`; body = { code: form.code, name: form.name, category: form.category, district: form.district, responsible_officer: form.responsibleOfficer, start_date: form.startDate, end_date: form.endDate, status: form.status, progress_pct: Number(form.progressPct) };
    } else if (tab === "progress") {
      path = `${base}/progress-updates`; body = { activity_id: form.activityId, progress_pct: Number(form.progressPct), status: form.status, narrative: form.narrative, report_date: form.reportDate };
    } else if (tab === "challenge") {
      path = `${base}/challenges`; body = { activity_id: form.activityId, challenge_type: form.challengeType, description: form.challengeDesc, mitigation_plan: form.mitigationPlan || null, resolved: false };
    } else if (tab === "beneficiary") {
      path = `${base}/beneficiaries`; body = { full_name: form.beneficiaryName, national_id: form.nationalId, beneficiary_type: form.beneficiaryType, district: form.district, contact_number: form.contactNumber || null, notes: null };
    } else {
      path = `${base}/financial-entries`; body = { activity_id: form.activityId, expense_category: form.expenseCategory, amount: Number(form.amount), description: form.description, receipt_url: null };
    }
    try {
      await apiRequest(path, { method: "POST", body: JSON.stringify(body) });
      setMessage("Entry saved. Dashboard metrics have been refreshed."); setForm(blank); await refresh();
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
    {error && <div className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-800"><AlertCircle className="h-5 w-5" />{error}</div>}
    <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
      <div className="flex flex-wrap border-b border-border">{tabs.map((item) => <button key={item.id} type="button" onClick={() => { setTab(item.id); setError(null); setMessage(null); }} className={`px-5 py-3 text-sm font-semibold ${tab === item.id ? "bg-[#1a3a6b] text-white" : "text-muted-foreground hover:bg-secondary"}`}>{item.label}</button>)}</div>
      {tab === "import" ? (
        <div className="p-6"><ImportSpreadsheet memberships={memberships} /></div>
      ) : tab !== "activity" && tab !== "beneficiary" && activities.length === 0 ? (
        <div className="p-6"><EmptyState message="Create an activity before entering activity-linked data." /></div>
      ) : (
      <form onSubmit={submit} className="space-y-5 p-6">
        {tab === "activity" && <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">Code *<input required value={form.code} onChange={(e) => set("code", e.target.value)} className={input} /></label>
          <label className="text-sm">Name *<input required value={form.name} onChange={(e) => set("name", e.target.value)} className={input} /></label>
          <label className="text-sm">Category *<input required value={form.category} onChange={(e) => set("category", e.target.value)} className={input} /></label>
          <label className="text-sm">District *<input required value={form.district} onChange={(e) => set("district", e.target.value)} className={input} /></label>
          <label className="text-sm">Responsible officer *<select required value={form.responsibleOfficer} onChange={(e) => set("responsibleOfficer", e.target.value)} className={input}><option value="">Select officer...</option>{members.filter((m) => m.role === "officer" && m.profiles?.active).map((m) => <option key={m.id} value={m.profiles!.id}>{m.profiles!.full_name}</option>)}</select></label>
          <label className="text-sm">Status *<select required value={form.status} onChange={(e) => set("status", e.target.value)} className={input}><option value="">Select...</option><option>Not Started</option><option>In Progress</option><option>Completed</option><option>On Hold</option></select></label>
          <label className="text-sm">Start date *<input type="date" required value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={input} /></label>
          <label className="text-sm">End date *<input type="date" required value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className={input} /></label>
        </div>}
        {tab === "progress" && <div className="space-y-4">{activitySelect}<label className="block text-sm">Progress: {form.progressPct}%<input type="range" min="0" max="100" value={form.progressPct} onChange={(e) => set("progressPct", e.target.value)} className="mt-2 w-full" /></label><label className="block text-sm">Status *<select required value={form.status} onChange={(e) => set("status", e.target.value)} className={input}><option value="">Select...</option><option>Not Started</option><option>In Progress</option><option>Completed</option><option>On Hold</option></select></label><label className="block text-sm">Narrative *<textarea required rows={4} value={form.narrative} onChange={(e) => set("narrative", e.target.value)} className={input} /></label><label className="block text-sm">Report date *<input type="date" required value={form.reportDate} onChange={(e) => set("reportDate", e.target.value)} className={input} /></label></div>}
        {tab === "challenge" && <div className="space-y-4">{activitySelect}<label className="block text-sm">Challenge type *<input required value={form.challengeType} onChange={(e) => set("challengeType", e.target.value)} className={input} /></label><label className="block text-sm">Description *<textarea required rows={4} value={form.challengeDesc} onChange={(e) => set("challengeDesc", e.target.value)} className={input} /></label><label className="block text-sm">Mitigation plan<textarea rows={3} value={form.mitigationPlan} onChange={(e) => set("mitigationPlan", e.target.value)} className={input} /></label></div>}
        {tab === "beneficiary" && <div className="grid grid-cols-2 gap-4"><label className="text-sm">Full name *<input required value={form.beneficiaryName} onChange={(e) => set("beneficiaryName", e.target.value)} className={input} /></label><label className="text-sm">National ID *<input required value={form.nationalId} onChange={(e) => set("nationalId", e.target.value)} className={input} /></label><label className="text-sm">Type *<input required value={form.beneficiaryType} onChange={(e) => set("beneficiaryType", e.target.value)} className={input} /></label><label className="text-sm">District *<input required value={form.district} onChange={(e) => set("district", e.target.value)} className={input} /></label><label className="col-span-2 text-sm">Contact number<input value={form.contactNumber} onChange={(e) => set("contactNumber", e.target.value)} className={input} /></label></div>}
        {tab === "financial" && <div className="space-y-4">{activitySelect}<div className="grid grid-cols-2 gap-4"><label className="text-sm">Expense category *<input required value={form.expenseCategory} onChange={(e) => set("expenseCategory", e.target.value)} className={input} /></label><label className="text-sm">Amount (BWP) *<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e) => set("amount", e.target.value)} className={input} /></label></div><label className="block text-sm">Description *<textarea required rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className={input} /></label></div>}
        <div className="flex justify-end gap-3"><button type="button" onClick={() => setForm(blank)} className="rounded-md border border-border px-4 py-2 text-sm font-semibold">Clear</button><button type="submit" disabled={submitting} className="rounded-md bg-[#1a3a6b] px-6 py-2 text-sm font-semibold text-white disabled:opacity-60">{submitting ? "Saving..." : "Save Entry"}</button></div>
      </form>
      )}
    </div>
  </div>;
}
