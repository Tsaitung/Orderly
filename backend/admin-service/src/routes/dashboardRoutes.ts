import { Router } from 'express';
import { getDashboardData, getBusinessMetrics } from '../controllers/dashboardController';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

// Apply admin authentication to all dashboard routes
router.use(authenticateAdmin);

// Dashboard routes
router.get('/data', getDashboardData);
router.get('/metrics', getBusinessMetrics);

export default router;