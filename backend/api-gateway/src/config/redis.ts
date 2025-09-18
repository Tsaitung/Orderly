import { Redis } from 'ioredis';
import { logger } from '../middleware/logger';

// Redis client configuration
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  reconnectOnError: (err) => {
    logger.warn('Redis connection error', { error: err.message });
    const targetError = 'READONLY';
    return err.message.includes(targetError);
  },
});

// Redis event handlers
redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('ready', () => {
  logger.info('Redis ready for operations');
});

redis.on('error', (err) => {
  logger.error('Redis error', { error: err.message });
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});

// Cache key prefixes
export const CACHE_KEYS = {
  API_RESPONSE: 'api:response:',
  USER_SESSION: 'session:',
  RATE_LIMIT: 'rate_limit:',
  CIRCUIT_BREAKER: 'circuit:',
  SERVICE_HEALTH: 'health:',
  PRODUCT_CACHE: 'product:',
  USER_CACHE: 'user:',
  NOTIFICATION_CACHE: 'notification:',
} as const;

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  API_RESPONSE: 5 * 60, // 5 minutes
  USER_SESSION: 24 * 60 * 60, // 24 hours
  RATE_LIMIT: 15 * 60, // 15 minutes
  CIRCUIT_BREAKER: 60, // 1 minute
  SERVICE_HEALTH: 30, // 30 seconds
  PRODUCT_CACHE: 30 * 60, // 30 minutes
  USER_CACHE: 15 * 60, // 15 minutes
  NOTIFICATION_CACHE: 5 * 60, // 5 minutes
} as const;

// Helper functions for common cache operations
export const cacheHelpers = {
  /**
   * Get cached data with JSON parsing
   */
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error', { key, error: error instanceof Error ? error.message : error });
      return null;
    }
  },

  /**
   * Set cached data with JSON stringification
   */
  async setJSON(key: string, data: any, ttl: number): Promise<boolean> {
    try {
      const result = await redis.setex(key, ttl, JSON.stringify(data));
      return result === 'OK';
    } catch (error) {
      logger.error('Cache set error', { key, error: error instanceof Error ? error.message : error });
      return false;
    }
  },

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await redis.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error', { key, error: error instanceof Error ? error.message : error });
      return false;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error: error instanceof Error ? error.message : error });
      return false;
    }
  },

  /**
   * Set expiration for existing key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error', { key, error: error instanceof Error ? error.message : error });
      return false;
    }
  },

  /**
   * Increment counter with expiration
   */
  async increment(key: string, ttl: number, amount: number = 1): Promise<number> {
    try {
      const pipeline = redis.pipeline();
      pipeline.incrby(key, amount);
      pipeline.expire(key, ttl);
      const results = await pipeline.exec();
      return results?.[0]?.[1] as number || 0;
    } catch (error) {
      logger.error('Cache increment error', { key, error: error instanceof Error ? error.message : error });
      return 0;
    }
  },
};

// Initialize Redis connection
export async function initializeRedis(): Promise<boolean> {
  try {
    await redis.connect();
    logger.info('Redis initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Redis', { error: error instanceof Error ? error.message : error });
    return false;
  }
}

export default redis;