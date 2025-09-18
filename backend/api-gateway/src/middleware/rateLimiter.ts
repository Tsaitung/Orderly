import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

// Redis connection for distributed rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

// Rate limiting configurations for different tiers
export const rateLimitConfigs = {
  // Public API - most restrictive
  public: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as Promise<any>,
      prefix: 'rl:public:',
    }),
    message: {
      error: 'Too many requests from this IP',
      retryAfter: '15 minutes',
      limit: 100,
    },
    onLimitReached: (req: Request) => {
      logger.warn(`Rate limit exceeded for public API`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        correlationId: req.headers['x-correlation-id'],
      });
    },
  },

  // Authenticated users - moderate limits
  authenticated: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use user ID for authenticated requests
      const userId = req.user?.id || req.ip;
      return `user:${userId}`;
    },
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as Promise<any>,
      prefix: 'rl:auth:',
    }),
    message: {
      error: 'Rate limit exceeded for authenticated user',
      retryAfter: '15 minutes',
      limit: 1000,
    },
    onLimitReached: (req: Request) => {
      logger.warn(`Rate limit exceeded for authenticated user`, {
        userId: req.user?.id,
        ip: req.ip,
        path: req.path,
        correlationId: req.headers['x-correlation-id'],
      });
    },
  },

  // VIP/Premium users - higher limits
  premium: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // 5000 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const userId = req.user?.id || req.ip;
      return `premium:${userId}`;
    },
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as Promise<any>,
      prefix: 'rl:premium:',
    }),
    message: {
      error: 'Rate limit exceeded for premium user',
      retryAfter: '15 minutes',
      limit: 5000,
    },
    onLimitReached: (req: Request) => {
      logger.warn(`Rate limit exceeded for premium user`, {
        userId: req.user?.id,
        ip: req.ip,
        path: req.path,
        correlationId: req.headers['x-correlation-id'],
      });
    },
  },

  // API keys - highest limits for B2B integrations
  apiKey: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // 10000 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const apiKey = req.headers['x-api-key'] as string;
      return `api:${apiKey}`;
    },
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as Promise<any>,
      prefix: 'rl:api:',
    }),
    message: {
      error: 'Rate limit exceeded for API key',
      retryAfter: '15 minutes',
      limit: 10000,
    },
    onLimitReached: (req: Request) => {
      logger.warn(`Rate limit exceeded for API key`, {
        apiKey: req.headers['x-api-key'],
        ip: req.ip,
        path: req.path,
        correlationId: req.headers['x-correlation-id'],
      });
    },
  },

  // Burst protection for sensitive operations
  sensitive: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Only 10 sensitive operations per 5 minutes
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as Promise<any>,
      prefix: 'rl:sensitive:',
    }),
    message: {
      error: 'Rate limit exceeded for sensitive operation',
      retryAfter: '5 minutes',
      limit: 10,
    },
    onLimitReached: (req: Request) => {
      logger.warn(`Sensitive operation rate limit exceeded`, {
        ip: req.ip,
        userId: req.user?.id,
        path: req.path,
        correlationId: req.headers['x-correlation-id'],
      });
    },
  },
};

// Dynamic rate limiter that adapts based on user type and endpoint
export const adaptiveRateLimit = (req: Request, res: Response, next: NextFunction) => {
  let config = rateLimitConfigs.public;

  // Check for API key
  if (req.headers['x-api-key']) {
    config = rateLimitConfigs.apiKey;
  }
  // Check for authenticated user
  else if (req.user) {
    // Check if user has premium subscription
    if (req.user.subscription === 'premium' || req.user.subscription === 'enterprise') {
      config = rateLimitConfigs.premium;
    } else {
      config = rateLimitConfigs.authenticated;
    }
  }

  // Apply sensitive operation limits for specific endpoints
  const sensitiveEndpoints = [
    '/api/users/password/reset',
    '/api/users/login',
    '/api/billing/payments',
    '/api/acceptance/verify',
  ];

  if (sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
    const sensitiveLimit = rateLimit(rateLimitConfigs.sensitive);
    return sensitiveLimit(req, res, next);
  }

  const limiter = rateLimit(config);
  return limiter(req, res, next);
};

// Circuit breaker pattern for service health
interface CircuitBreakerState {
  failures: number;
  lastFailureTime?: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

const FAILURE_THRESHOLD = 5;
const TIMEOUT_WINDOW = 60000; // 1 minute
const HALF_OPEN_MAX_CALLS = 3;

export const circuitBreaker = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const state = circuitBreakers.get(serviceName) || {
      failures: 0,
      state: 'CLOSED' as const,
    };

    const now = Date.now();

    switch (state.state) {
      case 'OPEN':
        if (state.lastFailureTime && now - state.lastFailureTime > TIMEOUT_WINDOW) {
          // Move to HALF_OPEN state
          state.state = 'HALF_OPEN';
          state.failures = 0;
          circuitBreakers.set(serviceName, state);
          logger.info(`Circuit breaker for ${serviceName} moved to HALF_OPEN`);
        } else {
          // Circuit is open, reject request
          return res.status(503).json({
            error: 'Service temporarily unavailable',
            service: serviceName,
            retryAfter: Math.ceil((TIMEOUT_WINDOW - (now - (state.lastFailureTime || 0))) / 1000),
            correlationId: req.headers['x-correlation-id'],
          });
        }
        break;

      case 'HALF_OPEN':
        if (state.failures >= HALF_OPEN_MAX_CALLS) {
          // Move back to OPEN
          state.state = 'OPEN';
          state.lastFailureTime = now;
          circuitBreakers.set(serviceName, state);
          logger.warn(`Circuit breaker for ${serviceName} moved back to OPEN`);
          return res.status(503).json({
            error: 'Service temporarily unavailable',
            service: serviceName,
            retryAfter: TIMEOUT_WINDOW / 1000,
            correlationId: req.headers['x-correlation-id'],
          });
        }
        break;
    }

    // Track response to update circuit breaker state
    const originalSend = res.send;
    res.send = function(data: any) {
      if (res.statusCode >= 500) {
        // Service error, increment failure count
        state.failures++;
        state.lastFailureTime = now;

        if (state.failures >= FAILURE_THRESHOLD) {
          state.state = 'OPEN';
          logger.warn(`Circuit breaker for ${serviceName} opened due to failures`, {
            failures: state.failures,
            correlationId: req.headers['x-correlation-id'],
          });
        }
      } else if (state.state === 'HALF_OPEN') {
        // Success in HALF_OPEN state, move to CLOSED
        state.state = 'CLOSED';
        state.failures = 0;
        logger.info(`Circuit breaker for ${serviceName} closed after successful request`);
      }

      circuitBreakers.set(serviceName, state);
      return originalSend.call(this, data);
    };

    next();
  };
};

// Health check for rate limiter Redis connection
export const rateLimiterHealthCheck = async (): Promise<boolean> => {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Rate limiter health check failed:', error);
    return false;
  }
};

export { redis as rateLimiterRedis };