import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from './logger';
import crypto from 'crypto';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  subscription: string;
  permissions: string[];
  companyId?: string;
  sessionId: string;
  iat: number;
  exp: number;
}

interface APIKeyInfo {
  keyId: string;
  clientId: string;
  name: string;
  permissions: string[];
  rateLimit: number;
  isActive: boolean;
  expiresAt?: Date;
}

// Mock API key store (in production, this would be in database/Redis)
const apiKeyStore = new Map<string, APIKeyInfo>([
  ['ak_prod_123456789abcdef', {
    keyId: 'ak_001',
    clientId: 'client_001',
    name: 'Production Key - Restaurant Chain A',
    permissions: ['orders:read', 'orders:create', 'products:read'],
    rateLimit: 10000,
    isActive: true,
    expiresAt: new Date('2025-12-31'),
  }],
  ['ak_dev_987654321fedcba', {
    keyId: 'ak_002',
    clientId: 'client_002',
    name: 'Development Key - Supplier B',
    permissions: ['products:read', 'inventory:read'],
    rateLimit: 1000,
    isActive: true,
  }],
]);

/**
 * JWT Authentication Middleware
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check for API key first
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      return await authenticateWithAPIKey(req, res, next, apiKey);
    }

    // Check for JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid Bearer token or API key',
        correlationId: req.correlationId,
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable not set');
      res.status(500).json({
        error: 'Internal server error',
        correlationId: req.correlationId,
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Additional security checks
    if (await isTokenBlacklisted(token)) {
      res.status(401).json({
        error: 'Token has been revoked',
        correlationId: req.correlationId,
      });
    }

    if (await isSessionExpired(decoded.sessionId)) {
      res.status(401).json({
        error: 'Session has expired',
        correlationId: req.correlationId,
      });
    }

    // Attach user information to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      subscription: decoded.subscription,
      permissions: decoded.permissions,
      companyId: decoded.companyId,
      sessionId: decoded.sessionId,
    };

    logger.info('User authenticated via JWT', {
      userId: decoded.userId,
      role: decoded.role,
      sessionId: decoded.sessionId,
      correlationId: req.correlationId,
    });

    next();
  } catch (error) {
    logger.warn('JWT authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId: req.correlationId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Token expired',
        message: 'Please refresh your token',
        correlationId: req.correlationId,
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Please provide a valid authentication token',
        correlationId: req.correlationId,
      });
    }

    res.status(401).json({
      error: 'Authentication failed',
      correlationId: req.correlationId,
    });
  }
};

/**
 * API Key Authentication
 */
const authenticateWithAPIKey = async (req: Request, res: Response, next: NextFunction, apiKey: string): Promise<void> => {
  try {
    // Validate API key format
    if (!apiKey.match(/^ak_(prod|dev|test)_[a-f0-9]{16,}$/)) {
      res.status(401).json({
        error: 'Invalid API key format',
        correlationId: req.correlationId,
      });
    }

    // Look up API key
    const keyInfo = apiKeyStore.get(apiKey);
    if (!keyInfo || !keyInfo.isActive) {
      logger.warn('Invalid or inactive API key used', {
        apiKey: apiKey.substring(0, 10) + '***',
        ip: req.ip,
        correlationId: req.correlationId,
      });

      res.status(401).json({
        error: 'Invalid or inactive API key',
        correlationId: req.correlationId,
      });
    }

    // Check expiration
    if (keyInfo.expiresAt && new Date() > keyInfo.expiresAt) {
      res.status(401).json({
        error: 'API key has expired',
        correlationId: req.correlationId,
      });
    }

    // Create user object for API key authentication
    req.user = {
      id: keyInfo.clientId,
      email: `${keyInfo.clientId}@api.orderly.com`,
      role: 'api_client',
      subscription: 'api',
      permissions: keyInfo.permissions,
      sessionId: `api_${keyInfo.keyId}`,
    };

    logger.info('User authenticated via API key', {
      keyId: keyInfo.keyId,
      clientId: keyInfo.clientId,
      permissions: keyInfo.permissions,
      correlationId: req.correlationId,
    });

    next();
  } catch (error) {
    logger.error('API key authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId: req.correlationId,
    });

    res.status(500).json({
      error: 'Authentication service error',
      correlationId: req.correlationId,
    });
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (requiredRoles: string | string[]) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        correlationId: req.correlationId,
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
        correlationId: req.correlationId,
      });

      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required role: ${roles.join(' or ')}`,
        correlationId: req.correlationId,
      });
    }

    next();
  };
};

/**
 * Permission-based access control middleware
 */
export const requirePermission = (requiredPermissions: string | string[]) => {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        correlationId: req.correlationId,
      });
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
        correlationId: req.correlationId,
      });

      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required permission: ${permissions.join(' or ')}`,
        correlationId: req.correlationId,
      });
    }

    next();
  };
};

