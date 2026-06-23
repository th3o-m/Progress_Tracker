import { Router } from 'express';
import { createProject, deleteProject, getProject, listProjects, updateProject } from '../controllers/projects.controller.js';
import { projectAccess } from '../middleware/projectAccess.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/http.js';

export const projectsRouter = Router();
projectsRouter.get('/', asyncHandler(listProjects));
projectsRouter.post('/', asyncHandler(createProject));
projectsRouter.get('/:projectId', projectAccess, asyncHandler(getProject));
projectsRouter.patch('/:projectId', projectAccess, requireRole('admin'), asyncHandler(updateProject));
projectsRouter.delete('/:projectId', projectAccess, requireRole('admin', 'supervisor'), asyncHandler(deleteProject));
