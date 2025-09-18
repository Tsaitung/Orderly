import { Request, Response, NextFunction } from 'express';
import redis, { CACHE_KEYS, CACHE_TTL, cacheHelpers } from '../config/redis';
import { logger } from './logger';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
  cacheableStatusCodes?: number[];
}

/**
 * API Response caching middleware
 * Caches GET requests responses based on URL and query parameters
 */
export function apiCache(options: CacheOptions = {}) {
  const {
    ttl = CACHE_TTL.API_RESPONSE,
    keyGenerator = (req: Request) => `${CACHE_KEYS.API_RESPONSE}${req.method}:${req.originalUrl}`,
    skipCache = (req: Request) => req.method !== 'GET' || req.headers['cache-control'] === 'no-cache',
    cacheableStatusCodes = [200]
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-cacheable requests
    if (skipCache(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);
    
    try {
      // Try to get cached response
      const cachedResponse = await cacheHelpers.getJSON<{
        statusCode: number;
        headers: Record<string, string>;
        body: any;
      }>(cacheKey);

      if (cachedResponse) {
        logger.debug('Cache hit', { 
          cacheKey, 
          method: req.method, 
          url: req.originalUrl,
          correlationId: req.headers['x-correlation-id']
        });

        // Set cached headers
        Object.entries(cachedResponse.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });

        res.setHeader('X-Cache-Status', 'HIT');
        return res.status(cachedResponse.statusCode).json(cachedResponse.body);
      }

      // Cache miss - continue with request
      logger.debug('Cache miss', { 
        cacheKey, 
        method: req.method, 
        url: req.originalUrl,
        correlationId: req.headers['x-correlation-id']
      });

      res.setHeader('X-Cache-Status', 'MISS');

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = function(body: any) {
        // Only cache successful responses
        if (cacheableStatusCodes.includes(res.statusCode)) {
          const responseToCache = {
            statusCode: res.statusCode,
            headers: {
              'Content-Type': res.getHeader('Content-Type') as string || 'application/json',
              'X-Correlation-ID': req.headers['x-correlation-id'] as string,
            },
            body
          };

          // Cache the response asynchronously
          cacheHelpers.setJSON(cacheKey, responseToCache, ttl).catch(error => {
            logger.error('Failed to cache response', { 
              cacheKey, 
              error: error instanceof Error ? error.message : error 
            });
          });

          logger.debug('Response cached', { 
            cacheKey, 
            statusCode: res.statusCode,
            ttl,
            correlationId: req.headers['x-correlation-id']
          });
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { 
        cacheKey, 
        error: error instanceof Error ? error.message : error 
      });
      next();
    }
  };
}

/**
 * Session caching middleware
 * Caches user session data for authenticated requests
 */
export function sessionCache() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return next();
    }

    const sessionKey = `${CACHE_KEYS.USER_SESSION}${userId}`;

    try {
      // Try to get cached session
      const cachedSession = await cacheHelpers.getJSON(sessionKey);
      
      if (cachedSession) {
        (req as any).cachedSession = cachedSession;
        logger.debug('Session cache hit', { userId, sessionKey });
      } else {
        logger.debug('Session cache miss', { userId, sessionKey });
      }

      next();
    } catch (error) {
      logger.error('Session cache error', { 
        userId, 
        sessionKey, 
        error: error instanceof Error ? error.message : error 
      });
      next();
    }
  };
}

/**
 * Clear cache middleware
 * Provides methods to clear cache on demand
 */
export function clearCache() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add cache clearing utilities to request object
    (req as any).clearCache = {
      api: async (pattern?: string) => {
        try {
          const keys = pattern 
            ? await redis.keys(`${CACHE_KEYS.API_RESPONSE}${pattern}`)
            : await redis.keys(`${CACHE_KEYS.API_RESPONSE}*`);
          
          if (keys.length > 0) {
            await redis.del(...keys);
            logger.info('API cache cleared', { pattern, keyCount: keys.length });
          }
          
          return keys.length;
        } catch (error) {
          logger.error('Failed to clear API cache', { error: error instanceof Error ? error.message : error });
          return 0;
        }
      },
      
      user: async (userId: string) => {
        try {
          const sessionKey = `${CACHE_KEYS.USER_SESSION}${userId}`;
          const deleted = await cacheHelpers.delete(sessionKey);
          logger.info('User session cache cleared', { userId, deleted });
          return deleted;
        } catch (error) {
          logger.error('Failed to clear user cache', { userId, error: error instanceof Error ? error.message : error });
          return false;
        }
      },

      all: async () => {
        try {
          const keys = await redis.keys('*');
          if (keys.length > 0) {
            await redis.del(...keys);
            logger.info('All cache cleared', { keyCount: keys.length });
          }
          return keys.length;
        } catch (error) {
          logger.error('Failed to clear all cache', { error: error instanceof Error ? error.message : error });
          return 0;
        }
      }
    };

    next();
  };
}

/**
 * Cache invalidation middleware
 * Automatically invalidates related cache on data modifications
 */
export function cacheInvalidation() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only handle modifying requests
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Store original json method to intercept response
    const originalJson = res.json.bind(res);
    res.json = function(body: any) {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Determine cache patterns to invalidate based on request path
        const pathSegments = req.path.split('/');
        const invalidationPromises: Promise<any>[] = [];

        // Invalidate API response cache for related endpoints
        if (pathSegments.includes('products')) {
          invalidationPromises.push(
            redis.keys(`${CACHE_KEYS.API_RESPONSE}*products*`).then(async (keys) => {
              if (keys.length > 0) {
                await redis.del(...keys);
              }
            })
          );
        }

        if (pathSegments.includes('orders')) {
          invalidationPromises.push(
            redis.keys(`${CACHE_KEYS.API_RESPONSE}*orders*`).then(async (keys) => {
              if (keys.length > 0) {
                await redis.del(...keys);
              }
            })
          );
        }

        if (pathSegments.includes('notifications')) {
          invalidationPromises.push(
            redis.keys(`${CACHE_KEYS.API_RESPONSE}*notifications*`).then(async (keys) => {
              if (keys.length > 0) {
                await redis.del(...keys);
              }
            })
          );
        }

        // Execute invalidation asynchronously
        Promise.all(invalidationPromises).catch(error => {
          logger.error('Cache invalidation failed', { 
            path: req.path, 
            method: req.method,
            error: error instanceof Error ? error.message : error 
          });
        });

        logger.debug('Cache invalidation triggered', { 
          path: req.path, 
          method: req.method,
          patterns: invalidationPromises.length
        });
      }

      return originalJson(body);
    };

    next();
  };
}

// Health check for cache system
export async function cacheHealthCheck(): Promise<{ status: string; redis: boolean; details?: any }> {
  try {
    const testKey = 'health_check_test';
    const testValue = { timestamp: new Date().toISOString() };
    
    // Test set and get operations
    await cacheHelpers.setJSON(testKey, testValue, 10);
    const retrieved = await cacheHelpers.getJSON<{ timestamp: string }>(testKey);
    await cacheHelpers.delete(testKey);
    
    const isHealthy = retrieved !== null && retrieved.timestamp === testValue.timestamp;
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      redis: isHealthy,
      details: {
        connected: redis.status === 'ready',
        testPassed: isHealthy
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      redis: false,
      details: {
        error: error instanceof Error ? error.message : error
      }
    };
  }
}