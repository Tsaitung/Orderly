import { Router } from 'express';
import * as simpleController from '../controllers/simpleController';

const router = Router();

// Health check with database connection
router.get('/health', simpleController.healthCheck);

// Basic Billing/Reconciliation operations
router.get('/', simpleController.getReconciliations);
router.get('/:id', simpleController.getReconciliationById);
router.post('/', simpleController.createReconciliation);
router.put('/:id/status', simpleController.updateReconciliationStatus);

export default router;