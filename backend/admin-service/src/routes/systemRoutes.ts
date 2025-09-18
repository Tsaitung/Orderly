import { Router } from 'express';
import { 
  getSystemHealth, 
  getServiceDetails, 
  restartService 
} from '../controllers/systemHealthController';
import { authenticateAdmin, requirePermission } from '../middleware/auth';

const router = Router();

// Apply admin authentication to all system routes
router.use(authenticateAdmin);

// System health routes
router.get('/health', getSystemHealth);
router.get('/services/:serviceName', getServiceDetails);

// System control routes (require special permissions)
router.post('/services/:serviceName/restart', requirePermission('system:control'), restartService);

export default router;