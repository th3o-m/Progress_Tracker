import { Router } from 'express'; import { generateReport, listReports } from '../controllers/reports.controller.js';
import { requireRole } from '../middleware/requireRole.js'; import { asyncHandler } from '../utils/http.js';
export const reportsRouter = Router(); reportsRouter.get('/', requireRole('supervisor', 'admin'), asyncHandler(listReports)); reportsRouter.post('/generate', requireRole('supervisor', 'admin'), asyncHandler(generateReport));

