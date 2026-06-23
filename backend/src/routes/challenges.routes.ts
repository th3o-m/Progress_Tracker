import { Router } from 'express'; import { createChallenge, deleteChallenge, listChallenges, updateChallenge } from '../controllers/challenges.controller.js';
import { requireRole } from '../middleware/requireRole.js'; import { asyncHandler } from '../utils/http.js';
export const challengesRouter = Router(); challengesRouter.get('/', requireRole('officer', 'supervisor', 'admin'), asyncHandler(listChallenges));
challengesRouter.post('/', requireRole('officer', 'supervisor', 'admin'), asyncHandler(createChallenge));
challengesRouter.patch('/:id', requireRole('officer', 'supervisor', 'admin'), asyncHandler(updateChallenge));
challengesRouter.delete('/:id', requireRole('officer', 'supervisor', 'admin'), asyncHandler(deleteChallenge));

