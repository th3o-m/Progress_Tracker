import { parseRows } from "../src/app/importSpreadsheetParser";

const sheetNames = [
  "Umbrella Project",
  "GBF Early Action",
  "POPS Workplan Implementation",
  "ABS PHASE II",
  "BW-NEA IMPLEMENTATION",
];

function shifted(row: unknown[]): unknown[] {
  return ["", ...row];
}

function sampleRows(sheetName: string): unknown[][] {
  return [
    shifted(["Project Name", sheetName]),
    shifted(["Project Code", sheetName.split(" ")[0]]),
    shifted(["Discription", `${sheetName} overview`]),
    shifted(["Project Manager", "DEP Manager"]),
    shifted(["Planned Start Date", "1st January 2026", "", "Actual Start Date", "45658"]),
    shifted(["Planned Completion Date", "28th February 2026", "", "Actual Completion Date", "28th February 2026"]),
    shifted(["Estimated Budget", "1,500,000", "", "Allocated Budget", "BWP 900,000"]),
    [],
    shifted(["Project Status", "", "", "", "", "", "", "Major Risks", "Status(G/Y/O/R)", "Mitigation"]),
    shifted(["Executive Summary", "Key Milestones", "Planned Completion Date", "Progress Achieved", "% Completion", "Color Code(G/Y/O/R)", "Remarks ", "", "Major Risks", "Status(G/Y/O/R)", "Mitigation"]),
    shifted(["Programme mobilised", "Baseline report", "28th February 2026", "Draft report completed", 0.7, "G", "On track", "", "Late procurement", "Y", "Fast-track approvals"]),
    shifted(["", "Stakeholder workshop", "31/03/2026", "Workshop invitations sent", "90%", "Y", "", "", "", "", ""]),
    [],
    shifted(["Financial Status"]),
    shifted(["Item", "Approved Budget", "Expenditure to date", "Balance", "% Utilised"]),
    shifted(["Consultants", "500000", "250000", "250000", 0.5]),
  ];
}

for (const sheetName of sheetNames) {
  const parsed = parseRows(sampleRows(sheetName), sheetName, "dep-monthly.xlsx");
  if (parsed.projectDetails.projectName !== sheetName) throw new Error(`${sheetName}: project name was not parsed`);
  if (parsed.projectDetails.projectOverview !== `${sheetName} overview`) throw new Error(`${sheetName}: typo Description/Discription was not parsed`);
  if (parsed.projectDetails.plannedCompletionDate !== "2026-02-28") throw new Error(`${sheetName}: ordinal text date was not parsed`);
  if (parsed.milestones.length !== 2) throw new Error(`${sheetName}: milestone rows were not parsed`);
  if (parsed.milestones[0].progressPercentage !== 70 || parsed.milestones[1].progressPercentage !== 90) throw new Error(`${sheetName}: percentages were not parsed`);
  if (parsed.milestones[1].executiveSummary !== "Programme mobilised") throw new Error(`${sheetName}: executive summary was not carried down`);
  if (parsed.risks.length !== 1) throw new Error(`${sheetName}: inline risk row was not parsed`);
  if (parsed.financialRows.length !== 1 || parsed.financialRows[0].percentUtilised !== 50) throw new Error(`${sheetName}: financial row was not parsed`);
}

console.log(`Import parser checks passed for ${sheetNames.length} DEP workbook sheet formats.`);

