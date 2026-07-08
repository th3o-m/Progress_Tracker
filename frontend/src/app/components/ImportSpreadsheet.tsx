import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, LoaderCircle, RefreshCw, Upload, X } from "lucide-react";
import type { WorkBook } from "xlsx";
import { apiRequest } from "../../lib/api";
import { useProjectData, type Activity, type FinancialEntry, type ProjectMember } from "../ProjectDataContext";
import { parseWorkbookSheet, type FinancialPreview, type MilestonePreview, type ParsedSpreadsheetPreview, type ProjectDetailsPreview, type RiskPreview } from "../importSpreadsheetParser";
import type { ProjectMembership } from "./ProjectSwitcher";

type WorkbookState = { workbook: WorkBook; fileName: string; sheets: string[] } | null;
type DuplicateMode = "skip" | "update" | "new";
type ImportDuplicate = { type: "activity" | "financial" | "report"; label: string; id?: string };
type ReportImportRecord = { id: string; review_status?: string };

const inputClass = "w-full min-w-[120px] rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#1a3a6b]";
const statuses = ["", "Not Started", "In Progress", "Completed", "On Hold"] as const;

function nullable<T>(value: T | ""): T | null {
  return value === "" ? null : value;
}

function definedPayload(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function normalizeKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function numberValue(value: number | ""): string {
  return value === "" ? "" : String(value);
}

function parseEditableNumber(value: string): number | "" {
  if (!value.trim()) return "";
  const parsed = Number(value.replace(/,/g, "").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : "";
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function chooseDate(...values: string[]): string {
  return values.find(Boolean) ?? today();
}

function displayMoney(value: number | ""): string {
  return value === "" ? "Missing" : `BWP ${Number(value).toLocaleString()}`;
}

function displayPercent(value: number | ""): string {
  return value === "" ? "Missing" : `${value}%`;
}

function importStatus(milestone: MilestonePreview): string {
  return milestone.status || (milestone.progressPercentage === 100 ? "Completed" : milestone.progressPercentage === "" || milestone.progressPercentage === 0 ? "Not Started" : "In Progress");
}

function firstOfficerId(members: ProjectMember[]): string {
  return members.find((member) => member.profiles?.active)?.profiles?.id ?? members.find((member) => member.profiles)?.profiles?.id ?? "";
}

function existingActivityFor(milestone: MilestonePreview, activities: Activity[]): Activity | undefined {
  const nameKey = normalizeKey(milestone.name);
  if (!nameKey) return undefined;
  return activities.find((activity) => normalizeKey(activity.name) === nameKey || normalizeKey(activity.code) === nameKey);
}

function existingFinancialFor(row: FinancialPreview, entries: FinancialEntry[]): FinancialEntry | undefined {
  return entries.find((entry) => normalizeKey(entry.expense_category) === normalizeKey(row.item) && Number(entry.amount) === Number(row.expenditureToDate));
}

function hasProjectDetails(details: ProjectDetailsPreview): boolean {
  return Object.values(details).some((value) => value !== "");
}

function hasUsableData(preview: ParsedSpreadsheetPreview | null): boolean {
  if (!preview) return false;
  return hasProjectDetails(preview.projectDetails) || preview.milestones.length > 0 || preview.risks.length > 0 || preview.financialRows.length > 0;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">{label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} mt-1`} />
    </label>
  );
}

export function ImportSpreadsheet({ memberships }: { memberships: ProjectMembership[] }) {
  const { projectId, refresh } = useProjectData();
  const managerProjects = useMemo(() => memberships.filter((item) => item.role === "admin" || item.role === "supervisor"), [memberships]);
  const [workbookState, setWorkbookState] = useState<WorkbookState>(null);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || managerProjects[0]?.projects.id || "");
  const [projectActivities, setProjectActivities] = useState<Activity[]>([]);
  const [projectFinancial, setProjectFinancial] = useState<FinancialEntry[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ParsedSpreadsheetPreview | null>(null);
  const [duplicates, setDuplicates] = useState<ImportDuplicate[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>("skip");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId && projectId) setSelectedProjectId(projectId);
  }, [projectId, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    let cancelled = false;
    async function loadSelectedProjectData() {
      try {
        const [nextActivities, nextFinancial, nextMembers] = await Promise.all([
          apiRequest<Activity[]>(`/projects/${selectedProjectId}/activities`),
          apiRequest<FinancialEntry[]>(`/projects/${selectedProjectId}/financial-entries`),
          apiRequest<ProjectMember[]>(`/projects/${selectedProjectId}/members`),
        ]);
        if (!cancelled) {
          setProjectActivities(nextActivities);
          setProjectFinancial(nextFinancial);
          setProjectMembers(nextMembers);
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to load selected project data.");
      }
    }
    void loadSelectedProjectData();
    return () => { cancelled = true; };
  }, [selectedProjectId]);

  function resetImport() {
    setWorkbookState(null);
    setSelectedSheet("");
    setPreview(null);
    setDuplicates([]);
    setDuplicateMode("skip");
    setUploadProgress(0);
    setMessage(null);
    setError(null);
  }

  function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    resetImport();
    setLoading(true);
    const reader = new FileReader();
    reader.onprogress = (progress) => progress.lengthComputable && setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
    reader.onerror = () => { setError("Unable to read the workbook."); setLoading(false); };
    reader.onload = async () => {
      try {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(reader.result, { type: "array", cellDates: true });
        setWorkbookState({ workbook, fileName: file.name, sheets: workbook.SheetNames });
        setSelectedSheet(workbook.SheetNames[0] ?? "");
        setUploadProgress(100);
      } catch {
        setError("The file could not be parsed as an .xlsx workbook.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = "";
  }

  function findDuplicates(nextPreview: ParsedSpreadsheetPreview): ImportDuplicate[] {
    const activityDuplicates = nextPreview.milestones.flatMap((milestone) => {
      const existing = existingActivityFor(milestone, projectActivities);
      return existing ? [{ type: "activity" as const, label: existing.name, id: existing.id }] : [];
    });
    const financialDuplicates = nextPreview.financialRows.flatMap((row) => {
      const existing = existingFinancialFor(row, projectFinancial);
      return existing ? [{ type: "financial" as const, label: row.item, id: existing.id }] : [];
    });
    return [...activityDuplicates, ...financialDuplicates].filter((item, index, all) => index === all.findIndex((candidate) => candidate.type === item.type && candidate.label === item.label));
  }

  async function findReportDuplicate(nextPreview: ParsedSpreadsheetPreview): Promise<ImportDuplicate[]> {
    const reportingPeriod = nextPreview.projectDetails.actualCompletionDate || nextPreview.projectDetails.plannedCompletionDate;
    if (!reportingPeriod) return [];
    try {
      const existing = await apiRequest<Array<{ id: string }>>(`/projects/${selectedProjectId}/report-imports?reporting_period=${encodeURIComponent(reportingPeriod)}`);
      return existing.length > 0 ? [{ type: "report", label: `Report snapshot for ${reportingPeriod}`, id: existing[0]?.id }] : [];
    } catch (requestError) {
      console.warn("Import history duplicate lookup failed; continuing without history duplicate checks.", requestError);
      return [];
    }
  }

  async function previewSheet(sheetName = selectedSheet) {
    if (!workbookState || !sheetName) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const XLSX = await import("xlsx");
      const parsed = parseWorkbookSheet(workbookState.workbook, sheetName, workbookState.fileName, XLSX.utils);
      setPreview(parsed);
      setDuplicates([...findDuplicates(parsed), ...await findReportDuplicate(parsed)]);
      setDuplicateMode("skip");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to preview this sheet.");
    } finally {
      setLoading(false);
    }
  }

  function blockingErrors(): string[] {
    return [
      !selectedProjectId ? "Select a project before importing." : "",
      !selectedSheet ? "Select a worksheet before importing." : "",
      !hasUsableData(preview) ? "No usable spreadsheet data was extracted. Add at least one project detail, milestone, risk, or financial row before importing." : "",
    ].filter(Boolean);
  }

  function warnings(): string[] {
    const items = [...(preview?.warnings ?? [])];
    if (!preview?.projectDetails.projectName) items.push("Project Name is blank.");
    if (duplicates.length > 0) items.push(`${duplicates.length} possible duplicate row(s) detected.`);
    if (preview && !firstOfficerId(projectMembers) && (preview.milestones.length > 0 || preview.risks.length > 0 || preview.financialRows.length > 0)) {
      items.push("No active project member was found. Operational rows that require an activity assignment may be skipped, but the report snapshot can still be saved.");
    }
    return [...new Set(items)];
  }

  function updateDetails<K extends keyof ProjectDetailsPreview>(key: K, value: ProjectDetailsPreview[K]) {
    setPreview((current) => current ? { ...current, projectDetails: { ...current.projectDetails, [key]: value } } : current);
  }

  function updateMilestone(index: number, patch: Partial<MilestonePreview>) {
    setPreview((current) => current ? { ...current, milestones: current.milestones.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) } : current);
  }

  function updateRisk(index: number, patch: Partial<RiskPreview>) {
    setPreview((current) => current ? { ...current, risks: current.risks.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) } : current);
  }

  function updateFinancial(index: number, patch: Partial<FinancialPreview>) {
    setPreview((current) => current ? { ...current, financialRows: current.financialRows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) } : current);
  }

  function removeRow(section: "milestones" | "risks" | "financialRows", index: number) {
    setPreview((current) => current ? { ...current, [section]: current[section].filter((_, rowIndex) => rowIndex !== index) } : current);
  }

  function addMilestone() {
    setPreview((current) => current ? { ...current, milestones: [...current.milestones, { executiveSummary: "", name: "Imported milestone", plannedCompletionDate: "", progressDescription: "", progressPercentage: "", statusColor: "", status: "", remarks: "" }] } : current);
  }

  function addRisk() {
    setPreview((current) => current ? { ...current, risks: [...current.risks, { majorRisk: "", statusColor: "", mitigation: "" }] } : current);
  }

  function addFinancialRow() {
    setPreview((current) => current ? { ...current, financialRows: [...current.financialRows, { item: "", approvedBudget: "", expenditureToDate: "", balance: "", percentUtilised: "" }] } : current);
  }

  async function saveReportSnapshot(nextPreview: ParsedSpreadsheetPreview): Promise<ReportImportRecord | null> {
    const reportDuplicate = duplicates.some((item) => item.type === "report");
    if (reportDuplicate && duplicateMode !== "update") {
      const existingId = duplicates.find((item) => item.type === "report")?.id;
      if (existingId) return { id: existingId };
      console.warn("Import history duplicate was detected, but the existing import could not be identified. Continuing without import history.");
      return null;
    }
    const previewData = {
      projectDetails: nextPreview.projectDetails,
      milestones: nextPreview.milestones,
      risks: nextPreview.risks,
      financialRows: nextPreview.financialRows,
    };
    try {
      return await apiRequest<ReportImportRecord>(`/projects/${selectedProjectId}/report-imports`, {
        method: "POST",
        body: JSON.stringify({
          source_file_name: nullable(nextPreview.sourceFileName),
          source_sheet_name: nullable(nextPreview.sourceSheetName),
          reporting_period: nullable(nextPreview.projectDetails.actualCompletionDate || nextPreview.projectDetails.plannedCompletionDate),
          import_type: "excel",
          selected_project_id: selectedProjectId,
          selected_sheet: nullable(nextPreview.sourceSheetName),
          file_name: nullable(nextPreview.sourceFileName),
          imported_rows_count: nextPreview.milestones.length + nextPreview.risks.length + nextPreview.financialRows.length,
          import_status: "completed",
          blocking_errors: blockingErrors(),
          warnings: warnings(),
          preview_data: previewData,
          raw_data: { rawRows: nextPreview.rawRows ?? [] },
          raw_preview_json: { ...previewData, rawRows: nextPreview.rawRows ?? [] },
          overwrite: duplicateMode === "update",
        }),
      });
    } catch (requestError) {
      console.warn("Import history save failed; continuing with spreadsheet import.", requestError);
      return null;
    }
  }

  async function updateSelectedProjectDetails(nextPreview: ParsedSpreadsheetPreview): Promise<boolean> {
    const details = nextPreview.projectDetails;
    const body = definedPayload({
      name: details.projectName || undefined,
      description: details.projectOverview || undefined,
      start_date: details.actualStartDate || details.plannedStartDate || undefined,
      end_date: details.actualCompletionDate || details.plannedCompletionDate || undefined,
      project_code: details.projectCode || null,
      project_manager: details.projectManager || null,
      planned_start_date: details.plannedStartDate || null,
      actual_start_date: details.actualStartDate || null,
      planned_completion_date: details.plannedCompletionDate || null,
      actual_completion_date: details.actualCompletionDate || null,
      estimated_budget: nullable(details.estimatedBudget),
      allocated_budget: nullable(details.allocatedBudget),
    });
    if (Object.keys(body).length === 0) return true;
    try {
      await apiRequest(`/projects/${selectedProjectId}`, { method: "PATCH", body: JSON.stringify(body) });
      return true;
    } catch (requestError) {
      console.warn("Project detail update failed; continuing with row import.", requestError);
      return false;
    }
  }

  async function createPlaceholderActivity(responsibleOfficer: string, importId: string | null): Promise<Activity | null> {
    if (!responsibleOfficer) return null;
    const body = {
      code: nextActivityCode(999),
      name: "Imported milestone",
      category: "Imported milestone",
      district: selectedProject?.projects.district || selectedMembership?.district || "Unspecified",
      responsible_officer: responsibleOfficer,
      start_date: chooseDate(preview?.projectDetails.actualStartDate || "", preview?.projectDetails.plannedStartDate || ""),
      end_date: chooseDate(preview?.projectDetails.actualCompletionDate || "", preview?.projectDetails.plannedCompletionDate || ""),
      status: "Not Started",
      progress_pct: 0,
      import_id: importId,
    };
    return apiRequest<Activity>(`/projects/${selectedProjectId}/activities`, { method: "POST", body: JSON.stringify(body) });
  }

  async function createOrUpdateActivity(milestone: MilestonePreview, index: number, responsibleOfficer: string, importId: string | null): Promise<Activity | null> {
    if (!responsibleOfficer) return null;
    const existing = existingActivityFor(milestone, projectActivities);
    if (existing && duplicateMode === "skip") return existing;
    const body = {
      code: nextActivityCode(index),
      name: milestone.name || "Imported milestone",
      category: "Imported milestone",
      district: selectedProject?.projects.district || selectedMembership?.district || "Unspecified",
      responsible_officer: responsibleOfficer,
      start_date: chooseDate(preview?.projectDetails.actualStartDate || "", preview?.projectDetails.plannedStartDate || ""),
      end_date: chooseDate(milestone.plannedCompletionDate, preview?.projectDetails.actualCompletionDate || "", preview?.projectDetails.plannedCompletionDate || ""),
      status: importStatus(milestone),
      progress_pct: milestone.progressPercentage === "" ? 0 : milestone.progressPercentage,
      import_id: importId,
      description: milestone.progressDescription || milestone.executiveSummary || null,
      status_color: milestone.statusColor || null,
      remarks: milestone.remarks || null,
      actual_completion_date: milestone.progressPercentage === 100 ? (milestone.plannedCompletionDate || preview?.projectDetails.actualCompletionDate || null) : null,
    };
    if (existing && duplicateMode === "update") return apiRequest<Activity>(`/projects/${selectedProjectId}/activities/${existing.id}`, { method: "PATCH", body: JSON.stringify(body) });
    return apiRequest<Activity>(`/projects/${selectedProjectId}/activities`, { method: "POST", body: JSON.stringify(body) });
  }

  function nextActivityCode(index: number): string {
    const codePrefix = preview?.projectDetails.projectCode || selectedProject?.projects.name || "IMP";
    const prefix = normalizeKey(codePrefix).slice(0, 8).toUpperCase() || "IMP";
    return `${prefix}-${Date.now().toString().slice(-6)}-${String(index + 1).padStart(3, "0")}`;
  }

  async function saveFinancialRow(row: FinancialPreview, fallbackActivity: Activity, importId: string | null) {
    if (!row.item) return;
    const existing = existingFinancialFor(row, projectFinancial);
    if (existing && duplicateMode === "skip") return;
    const body = {
      activity_id: fallbackActivity.id,
      expense_category: row.item || "",
      amount: row.expenditureToDate === "" || row.expenditureToDate <= 0 ? 0 : row.expenditureToDate,
      description: `Approved budget: ${displayMoney(row.approvedBudget)}; Balance: ${displayMoney(row.balance)}; Utilised: ${displayPercent(row.percentUtilised)}`,
      receipt_url: null,
      import_id: importId,
      approved_budget: nullable(row.approvedBudget),
      balance: nullable(row.balance),
      percentage_utilised: nullable(row.percentUtilised),
      remarks: "",
    };
    if (existing && duplicateMode === "update") await apiRequest(`/projects/${selectedProjectId}/financial-entries/${existing.id}`, { method: "PATCH", body: JSON.stringify(body) });
    else await apiRequest(`/projects/${selectedProjectId}/financial-entries`, { method: "POST", body: JSON.stringify(body) });
  }

  async function confirmImport() {
    const blockers = blockingErrors();
    if (!preview || blockers.length > 0) return;
    const responsibleOfficer = firstOfficerId(projectMembers);
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const importRecord = await saveReportSnapshot(preview);
      const importId = importRecord?.id ?? null;
      const projectUpdated = await updateSelectedProjectDetails(preview);
      const activityMap = new Map<string, Activity>();
      for (const [index, milestone] of preview.milestones.entries()) {
        const activity = await createOrUpdateActivity(milestone, index, responsibleOfficer, importId);
        if (activity) activityMap.set(normalizeKey(milestone.name || "Imported milestone"), activity);
        if (activity) {
          await apiRequest(`/projects/${selectedProjectId}/progress-updates`, {
            method: "POST",
            body: JSON.stringify({
              activity_id: activity.id,
              progress_pct: milestone.progressPercentage === "" ? activity.progress_pct || 0 : milestone.progressPercentage,
              status: importStatus(milestone),
              narrative: milestone.progressDescription || milestone.executiveSummary || milestone.remarks || "Imported progress update",
              report_date: chooseDate(preview.projectDetails.actualCompletionDate, preview.projectDetails.plannedCompletionDate),
              import_id: importId,
              executive_summary: milestone.executiveSummary || null,
              status_color: milestone.statusColor || null,
              remarks: milestone.remarks || null,
              reporting_period: preview.projectDetails.actualCompletionDate || preview.projectDetails.plannedCompletionDate || null,
            }),
          });
        }
      }
      let fallbackActivity = activityMap.values().next().value ?? projectActivities[0] ?? null;
      if (!fallbackActivity && (preview.risks.length > 0 || preview.financialRows.length > 0)) fallbackActivity = await createPlaceholderActivity(responsibleOfficer, importId);
      if (fallbackActivity) {
        for (const risk of preview.risks) {
          if (!risk.majorRisk) continue;
          await apiRequest(`/projects/${selectedProjectId}/challenges`, {
            method: "POST",
            body: JSON.stringify({ activity_id: fallbackActivity.id, challenge_type: risk.statusColor || "Risk", description: risk.majorRisk, mitigation_plan: risk.mitigation || "", resolved: false, import_id: importId, status_color: risk.statusColor || null, responsible_officer: responsibleOfficer || null }),
          });
        }
        for (const row of preview.financialRows) await saveFinancialRow(row, fallbackActivity, importId);
      }
      if (selectedProjectId === projectId) await refresh();
      setMessage(`Imported available data from ${preview.sourceSheetName}. Project tables were refreshed through the same APIs used by the app pages.${projectUpdated ? "" : " Project detail update failed, but row data was kept."}${importId ? " Use Imported Data Review to inspect and correct this import." : " Import history logging failed, but the spreadsheet data was still saved."}`);
      setDuplicates([]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save imported data.");
    } finally {
      setLoading(false);
    }
  }

  if (managerProjects.length === 0) {
    return <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">Project admin or supervisor access is required to import spreadsheets.</div>;
  }

  const selectedProject = managerProjects.find((item) => item.projects.id === selectedProjectId);
  const selectedMembership = memberships.find((item) => item.projects.id === selectedProjectId);
  const blockers = blockingErrors();
  const warningItems = warnings();

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#1a3a6b]/10 p-2.5"><FileSpreadsheet className="h-5 w-5 text-[#1a3a6b]" /></div>
            <div>
              <h2 className="font-bold text-foreground">Import spreadsheet</h2>
              <p className="mt-1 text-sm text-muted-foreground">Upload an .xlsx workbook, edit the extracted data, then import the usable rows.</p>
            </div>
          </div>
          <button type="button" onClick={resetImport} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"><X className="h-3.5 w-3.5" />Cancel</button>
        </div>
      </section>

      {(message || error) && <div className={`flex items-start gap-3 rounded-md border p-4 text-sm ${message ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>{message ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}<span>{message || error}</span></div>}

      <section className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
          <label className="block text-sm font-medium text-foreground">Project
            <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              {managerProjects.map((item) => <option key={item.projects.id} value={item.projects.id}>{item.projects.name} ({item.role})</option>)}
            </select>
          </label>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-8 text-center hover:bg-secondary">
            <Upload className="h-7 w-7 text-[#1a3a6b]" />
            <span className="mt-3 text-sm font-semibold text-foreground">Upload .xlsx workbook</span>
            <span className="mt-1 text-xs text-muted-foreground">All sheet names will be available after upload.</span>
            <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={uploadFile} className="sr-only" />
          </label>

          {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Processing workbook...</div>}
          {uploadProgress > 0 && <div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-[#1a3a6b]" style={{ width: `${uploadProgress}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{uploadProgress}% uploaded</p></div>}

          {workbookState && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted-foreground">{workbookState.fileName}</p>
              <label className="block text-sm font-medium text-foreground">Sheet
                <select value={selectedSheet} onChange={(event) => { setSelectedSheet(event.target.value); void previewSheet(event.target.value); }} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {workbookState.sheets.map((sheet) => <option key={sheet} value={sheet}>{sheet}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => void previewSheet()} disabled={loading || !selectedSheet} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Preview selected sheet
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
          <div>
            <h3 className="font-semibold text-foreground">Editable Preview</h3>
            <p className="text-xs text-muted-foreground">{selectedProject ? `Target project: ${selectedProject.projects.name}` : "Choose a target project."}</p>
          </div>

          {!preview ? <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Select a workbook sheet to preview extracted data.</p> : (
            <>
              {blockers.length > 0 && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"><p className="font-semibold">Blocking errors:</p><ul className="mt-2 list-disc space-y-1 pl-5">{blockers.map((item) => <li key={item}>{item}</li>)}</ul></div>}
              {warningItems.length > 0 && <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><p className="font-semibold">Warnings:</p><ul className="mt-2 list-disc space-y-1 pl-5">{warningItems.map((item) => <li key={item}>{item}</li>)}</ul></div>}
              {duplicates.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="font-semibold">Duplicate handling</p>
                  <select value={duplicateMode} onChange={(event) => setDuplicateMode(event.target.value as DuplicateMode)} className="mt-2 rounded-md border border-amber-300 bg-white px-2 py-1 text-sm">
                    <option value="skip">Skip duplicates</option>
                    <option value="update">Update existing</option>
                    <option value="new">Import as new</option>
                  </select>
                </div>
              )}

              <section className="rounded-md border border-border p-3">
                <h4 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Project Details</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Project Name" value={preview.projectDetails.projectName} onChange={(value) => updateDetails("projectName", value)} />
                  <Field label="Project Code" value={preview.projectDetails.projectCode} onChange={(value) => updateDetails("projectCode", value)} />
                  <Field label="Project Manager" value={preview.projectDetails.projectManager} onChange={(value) => updateDetails("projectManager", value)} />
                  <Field label="Planned Start Date" type="date" value={preview.projectDetails.plannedStartDate} onChange={(value) => updateDetails("plannedStartDate", value)} />
                  <Field label="Actual Start Date" type="date" value={preview.projectDetails.actualStartDate} onChange={(value) => updateDetails("actualStartDate", value)} />
                  <Field label="Planned Completion Date" type="date" value={preview.projectDetails.plannedCompletionDate} onChange={(value) => updateDetails("plannedCompletionDate", value)} />
                  <Field label="Actual Completion Date" type="date" value={preview.projectDetails.actualCompletionDate} onChange={(value) => updateDetails("actualCompletionDate", value)} />
                  <Field label="Estimated Budget" type="number" value={numberValue(preview.projectDetails.estimatedBudget)} onChange={(value) => updateDetails("estimatedBudget", parseEditableNumber(value))} />
                  <Field label="Allocated Budget" type="number" value={numberValue(preview.projectDetails.allocatedBudget)} onChange={(value) => updateDetails("allocatedBudget", parseEditableNumber(value))} />
                  <label className="block text-xs font-medium text-muted-foreground md:col-span-2">Project Overview
                    <textarea value={preview.projectDetails.projectOverview} onChange={(event) => updateDetails("projectOverview", event.target.value)} rows={3} className={`${inputClass} mt-1`} />
                  </label>
                </div>
              </section>

              <section className="space-y-3 rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3"><h4 className="text-xs font-semibold uppercase text-muted-foreground">Milestones / Activities and Progress</h4><button type="button" onClick={addMilestone} className="rounded border border-border px-2 py-1 text-xs font-semibold">Add row</button></div>
                {preview.milestones.length === 0 ? <p className="text-sm text-muted-foreground">No milestone rows found.</p> : preview.milestones.map((row, index) => (
                  <div key={index} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-2">
                    <Field label="Milestone title" value={row.name} onChange={(value) => updateMilestone(index, { name: value || "Imported milestone" })} />
                    <Field label="Planned completion" type="date" value={row.plannedCompletionDate} onChange={(value) => updateMilestone(index, { plannedCompletionDate: value })} />
                    <Field label="Completion %" type="number" value={numberValue(row.progressPercentage)} onChange={(value) => updateMilestone(index, { progressPercentage: parseEditableNumber(value) })} />
                    <label className="block text-xs font-medium text-muted-foreground">Status
                      <select value={row.status} onChange={(event) => updateMilestone(index, { status: event.target.value as MilestonePreview["status"] })} className={`${inputClass} mt-1`}>
                        {statuses.map((status) => <option key={status} value={status}>{status || "Blank"}</option>)}
                      </select>
                    </label>
                    <Field label="Color code" value={row.statusColor} onChange={(value) => updateMilestone(index, { statusColor: value })} />
                    <Field label="Remarks" value={row.remarks} onChange={(value) => updateMilestone(index, { remarks: value })} />
                    <label className="block text-xs font-medium text-muted-foreground md:col-span-2">Executive Summary
                      <textarea value={row.executiveSummary} onChange={(event) => updateMilestone(index, { executiveSummary: event.target.value })} rows={2} className={`${inputClass} mt-1`} />
                    </label>
                    <label className="block text-xs font-medium text-muted-foreground md:col-span-2">Progress Achieved
                      <textarea value={row.progressDescription} onChange={(event) => updateMilestone(index, { progressDescription: event.target.value })} rows={2} className={`${inputClass} mt-1`} />
                    </label>
                    <div className="md:col-span-2"><button type="button" onClick={() => removeRow("milestones", index)} className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700">Remove row</button></div>
                  </div>
                ))}
              </section>

              <section className="space-y-3 rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3"><h4 className="text-xs font-semibold uppercase text-muted-foreground">Risks / Challenges</h4><button type="button" onClick={addRisk} className="rounded border border-border px-2 py-1 text-xs font-semibold">Add row</button></div>
                {preview.risks.length === 0 ? <p className="text-sm text-muted-foreground">No risk rows found.</p> : preview.risks.map((row, index) => (
                  <div key={index} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-2">
                    <Field label="Major Risk" value={row.majorRisk} onChange={(value) => updateRisk(index, { majorRisk: value })} />
                    <Field label="Status / color" value={row.statusColor} onChange={(value) => updateRisk(index, { statusColor: value })} />
                    <label className="block text-xs font-medium text-muted-foreground md:col-span-2">Mitigation
                      <textarea value={row.mitigation} onChange={(event) => updateRisk(index, { mitigation: event.target.value })} rows={2} className={`${inputClass} mt-1`} />
                    </label>
                    <div className="md:col-span-2"><button type="button" onClick={() => removeRow("risks", index)} className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700">Remove row</button></div>
                  </div>
                ))}
              </section>

              <section className="space-y-3 rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3"><h4 className="text-xs font-semibold uppercase text-muted-foreground">Financial Status</h4><button type="button" onClick={addFinancialRow} className="rounded border border-border px-2 py-1 text-xs font-semibold">Add row</button></div>
                {preview.financialRows.length === 0 ? <p className="text-sm text-muted-foreground">No financial rows found.</p> : preview.financialRows.map((row, index) => (
                  <div key={index} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-2">
                    <Field label="Item" value={row.item} onChange={(value) => updateFinancial(index, { item: value })} />
                    <Field label="Approved Budget" type="number" value={numberValue(row.approvedBudget)} onChange={(value) => updateFinancial(index, { approvedBudget: parseEditableNumber(value) })} />
                    <Field label="Expenditure to date" type="number" value={numberValue(row.expenditureToDate)} onChange={(value) => updateFinancial(index, { expenditureToDate: parseEditableNumber(value) })} />
                    <Field label="Balance" type="number" value={numberValue(row.balance)} onChange={(value) => updateFinancial(index, { balance: parseEditableNumber(value) })} />
                    <Field label="% Utilised" type="number" value={numberValue(row.percentUtilised)} onChange={(value) => updateFinancial(index, { percentUtilised: parseEditableNumber(value) })} />
                    <div className="md:col-span-2"><button type="button" onClick={() => removeRow("financialRows", index)} className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700">Remove row</button></div>
                  </div>
                ))}
              </section>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setPreview(null)} className="rounded-md border border-border px-4 py-2 text-sm font-semibold">Choose another sheet</button>
                <button type="button" onClick={confirmImport} disabled={loading || blockers.length > 0} className="rounded-md bg-[#1a3a6b] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Saving..." : "Confirm Import"}</button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
