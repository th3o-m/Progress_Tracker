import { Router } from 'express';
import { addProjectMember, getCurrentUser, listProjectMembers, removeProjectMember, updateProjectMember } from '../controllers/auth.controller.js';
import { createProfile, deleteProfile, listProfiles, updateProfile } from '../controllers/profiles.controller.js';
import { requireOrgAdmin, requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/http.js';

export const usersRouter = Router();
usersRouter.get('/me', asyncHandler(getCurrentUser));
usersRouter.get('/', requireOrgAdmin, asyncHandler(listProfiles));
usersRouter.post('/', requireOrgAdmin, asyncHandler(createProfile));
usersRouter.patch('/:id', requireOrgAdmin, asyncHandler(updateProfile));
usersRouter.delete('/:id', requireOrgAdmin, asyncHandler(deleteProfile));

export const membersRouter = Router({ mergeParams: true });
membersRouter.get('/', requireRole('supervisor', 'admin'), asyncHandler(listProjectMembers));
membersRouter.post('/', requireRole('admin'), asyncHandler(addProjectMember));
membersRouter.patch('/:memberId', requireRole('admin'), asyncHandler(updateProjectMember));
membersRouter.delete('/:memberId', requireRole('admin'), asyncHandler(removeProjectMember));
