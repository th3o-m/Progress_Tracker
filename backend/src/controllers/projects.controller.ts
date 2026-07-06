import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { createProjectSchema, updateProjectSchema } from '../schemas/index.js';
import { auditLog } from '../services/auditLog.service.js';
import { applyReadScope, getRecord } from '../services/access.service.js';
import { ApiError, parseBody, throwDb } from '../utils/http.js';

export async function listProjects(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabase.from('project_members').select('role, district, added_at, projects(*)').eq('user_id', req.user.id).order('added_at', { ascending: false });
  throwDb(error); res.json(data);
}

export async function getProject(req: Request, res: Response): Promise<void> {
  const project = await getRecord('projects', req.context.projectId);
  res.json({ ...project, membership: { role: req.context.roleInProject, district: req.context.district } });
}

function normalizeStatus(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
}

function countByStatus(rows: Array<Record<string, any>>, statuses: string[]): number {
  const targets = new Set(statuses.map(normalizeStatus));
  return rows.filter((row) => targets.has(normalizeStatus(row.status))).length;
}

function sum(rows: Array<Record<string, any>>, field: string): number {
  return rows.reduce((total, row) => total + Number(row[field] ?? 0), 0);
}

function firstText(...values: unknown[]): string | null {
  const value = values.find((item) => typeof item === 'string' && item.trim().length > 0);
  return typeof value === 'string' ? value.trim() : null;
}

function relatedActivityName(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = Array.isArray(value) ? value[0] : value;
  if (!record || typeof record !== 'object' || !('name' in record)) return null;
  return typeof record.name === 'string' ? record.name : null;
}

function buildExecutiveSummary(overallProgress: number, totalActivities: number, completedActivities: number, ongoingActivities: number, delayedActivities: number, recentUpdates: unknown[], unresolvedChallenges: number): string {
  if (totalActivities === 0) return 'Based on available project records, no activities have been recorded yet. Limited progress data is currently available for executive review.';
  const parts = [
    `Based on available project records, the project is currently at ${overallProgress}% overall progress.`,
    `Out of ${totalActivities} planned activities, ${completedActivities} are completed, ${ongoingActivities} are ongoing, and ${delayedActivities} are delayed.`,
  ];
  if (recentUpdates.length === 0) parts.push('Limited recent progress update data is currently available.');
  else parts.push('Recent updates indicate active implementation records are being captured.');
  if (unresolvedChallenges > 0) parts.push(`Key attention is required for ${unresolvedChallenges} unresolved challenge${unresolvedChallenges === 1 ? '' : 's'}.`);
  return parts.join(' ');
}

