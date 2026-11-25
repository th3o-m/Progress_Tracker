// Imports currently use multiple API requests, not a single transaction.
// Report acknowledged writes, and never imply that failed imports were rolled back.
export interface ImportCounts {
  activities: number;
  progressUpdates: number;
  challenges: number;
  financialEntries: number;
  projectDetails: number;
  reportSnapshots: number;
  financialSnapshots: number;
}

export interface ImportOutcome {
  kind: "success" | "partial" | "error";
  title: string;
  detail: string;
}

export function buildImportOutcome(
  sheetName: string,
  counts: ImportCounts,
  warnings: string[],
  failure?: string,
): ImportOutcome {
  const acknowledged = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const summary = [
    `${counts.activities} activities created/updated`,
    `${counts.progressUpdates} progress updates saved`,
    `${counts.challenges} challenges saved`,
    `${counts.financialEntries} financial entries saved`,
    `${counts.projectDetails} project detail updates`,
    `${counts.reportSnapshots} import history snapshots`,
    `${counts.financialSnapshots} financial snapshots`,
  ].join(" · ");
  const issues = warnings.join(" ");
  if (failure !== undefined) {
    return {
      kind: acknowledged > 0 ? "partial" : "error",
      title: acknowledged > 0 ? "Import stopped — some data was saved" : "Import could not be confirmed",
      detail: `${sheetName}: ${summary}. ${failure} ${issues} Changes are not automatically rolled back. Review the project and import history before retrying.`.replace(/\s+/g, " ").trim(),
    };
  }
  if (warnings.length > 0 || acknowledged === 0) {
    return {
      kind: "partial",
      title: acknowledged > 0 ? "Import completed with warnings" : "No new changes confirmed",
      detail: `${sheetName}: ${summary}. ${issues} Review the project before importing again.`.replace(/\s+/g, " ").trim(),
    };
  }
  return {
    kind: "success",
    title: "Import successful",
    detail: `${sheetName}: ${summary}. Your saved records are available in the selected project.`,
  };
}
