import { z } from 'zod';
import { roles } from '../types/domain.js';

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const text = z.string().trim().min(1);
const optionalText = z.string().trim().nullable().optional();
const progress = z.coerce.number().int().min(0).max(100);
const nullableDate = z.preprocess((value) => value === '' ? null : value, date.nullable().optional());
const nullableText = z.preprocess((value) => typeof value === 'string' && value.trim() === '' ? null : value, z.string().trim().min(1).nullable().optional());
const nullableTextMax = (max: number) => z.preprocess((value) => typeof value === 'string' && value.trim() === '' ? null : value, z.string().trim().min(1).max(max).nullable().optional());
const nullableNumber = z.preprocess((value) => value === '' ? null : value, z.coerce.number().nullable().optional());
const nullableProgress = z.preprocess((value) => value === '' ? null : value, progress.nullable().optional());
const optionalJsonArray = z.preprocess((value) => value ?? [], z.array(z.unknown()).default([]));
const importId = uuid.nullable().optional();

const activitySchema = z.object({
  code: text.max(50), name: text.max(255), category: text.max(100), district: text.max(100),
  responsible_officer: uuid, start_date: date, end_date: date, status: text.max(50), progress_pct: progress.default(0),
  import_id: importId, description: nullableText, status_color: nullableTextMax(50), remarks: nullableText, actual_completion_date: nullableDate,
}).strict();
export const createActivitySchema = activitySchema.refine((v) => v.end_date >= v.start_date, { path: ['end_date'], message: 'Must be on or after start_date' });
export const updateActivitySchema = activitySchema.partial().refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, { path: ['end_date'], message: 'Must be on or after start_date' });

export const createProgressSchema = z.object({ activity_id: uuid, progress_pct: progress, status: text.max(50), narrative: text, report_date: date, import_id: importId, executive_summary: nullableText, status_color: nullableTextMax(50), remarks: nullableText, reporting_period: nullableTextMax(100) }).strict();
export const updateProgressSchema = createProgressSchema.omit({ activity_id: true }).partial().refine((v) => Object.keys(v).length > 0, 'At least one field is required');

export const createChallengeSchema = z.object({ activity_id: uuid, challenge_type: text.max(100), description: text, mitigation_plan: optionalText, resolved: z.boolean().default(false), import_id: importId, status_color: nullableTextMax(50), responsible_officer: importId, due_date: nullableDate }).strict();
export const updateChallengeSchema = createChallengeSchema.omit({ activity_id: true }).partial().refine((v) => Object.keys(v).length > 0, 'At least one field is required');

export const createBeneficiarySchema = z.object({ full_name: text.max(255), national_id: text.max(100), beneficiary_type: text.max(100), district: text.max(100), contact_number: optionalText, notes: optionalText }).strict();
export const updateBeneficiarySchema = createBeneficiarySchema.partial().refine((v) => Object.keys(v).length > 0, 'At least one field is required');

export const createFinancialSchema = z.object({ activity_id: uuid, expense_category: text.max(100), amount: z.coerce.number().nonnegative().multipleOf(0.01), description: text, receipt_url: z.string().url().nullable().optional(), import_id: importId, approved_budget: nullableNumber.refine((value) => value == null || value >= 0, 'Number must be greater than or equal to 0'), balance: nullableNumber, percentage_utilised: nullableNumber, remarks: nullableText }).strict();
export const updateFinancialSchema = createFinancialSchema.partial().refine((v) => Object.keys(v).length > 0, 'At least one field is required');
export const decisionSchema = z.object({ reason: z.string().trim().max(1000).optional() }).strict();

export const generateReportSchema = z.object({ type: z.enum(['pdf', 'excel']), start_date: date, end_date: date }).strict().refine((v) => v.end_date >= v.start_date, { path: ['end_date'], message: 'Must be on or after start_date' });