export async function getProjectPresentation(req: Request, res: Response): Promise<void> {
  const project = await getRecord('projects', req.context.projectId);
  let activitiesQuery = supabase.from('activities').select('id, code, name, category, district, status, progress_pct, start_date, end_date, description, remarks, actual_completion_date, created_at').eq('project_id', req.context.projectId);
  activitiesQuery = applyReadScope(activitiesQuery, req);
  const { data: activitiesData, error: activitiesError } = await activitiesQuery; throwDb(activitiesError);

  let progressQuery = supabase.from('progress_updates').select('id, activity_id, progress_pct, status, narrative, executive_summary, remarks, report_date, created_at, activities(code,name,district)').eq('project_id', req.context.projectId).order('report_date', { ascending: false }).limit(6);
  progressQuery = applyReadScope(progressQuery, req, 'officer_id');
  const { data: progressData, error: progressError } = await progressQuery; throwDb(progressError);

  let challengesQuery = supabase.from('challenges').select('id, challenge_type, description, mitigation_plan, resolved, created_at, activities(code,name,district)').eq('project_id', req.context.projectId).order('created_at', { ascending: false });
  challengesQuery = applyReadScope(challengesQuery, req, 'officer_id');
  const { data: challengesData, error: challengesError } = await challengesQuery; throwDb(challengesError);

  let beneficiariesQuery = supabase.from('beneficiaries').select('id, beneficiary_type, district').eq('project_id', req.context.projectId);
  beneficiariesQuery = applyReadScope(beneficiariesQuery, req);
  const { data: beneficiariesData, error: beneficiariesError } = await beneficiariesQuery; throwDb(beneficiariesError);

  let financialQuery = supabase.from('financial_entries').select('id, amount, approved_budget, balance, status, submitted_by').eq('project_id', req.context.projectId);
  financialQuery = applyReadScope(financialQuery, req, 'submitted_by');
  const { data: financialData, error: financialError } = await financialQuery; throwDb(financialError);

  const activities = activitiesData ?? [];
  const progressUpdates = progressData ?? [];
  const challenges = challengesData ?? [];
  const beneficiaries = beneficiariesData ?? [];
  const financialEntries = financialData ?? [];
  const totalActivities = activities.length;
  const completedActivities = countByStatus(activities, ['completed', 'complete']);
  const ongoingActivities = countByStatus(activities, ['in progress', 'ongoing', 'active']);
  const delayedActivities = countByStatus(activities, ['delayed', 'overdue', 'behind schedule']);
  const notStartedActivities = countByStatus(activities, ['not started', 'pending']);
  const overallProgress = totalActivities ? Math.round(activities.reduce((total, row) => total + Number(row.progress_pct ?? 0), 0) / totalActivities) : 0;
  const unresolvedChallenges = challenges.filter((challenge) => !challenge.resolved);
  const incompleteActivities = activities.filter((activity) => normalizeStatus(activity.status) !== 'completed');
  const achievements = activities
    .filter((activity) => normalizeStatus(activity.status) === 'completed')
    .slice(0, 6)
    .map((activity) => firstText(activity.name, activity.code))
    .filter((value): value is string => Boolean(value));
  const nextSteps = [
    delayedActivities > 0 ? `Review and recover ${delayedActivities} delayed activity${delayedActivities === 1 ? '' : 'ies'}.` : null,
    unresolvedChallenges.length > 0 ? `Resolve or update mitigation plans for ${unresolvedChallenges.length} open challenge${unresolvedChallenges.length === 1 ? '' : 's'}.` : null,
    incompleteActivities.length > 0 ? `Continue implementation for ${incompleteActivities.length} incomplete activity${incompleteActivities.length === 1 ? '' : 'ies'}.` : null,
  ].filter((value): value is string => Boolean(value));

  const byCategory = Array.from(beneficiaries.reduce((map, row) => {
    const label = firstText(row.beneficiary_type, 'Unspecified') ?? 'Unspecified';
    map.set(label, (map.get(label) ?? 0) + 1);
    return map;
  }, new Map<string, number>())).map(([label, value]) => ({ label, value }));

  const response = {
    project: {
      id: project.id,
      name: project.name,
      description: project.description ?? null,
      objectives: null,
      projectCode: project.project_code ?? null,
      projectManager: project.project_manager ?? null,
      startDate: project.start_date ?? project.planned_start_date ?? project.actual_start_date ?? null,
      endDate: project.end_date ?? project.planned_completion_date ?? project.actual_completion_date ?? null,
      status: project.status ?? null,
      district: project.district ?? null,
      sector: project.sector ?? null,
    },
    executiveSummary: buildExecutiveSummary(overallProgress, totalActivities, completedActivities, ongoingActivities, delayedActivities, progressUpdates, unresolvedChallenges.length),
    progressOverview: { overallProgress, totalActivities, completedActivities, ongoingActivities, delayedActivities, notStartedActivities, unresolvedChallenges: unresolvedChallenges.length },
    recentUpdates: progressUpdates.map((update) => ({
      id: update.id,
      title: firstText(relatedActivityName(update.activities), update.status),
      description: firstText(update.executive_summary, update.narrative, update.remarks),
      progress: Number(update.progress_pct ?? 0),
      createdAt: update.report_date ?? update.created_at ?? null,
    })),
    achievements,
    challenges: unresolvedChallenges.slice(0, 8).map((challenge) => ({
      id: challenge.id,
      title: firstText(challenge.challenge_type, relatedActivityName(challenge.activities)),
      description: challenge.description ?? null,
      mitigation: challenge.mitigation_plan ?? null,
      status: challenge.resolved ? 'Resolved' : 'Unresolved',
    })),
    beneficiariesSummary: { totalBeneficiaries: beneficiaries.length, byCategory },
    financialSummary: {
      totalBudget: Number(project.allocated_budget ?? project.estimated_budget ?? 0),
      totalSpent: sum(financialEntries, 'amount'),
      approvedAmount: sum(financialEntries.filter((entry) => entry.status === 'approved'), 'amount'),
      pendingAmount: sum(financialEntries.filter((entry) => entry.status === 'pending'), 'amount'),
      rejectedAmount: sum(financialEntries.filter((entry) => entry.status === 'rejected'), 'amount'),
    },
    nextSteps: nextSteps.length ? nextSteps : ['Maintain project monitoring and continue updating project records.'],
  };
  res.json(response);
}

