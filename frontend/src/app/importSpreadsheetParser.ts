import * as XLSX from "xlsx";

export type ImportStatus = "Not Started" | "In Progress" | "Completed" | "On Hold";

export interface ProjectDetailsPreview {
  projectName: string;
  projectOverview: string;
  projectManager: string;
  projectCode: string;
  plannedStartDate: string;
  actualStartDate: string;
  plannedCompletionDate: string;
  actualCompletionDate: string;
  estimatedBudget: number | "";
  allocatedBudget: number | "";
}

export interface MilestonePreview {
  executiveSummary: string;
  name: string;
  plannedCompletionDate: string;
  progressDescription: string;
  progressPercentage: number | "";
  statusColor: string;
  status: ImportStatus | "";
  remarks: string;
}

export interface RiskPreview {
  majorRisk: string;
  statusColor: string;
  mitigation: string;
}

export interface FinancialPreview {
  item: string;
  approvedBudget: number | "";
  expenditureToDate: number | "";
  balance: number | "";
  percentUtilised: number | "";
}

export interface ParsedSpreadsheetPreview {
  sourceFileName: string;
  sourceSheetName: string;
  projectDetails: ProjectDetailsPreview;
  milestones: MilestonePreview[];
  risks: RiskPreview[];
  financialRows: FinancialPreview[];
  warnings: string[];
  errors: string[];
}

type Row = unknown[];
type HeaderMap = Partial<Record<string, number>>;

const monthNames: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

const fieldAliases: Record<string, string[]> = {
  projectName: ["project name", "name of project", "project title", "title of project"],
  projectOverview: ["project overview", "project description", "description", "discription", "overview"],
  projectManager: ["project manager", "manager", "project officer", "responsible officer", "project lead", "coordinator"],
  projectCode: ["project code", "code"],
  plannedStartDate: ["planned start date", "planned commencement date", "start date"],
  actualStartDate: ["actual start date", "actual commencement date"],
  plannedCompletionDate: ["planned completion date", "planned end date", "completion date"],
  actualCompletionDate: ["actual completion date", "actual end date"],
  estimatedBudget: ["estimated budget", "estimated cost", "budget estimate"],
  allocatedBudget: ["allocated budget", "approved budget", "total budget", "project budget"],
  executiveSummary: ["executive summary", "summary"],
  keyMilestones: ["key milestones", "milestones", "milestone", "activity", "activities"],
  progressAchieved: ["progress achieved", "achievements", "progress", "progress to date"],
  percentCompletion: ["% completion", "percentage completion", "percent completion", "completion %", "% complete"],
  colorCode: ["color code", "colour code", "color code g y o r", "colour code g y o r", "status g y o r"],
  remarks: ["remarks", "comments", "notes"],
  majorRisks: ["major risks", "major risk", "risks", "risk"],
  mitigation: ["mitigation", "mitigation plan", "risk mitigation", "corrective action"],
  item: ["item", "description", "discription", "expense item"],
  approvedBudget: ["approved budget", "budget"],
  expenditureToDate: ["expenditure to date", "expenditure", "spent to date", "amount spent"],
  balance: ["balance", "remaining balance"],
  percentUtilised: ["% utilised", "% utilized", "percent utilised", "percent utilized", "utilisation", "utilization"],
};

export function normalizeCell(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/description/g, "discription")
    .replace(/colour/g, "color")
    .replace(/utilized/g, "utilised")
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value: unknown): string {
  return normalizeCell(value).replace(/[^a-z0-9%]/g, "");
}

function cellText(value: unknown): string {
  if (value instanceof Date) return toDate(value);
  return String(value ?? "").trim();
}

function isBlankRow(row: Row): boolean {
  return row.every((cell) => !cellText(cell));
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, row) => Array.from({ length: b.length + 1 }, (_, col) => row + col));
  for (let row = 1; row <= a.length; row += 1) {
    for (let col = 1; col <= b.length; col += 1) {
      dp[row][col] = a[row - 1] === b[col - 1]
        ? dp[row - 1][col - 1]
        : Math.min(dp[row - 1][col], dp[row][col - 1], dp[row - 1][col - 1]) + 1;
    }
  }
  return dp[a.length][b.length];
}