export const reportImportSchema = z.object({
  source_file_name: nullableTextMax(255),
  source_sheet_name: nullableTextMax(255),
  reporting_period: nullableTextMax(100),
  import_type: nullableTextMax(50).default('excel'),
  selected_project_id: uuid.nullable().optional(),
  selected_sheet: nullableTextMax(255),
  file_name: nullableTextMax(255),
  imported_rows_count: z.coerce.number().int().nonnegative().default(0),
  import_status: nullableTextMax(50).default('completed'),
  blocking_errors: optionalJsonArray,
  warnings: optionalJsonArray,
  preview_data: z.record(z.unknown()).nullable().optional(),
  raw_data: z.record(z.unknown()).nullable().optional(),
  raw_preview_json: z.record(z.unknown()).optional(),
  project_name: nullableTextMax(255),
  project_manager: nullableTextMax(255),
  start_date: nullableDate,
  completion_date: nullableDate,
  budget: nullableNumber.refine((value) => value == null || value >= 0, 'Number must be greater than or equal to 0'),
  executive_summary: nullableText,
  milestones: z.array(text).or(text.transform((value) => [value])).default([]),
  progress_achieved: nullableText,
  percentage_completion: nullableProgress,
  remarks: optionalText,
  risks: optionalText,
  mitigation: optionalText,
  status: z.enum(['Not Started', 'In Progress', 'Completed', 'On Hold']).nullable().optional(),
  overwrite: z.boolean().default(false),
}).strict().refine((v) => !v.start_date || !v.completion_date || v.completion_date >= v.start_date, { path: ['completion_date'], message: 'Must be on or after start_date' });

export const updateReportImportReviewSchema = z.object({
  review_status: z.enum(['imported', 'under_review', 'corrected', 'approved']),
}).strict();

export const createNotificationSchema = z.object({
  projectId: uuid,
  type: text.max(100),
  title: text.max(255),
  message: text.max(2000),
  entityType: nullableTextMax(100),
  entityId: uuid.nullable().optional(),
  severity: z.enum(['info', 'success', 'warning', 'error']).default('info'),
}).strict();

export const markAllNotificationsReadSchema = z.object({
  projectId: uuid,
}).strict();

const projectSchema = z.object({
  name: text.max(255), description: optionalText, district: optionalText, sector: optionalText,
  start_date: date.nullable().optional(), end_date: date.nullable().optional(),
  project_code: nullableTextMax(100),
  project_manager: nullableTextMax(255),
  planned_start_date: nullableDate,
  actual_start_date: nullableDate,
  planned_completion_date: nullableDate,
  actual_completion_date: nullableDate,
  estimated_budget: nullableNumber.refine((value) => value == null || value >= 0, 'Number must be greater than or equal to 0'),
  allocated_budget: nullableNumber.refine((value) => value == null || value >= 0, 'Number must be greater than or equal to 0'),
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).default('active'),
}).strict();
export const createProjectSchema = projectSchema.extend({ source_project_id: uuid.optional() }).refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, { path: ['end_date'], message: 'Must be on or after start_date' });
export const updateProjectSchema = projectSchema.partial().refine((v) => Object.keys(v).length > 0, 'At least one field is required').refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, { path: ['end_date'], message: 'Must be on or after start_date' });
export const addProjectMemberSchema = z.object({ email: z.string().trim().email().transform((v) => v.toLowerCase()), role: z.enum(roles), district: optionalText }).strict();
export const updateProjectMemberSchema = z.object({ role: z.enum(roles).optional(), district: optionalText }).strict().refine((v) => Object.keys(v).length > 0, 'At least one field is required');
export const createProjectInvitationSchema = z.object({
  role: z.enum(roles).default('officer'),
  expiresInDays: z.coerce.number().int().min(1).max(90).default(7),
}).strict();

export const invitationTokenSchema = z.string().trim().regex(/^[A-Fa-f0-9]{64,256}$/, 'Invalid invitation token');

export const createProfileSchema = z.object({ email: z.string().trim().email().transform((v) => v.toLowerCase()), password: z.string().min(8), full_name: text.max(255), phone: optionalText, is_org_admin: z.boolean().default(false), active: z.boolean().default(true) }).strict();
export const updateProfileSchema = z.object({ full_name: text.max(255).optional(), phone: optionalText, is_org_admin: z.boolean().optional(), active: z.boolean().optional() }).strict().refine((v) => Object.keys(v).length > 0, 'At least one field is required');
