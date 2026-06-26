import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, LoaderCircle, RefreshCw, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";
import { apiRequest } from "../../lib/api";
import { useProjectData, type Activity, type FinancialEntry, type ProjectMember } from "../ProjectDataContext";
import { parseWorkbookSheet, type FinancialPreview, type MilestonePreview, type ParsedSpreadsheetPreview, type RiskPreview } from "../importSpreadsheetParser";
import type { ProjectMembership } from "./ProjectSwitcher";

type WorkbookState = { workbook: XLSX.WorkBook; fileName: string; sheets: string[] } | null;
type ImportDuplicate = { type: "activity" | "financial" | "report"; label: string };

function nullable<T>(value: T | ""): T | null {
  return value === "" ? null : value;
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Missing";
  return String(value);
}

function money(value: number | ""): string {
  return value === "" ? "Missing" : `BWP ${Number(value).toLocaleString()}`;
}

function percent(value: number | ""): string {
  return value === "" ? "Missing" : `${value}%`;
}

function normalizeKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function chooseDate(...values: string[]): string {
  return values.find(Boolean) ?? today();
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

function sectionTable<T>({ title, rows, columns }: { title: string; rows: T[]; columns: Array<[string, (row: T) => string]> }) {
  return (
    <section className="overflow-hidden rounded-md border border-border">
      <div className="border-b border-border bg-secondary px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">No rows found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-secondary/60">
              <tr>{columns.map(([label]) => <th key={label} className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">{label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t border-border">
                  {columns.map(([label, render]) => <td key={label} className="px-3 py-2 align-top text-foreground">{render(row) || <span className="text-muted-foreground">Missing</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
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
  const [confirmUpdate, setConfirmUpdate] = useState(false);
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
    setConfirmUpdate(false);
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
    reader.onload = () => {
      try {
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
      return existing ? [{ type: "activity" as const, label: existing.name }] : [];
    });
    const financialDuplicates = nextPreview.financialRows.flatMap((row) => projectFinancial.some((entry) => normalizeKey(entry.expense_category) === normalizeKey(row.item) && Number(entry.amount) === Number(row.expenditureToDate)) ? [{ type: "financial" as const, label: row.item }] : []);
    return [...activityDuplicates, ...financialDuplicates].filter((item, index, all) => index === all.findIndex((candidate) => candidate.type === item.type && candidate.label === item.label));
  }

  async function findReportDuplicate(nextPreview: ParsedSpreadsheetPreview): Promise<ImportDuplicate[]> {
    const reportingPeriod = nextPreview.projectDetails.actualCompletionDate || nextPreview.projectDetails.plannedCompletionDate;
    if (!reportingPeriod) return [];
    const existing = await apiRequest<unknown[]>(`/projects/${selectedProjectId}/report-imports?reporting_period=${encodeURIComponent(reportingPeriod)}`);
    return existing.length > 0 ? [{ type: "report", label: `Report snapshot for ${reportingPeriod}` }] : [];
  }

  async function previewSheet(sheetName = selectedSheet) {
    if (!workbookState || !sheetName) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const parsed = parseWorkbookSheet(workbookState.workbook, sheetName, workbookState.fileName);
      setPreview(parsed);
      setDuplicates([...findDuplicates(parsed), ...await findReportDuplicate(parsed)]);
      setConfirmUpdate(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to preview this sheet.");
    } finally {
      setLoading(false);
    }
  }

  async function saveReportSnapshot(nextPreview: ParsedSpreadsheetPreview) {
    const firstMilestone = nextPreview.milestones[0];
    await apiRequest(`/projects/${selectedProjectId}/report-imports`, {
      method: "POST",
      body: JSON.stringify({
        source_file_name: nextPreview.sourceFileName,
        source_sheet_name: nextPreview.sourceSheetName,
        reporting_period: nullable(nextPreview.projectDetails.actualCompletionDate || nextPreview.projectDetails.plannedCompletionDate),
        project_name: nullable(nextPreview.projectDetails.projectName),
        project_manager: nullable(nextPreview.projectDetails.projectManager),
        start_date: nullable(nextPreview.projectDetails.actualStartDate || nextPreview.projectDetails.plannedStartDate),
        completion_date: nullable(nextPreview.projectDetails.actualCompletionDate || nextPreview.projectDetails.plannedCompletionDate),
        budget: nullable(nextPreview.projectDetails.allocatedBudget || nextPreview.projectDetails.estimatedBudget),
        executive_summary: nullable(firstMilestone?.executiveSummary || nextPreview.projectDetails.projectOverview),
        milestones: nextPreview.milestones.map((milestone) => milestone.name).filter(Boolean),
        progress_achieved: nullable(firstMilestone?.progressDescription || ""),
        percentage_completion: nullable(firstMilestone?.progressPercentage ?? ""),
        remarks: nullable(firstMilestone?.remarks || ""),
        risks: nullable(nextPreview.risks.map((risk) => risk.majorRisk).filter(Boolean).join("; ")),
        mitigation: nullable(nextPreview.risks.map((risk) => risk.mitigation).filter(Boolean).join("; ")),
        status: firstMilestone?.status || null,
        overwrite: confirmUpdate,
      }),
    });
  }

  async function createOrUpdateActivity(milestone: MilestonePreview, index: number, responsibleOfficer: string): Promise<Activity | null> {
    if (!milestone.name) return null;
    const existing = existingActivityFor(milestone, projectActivities);
    const body = {
      code: nextActivityCode(index),
      name: milestone.name,
      category: "Imported milestone",
      district: selectedProject?.projects.district || selectedMembership?.district || "Unspecified",
      responsible_officer: responsibleOfficer,
      start_date: chooseDate(preview?.projectDetails.actualStartDate || "", preview?.projectDetails.plannedStartDate || ""),
      end_date: chooseDate(milestone.plannedCompletionDate, preview?.projectDetails.actualCompletionDate || "", preview?.projectDetails.plannedCompletionDate || ""),
      status: importStatus(milestone),
      progress_pct: milestone.progressPercentage === "" ? 0 : milestone.progressPercentage,
    };
    if (existing) {
      if (!confirmUpdate) return existing;
      return apiRequest<Activity>(`/projects/${selectedProjectId}/activities/${existing.id}`, { method: "PATCH", body: JSON.stringify(body) });
    }
    return apiRequest<Activity>(`/projects/${selectedProjectId}/activities`, { method: "POST", body: JSON.stringify(body) });
  }

  function nextActivityCode(index: number): string {
    const codePrefix = preview?.projectDetails.projectCode || selectedProject?.projects.name || "IMP";
    const prefix = normalizeKey(codePrefix).slice(0, 8).toUpperCase() || "IMP";
    return `${prefix}-${String(index + 1).padStart(3, "0")}`;
  }

  async function confirmImport() {
    if (!preview || !selectedProjectId || preview.errors.length > 0 || (duplicates.length > 0 && !confirmUpdate)) return;
    const responsibleOfficer = firstOfficerId(projectMembers);
    if (!responsibleOfficer) {
      setError("Unable to import activities because this project has no active member to assign as responsible officer.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const activityMap = new Map<string, Activity>();
      for (const [index, milestone] of preview.milestones.entries()) {
        const activity = await createOrUpdateActivity(milestone, index, responsibleOfficer);
        if (activity) activityMap.set(normalizeKey(milestone.name), activity);
        if (activity && milestone.progressDescription) {
          await apiRequest(`/projects/${selectedProjectId}/progress-updates`, {
            method: "POST",
            body: JSON.stringify({
              activity_id: activity.id,
              progress_pct: milestone.progressPercentage === "" ? activity.progress_pct : milestone.progressPercentage,
              status: importStatus(milestone),
              narrative: milestone.progressDescription,
              report_date: chooseDate(preview.projectDetails.actualCompletionDate, preview.projectDetails.plannedCompletionDate),
            }),
          });
        }
      }
      const fallbackActivity = activityMap.values().next().value ?? projectActivities[0];
      for (const risk of preview.risks) {
        if (!fallbackActivity || !risk.majorRisk) continue;
        await apiRequest(`/projects/${selectedProjectId}/challenges`, {
          method: "POST",
          body: JSON.stringify({ activity_id: fallbackActivity.id, challenge_type: risk.statusColor || "Risk", description: risk.majorRisk, mitigation_plan: risk.mitigation || null, resolved: false }),
        });
      }
      for (const row of preview.financialRows) {
        if (!fallbackActivity || !row.item || row.expenditureToDate === "" || row.expenditureToDate <= 0) continue;
        await apiRequest(`/projects/${selectedProjectId}/financial-entries`, {
          method: "POST",
          body: JSON.stringify({ activity_id: fallbackActivity.id, expense_category: row.item, amount: row.expenditureToDate, description: `Approved budget: ${money(row.approvedBudget)}; Balance: ${money(row.balance)}; Utilised: ${percent(row.percentUtilised)}`, receipt_url: null }),
        });
      }
      await saveReportSnapshot(preview);
      if (selectedProjectId === projectId) await refresh();
      setMessage(`Imported ${preview.milestones.length} milestone rows, ${preview.risks.length} risk rows, and ${preview.financialRows.length} financial rows from ${preview.sourceSheetName}.`);
      setDuplicates([]);
      setConfirmUpdate(false);
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
  const projectRows = preview ? [
    ["Project Name", preview.projectDetails.projectName],
    ["Project Overview", preview.projectDetails.projectOverview],
    ["Project Manager", preview.projectDetails.projectManager],
    ["Project Code", preview.projectDetails.projectCode],
    ["Planned Start Date", preview.projectDetails.plannedStartDate],
    ["Actual Start Date", preview.projectDetails.actualStartDate],
    ["Planned Completion Date", preview.projectDetails.plannedCompletionDate],
    ["Actual Completion Date", preview.projectDetails.actualCompletionDate],
    ["Estimated Budget", money(preview.projectDetails.estimatedBudget)],
    ["Allocated Budget", money(preview.projectDetails.allocatedBudget)],
  ] : [];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#1a3a6b]/10 p-2.5"><FileSpreadsheet className="h-5 w-5 text-[#1a3a6b]" /></div>
            <div>
              <h2 className="font-bold text-foreground">Import spreadsheet</h2>
              <p className="mt-1 text-sm text-muted-foreground">Upload an .xlsx workbook, choose one sheet, review the extracted sections, then confirm the import.</p>
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
            <h3 className="font-semibold text-foreground">Preview</h3>
            <p className="text-xs text-muted-foreground">{selectedProject ? `Target project: ${selectedProject.projects.name}` : "Choose a target project."}</p>
          </div>

          {!preview ? <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Select a workbook sheet to preview extracted data.</p> : (
            <>
              {preview.errors.length > 0 && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"><p className="font-semibold">Fix these validation errors before importing:</p><ul className="mt-2 list-disc space-y-1 pl-5">{preview.errors.map((item) => <li key={item}>{item}</li>)}</ul></div>}
              {preview.warnings.length > 0 && <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><p className="font-semibold">Some optional information was not found.</p><p className="mt-1">The preview can still be imported. Missing fields: {preview.warnings.join(", ")}.</p></div>}
              {duplicates.length > 0 && <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><label className="flex gap-2"><input type="checkbox" checked={confirmUpdate} onChange={(event) => setConfirmUpdate(event.target.checked)} />{duplicates.length} matching row(s) already exist. Update matching activities and continue importing new rows.</label></div>}

              <section className="overflow-hidden rounded-md border border-border">
                <div className="border-b border-border bg-secondary px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Project Details</div>
                <div className="grid sm:grid-cols-2">
                  {projectRows.map(([label, value]) => <div key={label} className="grid grid-cols-[150px_1fr] border-b border-border last:border-b-0 sm:border-r sm:last:border-r-0"><div className="bg-secondary/60 px-3 py-2 text-xs font-semibold text-muted-foreground">{label}</div><div className="px-3 py-2 text-sm text-foreground">{display(value)}</div></div>)}
                </div>
              </section>

              {sectionTable<MilestonePreview>({
                title: "Milestones / Activities",
                rows: preview.milestones,
                columns: [["Milestone", (row) => row.name], ["Planned Completion", (row) => display(row.plannedCompletionDate)], ["Colour", (row) => display(row.statusColor)], ["Status", (row) => display(importStatus(row))], ["Remarks", (row) => display(row.remarks)]],
              })}
              {sectionTable<MilestonePreview>({
                title: "Progress Updates",
                rows: preview.milestones,
                columns: [["Executive Summary", (row) => display(row.executiveSummary)], ["Milestone", (row) => row.name], ["Progress Achieved", (row) => row.progressDescription], ["Completion", (row) => percent(row.progressPercentage)]],
              })}
              {sectionTable<RiskPreview>({
                title: "Risks / Challenges",
                rows: preview.risks,
                columns: [["Major Risk", (row) => row.majorRisk], ["Status", (row) => display(row.statusColor)], ["Mitigation", (row) => display(row.mitigation)]],
              })}
              {sectionTable<FinancialPreview>({
                title: "Financial Status",
                rows: preview.financialRows,
                columns: [["Item", (row) => row.item], ["Approved Budget", (row) => money(row.approvedBudget)], ["Expenditure To Date", (row) => money(row.expenditureToDate)], ["Balance", (row) => money(row.balance)], ["Utilised", (row) => percent(row.percentUtilised)]],
              })}

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setPreview(null)} className="rounded-md border border-border px-4 py-2 text-sm font-semibold">Choose another sheet</button>
                <button type="button" onClick={confirmImport} disabled={loading || preview.errors.length > 0 || !selectedProjectId || (duplicates.length > 0 && !confirmUpdate)} className="rounded-md bg-[#1a3a6b] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Saving..." : "Confirm Import"}</button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