function matchesAlias(value: unknown, aliases: string[]): boolean {
  const candidate = normalizeCell(value);
  const candidateCompact = compact(value);
  if (!candidate) return false;
  return aliases.some((alias) => {
    const normalizedAlias = normalizeCell(alias);
    const aliasCompact = compact(alias);
    if (candidate === normalizedAlias || candidateCompact === aliasCompact) return true;
    if (candidate.includes(normalizedAlias) || normalizedAlias.includes(candidate)) return true;
    if (candidateCompact.includes(aliasCompact) || aliasCompact.includes(candidateCompact)) return true;
    return Math.max(candidateCompact.length, aliasCompact.length) >= 8 && editDistance(candidateCompact, aliasCompact) <= 2;
  });
}

function matchesField(value: unknown, field: keyof typeof fieldAliases): boolean {
  return matchesAlias(value, fieldAliases[field]);
}

function rowHasSection(row: Row, labels: string[]): boolean {
  return labels.every((label) => row.some((cell) => matchesField(cell, label)));
}

function rowHasAnySectionMarker(row: Row): boolean {
  return row.some((cell) => matchesAlias(cell, ["financial status", "project status", "major risks", "risk status"]));
}

function findLabelValue(rows: Row[], field: keyof typeof fieldAliases): unknown {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const cell = row[colIndex];
      if (!matchesField(cell, field)) continue;
      const embedded = valueInLabelCell(cell, field);
      if (embedded) return embedded;
      for (let next = colIndex + 1; next < row.length; next += 1) {
        if (cellText(row[next])) return row[next];
      }
      for (let nextRow = rowIndex + 1; nextRow < Math.min(rows.length, rowIndex + 5); nextRow += 1) {
        const sameColumn = rows[nextRow]?.[colIndex];
        if (cellText(sameColumn)) return sameColumn;
        const nextColumn = rows[nextRow]?.[colIndex + 1];
        if (cellText(nextColumn)) return nextColumn;
      }
    }
  }
  return "";
}

function valueInLabelCell(value: unknown, field: keyof typeof fieldAliases): string {
  const raw = cellText(value);
  if (!raw) return "";
  const alias = fieldAliases[field]
    .map((item) => normalizeCell(item))
    .sort((a, b) => b.length - a.length)
    .find((item) => normalizeCell(raw).includes(item));
  if (!alias) return "";
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return raw.match(new RegExp(`${escaped}\\s*[:\\-=]?\\s*(.+)$`, "i"))?.[1]?.trim() ?? "";
}

function looksLikeLabel(value: unknown): boolean {
  return Object.keys(fieldAliases).some((field) => matchesField(value, field));
}

export function toDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const raw = cellText(value).replace(/(\d+)(st|nd|rd|th)/gi, "$1").replace(/,/g, " ").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const serial = Number(raw);
  if (Number.isFinite(serial) && serial > 20000 && serial < 70000) {
    const date = new Date(Date.UTC(1899, 11, 30 + Math.floor(serial)));
    return date.toISOString().slice(0, 10);
  }
  const longDate = raw.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
  if (longDate) {
    const month = monthNames[longDate[2].toLowerCase()];
    if (month) return `${longDate[3]}-${month}-${longDate[1].padStart(2, "0")}`;
  }
  const isoLike = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoLike) return `${isoLike[1]}-${isoLike[2].padStart(2, "0")}-${isoLike[3].padStart(2, "0")}`;
  const dayFirst = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!dayFirst) {
    const native = new Date(raw);
    return Number.isNaN(native.getTime()) ? "" : native.toISOString().slice(0, 10);
  }
  const year = dayFirst[3].length === 2 ? `20${dayFirst[3]}` : dayFirst[3];
  return `${year}-${dayFirst[2].padStart(2, "0")}-${dayFirst[1].padStart(2, "0")}`;
}

export function parseMoney(value: unknown): number | "" {
  const raw = cellText(value).replace(/,/g, "");
  if (!raw) return "";
  const parsed = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : "";
}

export function parsePercent(value: unknown): number | "" {
  const raw = cellText(value);
  if (!raw) return "";
  const parsed = Number(raw.replace("%", "").trim());
  if (!Number.isFinite(parsed)) return "";
  return parsed <= 1 ? Math.round(parsed * 100) : Math.round(parsed);
}

