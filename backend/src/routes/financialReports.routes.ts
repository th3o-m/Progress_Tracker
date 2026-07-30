import { Router } from 'express';
import { createFinancialReport, listFinancialReports } from '../controllers/financialReports.controller.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../utils/http.js';

export const financialReportsRouter = Router();

financialReportsRouter.get('/', asyncHandler(listFinancialReports));
financialReportsRouter.post('/', requireRole('supervisor', 'finance', 'admin'), asyncHandler(createFinancialReport));