export async function createProject(req: Request, res: Response): Promise<void> {
  const body = parseBody(createProjectSchema, req.body);
  const { source_project_id, ...projectInput } = body;
  if (!req.user.isOrgAdmin) {
    if (!source_project_id) throw new ApiError(403, 'Select a project where you are an admin or supervisor');
    const { data: sourceMembership, error: membershipError } = await supabase.from('project_members').select('role').eq('project_id', source_project_id).eq('user_id', req.user.id).maybeSingle();
    throwDb(membershipError);
    if (!sourceMembership || !['admin', 'supervisor'].includes(sourceMembership.role)) throw new ApiError(403, 'Project admin or supervisor access required');
  }
  const { data: project, error } = await supabase.from('projects').insert({ ...projectInput, created_by: req.user.id }).select().single(); throwDb(error);
  const { data: membership, error: memberError } = await supabase.from('project_members').insert({ project_id: project.id, user_id: req.user.id, role: 'admin', district: projectInput.district ?? null }).select().single();
  if (memberError) { await supabase.from('projects').delete().eq('id', project.id); throwDb(memberError); }
  await auditLog({ user_id: req.user.id, action: 'create', table_name: 'projects', record_id: project.id, details: { ...projectInput, project_id: project.id, source_project_id: source_project_id ?? null } });
  await auditLog({ user_id: req.user.id, action: 'create', table_name: 'project_members', record_id: membership.id, details: { project_id: project.id, user_id: req.user.id, role: 'admin' } });
  res.status(201).json({ ...project, membership });
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  const body = parseBody(updateProjectSchema, req.body);
  const current = await getRecord('projects', req.context.projectId);
  const startDate = body.start_date === undefined ? current.start_date : body.start_date;
  const endDate = body.end_date === undefined ? current.end_date : body.end_date;
  if (startDate && endDate && endDate < startDate) throw new ApiError(400, 'Validation failed', { end_date: ['Must be on or after start_date'] });
  const { data, error } = await supabase.from('projects').update(body).eq('id', req.context.projectId).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'update', table_name: 'projects', record_id: data.id, details: { ...body, project_id: data.id } }); res.json(data);
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  const project = await getRecord('projects', req.context.projectId);
  if (project.status === 'cancelled') throw new ApiError(409, 'Project is already removed');
  const { error } = await supabase.from('projects').update({ status: 'cancelled' }).eq('id', project.id).select().single(); throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'update', table_name: 'projects', record_id: project.id, details: { name: project.name, project_id: project.id, status: 'cancelled', reason: 'removed_from_project_switcher' } }); res.status(204).send();
}
