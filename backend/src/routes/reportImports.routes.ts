import { Router } from 'express';
import { createReportImport, getReportImportReview, listReportImports, updateReportImportReviewStatus } from '../controllers/reportImports.controller.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/http.js';

export const reportImportsRouter = Router();
reportImportsRouter.get('/', requireRole('supervisor', 'admin'), asyncHandler(listReportImports));
reportImportsRouter.get('/:importId/review', requireRole('supervisor', 'admin'), asyncHandler(getReportImportReview));
reportImportsRouter.post('/', requireRole('supervisor', 'admin'), asyncHandler(createReportImport));
reportImportsRouter.patch('/:importId/review-status', requireRole('supervisor', 'admin'), asyncHandler(updateReportImportReviewStatus));
