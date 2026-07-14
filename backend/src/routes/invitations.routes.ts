import { Router } from 'express';
import { acceptInvitation, revokeInvitation, validateInvitation } from '../controllers/invitations.controller.js';
import { asyncHandler } from '../utils/http.js';

export const invitationsRouter = Router();
invitationsRouter.get('/:token', asyncHandler(validateInvitation));
invitationsRouter.post('/:token/accept', asyncHandler(acceptInvitation));
invitationsRouter.delete('/:token', asyncHandler(revokeInvitation));
