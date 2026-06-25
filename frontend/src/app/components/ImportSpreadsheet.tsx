import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, LoaderCircle, RefreshCw, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";
import { apiRequest, ApiRequestError } from "../../lib/api";
import type { ProjectMembership } from "./ProjectSwitcher";

interface ImportedReport {
  source_file_name: string;
  source_sheet_name: string;
  reporting_period: string;
  project_name: string;
  project_manager: string;
  start_date: string;
  completion_date: string;
  budget: number | "";
  executive_summary: string;
  milestones: string[];
  progress_achieved: string;
  percentage_completion: number | "";
  remarks: string | null;
  risks: string | null;
  mitigation: string | null;
  status: "Not Started" | "In Progress" | "Completed" | "On Hold" | null;
  status_input?: string;
}

type WorkbookState = { workbook: XLSX.WorkBook; fileName: string; sheets: string[] } | null;
type ImportField = Exclude<keyof ImportedReport, "source_file_name" | "source_sheet_name" | "status_input">;

const allowedStatuses = ["Not Started", "In Progress", "Completed", "On Hold"] as const;
const aliases: Record<ImportField, string[]> = {
  reporting_period: ["reporting period", "report period", "period", "report date", "reporting date", "as at", "as of"],
  project_name: ["project name", "name of project", "project title", "title of project", "project"],
  project_manager: ["project manager", "manager", "project officer", "responsible officer", "project lead", "coordinator"],
  start_date: ["start date", "commencement date", "project start date", "date started", "implementation start date", "effective date"],
  completion_date: ["completion date", "end date", "project completion date", "planned completion date", "finish date", "closing date"],
  budget: ["budget", "approved budget", "total budget", "budget bwp", "project budget", "contract amount", "project cost", "allocated budget"],
  executive_summary: ["executive summary", "summary", "project summary", "overview"],
  milestones: ["milestones", "milestone", "key milestones", "deliverables"],
  progress_achieved: ["progress achieved", "achievements", "progress", "work completed", "progress to date"],
  percentage_completion: ["percentage completion", "percent completion", "% completion", "completion percentage", "completion %", "% complete", "percentage complete"],
  remarks: ["remarks", "comments", "notes"],
  risks: ["risks", "risk", "challenges", "issues"],
  mitigation: ["mitigation", "mitigation plan", "risk mitigation", "remedial action", "corrective action"],
  status: ["status", "project status"],
};

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9%]+/g, " ").replace(/\s+/g, " ").trim();
}

function cellText(value: unknown): string {
  if (value instanceof Date) return toDate(value);
  return String(value ?? "").trim();
}

function toDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const raw = cellText(value);
  if (!raw) return "";
  const native = new Date(raw);
  if (!Number.isNaN(native.getTime())) return native.toISOString().slice(0, 10);
  const isoLike = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoLike) return `${isoLike[1]}-${isoLike[2].padStart(2, "0")}-${isoLike[3].padStart(2, "0")}`;
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return "";
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function parseMoney(value: unknown): number | "" {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const numeric = cellText(value).replace(/[^0-9.-]/g, "");
  if (!numeric) return "";
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : "";
}

function parsePercent(value: unknown): number | "" {
  if (typeof value === "number" && Number.isFinite(value)) return value <= 1 ? Math.round(value * 100) : value;
  const raw = cellText(value).replace("%", "").trim();
  if (!raw) return "";
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : "";
}

function splitMilestones(value: unknown): string[] {
  return cellText(value).split(/\r?\n|;|\u2022/).map((item) => item.trim()).filter(Boolean);
}

function labelMatches(field: keyof typeof aliases, value: unknown): boolean {
  const candidate = normalize(value);
  if (!candidate) return false;
  return aliases[field].some((alias) => {
    const label = normalize(alias);
    if (candidate === label) return true;
    if (label.length < 8 || !label.includes(" ")) return false;
    return candidate.includes(label) || label.includes(candidate);
  });
}

function hasKnownLabel(value: unknown): boolean {
  return (Object.keys(aliases) as Array<keyof typeof aliases>).some((field) => labelMatches(field, value));
}

