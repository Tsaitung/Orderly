import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from './logger';

/**
 * Simple authentication middleware for JWT tokens
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid Bearer token',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    
    const decoded = jwt.verify(token, jwtSecret) as any;

    // Attach user information to request
    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role || 'user',
      subscription: decoded.subscription || 'free',
      permissions: decoded.permissions || [],
      companyId: decoded.companyId,
      sessionId: decoded.sessionId || 'session_' + Date.now(),
    };

    logger.info('User authenticated via JWT', {
      userId: req.user.id,
      role: req.user.role,
    });

    next();
  } catch (error) {
    logger.warn('JWT authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
    });

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Token expired',
        message: 'Please refresh your token',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Please provide a valid authentication token',
      });
      return;
    }

    res.status(401).json({
      error: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication middleware
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    // If no token is provided, continue without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev';

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        role: decoded.role || 'user',
        subscription: decoded.subscription || 'free',
        permissions: decoded.permissions || [],
        companyId: decoded.companyId,
        sessionId: decoded.sessionId || 'session_' + Date.now(),
      };
    } catch (error) {
      // Token is invalid, but this is optional auth, so continue without user
      logger.debug('Optional auth failed, continuing without user', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    next();
  } catch (error) {
    // Optional auth failed, continue without user
    logger.debug('Optional authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next();
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (requiredRoles: string | string[]) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
      });

      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required role: ${roles.join(' or ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Permission-based access control middleware
 */
export const requirePermission = (requiredPermissions: string | string[]) => {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
      });
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.some(permission => 
      userPermissions.includes(permission) || 
      userPermissions.includes('*') ||
      req.user?.role === 'admin'
    );

    if (!hasPermission) {
      logger.warn('Access denied - insufficient permissions', {
        userId: req.user.id,
        userPermissions,
        requiredPermissions: permissions,
        path: req.path,
      });

      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required permission: ${permissions.join(' or ')}`,
      });
      return;
    }

    next();
  };
};