import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { createProjectInvitationSchema, invitationTokenSchema } from '../schemas/index.js';
import { auditLog } from '../services/auditLog.service.js';
import { ApiError, parseBody, throwDb } from '../utils/http.js';

type InvitationStatus = 'Pending' | 'Accepted' | 'Expired' | 'Revoked';

interface InvitationRecord {
  id: string;
  project_id: string;
  created_by: string;
  token: string;
  role: string;
  expires_at: string;
  status: InvitationStatus;
  accepted_by?: string | null;
  projects?: { id: string; name: string; status: string | null } | { id: string; name: string; status: string | null }[] | null;
  profiles?: { id: string; full_name: string; email: string } | { id: string; full_name: string; email: string }[] | null;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function parseToken(value: unknown): string {
  const parsed = invitationTokenSchema.safeParse(value);
  if (!parsed.success) throw new ApiError(400, 'Invalid invitation token');
  return parsed.data;
}

function publicInvitationUrl(token: string): string {
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/invite/${token}`;
}

async function generateUniqueToken(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = randomBytes(32).toString('hex');
    const { data, error } = await supabase.from('project_invitations').select('id').eq('token', token).maybeSingle();
    throwDb(error);
    if (!data) return token;
  }
  throw new ApiError(500, 'Unable to generate a unique invitation token');
}

async function getInvitationByToken(token: string): Promise<InvitationRecord> {
  const { data, error } = await supabase
    .from('project_invitations')
    .select('id, project_id, created_by, token, role, expires_at, status, accepted_by, projects(id,name,status), profiles!project_invitations_created_by_fkey(id,full_name,email)')
    .eq('token', token)
    .maybeSingle();
  throwDb(error);
  if (!data) throw new ApiError(404, 'Invitation not found');
  return data as InvitationRecord;
}

function isExpired(invitation: InvitationRecord): boolean {
  return new Date(invitation.expires_at).getTime() <= Date.now();
}

async function markExpired(invitation: InvitationRecord): Promise<void> {
  if (invitation.status !== 'Pending' || !isExpired(invitation)) return;
  const { error } = await supabase.from('project_invitations').update({ status: 'Expired', updated_at: new Date().toISOString() }).eq('id', invitation.id);
  throwDb(error);
  invitation.status = 'Expired';
}

function assertUsableInvitation(invitation: InvitationRecord): void {
  if (invitation.status === 'Revoked') throw new ApiError(410, 'This invitation is no longer valid');
  if (invitation.status === 'Expired') throw new ApiError(410, 'This invitation has expired');
  if (invitation.status === 'Accepted') throw new ApiError(409, 'This invitation has already been accepted');
}

function assertVisibleInvitation(invitation: InvitationRecord): void {
  if (invitation.status === 'Revoked') throw new ApiError(410, 'This invitation is no longer valid');
  if (invitation.status === 'Expired') throw new ApiError(410, 'This invitation has expired');
}

function invitationResponse(invitation: InvitationRecord, alreadyMember = false) {
  const project = normalizeRelation(invitation.projects);
  const manager = normalizeRelation(invitation.profiles);
  return {
    token: invitation.token,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expires_at,
    alreadyMember,
    project: project ? { name: project.name } : null,
    manager: manager ? { name: manager.full_name, email: manager.email } : null,
  };
}

export async function createProjectInvitation(req: Request, res: Response): Promise<void> {
  const body = parseBody(createProjectInvitationSchema, req.body);
  const role = body.role ?? 'officer';
  const token = await generateUniqueToken();
  const expiresAt = addDays(new Date(), body.expiresInDays ?? 7).toISOString();
  const { data, error } = await supabase
    .from('project_invitations')
    .insert({ project_id: req.context.projectId, created_by: req.user.id, token, role, expires_at: expiresAt, status: 'Pending' })
    .select('id, project_id, created_by, token, role, expires_at, status')
    .single();
  throwDb(error);
  if (!data) throw new ApiError(500, 'Invitation was not created');
  await auditLog({ user_id: req.user.id, action: 'create', table_name: 'project_invitations', record_id: data.id, details: { project_id: req.context.projectId, role, expires_at: expiresAt } });
  res.status(201).json({ ...data, invitationUrl: publicInvitationUrl(token), expiresAt });
}

export async function validateInvitation(req: Request, res: Response): Promise<void> {
  const token = parseToken(req.params.token);
  const invitation = await getInvitationByToken(token);
  await markExpired(invitation);
  assertVisibleInvitation(invitation);
  const project = normalizeRelation(invitation.projects);
  if (!project || project.status === 'cancelled') throw new ApiError(404, 'Project not found');
  const { data: membership, error } = await supabase.from('project_members').select('id').eq('project_id', invitation.project_id).eq('user_id', req.user.id).maybeSingle();
  throwDb(error);
  res.json(invitationResponse(invitation, Boolean(membership)));
}

export async function acceptInvitation(req: Request, res: Response): Promise<void> {
  const token = parseToken(req.params.token);
  const invitation = await getInvitationByToken(token);
  await markExpired(invitation);
  assertUsableInvitation(invitation);
  const project = normalizeRelation(invitation.projects);
  if (!project || project.status === 'cancelled') throw new ApiError(404, 'Project not found');

  const { data: existing, error: existingError } = await supabase.from('project_members').select('id, role').eq('project_id', invitation.project_id).eq('user_id', req.user.id).maybeSingle();
  throwDb(existingError);
  if (existing) {
    res.json({
      success: true,
      alreadyMember: true,
      message: 'You are already a member of this project',
      project: { id: invitation.project_id, name: project.name, role: existing.role },
      membership: existing,
      invitation: invitationResponse(invitation, true),
    });
    return;
  }

  const { data: membership, error: memberError } = await supabase
    .from('project_members')
    .insert({ project_id: invitation.project_id, user_id: req.user.id, role: invitation.role, district: null })
    .select('id, project_id, user_id, role, district, added_at')
    .single();
  throwDb(memberError);
  if (!membership) throw new ApiError(500, 'Project membership was not created');

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('project_invitations')
    .update({ status: 'Accepted', accepted_by: req.user.id, accepted_at: now, updated_at: now })
    .eq('id', invitation.id)
    .eq('status', 'Pending');
  throwDb(updateError);
  await auditLog({ user_id: req.user.id, action: 'create', table_name: 'project_members', record_id: membership.id, details: { project_id: invitation.project_id, role: invitation.role, invitation_id: invitation.id } });
  res.status(201).json({
    success: true,
    alreadyMember: false,
    message: 'Successfully joined project',
    project: { id: invitation.project_id, name: project.name, role: invitation.role },
    membership,
  });
}

export async function revokeInvitation(req: Request, res: Response): Promise<void> {
  const token = parseToken(req.params.token);
  const invitation = await getInvitationByToken(token);
  const { data: managerMembership, error: membershipError } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', invitation.project_id)
    .eq('user_id', req.user.id)
    .eq('role', 'admin')
    .maybeSingle();
  throwDb(membershipError);
  if (!managerMembership) throw new ApiError(403, 'Insufficient permissions');
  if (invitation.status === 'Accepted') throw new ApiError(409, 'Accepted invitations cannot be revoked');
  const { error } = await supabase.from('project_invitations').update({ status: 'Revoked', updated_at: new Date().toISOString() }).eq('id', invitation.id);
  throwDb(error);
  await auditLog({ user_id: req.user.id, action: 'update', table_name: 'project_invitations', record_id: invitation.id, details: { project_id: invitation.project_id, status: 'Revoked' } });
  res.status(204).send();
}