function valueInLabelCell(field: keyof typeof aliases, value: unknown): string {
  const raw = cellText(value);
  if (!raw) return "";
  const bestAlias = aliases[field]
    .map((alias) => normalize(alias))
    .filter((alias) => alias.length >= 8 || alias.includes(" "))
    .sort((a, b) => b.length - a.length)
    .find((alias) => normalize(raw).includes(alias));

  if (!bestAlias) return "";
  const escaped = bestAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const match = raw.match(new RegExp(`${escaped}\\s*[:\\-=–—]?\\s*(.+)$`, "i"));
  return match?.[1]?.trim() ?? "";
}

function firstNearbyValue(rows: unknown[][], rowIndex: number, columnIndex: number): unknown {
  const row = rows[rowIndex] ?? [];
  for (let next = columnIndex + 1; next < row.length; next += 1) {
    if (cellText(row[next]) && !hasKnownLabel(row[next])) return row[next];
  }

  const belowLimit = Math.min(rows.length, rowIndex + 5);
  for (let nextRow = rowIndex + 1; nextRow < belowLimit; nextRow += 1) {
    const sameColumn = rows[nextRow]?.[columnIndex];
    if (cellText(sameColumn) && !hasKnownLabel(sameColumn)) return sameColumn;

    const nextColumn = rows[nextRow]?.[columnIndex + 1];
    if (cellText(nextColumn) && !hasKnownLabel(nextColumn)) return nextColumn;
  }

  return "";
}

function findValue(rows: unknown[][], field: keyof typeof aliases): unknown {
  for (const row of rows) {
    for (let index = 0; index < row.length; index += 1) {
      if (!labelMatches(field, row[index])) continue;
      const embedded = valueInLabelCell(field, row[index]);
      if (embedded) return embedded;
      const rowIndex = rows.indexOf(row);
      const nearby = firstNearbyValue(rows, rowIndex, index);
      if (cellText(nearby)) return nearby;
    }
  }

  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 25); rowIndex += 1) {
    const headerIndex = rows[rowIndex].findIndex((cell) => labelMatches(field, cell));
    if (headerIndex === -1) continue;
    for (let dataIndex = rowIndex + 1; dataIndex < rows.length; dataIndex += 1) {
      const value = rows[dataIndex]?.[headerIndex];
      if (cellText(value) && !hasKnownLabel(value)) return value;
    }
  }
  return "";
}

function parseSheet(workbook: XLSX.WorkBook, sheetName: string, fileName: string): ImportedReport {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
  const startDate = toDate(findValue(rows, "start_date"));
  const completionDate = toDate(findValue(rows, "completion_date"));
  const reportingPeriod = toDate(findValue(rows, "reporting_period")) || completionDate || startDate;
  const statusRaw = cellText(findValue(rows, "status"));
  const status = allowedStatuses.find((item) => normalize(item) === normalize(statusRaw)) ?? null;

  return {
    source_file_name: fileName,
    source_sheet_name: sheetName,
    reporting_period: reportingPeriod,
    project_name: cellText(findValue(rows, "project_name")),
    project_manager: cellText(findValue(rows, "project_manager")),
    start_date: startDate,
    completion_date: completionDate,
    budget: parseMoney(findValue(rows, "budget")),
    executive_summary: cellText(findValue(rows, "executive_summary")),
    milestones: splitMilestones(findValue(rows, "milestones")),
    progress_achieved: cellText(findValue(rows, "progress_achieved")),
    percentage_completion: parsePercent(findValue(rows, "percentage_completion")),
    remarks: cellText(findValue(rows, "remarks")) || null,
    risks: cellText(findValue(rows, "risks")) || null,
    mitigation: cellText(findValue(rows, "mitigation")) || null,
    status,
    status_input: statusRaw,
  };
}

function validate(report: ImportedReport): string[] {
  const errors: string[] = [];
  if (report.percentage_completion !== "" && Number.isNaN(Number(report.percentage_completion))) errors.push("Percentage Completion must be numeric.");
  if (typeof report.percentage_completion === "number" && (report.percentage_completion < 0 || report.percentage_completion > 100)) errors.push("Percentage Completion must be between 0 and 100.");
  if (report.budget !== "" && Number.isNaN(Number(report.budget))) errors.push("Budget must be numeric.");
  if (report.start_date && report.completion_date && report.completion_date < report.start_date) errors.push("Completion Date must be on or after Start Date.");
  if (report.status_input && report.status === null) errors.push("Status must be Not Started, In Progress, Completed, or On Hold.");
  return [...new Set(errors)];
}