function mapColorToStatus(value: unknown): ImportStatus | "" {
  const normalized = normalizeCell(value);
  if (!normalized) return "";
  if (normalized === "g" || normalized.includes("green")) return "Completed";
  if (normalized === "y" || normalized.includes("yellow")) return "In Progress";
  if (normalized === "o" || normalized.includes("orange")) return "On Hold";
  if (normalized === "r" || normalized.includes("red")) return "On Hold";
  if (normalized.includes("complete")) return "Completed";
  if (normalized.includes("progress")) return "In Progress";
  if (normalized.includes("hold")) return "On Hold";
  return "";
}

function headerMap(row: Row, fields: string[]): HeaderMap {
  const map: HeaderMap = {};
  row.forEach((cell, index) => {
    fields.forEach((field) => {
      if (map[field] === undefined && matchesField(cell, field)) map[field] = index;
    });
  });
  return map;
}

function getByHeader(row: Row, map: HeaderMap, field: string): string {
  const index = map[field];
  return index === undefined ? "" : cellText(row[index]);
}

function findProjectStatusHeader(rows: Row[]): { rowIndex: number; map: HeaderMap } | null {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    if (!rowHasSection(row, ["executiveSummary", "keyMilestones", "progressAchieved", "percentCompletion"])) continue;
    return { rowIndex, map: headerMap(row, ["executiveSummary", "keyMilestones", "plannedCompletionDate", "progressAchieved", "percentCompletion", "colorCode", "remarks", "majorRisks", "mitigation"]) };
  }
  return null;
}

function parseMilestones(rows: Row[], header: { rowIndex: number; map: HeaderMap } | null): MilestonePreview[] {
  if (!header) return [];
  const milestones: MilestonePreview[] = [];
  let carriedSummary = "";
  let blankRows = 0;
  for (let rowIndex = header.rowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    if (rowHasAnySectionMarker(row) || rowHasSection(row, ["item", "approvedBudget", "expenditureToDate", "balance"]) || rowHasSection(row, ["majorRisks", "mitigation"])) break;
    if (isBlankRow(row)) {
      blankRows += 1;
      if (blankRows >= 2) break;
      continue;
    }
    blankRows = 0;
    const executiveSummary = getByHeader(row, header.map, "executiveSummary") || carriedSummary;
    if (executiveSummary) carriedSummary = executiveSummary;
    const name = getByHeader(row, header.map, "keyMilestones");
    const progressDescription = getByHeader(row, header.map, "progressAchieved");
    const progressPercentage = parsePercent(getByHeader(row, header.map, "percentCompletion"));
    const statusColor = getByHeader(row, header.map, "colorCode");
    const plannedCompletionDate = toDate(getByHeader(row, header.map, "plannedCompletionDate"));
    const remarks = getByHeader(row, header.map, "remarks");
    if (!name && !progressDescription && progressPercentage === "" && !remarks) continue;
    milestones.push({ executiveSummary, name, plannedCompletionDate, progressDescription, progressPercentage, statusColor, status: mapColorToStatus(statusColor), remarks });
  }
  return milestones;
}

function parseInlineRisks(rows: Row[], header: { rowIndex: number; map: HeaderMap } | null): RiskPreview[] {
  if (!header || header.map.majorRisks === undefined) return [];
  const risks: RiskPreview[] = [];
  for (let rowIndex = header.rowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    if (rowHasAnySectionMarker(row) || rowHasSection(row, ["item", "approvedBudget", "expenditureToDate", "balance"])) break;
    const majorRisk = getByHeader(row, header.map, "majorRisks");
    const mitigation = getByHeader(row, header.map, "mitigation");
    const statusColor = getByHeader(row, header.map, "colorCode");
    if (majorRisk || mitigation) risks.push({ majorRisk, statusColor, mitigation });
  }
  return risks;
}

