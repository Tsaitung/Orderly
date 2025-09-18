import { Router } from 'express';
import * as simpleController from '../controllers/simpleController';

const router = Router();

// Health check
router.get('/health', simpleController.healthCheck);

// Basic Order operations
router.get('/', simpleController.getOrders);
router.get('/:id', simpleController.getOrderById);
router.post('/', simpleController.createOrder);
router.put('/:id/status', simpleController.updateOrderStatus);

export default router;