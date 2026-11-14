import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import { parseWorkbookSheet } from '../app/importSpreadsheetParser';

// Exercise the same binary read options and parser used by the upload UI.
function roundTrip(rows: unknown[][]) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
  XLSX.utils.book_append_sheet(workbook, sheet, 'Report');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Project Name', 'Other project']]), 'Other');
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return XLSX.read(bytes, { type: 'array', cellDates: true });
}

test('patched SheetJS imports binary workbook project, milestone, risk and financial sections', () => {
  const workbook = roundTrip([
    ['Project Name', 'Water – North'],
    ['Project Manager', 'Example Manager'],
    ['Planned Start Date', '2026-01-15'],
    ['Estimated Budget', 10000],
    ['Executive Summary', 'Key Milestones', 'Progress Achieved', '% Completion', 'Color Code', 'Remarks'],
    ['On track', 'Build wells', 'Two completed', '50%', 'G', 'Reviewed'],
    ['Major Risks', 'Mitigation'],
    ['Rain', 'Adjust schedule'],
    ['Item', 'Approved Budget', 'Expenditure to Date', 'Balance', '% Utilised'],
    ['Equipment', 1000, 250, 750, '25%'],
  ]);
  const result = parseWorkbookSheet(workbook, 'Report', 'report.xlsx', XLSX.utils);
  assert.equal(result.sourceFileName, 'report.xlsx');
  assert.equal(result.sourceSheetName, 'Report');
  assert.equal(result.projectDetails.projectName, 'Water – North');
  assert.equal(result.projectDetails.plannedStartDate, '2026-01-15');
  assert.equal(result.projectDetails.estimatedBudget, 10000);
  assert.equal(result.milestones[0].name, 'Build wells');
  assert.equal(result.milestones[0].progressPercentage, 50);
  assert.deepEqual(result.risks, [{ majorRisk: 'Rain', statusColor: '', mitigation: 'Adjust schedule' }]);
  assert.deepEqual(result.financialRows, [{ item: 'Equipment', approvedBudget: 1000, expenditureToDate: 250, balance: 750, percentUtilised: 25 }]);
  assert.deepEqual(result.errors, []);
  assert.equal(parseWorkbookSheet(workbook, 'Other', 'report.xlsx', XLSX.utils).projectDetails.projectName, 'Other project');
});

test('native Excel dates and formatted numbers survive workbook serialization', () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Project Name', 'Dates'], ['Planned Start Date', new Date('2026-01-15T00:00:00Z')],
    ['Estimated Budget', 1234.5],
  ], { cellDates: true });
  sheet.B2.z = 'yyyy-mm-dd';
  sheet.B3.z = '#,##0.00';
  XLSX.utils.book_append_sheet(workbook, sheet, 'Report');
  const parsed = XLSX.read(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }), { type: 'array', cellDates: true });
  const result = parseWorkbookSheet(parsed, 'Report', 'dates.xlsx', XLSX.utils);
  assert.equal(result.projectDetails.plannedStartDate, '2026-01-15');
  assert.equal(result.projectDetails.estimatedBudget, 1234.5);
  assert.equal(result.rawRows?.[2][1], 1234.5);
});

test('empty sheets and malformed cell values produce usable previews with warnings', () => {
  const empty = parseWorkbookSheet(roundTrip([]), 'Report', 'empty.xlsx', XLSX.utils);
  assert.deepEqual(empty.milestones, []);
  assert.deepEqual(empty.financialRows, []);
  assert.ok(empty.warnings.length > 0);
  const invalid = parseWorkbookSheet(roundTrip([
    ['Project Name', 'Invalid values'], ['Estimated Budget', 'not money'],
    ['Executive Summary', 'Key Milestones', 'Progress Achieved', '% Completion'],
    ['Summary', 'Task', 'Started', 'not a percentage'],
  ]), 'Report', 'invalid.xlsx', XLSX.utils);
  assert.equal(invalid.projectDetails.estimatedBudget, '');
  assert.equal(invalid.milestones[0].progressPercentage, '');
  assert.ok(invalid.warnings.some(w => w.includes('Estimated Budget')));
  assert.ok(invalid.warnings.some(w => w.includes('completion percentage')));
});

test('truncated XLSX archive is rejected for the upload error handler', () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Project Name', 'Test']]), 'Report');
  const bytes = new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
  assert.throws(() => XLSX.read(bytes.slice(0, 30), { type: 'array', cellDates: true }));
});
