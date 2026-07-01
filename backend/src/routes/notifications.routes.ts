import { Router } from 'express';
import { runOverdueTaskNotificationsForAdmin } from '../controllers/notifications.controller.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/http.js';

export const notificationsRouter = Router({ mergeParams: true });

notificationsRouter.post('/overdue-tasks/run', requireRole('admin', 'supervisor'), asyncHandler(runOverdueTaskNotificationsForAdmin));
