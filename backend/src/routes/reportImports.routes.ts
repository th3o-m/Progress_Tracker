import { Router } from 'express';
import { createReportImport, listReportImports } from '../controllers/reportImports.controller.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/http.js';

export const reportImportsRouter = Router();
reportImportsRouter.get('/', requireRole('supervisor', 'admin'), asyncHandler(listReportImports));
reportImportsRouter.post('/', requireRole('supervisor', 'admin'), asyncHandler(createReportImport));
