import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import rateLimit from 'express-rate-limit';

/**
 * Simple correlation ID middleware
 */
export const correlationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate or use existing correlation ID
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  
  // Attach to request
  req.correlationId = correlationId;
  
  // Add to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
};

/**
 * Simple request context middleware
 */
export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log request start
  logger.info('Request started', {
    correlationId: req.correlationId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Track response
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      correlationId: req.correlationId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
    });

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Simple rate limiting
 */
export const simpleRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Simple service call tracer
 */
export const serviceCallTracer = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    logger.info(`Proxying request to ${serviceName}`, {
      correlationId: req.correlationId,
      targetService: serviceName,
      method: req.method,
      path: req.path,
      userId: req.user?.id,
    });

    next();
  };
};

/**
 * Simple circuit breaker placeholder
 */
export const circuitBreaker = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Simple implementation - would be more complex in production
    next();
  };
};

/**
 * Security headers middleware
 */
export const securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

/**
 * Simple metrics middleware
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds

    // Log metrics
    logger.info('Request metrics', {
      method: req.method,
      route: req.path,
      statusCode: res.statusCode,
      duration,
      correlationId: req.correlationId,
      userId: req.user?.id,
    });
  });

  next();
};

/**
 * Health check for simple rate limiter
 */
export const rateLimiterHealthCheck = async (): Promise<boolean> => {
  // Simple implementation - always return true
  // In production, this would check Redis connectivity
  return true;
};