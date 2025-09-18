import { Router } from 'express';
import { 
  getUsers, 
  getUserById, 
  updateUserStatus, 
  deleteUser 
} from '../controllers/userController';
import { authenticateAdmin, requirePermission } from '../middleware/auth';

const router = Router();

// Apply admin authentication to all user routes
router.use(authenticateAdmin);

// User management routes
router.get('/', getUsers);
router.get('/:id', getUserById);

// User modification routes (require special permissions)
router.patch('/:id/status', requirePermission('user:modify'), updateUserStatus);
router.delete('/:id', requirePermission('user:delete'), deleteUser);

export default router;