/**
 * Resource ownership validation
 */
export const requireOwnership = (resourceIdParam: string, resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        correlationId: req.correlationId,
      });
    }

    // Admin users can access all resources
    if (req.user.role === 'admin') {
      return next();
    }

    const resourceId = req.params[resourceIdParam];
    if (!resourceId) {
      res.status(400).json({
        error: 'Resource ID required',
        correlationId: req.correlationId,
      });
    }

    try {
      // Check resource ownership (this would typically query the database)
      const hasAccess = await checkResourceOwnership(req.user.id, resourceId, resourceType, req.user.companyId);
      
      if (!hasAccess) {
        logger.warn('Access denied - resource ownership', {
          userId: req.user.id,
          resourceId,
          resourceType,
          correlationId: req.correlationId,
        });

        res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this resource',
          correlationId: req.correlationId,
        });
      }

      next();
    } catch (error) {
      logger.error('Resource ownership check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user.id,
        resourceId,
        resourceType,
        correlationId: req.correlationId,
      });

      res.status(500).json({
        error: 'Access control error',
        correlationId: req.correlationId,
      });
    }
  };
};

/**
 * Security headers middleware
 */
export const securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
      return;
  res.setHeader('X-Frame-Options', 'DENY');
      return;
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      return;
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      return;
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

/**
 * Optional authentication middleware
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    // If neither token nor API key is provided, continue without authentication
    if (!authHeader && !apiKey) {
      return next();
    }

    // Try API key authentication first
    if (apiKey) {
      const keyInfo = apiKeyStore.get(apiKey);
      if (keyInfo && keyInfo.isActive) {
        req.user = {
          id: keyInfo.clientId,
          email: `${keyInfo.clientId}@api.orderly.com`,
          role: 'api_client',
          subscription: 'api',
          permissions: keyInfo.permissions,
          sessionId: `api_${keyInfo.keyId}`,
        };
      }
      return next();
    }

    // Try JWT authentication
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET;

      if (jwtSecret) {
        try {
          const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
          req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            subscription: decoded.subscription,
            permissions: decoded.permissions,
            companyId: decoded.companyId,
            sessionId: decoded.sessionId,
          };
        } catch (error) {
          // Token is invalid, but this is optional auth, so continue without user
          logger.debug('Optional auth failed, continuing without user', {
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId: req.correlationId,
          });
        }
      }
    }

    next();
  } catch (error) {
    // Optional auth failed, continue without user
    logger.debug('Optional authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId: req.correlationId,
    });
    next();
  }
};

// Helper functions (would typically interact with database/Redis)
const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  // In production, check Redis blacklist
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  // return await redis.exists(`blacklist:${hash}`);
  return false; // Placeholder
};

const isSessionExpired = async (sessionId: string): Promise<boolean> => {
  // In production, check session store
  // const session = await redis.get(`session:${sessionId}`);
  // return !session || new Date() > new Date(JSON.parse(session).expiresAt);
  return false; // Placeholder
};

const checkResourceOwnership = async (
  userId: string, 
  resourceId: string, 
  resourceType: string, 
  companyId?: string
): Promise<boolean> => {
  // In production, this would query the database to check ownership
  // Example: SELECT 1 FROM orders WHERE id = ? AND (user_id = ? OR company_id = ?)
  return true; // Placeholder
};