import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Plus, RefreshCw, RotateCcw, Save, Search, Trash2, X } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { useProjectData, type Activity, type Challenge, type FinancialEntry, type ProgressUpdate, type ProjectMember } from "../ProjectDataContext";

type ReviewStatus = "imported" | "under_review" | "corrected" | "approved";
type Section = "all" | "project" | "activities" | "progress" | "challenges" | "financial";
type WarningFilter = "all" | "warnings" | "clean";
type RawSpreadsheetCell = string | number | boolean | null;
type RawSpreadsheetRows = RawSpreadsheetCell[][];
type RawPreviewJson = { rawRows?: RawSpreadsheetRows; [key: string]: unknown };
type ImportHistory = {
  id: string;
  source_file_name: string | null;
  source_sheet_name: string | null;
  reporting_period: string | null;
  created_at: string;
  review_status: ReviewStatus;
  imported_rows_count?: number;
  raw_preview_json?: RawPreviewJson | null;
};
type ProjectRecord = {
  id: string; name: string; description: string | null; project_code: string | null; project_manager: string | null;
  planned_start_date: string | null; actual_start_date: string | null; planned_completion_date: string | null; actual_completion_date: string | null;
  estimated_budget: number | null; allocated_budget: number | null; district?: string | null;
};
type ImportedActivity = Activity & { import_id?: string | null; description?: string | null; status_color?: string | null; remarks?: string | null; actual_completion_date?: string | null };
type ImportedProgress = ProgressUpdate & { import_id?: string | null; executive_summary?: string | null; status_color?: string | null; remarks?: string | null; reporting_period?: string | null };
type ImportedChallenge = Challenge & { import_id?: string | null; status_color?: string | null; responsible_officer?: string | null; due_date?: string | null };
type ImportedFinancial = FinancialEntry & { import_id?: string | null; approved_budget?: number | null; balance?: number | null; percentage_utilised?: number | null; remarks?: string | null };
type ReviewPayload = { import: ImportHistory; project: ProjectRecord; activities: ImportedActivity[]; progress: ImportedProgress[]; challenges: ImportedChallenge[]; financial: ImportedFinancial[]; members: ProjectMember[] };

const CURRENT_RECORDS_ID = "__current_platform_records__";
const currentRecordsImport = (): ImportHistory => ({
  id: CURRENT_RECORDS_ID,
  source_file_name: null,
  source_sheet_name: "Current platform records",
  reporting_period: null,
  created_at: new Date().toISOString(),
  review_status: "under_review",
});

const inputClass = "w-full min-w-[120px] rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#1a3a6b]";
const statusOptions = ["Not Started", "In Progress", "Completed", "On Hold"];
const colorOptions = ["", "Green", "Yellow", "Orange", "Red", "G", "Y", "O", "R"];
const reviewStatuses: ReviewStatus[] = ["imported", "under_review", "corrected", "approved"];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function text(value: unknown): string {
  return String(value ?? "");
}

function spreadsheetRows(importRecord: ImportHistory | null | undefined): RawSpreadsheetRows {
  const rows = importRecord?.raw_preview_json?.rawRows;
  return Array.isArray(rows) ? rows.filter((row): row is RawSpreadsheetCell[] => Array.isArray(row)) : [];
}

