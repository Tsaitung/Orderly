import { Router } from 'express';
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  registerValidation,
  loginValidation
} from '../controllers/authController';

const router = Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;