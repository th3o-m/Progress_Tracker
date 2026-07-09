import { Router } from 'express';
import {
  createNotification,
  generateOverdueActivityNotifications,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  runOverdueTaskNotificationsForAdmin,
} from '../controllers/notifications.controller.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/http.js';

export const notificationsRouter = Router({ mergeParams: true });

notificationsRouter.post('/overdue-tasks/run', requireRole('admin', 'supervisor'), asyncHandler(runOverdueTaskNotificationsForAdmin));

export const userNotificationsRouter = Router();

userNotificationsRouter.post('/generate-overdue', asyncHandler(generateOverdueActivityNotifications));
userNotificationsRouter.get('/', asyncHandler(listNotifications));
userNotificationsRouter.get('/unread-count', asyncHandler(getUnreadNotificationCount));
userNotificationsRouter.post('/', asyncHandler(createNotification));
userNotificationsRouter.patch('/read-all', asyncHandler(markAllNotificationsRead));
userNotificationsRouter.patch('/:notificationId/read', asyncHandler(markNotificationRead));
