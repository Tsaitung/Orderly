import { Router } from 'express';
import * as simpleController from '../controllers/simpleController';

const router = Router();

// Health check with database connection
router.get('/health', simpleController.healthCheck);

// Basic Notification operations
router.get('/', simpleController.getNotifications);
router.get('/:id', simpleController.getNotificationById);
router.post('/', simpleController.createNotification);
router.patch('/:id/read', simpleController.markAsRead);
router.patch('/read-all', simpleController.markAllAsRead);

export default router;