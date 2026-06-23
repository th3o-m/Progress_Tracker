import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export interface ReportData {
  activities: Record<string, any>[];
  progress_updates: Record<string, any>[];
  challenges: Record<string, any>[];
  beneficiaries: Record<string, any>[];
  financial_entries: Record<string, any>[];
}

function display(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export async function buildExcel(data: ReportData, start: string, end: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Projectt Tracker';
  workbook.created = new Date();
  const summary = workbook.addWorksheet('Summary');
  summary.addRows([
    ['Projectt Tracker Monitoring Report'],
    ['Period', `${start} to ${end}`],
    ['Activities', data.activities.length], ['Progress updates', data.progress_updates.length],
    ['Challenges', data.challenges.length], ['Beneficiaries', data.beneficiaries.length],
    ['Financial entries', data.financial_entries.length],
  ]);
  summary.getRow(1).font = { bold: true, size: 16 };
  summary.columns = [{ width: 28 }, { width: 36 }];

  for (const [name, rows] of Object.entries(data)) {
    const sheet = workbook.addWorksheet(name.slice(0, 31));
    const keys = rows.length ? Object.keys(rows[0]!) : ['No records'];
    sheet.columns = keys.map((key) => ({ header: key, key, width: Math.min(45, Math.max(14, key.length + 2)) }));
    for (const row of rows) sheet.addRow(Object.fromEntries(keys.map((key) => [key, display(row[key])])));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = rows.length ? { from: { row: 1, column: 1 }, to: { row: 1, column: keys.length } } : undefined;
  }
  const result = await workbook.xlsx.writeBuffer();
  return Buffer.from(result);
}

export function buildPdf(data: ReportData, start: string, end: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 42, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(18).text('Projectt Tracker Monitoring Report', { align: 'center' });
    doc.moveDown(0.5).fontSize(10).text(`Reporting period: ${start} to ${end}`, { align: 'center' });
    doc.moveDown(1.5);
    for (const [name, rows] of Object.entries(data)) {
      if (doc.y > 700) doc.addPage();
      doc.fontSize(14).text(name.replaceAll('_', ' ').toUpperCase());
      doc.fontSize(10).text(`Total records: ${rows.length}`);
      doc.moveDown(0.4);
      for (const row of rows) {
        if (doc.y > 720) doc.addPage();
        const preferred = ['code', 'name', 'status', 'report_date', 'full_name', 'expense_category', 'amount', 'description', 'progress_pct'];
        const fields = preferred.filter((key) => key in row).slice(0, 5);
        doc.fontSize(8).text(fields.map((key) => `${key}: ${display(row[key])}`).join(' | '), { width: 510 });
        doc.moveDown(0.25);
      }
      doc.moveDown(0.8);
    }
    const pages = doc.bufferedPageRange();
    for (let index = 0; index < pages.count; index += 1) {
      doc.switchToPage(index);
      doc.fontSize(8).text(`Page ${index + 1} of ${pages.count}`, 42, 800, { align: 'right', width: 510 });
    }
    doc.end();
  });
}
