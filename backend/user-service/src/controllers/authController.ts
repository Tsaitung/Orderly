import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { logger } from '../middleware/logger';

export const authController = {
  // Health check for auth service
  health: (req: Request, res: Response): void => {
    res.json({
      status: 'healthy',
      service: 'user-service-auth',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    });
  },

  // Test endpoint for development
  test: (req: Request, res: Response): void => {
    res.json({
      message: 'Hello from User Service Auth Controller! 🔐',
      service: 'user-service',
      controller: 'auth',
      timestamp: new Date().toISOString(),
      endpoints: [
        'GET /auth/health',
        'GET /auth/test',
        'POST /auth/register',
        'POST /auth/login',
        'POST /auth/refresh',
      ],
    });
  },

  // User registration (mock implementation)
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name, role = 'user' } = req.body;

      // Basic validation
      if (!email || !password || !name) {
        res.status(400).json({
          success: false,
          message: 'Email, password, and name are required',
        });
        return;
      }

      // Mock user creation (in real implementation, this would save to database)
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const mockUser = {
        id: `user_${Date.now()}`,
        email,
        name,
        role,
        createdAt: new Date().toISOString(),
      };

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: mockUser.id, 
          email: mockUser.email, 
          role: mockUser.role 
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '24h' }
      );

      logger.info('User registered successfully', { userId: mockUser.id, email });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
            role: mockUser.role,
          },
          token,
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration',
      });
    }
  },

  // User login (mock implementation)
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Basic validation
      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
        return;
      }

      // Mock user lookup (in real implementation, this would query database)
      const mockUser = {
        id: 'user_demo',
        email: email,
        name: 'Demo User',
        role: 'user',
        password: await bcrypt.hash('password123', 12), // Mock hashed password
      };

      // For demo purposes, accept any email with password "password123"
      const isValidPassword = await bcrypt.compare(password, mockUser.password) || password === 'password123';

      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: mockUser.id, 
          email: mockUser.email, 
          role: mockUser.role 
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '24h' }
      );

      logger.info('User logged in successfully', { userId: mockUser.id, email });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
            role: mockUser.role,
          },
          token,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login',
      });
    }
  },

  // Refresh token (mock implementation)
  refresh: async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
        return;
      }

      // Mock refresh logic
      const newToken = jwt.sign(
        { 
          id: 'user_demo', 
          email: 'demo@orderly.com', 
          role: 'user' 
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
        },
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during token refresh',
      });
    }
  },
};