function getMissingWarnings(report: ImportedReport): string[] {
  const warnings: string[] = [];
  const expected: Array<[keyof ImportedReport, string]> = [
    ["project_name", "Project Name"], ["project_manager", "Project Manager"], ["start_date", "Start Date"],
    ["completion_date", "Completion Date"], ["budget", "Budget"], ["executive_summary", "Executive Summary"],
    ["progress_achieved", "Progress Achieved"], ["percentage_completion", "Percentage Completion"], ["reporting_period", "Reporting Period"],
  ];
  expected.forEach(([key, label]) => { if (report[key] === "" || report[key] === null || (Array.isArray(report[key]) && report[key].length === 0)) warnings.push(label); });
  if (report.milestones.length === 0) warnings.push("Milestones");
  return [...new Set(warnings)];
}

function emptyToNull<T>(value: T | ""): T | null {
  return value === "" ? null : value;
}

export function ImportSpreadsheet({ memberships }: { memberships: ProjectMembership[] }) {
  const managerProjects = useMemo(() => memberships.filter((item) => item.role === "admin" || item.role === "supervisor"), [memberships]);
  const [workbookState, setWorkbookState] = useState<WorkbookState>(null);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(managerProjects[0]?.projects.id ?? "");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportedReport | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [missingWarnings, setMissingWarnings] = useState<string[]>([]);
  const [existingImport, setExistingImport] = useState(false);
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId && managerProjects[0]) setSelectedProjectId(managerProjects[0].projects.id);
  }, [managerProjects, selectedProjectId]);

  async function checkExisting(projectId: string, report: ImportedReport) {
    if (!projectId || !report.reporting_period) { setExistingImport(false); return; }
    const existing = await apiRequest<unknown[]>(`/projects/${projectId}/report-imports?reporting_period=${encodeURIComponent(report.reporting_period)}`);
    setExistingImport(existing.length > 0);
    setConfirmUpdate(false);
  }

  function resetImport() {
    setWorkbookState(null); setSelectedSheet(""); setPreview(null); setValidationErrors([]); setMissingWarnings([]); setExistingImport(false); setConfirmUpdate(false); setUploadProgress(0); setError(null);
  }

  function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    resetImport();
    setLoading(true);
    setMessage(null);
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

  async function previewSheet(sheetName = selectedSheet, projectId = selectedProjectId) {
    if (!workbookState || !sheetName) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      const report = parseSheet(workbookState.workbook, sheetName, workbookState.fileName);
      const errors = validate(report);
      setPreview(report);
      setValidationErrors(errors);
      setMissingWarnings(getMissingWarnings(report));
      if (errors.length === 0) await checkExisting(projectId, report);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to preview this sheet.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!preview || !selectedProjectId || validationErrors.length > 0 || (existingImport && !confirmUpdate)) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      const { status_input, ...payload } = preview;
      void status_input;
      await apiRequest(`/projects/${selectedProjectId}/report-imports`, {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          reporting_period: emptyToNull(payload.reporting_period),
          project_name: emptyToNull(payload.project_name),
          project_manager: emptyToNull(payload.project_manager),
          start_date: emptyToNull(payload.start_date),
          completion_date: emptyToNull(payload.completion_date),
          budget: emptyToNull(payload.budget),
          executive_summary: emptyToNull(payload.executive_summary),
          progress_achieved: emptyToNull(payload.progress_achieved),
          percentage_completion: emptyToNull(payload.percentage_completion),
          remarks: emptyToNull(payload.remarks ?? ""),
          risks: emptyToNull(payload.risks ?? ""),
          mitigation: emptyToNull(payload.mitigation ?? ""),
          overwrite: existingImport && confirmUpdate,
        }),
      });
      setMessage(existingImport ? "Imported report was updated." : "Imported report was saved.");
      setExistingImport(false);
      setConfirmUpdate(false);
    } catch (requestError) {
      if (requestError instanceof ApiRequestError && requestError.status === 409) setExistingImport(true);
      setError(requestError instanceof Error ? requestError.message : "Unable to save imported data.");
    } finally {
      setLoading(false);
    }
  }

  if (managerProjects.length === 0) {
    return <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">Project admin or supervisor access is required to import spreadsheets.</div>;
  }

  const selectedProject = managerProjects.find((item) => item.projects.id === selectedProjectId);
  const fields: Array<[string, string]> = preview ? [
    ["Project Name", preview.project_name], ["Project Manager", preview.project_manager], ["Start Date", preview.start_date],
    ["Completion Date", preview.completion_date], ["Budget", preview.budget === "" ? "" : `BWP ${Number(preview.budget).toLocaleString()}`],
    ["Executive Summary", preview.executive_summary], ["Milestones", preview.milestones.join("; ")], ["Progress Achieved", preview.progress_achieved],
    ["Percentage Completion", preview.percentage_completion === "" ? "" : `${preview.percentage_completion}%`], ["Remarks", preview.remarks ?? ""],
    ["Risks", preview.risks ?? ""], ["Mitigation", preview.mitigation ?? ""], ["Status", preview.status ?? ""], ["Reporting Period", preview.reporting_period],
  ] : [];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#1a3a6b]/10 p-2.5"><FileSpreadsheet className="h-5 w-5 text-[#1a3a6b]" /></div>
            <div>
              <h2 className="font-bold text-foreground">Import spreadsheet</h2>
              <p className="mt-1 text-sm text-muted-foreground">Upload an .xlsx workbook, choose a sheet, review the extracted report, then confirm the import.</p>
            </div>
          </div>
          <button type="button" onClick={resetImport} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"><X className="h-3.5 w-3.5" />Cancel</button>
        </div>
      </section>

      {(message || error) && <div className={`flex items-start gap-3 rounded-md border p-4 text-sm ${message ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>{message ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}<span>{message || error}</span></div>}

      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
          <label className="block text-sm font-medium text-foreground">Project
            <select value={selectedProjectId} onChange={(event) => { setSelectedProjectId(event.target.value); if (preview) void checkExisting(event.target.value, preview); }} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              {managerProjects.map((item) => <option key={item.projects.id} value={item.projects.id}>{item.projects.name} ({item.role})</option>)}
            </select>
          </label>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-8 text-center hover:bg-secondary">
            <Upload className="h-7 w-7 text-[#1a3a6b]" />
            <span className="mt-3 text-sm font-semibold text-foreground">Upload .xlsx workbook</span>
            <span className="mt-1 text-xs text-muted-foreground">No data is imported until you confirm.</span>
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

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">Preview</h3>
              <p className="text-xs text-muted-foreground">{selectedProject ? `Target project: ${selectedProject.projects.name}` : "Choose a target project."}</p>
            </div>
          </div>

          {!preview ? <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Select a workbook sheet to preview extracted data.</p> : (
            <div className="space-y-4">
              {validationErrors.length > 0 && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"><p className="font-semibold">Fix these validation errors before importing:</p><ul className="mt-2 list-disc space-y-1 pl-5">{validationErrors.map((item) => <li key={item}>{item}</li>)}</ul></div>}
              {missingWarnings.length > 0 && <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><p className="font-semibold">Some information was not found in the workbook.</p><p className="mt-1">The import can continue, but these fields will need to be added manually: {missingWarnings.join(", ")}.</p></div>}
              {existingImport && <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><label className="flex gap-2"><input type="checkbox" checked={confirmUpdate} onChange={(event) => setConfirmUpdate(event.target.checked)} />A report already exists for this project and reporting period. Update it instead of cancelling.</label></div>}
              <div className="overflow-hidden rounded-md border border-border">
                {fields.map(([label, value]) => <div key={label} className="grid grid-cols-[170px_1fr] border-b border-border last:border-b-0"><div className="bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground">{label}</div><div className="px-3 py-2 text-sm text-foreground">{value || <span className="text-muted-foreground">Not found</span>}</div></div>)}
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setPreview(null)} className="rounded-md border border-border px-4 py-2 text-sm font-semibold">Choose another sheet</button>
                <button type="button" onClick={confirmImport} disabled={loading || validationErrors.length > 0 || !selectedProjectId || (existingImport && !confirmUpdate)} className="rounded-md bg-[#1a3a6b] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Saving..." : "Confirm Import"}</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
