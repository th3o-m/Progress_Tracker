import { Router } from 'express'; import { createBeneficiary, deleteBeneficiary, listBeneficiaries, updateBeneficiary } from '../controllers/beneficiaries.controller.js';
import { requireRole } from '../middleware/requireRole.js'; import { asyncHandler } from '../utils/http.js';
export const beneficiariesRouter = Router(); beneficiariesRouter.get('/', requireRole('officer', 'supervisor', 'admin'), asyncHandler(listBeneficiaries));
beneficiariesRouter.post('/', requireRole('officer', 'supervisor', 'admin'), asyncHandler(createBeneficiary));
beneficiariesRouter.patch('/:id', requireRole('officer', 'supervisor', 'admin'), asyncHandler(updateBeneficiary));
beneficiariesRouter.delete('/:id', requireRole('officer', 'supervisor', 'admin'), asyncHandler(deleteBeneficiary));