function parseRiskTable(rows: Row[]): RiskPreview[] {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    if (!rowHasSection(row, ["majorRisks", "mitigation"])) continue;
    const map = headerMap(row, ["majorRisks", "colorCode", "mitigation"]);
    const risks: RiskPreview[] = [];
    for (let next = rowIndex + 1; next < rows.length; next += 1) {
      const dataRow = rows[next] ?? [];
      if (rowHasAnySectionMarker(dataRow) || rowHasSection(dataRow, ["item", "approvedBudget", "expenditureToDate", "balance"])) break;
      if (isBlankRow(dataRow)) {
        if (risks.length > 0) break;
        continue;
      }
      const majorRisk = getByHeader(dataRow, map, "majorRisks");
      const mitigation = getByHeader(dataRow, map, "mitigation");
      const statusColor = getByHeader(dataRow, map, "colorCode");
      if (majorRisk || mitigation) risks.push({ majorRisk, statusColor, mitigation });
    }
    return risks;
  }
  return [];
}

function parseFinancialRows(rows: Row[]): FinancialPreview[] {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    if (!rowHasSection(row, ["item", "approvedBudget", "expenditureToDate", "balance"])) continue;
    const map = headerMap(row, ["item", "approvedBudget", "expenditureToDate", "balance", "percentUtilised"]);
    const financialRows: FinancialPreview[] = [];
    for (let next = rowIndex + 1; next < rows.length; next += 1) {
      const dataRow = rows[next] ?? [];
      if (rowHasAnySectionMarker(dataRow) && financialRows.length > 0) break;
      if (isBlankRow(dataRow)) {
        if (financialRows.length > 0) break;
        continue;
      }
      const item = getByHeader(dataRow, map, "item");
      const approvedBudget = parseMoney(getByHeader(dataRow, map, "approvedBudget"));
      const expenditureToDate = parseMoney(getByHeader(dataRow, map, "expenditureToDate"));
      const balance = parseMoney(getByHeader(dataRow, map, "balance"));
      const percentUtilised = parsePercent(getByHeader(dataRow, map, "percentUtilised"));
      if (item || approvedBudget !== "" || expenditureToDate !== "" || balance !== "") financialRows.push({ item, approvedBudget, expenditureToDate, balance, percentUtilised });
    }
    return financialRows;
  }
  return [];
}

export function parseRows(rows: Row[], sourceSheetName: string, sourceFileName = ""): ParsedSpreadsheetPreview {
  const statusHeader = findProjectStatusHeader(rows);
  const milestones = parseMilestones(rows, statusHeader);
  const risks = [...parseInlineRisks(rows, statusHeader), ...parseRiskTable(rows)]
    .filter((risk, index, all) => index === all.findIndex((item) => normalizeCell(item.majorRisk) === normalizeCell(risk.majorRisk) && normalizeCell(item.mitigation) === normalizeCell(risk.mitigation)));
  const financialRows = parseFinancialRows(rows);
  const projectDetails: ProjectDetailsPreview = {
    projectName: cellText(findLabelValue(rows, "projectName")),
    projectOverview: cellText(findLabelValue(rows, "projectOverview")),
    projectManager: cellText(findLabelValue(rows, "projectManager")),
    projectCode: cellText(findLabelValue(rows, "projectCode")),
    plannedStartDate: toDate(findLabelValue(rows, "plannedStartDate")),
    actualStartDate: toDate(findLabelValue(rows, "actualStartDate")),
    plannedCompletionDate: toDate(findLabelValue(rows, "plannedCompletionDate")),
    actualCompletionDate: toDate(findLabelValue(rows, "actualCompletionDate")),
    estimatedBudget: parseMoney(findLabelValue(rows, "estimatedBudget")),
    allocatedBudget: parseMoney(findLabelValue(rows, "allocatedBudget")),
  };
  const warnings = [
    ...Object.entries(projectDetails).filter(([, value]) => value === "").map(([key]) => key),
    milestones.length === 0 ? "Milestones / progress rows" : "",
    risks.length === 0 ? "Risks / challenges" : "",
    financialRows.length === 0 ? "Financial status" : "",
  ].filter(Boolean);
  const errors = [
    !projectDetails.projectName ? "Project Name is required." : "",
    milestones.length === 0 ? "At least one milestone or progress row is required." : "",
  ].filter(Boolean);
  return { sourceFileName, sourceSheetName, projectDetails, milestones, risks, financialRows, warnings, errors };
}

export function parseWorkbookSheet(workbook: XLSX.WorkBook, sheetName: string, fileName: string): ParsedSpreadsheetPreview {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, defval: "", raw: false });
  return parseRows(rows, sheetName, fileName);
}