function SpreadsheetPreview({ rows }: { rows: RawSpreadsheetRows }) {
  const columnCount = Math.max(0, ...rows.map((row) => row.length));
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="font-semibold text-foreground">Spreadsheet Preview</h3>
        <p className="text-xs text-muted-foreground">Original worksheet rows saved with this import.</p>
      </div>
      {rows.length === 0 || columnCount === 0 ? (
        <p className="rounded border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No spreadsheet preview is available for this import.</p>
      ) : (
        <div className="max-h-[420px] overflow-auto rounded-md border border-border">
          <table className="min-w-max border-collapse text-left text-xs">
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? "bg-secondary/70 font-semibold" : "odd:bg-background even:bg-secondary/30"}>
                  {Array.from({ length: columnCount }).map((_, colIndex) => (
                    <td key={colIndex} className="max-w-[280px] whitespace-pre-wrap border-b border-r border-border px-3 py-2 align-top text-foreground">
                      {text(row[colIndex]) || <span className="text-muted-foreground"> </span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function numberField(value: unknown): string {
  return value === null || value === undefined || value === "" ? "" : String(value);
}

function nullable(value: string): string | null {
  return value.trim() ? value.trim() : null;
}

function money(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function percent(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;
}

function validDate(value: string | null | undefined): boolean {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function rowWarnings(section: Exclude<Section, "all">, row: Record<string, unknown>): string[] {
  const warnings: string[] = [];
  if (section === "activities") {
    if (!text(row.name).trim()) warnings.push("Missing activity title");
    if (!text(row.responsible_officer).trim()) warnings.push("Missing responsible officer");
    if (!validDate(text(row.end_date))) warnings.push("Invalid planned completion date");
    if (!validDate(text(row.actual_completion_date))) warnings.push("Invalid actual completion date");
    const progress = Number(row.progress_pct);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) warnings.push("Completion percentage must be 0-100");
    if (row.status && !statusOptions.includes(text(row.status))) warnings.push("Invalid status");
    if (row.status_color && !colorOptions.map((item) => item.toLowerCase()).includes(text(row.status_color).toLowerCase())) warnings.push("Invalid color/status value");
  }
  if (section === "progress") {
    if (!validDate(text(row.report_date))) warnings.push("Invalid reporting date");
    const progress = Number(row.progress_pct);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) warnings.push("Completion percentage must be 0-100");
    if (row.status && !statusOptions.includes(text(row.status))) warnings.push("Invalid status");
    if (row.status_color && !colorOptions.map((item) => item.toLowerCase()).includes(text(row.status_color).toLowerCase())) warnings.push("Invalid color/status value");
  }
  if (section === "challenges") {
    if (!text(row.description).trim()) warnings.push("Missing risk/challenge description");
    if (!validDate(text(row.due_date))) warnings.push("Invalid due date");
    if (row.status_color && !colorOptions.map((item) => item.toLowerCase()).includes(text(row.status_color).toLowerCase())) warnings.push("Invalid color/status value");
  }
  if (section === "financial") {
    if (!text(row.expense_category).trim()) warnings.push("Missing budget item/category");
    if (row.approved_budget === null || row.approved_budget === undefined || row.approved_budget === "") warnings.push("Missing approved budget amount");
    if (Number(row.balance) < 0) warnings.push("Negative balance");
    const used = Number(row.percentage_utilised);
    if (row.percentage_utilised !== null && row.percentage_utilised !== undefined && (!Number.isFinite(used) || used < 0 || used > 100)) warnings.push("Percentage utilised should be 0-100");
  }
  return warnings;
}

function Field({ label, value, type = "text", disabled, onChange }: { label: string; value: string; type?: string; disabled?: boolean; onChange: (value: string) => void }) {
  return <label className="text-xs font-medium text-muted-foreground">{label}<input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={`${inputClass} mt-1 disabled:opacity-60`} /></label>;
}

function SelectField({ label, value, disabled, options, onChange }: { label: string; value: string; disabled?: boolean; options: string[]; onChange: (value: string) => void }) {
  return <label className="text-xs font-medium text-muted-foreground">{label}<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={`${inputClass} mt-1 disabled:opacity-60`}>{options.map((item) => <option key={item} value={item}>{item || "Blank"}</option>)}</select></label>;
}

export function ImportedDataReview() {
  const { projectId, role, refresh } = useProjectData();
  const canEdit = role === "admin" || role === "supervisor";
  const [imports, setImports] = useState<ImportHistory[]>([]);
  const [selectedImportId, setSelectedImportId] = useState("");
  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [draft, setDraft] = useState<ReviewPayload | null>(null);
  const [section, setSection] = useState<Section>("all");
  const [warningFilter, setWarningFilter] = useState<WarningFilter>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadImports(preferredId?: string) {
    setError(null);
    let rows: ImportHistory[] = [];
    try {
      rows = await apiRequest<ImportHistory[]>(`/projects/${projectId}/report-imports`);
    } catch (requestError) {
      console.warn("Import history unavailable; loading current platform records instead.", requestError);
    }
    const sources = [currentRecordsImport(), ...rows];
    setImports(sources);
    const nextId = preferredId || selectedImportId || CURRENT_RECORDS_ID;
    setSelectedImportId(nextId);
    if (nextId) await loadReview(nextId);
  }

  async function loadReview(importId = selectedImportId) {
    if (!importId) return;
    setBusy("load");
    setError(null);
    try {
      const payload = importId === CURRENT_RECORDS_ID ? await loadCurrentRecordsReview() : await apiRequest<ReviewPayload>(`/projects/${projectId}/report-imports/${importId}/review`);
      setReview(payload);
      setDraft(clone(payload));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load overview records.");
    } finally {
      setBusy(null);
    }
  }

  async function loadCurrentRecordsReview(): Promise<ReviewPayload> {
    const base = `/projects/${projectId}`;
    const [project, activities, progress, challenges, financial, members] = await Promise.all([
      apiRequest<ProjectRecord>(base),
      apiRequest<ImportedActivity[]>(`${base}/activities`),
      apiRequest<ImportedProgress[]>(`${base}/progress-updates`),
      apiRequest<ImportedChallenge[]>(`${base}/challenges`),
      apiRequest<ImportedFinancial[]>(`${base}/financial-entries`),
      apiRequest<ProjectMember[]>(`${base}/members`),
    ]);
    return { import: currentRecordsImport(), project, activities, progress, challenges, financial, members };
  }

  useEffect(() => {
    setReview(null);
    setDraft(null);
    setImports([]);
    setSelectedImportId("");
    void loadImports();
  }, [projectId]);

  const members = draft?.members ?? [];
  const firstOfficer = members.find((item) => item.profiles?.active)?.profiles?.id ?? "";
  const firstActivity = draft?.activities[0]?.id ?? review?.activities[0]?.id ?? "";
  const visibleCounts = useMemo(() => ({
    project: draft ? 1 : 0,
    activities: draft?.activities.length ?? 0,
    progress: draft?.progress.length ?? 0,
    challenges: draft?.challenges.length ?? 0,
    financial: draft?.financial.length ?? 0,
  }), [draft]);

  function changed(path: string): boolean {
    if (!draft || !review) return false;
    const [part, id] = path.split(":");
    if (part === "project") return JSON.stringify(draft.project) !== JSON.stringify(review.project);
    const key = part as "activities" | "progress" | "challenges" | "financial";
    return JSON.stringify(draft[key].find((item) => item.id === id)) !== JSON.stringify(review[key].find((item) => item.id === id));
  }

  function updateProject(patch: Partial<ProjectRecord>) {
    setDraft((current) => current ? { ...current, project: { ...current.project, ...patch } } : current);
  }

  function updateRow<K extends "activities" | "progress" | "challenges" | "financial">(key: K, id: string, patch: Partial<ReviewPayload[K][number]>) {
    setDraft((current) => current ? { ...current, [key]: current[key].map((row) => row.id === id ? { ...row, ...patch } : row) } : current);
  }

  function resetRow(path: string) {
    if (!draft || !review) return;
    const [part, id] = path.split(":");
    if (part === "project") setDraft({ ...draft, project: clone(review.project) });
    else {
      const key = part as "activities" | "progress" | "challenges" | "financial";
      const original = review[key].find((item) => item.id === id);
      if (original) setDraft({ ...draft, [key]: draft[key].map((row) => row.id === id ? clone(original) : row) });
    }
  }

  function rowMatches(sectionKey: Exclude<Section, "all">, row: Record<string, unknown>): boolean {
    const warningCount = rowWarnings(sectionKey, row).length;
    if (warningFilter === "warnings" && warningCount === 0) return false;
    if (warningFilter === "clean" && warningCount > 0) return false;
    if (!query.trim()) return true;
    return Object.values(row).some((value) => text(value).toLowerCase().includes(query.trim().toLowerCase()));
  }

  async function saveProject() {
    if (!draft) return;
    setBusy("project");
    setError(null);
    try {
      await apiRequest(`/projects/${projectId}`, { method: "PATCH", body: JSON.stringify({
        name: draft.project.name,
        description: draft.project.description,
        project_code: draft.project.project_code,
        project_manager: draft.project.project_manager,
        planned_start_date: draft.project.planned_start_date,
        actual_start_date: draft.project.actual_start_date,
        planned_completion_date: draft.project.planned_completion_date,
        actual_completion_date: draft.project.actual_completion_date,
        estimated_budget: draft.project.estimated_budget,
        allocated_budget: draft.project.allocated_budget,
      }) });
      if (draft.import.id !== CURRENT_RECORDS_ID) await markStatus("corrected", false);
      await refresh();
      await loadReview();
      setMessage("Project details saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save project details.");
    } finally {
      setBusy(null);
    }
  }

  async function saveRow(key: "activities" | "progress" | "challenges" | "financial", id: string) {
    if (!draft) return;
    const row = draft[key].find((item) => item.id === id);
    if (!row) return;
    setBusy(`${key}:${id}`);
    setError(null);
    try {
      if (key === "activities") {
        const activity = row as ImportedActivity;
        await apiRequest(`/projects/${projectId}/activities/${id}`, { method: "PATCH", body: JSON.stringify({
          code: activity.code,
          name: activity.name,
          category: activity.category,
          district: activity.district,
          responsible_officer: activity.responsible_officer,
          start_date: activity.start_date,
          end_date: activity.end_date,
          status: activity.status,
          progress_pct: activity.progress_pct,
          import_id: activity.import_id ?? null,
          description: activity.description ?? null,
          status_color: activity.status_color ?? null,
          remarks: activity.remarks ?? null,
          actual_completion_date: activity.actual_completion_date ?? null,
        }) });
      }
      if (key === "progress") {
        const progress = row as ImportedProgress;
        await apiRequest(`/projects/${projectId}/progress-updates/${id}`, { method: "PATCH", body: JSON.stringify({
          progress_pct: progress.progress_pct,
          status: progress.status,
          narrative: progress.narrative,
          report_date: progress.report_date,
          import_id: progress.import_id ?? null,
          executive_summary: progress.executive_summary ?? null,
          status_color: progress.status_color ?? null,
          remarks: progress.remarks ?? null,
          reporting_period: progress.reporting_period ?? null,
        }) });
      }
      if (key === "challenges") {
        const challenge = row as ImportedChallenge;
        await apiRequest(`/projects/${projectId}/challenges/${id}`, { method: "PATCH", body: JSON.stringify({
          challenge_type: challenge.challenge_type || "Risk",
          description: challenge.description,
          mitigation_plan: challenge.mitigation_plan ?? null,
          resolved: challenge.resolved,
          import_id: challenge.import_id ?? null,
          status_color: challenge.status_color ?? null,
          responsible_officer: challenge.responsible_officer ?? null,
          due_date: challenge.due_date ?? null,
        }) });
      }
      if (key === "financial") {
        const financial = row as ImportedFinancial;
        await apiRequest(`/projects/${projectId}/financial-entries/${id}`, { method: "PATCH", body: JSON.stringify({
          activity_id: financial.activity_id,
          expense_category: financial.expense_category,
          amount: financial.amount,
          description: financial.description || financial.remarks || financial.expense_category,
          receipt_url: null,
          import_id: financial.import_id ?? null,
          approved_budget: financial.approved_budget ?? null,
          balance: financial.balance ?? null,
          percentage_utilised: financial.percentage_utilised ?? null,
          remarks: financial.remarks ?? null,
        }) });
      }
      if (draft.import.id !== CURRENT_RECORDS_ID) await markStatus("corrected", false);
      await refresh();
      await loadReview();
      setMessage("Row saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save row.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteRow(key: "activities" | "progress" | "challenges" | "financial", id: string) {
    if (!window.confirm("Delete this row? This removes it from the real project data.")) return;
    setBusy(`${key}:${id}`);
    setError(null);
    try {
      const path = key === "activities" ? "activities" : key === "progress" ? "progress-updates" : key === "challenges" ? "challenges" : "financial-entries";
      await apiRequest(`/projects/${projectId}/${path}/${id}`, { method: "DELETE" });
      await refresh();
      await loadReview();
      setMessage("Row deleted.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete row.");
    } finally {
      setBusy(null);
    }
  }

  async function addRow(key: "activities" | "progress" | "challenges" | "financial") {
    if (!draft?.import.id) return;
    setBusy(`add:${key}`);
    setError(null);
    const importId = draft.import.id === CURRENT_RECORDS_ID ? null : draft.import.id;
    try {
      if (key === "activities") {
        await apiRequest(`/projects/${projectId}/activities`, { method: "POST", body: JSON.stringify({
          code: `IMP-${Date.now().toString().slice(-8)}`,
          name: "Imported activity",
          category: "Imported milestone",
          district: draft.project.district || "Unspecified",
          responsible_officer: firstOfficer,
          start_date: draft.project.actual_start_date || draft.project.planned_start_date || new Date().toISOString().slice(0, 10),
          end_date: draft.project.actual_completion_date || draft.project.planned_completion_date || new Date().toISOString().slice(0, 10),
          status: "Not Started",
          progress_pct: 0,
          import_id: importId,
        }) });
      }
      if (key === "progress") {
        if (!firstActivity) throw new Error("Add an activity before adding progress.");
        await apiRequest(`/projects/${projectId}/progress-updates`, { method: "POST", body: JSON.stringify({ activity_id: firstActivity, progress_pct: 0, status: "Not Started", narrative: "Imported progress update", report_date: new Date().toISOString().slice(0, 10), import_id: importId }) });
      }
      if (key === "challenges") {
        if (!firstActivity) throw new Error("Add an activity before adding risks.");
        await apiRequest(`/projects/${projectId}/challenges`, { method: "POST", body: JSON.stringify({ activity_id: firstActivity, challenge_type: "Risk", description: "Imported risk", mitigation_plan: "", resolved: false, import_id: importId, responsible_officer: firstOfficer || null }) });
      }
      if (key === "financial") {
        if (!firstActivity) throw new Error("Add an activity before adding financial rows.");
        await apiRequest(`/projects/${projectId}/financial-entries`, { method: "POST", body: JSON.stringify({ activity_id: firstActivity, expense_category: "Imported budget item", amount: 0, description: "Imported financial row", import_id: importId, approved_budget: 0, balance: 0, percentage_utilised: 0, remarks: "" }) });
      }
      if (draft.import.id !== CURRENT_RECORDS_ID) await markStatus("under_review", false);
      await refresh();
      await loadReview();
      setMessage("Row added.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to add row.");
    } finally {
      setBusy(null);
    }
  }

  async function saveAll() {
    if (!draft) return;
    setBusy("save-all");
    try {
      if (changed("project")) await saveProject();
      for (const row of draft.activities) if (changed(`activities:${row.id}`)) await saveRow("activities", row.id);
      for (const row of draft.progress) if (changed(`progress:${row.id}`)) await saveRow("progress", row.id);
      for (const row of draft.challenges) if (changed(`challenges:${row.id}`)) await saveRow("challenges", row.id);
      for (const row of draft.financial) if (changed(`financial:${row.id}`)) await saveRow("financial", row.id);
      setMessage("All changes saved.");
    } finally {
      setBusy(null);
    }
  }

  async function markStatus(status: ReviewStatus, reload = true) {
    if (!draft?.import.id || draft.import.id === CURRENT_RECORDS_ID) return;
    const next = await apiRequest<ImportHistory>(`/projects/${projectId}/report-imports/${draft.import.id}/review-status`, { method: "PATCH", body: JSON.stringify({ review_status: status }) });
    setImports((current) => current.map((item) => item.id === next.id ? { ...item, ...next } : item));
    if (reload) await loadReview(next.id);
  }

  const showProject = draft && (section === "all" || section === "project");
  const rawRows = spreadsheetRows(draft?.import);
  const sections = [
    { id: "activities" as const, title: "Work Plan Activities / Milestones", rows: draft?.activities.filter((row) => rowMatches("activities", row as unknown as Record<string, unknown>)) ?? [] },
    { id: "progress" as const, title: "Progress Updates", rows: draft?.progress.filter((row) => rowMatches("progress", row as unknown as Record<string, unknown>)) ?? [] },
    { id: "challenges" as const, title: "Risks / Challenges", rows: draft?.challenges.filter((row) => rowMatches("challenges", row as unknown as Record<string, unknown>)) ?? [] },
    { id: "financial" as const, title: "Budget / Financial Data", rows: draft?.financial.filter((row) => rowMatches("financial", row as unknown as Record<string, unknown>)) ?? [] },
  ].filter((item) => section === "all" || section === item.id);

  if (!canEdit) return <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">Project admin or supervisor access is required to edit overview records.</div>;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-foreground">Overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">Edit the live project records that feed the dashboard, activities, budget, and charts. Select an import history item only when you need to filter to one import.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void loadReview()} disabled={!selectedImportId || busy === "load"} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"><RefreshCw className={`h-3.5 w-3.5 ${busy === "load" ? "animate-spin" : ""}`} />Refresh</button>
            <button type="button" onClick={saveAll} disabled={!draft || Boolean(busy)} className="inline-flex items-center gap-2 rounded-md bg-[#1a3a6b] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"><Save className="h-3.5 w-3.5" />Save all changes</button>
          </div>
        </div>
        {(message || error) && <div className={`mt-4 flex items-start justify-between gap-3 rounded-md border p-3 text-sm ${message ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>{message ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}<span className="flex-1">{message || error}</span><button type="button" onClick={() => { setMessage(null); setError(null); }}><X className="h-4 w-4" /></button></div>}
      </section>

      <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
          <label className="block text-xs font-medium text-muted-foreground">Record source
            <select value={selectedImportId} onChange={(event) => { setSelectedImportId(event.target.value); void loadReview(event.target.value); }} className={`${inputClass} mt-1`}>
              {imports.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id === CURRENT_RECORDS_ID ? "Current platform records" : `${item.reporting_period || item.source_sheet_name || item.source_file_name || item.id.slice(0, 8)} - ${item.review_status}`}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-muted-foreground">Section
            <select value={section} onChange={(event) => setSection(event.target.value as Section)} className={`${inputClass} mt-1`}>
              <option value="all">All sections</option>
              <option value="project">Project Details ({visibleCounts.project})</option>
              <option value="activities">Activities ({visibleCounts.activities})</option>
              <option value="progress">Progress ({visibleCounts.progress})</option>
              <option value="challenges">Risks ({visibleCounts.challenges})</option>
              <option value="financial">Budget ({visibleCounts.financial})</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-muted-foreground">Warnings
            <select value={warningFilter} onChange={(event) => setWarningFilter(event.target.value as WarningFilter)} className={`${inputClass} mt-1`}>
              <option value="all">All rows</option>
              <option value="warnings">Rows with warnings</option>
              <option value="clean">Rows without warnings</option>
            </select>
          </label>
          <div className="relative"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records..." className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-sm" /></div>
          {draft && draft.import.id !== CURRENT_RECORDS_ID && <div className="space-y-2 border-t border-border pt-3"><p className="text-xs font-semibold text-muted-foreground">Review status</p><div className="grid grid-cols-2 gap-2">{reviewStatuses.map((item) => <button key={item} type="button" onClick={() => void markStatus(item)} className={`rounded border px-2 py-1.5 text-xs font-semibold ${draft.import.review_status === item ? "border-[#1a3a6b] bg-[#1a3a6b] text-white" : "border-border hover:bg-secondary"}`}>{item.replace("_", " ")}</button>)}</div></div>}
        </aside>

        <main className="space-y-4">
          {busy === "load" && <div className="flex items-center gap-2 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Loading records...</div>}
          {!draft && busy !== "load" && <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No records selected.</div>}

          {draft && section === "all" && <SpreadsheetPreview rows={rawRows} />}

          {showProject && draft && (
            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-foreground">Project Details</h3><div className="flex gap-2"><button type="button" onClick={() => resetRow("project")} disabled={!changed("project")} className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-semibold disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" />Reset</button><button type="button" onClick={saveProject} disabled={!changed("project") || Boolean(busy)} className="inline-flex items-center gap-1 rounded bg-[#1a3a6b] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" />Save</button></div></div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Project name" value={draft.project.name} onChange={(value) => updateProject({ name: value })} />
                <Field label="Project code" value={text(draft.project.project_code)} onChange={(value) => updateProject({ project_code: nullable(value) })} />
                <Field label="Project manager" value={text(draft.project.project_manager)} onChange={(value) => updateProject({ project_manager: nullable(value) })} />
                <Field label="Planned start date" type="date" value={text(draft.project.planned_start_date)} onChange={(value) => updateProject({ planned_start_date: nullable(value) })} />
                <Field label="Actual start date" type="date" value={text(draft.project.actual_start_date)} onChange={(value) => updateProject({ actual_start_date: nullable(value) })} />
                <Field label="Planned completion date" type="date" value={text(draft.project.planned_completion_date)} onChange={(value) => updateProject({ planned_completion_date: nullable(value) })} />
                <Field label="Actual completion date" type="date" value={text(draft.project.actual_completion_date)} onChange={(value) => updateProject({ actual_completion_date: nullable(value) })} />
                <Field label="Estimated budget" type="number" value={numberField(draft.project.estimated_budget)} onChange={(value) => updateProject({ estimated_budget: money(value) })} />
                <Field label="Allocated budget" type="number" value={numberField(draft.project.allocated_budget)} onChange={(value) => updateProject({ allocated_budget: money(value) })} />
                <label className="text-xs font-medium text-muted-foreground md:col-span-2">Project overview/description<textarea value={text(draft.project.description)} onChange={(event) => updateProject({ description: nullable(event.target.value) })} rows={3} className={`${inputClass} mt-1`} /></label>
              </div>
            </section>
          )}

          {sections.map((item) => (
            <section key={item.id} className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-foreground">{item.title}</h3><button type="button" onClick={() => void addRow(item.id)} disabled={Boolean(busy)} className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-semibold hover:bg-secondary"><Plus className="h-3.5 w-3.5" />Add row</button></div>
              {item.rows.length === 0 ? <p className="rounded border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No rows match the current filters.</p> : item.rows.map((row) => {
                const warnings = rowWarnings(item.id, row as unknown as Record<string, unknown>);
                const path = `${item.id}:${row.id}`;
                return (
                  <article key={row.id} className="rounded-md border border-border p-3">
                    {warnings.length > 0 && <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{warnings.join("; ")}</div>}
                    {item.id === "activities" && <div className="grid gap-3 md:grid-cols-2"><Field label="Activity / milestone title" value={(row as ImportedActivity).name} onChange={(value) => updateRow("activities", row.id, { name: value } as Partial<ImportedActivity>)} /><Field label="Description" value={text((row as ImportedActivity).description)} onChange={(value) => updateRow("activities", row.id, { description: nullable(value) } as Partial<ImportedActivity>)} /><SelectField label="Responsible officer" value={(row as ImportedActivity).responsible_officer} options={members.map((member) => member.profiles?.id || "").filter(Boolean)} onChange={(value) => updateRow("activities", row.id, { responsible_officer: value } as Partial<ImportedActivity>)} /><Field label="Planned completion date" type="date" value={(row as ImportedActivity).end_date} onChange={(value) => updateRow("activities", row.id, { end_date: value } as Partial<ImportedActivity>)} /><Field label="Actual completion date" type="date" value={text((row as ImportedActivity).actual_completion_date)} onChange={(value) => updateRow("activities", row.id, { actual_completion_date: nullable(value) } as Partial<ImportedActivity>)} /><Field label="Completion percentage" type="number" value={numberField((row as ImportedActivity).progress_pct)} onChange={(value) => updateRow("activities", row.id, { progress_pct: percent(value) } as Partial<ImportedActivity>)} /><SelectField label="Status" value={(row as ImportedActivity).status} options={statusOptions} onChange={(value) => updateRow("activities", row.id, { status: value } as Partial<ImportedActivity>)} /><SelectField label="Status / color code" value={text((row as ImportedActivity).status_color)} options={colorOptions} onChange={(value) => updateRow("activities", row.id, { status_color: nullable(value) } as Partial<ImportedActivity>)} /><Field label="Remarks" value={text((row as ImportedActivity).remarks)} onChange={(value) => updateRow("activities", row.id, { remarks: nullable(value) } as Partial<ImportedActivity>)} /></div>}
                    {item.id === "progress" && <div className="grid gap-3 md:grid-cols-2"><Field label="Executive summary" value={text((row as ImportedProgress).executive_summary)} onChange={(value) => updateRow("progress", row.id, { executive_summary: nullable(value) } as Partial<ImportedProgress>)} /><Field label="Progress achieved" value={(row as ImportedProgress).narrative} onChange={(value) => updateRow("progress", row.id, { narrative: value } as Partial<ImportedProgress>)} /><Field label="Reporting period" value={text((row as ImportedProgress).reporting_period)} onChange={(value) => updateRow("progress", row.id, { reporting_period: nullable(value) } as Partial<ImportedProgress>)} /><Field label="Report date" type="date" value={(row as ImportedProgress).report_date} onChange={(value) => updateRow("progress", row.id, { report_date: value } as Partial<ImportedProgress>)} /><Field label="Completion percentage" type="number" value={numberField((row as ImportedProgress).progress_pct)} onChange={(value) => updateRow("progress", row.id, { progress_pct: percent(value) } as Partial<ImportedProgress>)} /><SelectField label="Status" value={(row as ImportedProgress).status} options={statusOptions} onChange={(value) => updateRow("progress", row.id, { status: value } as Partial<ImportedProgress>)} /><SelectField label="Status / color code" value={text((row as ImportedProgress).status_color)} options={colorOptions} onChange={(value) => updateRow("progress", row.id, { status_color: nullable(value) } as Partial<ImportedProgress>)} /><Field label="Remarks" value={text((row as ImportedProgress).remarks)} onChange={(value) => updateRow("progress", row.id, { remarks: nullable(value) } as Partial<ImportedProgress>)} /></div>}
                    {item.id === "challenges" && <div className="grid gap-3 md:grid-cols-2"><Field label="Risk/challenge description" value={(row as ImportedChallenge).description} onChange={(value) => updateRow("challenges", row.id, { description: value } as Partial<ImportedChallenge>)} /><SelectField label="Risk status / color code" value={text((row as ImportedChallenge).status_color || (row as ImportedChallenge).challenge_type)} options={colorOptions} onChange={(value) => updateRow("challenges", row.id, { status_color: nullable(value), challenge_type: value || "Risk" } as Partial<ImportedChallenge>)} /><Field label="Mitigation action" value={text((row as ImportedChallenge).mitigation_plan)} onChange={(value) => updateRow("challenges", row.id, { mitigation_plan: nullable(value) } as Partial<ImportedChallenge>)} /><SelectField label="Responsible officer" value={text((row as ImportedChallenge).responsible_officer)} options={["", ...members.map((member) => member.profiles?.id || "").filter(Boolean)]} onChange={(value) => updateRow("challenges", row.id, { responsible_officer: nullable(value) } as Partial<ImportedChallenge>)} /><Field label="Due date" type="date" value={text((row as ImportedChallenge).due_date)} onChange={(value) => updateRow("challenges", row.id, { due_date: nullable(value) } as Partial<ImportedChallenge>)} /></div>}
                    {item.id === "financial" && <div className="grid gap-3 md:grid-cols-2"><Field label="Budget item/category" value={(row as ImportedFinancial).expense_category} onChange={(value) => updateRow("financial", row.id, { expense_category: value } as Partial<ImportedFinancial>)} /><Field label="Approved budget" type="number" value={numberField((row as ImportedFinancial).approved_budget)} onChange={(value) => updateRow("financial", row.id, { approved_budget: money(value) } as Partial<ImportedFinancial>)} /><Field label="Expenditure to date" type="number" value={numberField((row as ImportedFinancial).amount)} onChange={(value) => updateRow("financial", row.id, { amount: money(value) ?? 0 } as Partial<ImportedFinancial>)} /><Field label="Balance" type="number" value={numberField((row as ImportedFinancial).balance)} onChange={(value) => updateRow("financial", row.id, { balance: money(value) } as Partial<ImportedFinancial>)} /><Field label="Percentage utilised" type="number" value={numberField((row as ImportedFinancial).percentage_utilised)} onChange={(value) => updateRow("financial", row.id, { percentage_utilised: money(value) } as Partial<ImportedFinancial>)} /><Field label="Remarks" value={text((row as ImportedFinancial).remarks)} onChange={(value) => updateRow("financial", row.id, { remarks: nullable(value), description: value || (row as ImportedFinancial).description } as Partial<ImportedFinancial>)} /></div>}
                    <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-border pt-3"><button type="button" onClick={() => resetRow(path)} disabled={!changed(path) || Boolean(busy)} className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-semibold disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" />Reset</button><button type="button" onClick={() => void deleteRow(item.id, row.id)} disabled={Boolean(busy)} className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Delete</button><button type="button" onClick={() => void saveRow(item.id, row.id)} disabled={!changed(path) || Boolean(busy)} className="inline-flex items-center gap-1 rounded bg-[#1a3a6b] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" />Save row</button></div>
                  </article>
                );
              })}
            </section>
          ))}
        </main>
      </section>
    </div>
  );
}
