import { Router } from 'express'; import { approveFinancialEntry, createFinancialEntry, deleteFinancialEntry, listFinancialEntries, rejectFinancialEntry, updateFinancialEntry } from '../controllers/financial.controller.js';
import { requireRole } from '../middleware/requireRole.js'; import { asyncHandler } from '../utils/http.js';
export const financialRouter = Router(); financialRouter.get('/', asyncHandler(listFinancialEntries));
financialRouter.post('/', requireRole('officer', 'supervisor', 'finance', 'admin'), asyncHandler(createFinancialEntry));
financialRouter.patch('/:id/approve', requireRole('finance', 'admin'), asyncHandler(approveFinancialEntry));
financialRouter.patch('/:id/reject', requireRole('finance', 'admin'), asyncHandler(rejectFinancialEntry));
financialRouter.patch('/:id', requireRole('officer', 'supervisor', 'finance', 'admin'), asyncHandler(updateFinancialEntry));
financialRouter.delete('/:id', requireRole('officer', 'supervisor', 'admin'), asyncHandler(deleteFinancialEntry));
