import { Router } from 'express';
import { createActivity, deleteActivity, getActivity, listActivities, updateActivity } from '../controllers/activities.controller.js';
import { requireRole } from '../middleware/requireRole.js'; import { asyncHandler } from '../utils/http.js';
export const activitiesRouter = Router();
activitiesRouter.get('/', asyncHandler(listActivities)); activitiesRouter.get('/:id', asyncHandler(getActivity));
activitiesRouter.post('/', requireRole('supervisor', 'admin'), asyncHandler(createActivity));
activitiesRouter.patch('/:id', requireRole('officer', 'supervisor', 'admin'), asyncHandler(updateActivity));
activitiesRouter.delete('/:id', requireRole('admin'), asyncHandler(deleteActivity));

