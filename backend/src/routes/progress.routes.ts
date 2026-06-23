import { Router } from 'express'; import { createProgress, deleteProgress, listProgress, updateProgress } from '../controllers/progress.controller.js';
import { requireRole } from '../middleware/requireRole.js'; import { asyncHandler } from '../utils/http.js';
export const progressRouter = Router(); progressRouter.get('/', requireRole('officer', 'supervisor', 'admin'), asyncHandler(listProgress));
progressRouter.post('/', requireRole('officer', 'supervisor', 'admin'), asyncHandler(createProgress));
progressRouter.patch('/:id', requireRole('officer', 'supervisor', 'admin'), asyncHandler(updateProgress));
progressRouter.delete('/:id', requireRole('officer', 'supervisor', 'admin'), asyncHandler(deleteProgress));

