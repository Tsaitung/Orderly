import { Router } from 'express';
import * as simpleController from '../controllers/simpleController';

const router = Router();

// Health check with database connection
router.get('/health', simpleController.healthCheck);

// Basic Product operations
router.get('/', simpleController.getProducts);
router.get('/:id', simpleController.getProductById);
router.post('/', simpleController.createProduct);
router.put('/:id', simpleController.updateProduct);

export default router;