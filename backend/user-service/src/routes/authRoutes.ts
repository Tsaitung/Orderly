import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

// Public routes
router.get('/health', authController.health);
router.get('/test', authController.test);

// Authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

export default router;