import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { createServiceProxy } from '../middleware/proxy';
import { SERVICES } from '../config/services';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Public routes (no auth required)
router.use('/api/users/register', createServiceProxy('USER_SERVICE'));
router.use('/api/users/login', createServiceProxy('USER_SERVICE'));
router.use('/api/users/forgot-password', createServiceProxy('USER_SERVICE'));

// Protected routes (auth required)
router.use('/api/users', authenticateToken, createServiceProxy('USER_SERVICE'));
router.use('/api/orders', authenticateToken, createServiceProxy('ORDER_SERVICE'));
router.use('/api/products', authenticateToken, createServiceProxy('PRODUCT_SERVICE'));
router.use('/api/acceptance', authenticateToken, createServiceProxy('ACCEPTANCE_SERVICE'));
router.use('/api/billing', authenticateToken, createServiceProxy('BILLING_SERVICE'));
router.use('/api/notifications', authenticateToken, createServiceProxy('NOTIFICATION_SERVICE'));

export default router;