import Redis from 'ioredis'

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = globalThis.redis || new Redis(redisUrl, {
  // Redis 連接配置
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  connectTimeout: 10000,
  lazyConnect: true,
  // 開發環境設置
  ...(process.env.NODE_ENV === 'development' && {
    enableReadyCheck: false,
    maxRetriesPerRequest: null
  })
})

if (process.env.NODE_ENV !== 'production') {
  globalThis.redis = redis
}

// Redis 工具函數
export class CacheService {
  private static TTL = {
    SHORT: 300, // 5 分鐘
    MEDIUM: 1800, // 30 分鐘
    LONG: 3600, // 1 小時
    DAY: 86400 // 24 小時
  }

  static async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Redis GET error:', error)
      return null
    }
  }

  static async set(key: string, value: any, ttl: number = this.TTL.MEDIUM): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value)
      await redis.setex(key, ttl, serialized)
      return true
    } catch (error) {
      console.error('Redis SET error:', error)
      return false
    }
  }

  static async del(key: string): Promise<boolean> {
    try {
      await redis.del(key)
      return true
    } catch (error) {
      console.error('Redis DEL error:', error)
      return false
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Redis EXISTS error:', error)
      return false
    }
  }

  // 用戶會話管理
  static async setUserSession(userId: string, sessionData: any, ttl: number = this.TTL.DAY): Promise<boolean> {
    const key = `session:user:${userId}`
    return this.set(key, sessionData, ttl)
  }

  static async getUserSession(userId: string): Promise<any | null> {
    const key = `session:user:${userId}`
    return this.get(key)
  }

  static async deleteUserSession(userId: string): Promise<boolean> {
    const key = `session:user:${userId}`
    return this.del(key)
  }

  // 對帳數據緩存
  static async cacheReconciliationResult(reconciliationId: string, result: any, ttl: number = this.TTL.LONG): Promise<boolean> {
    const key = `reconciliation:result:${reconciliationId}`
    return this.set(key, result, ttl)
  }

  static async getCachedReconciliationResult(reconciliationId: string): Promise<any | null> {
    const key = `reconciliation:result:${reconciliationId}`
    return this.get(key)
  }

  // 組織數據緩存
  static async cacheOrganizationData(organizationId: string, data: any, ttl: number = this.TTL.LONG): Promise<boolean> {
    const key = `organization:${organizationId}`
    return this.set(key, data, ttl)
  }

  static async getCachedOrganizationData(organizationId: string): Promise<any | null> {
    const key = `organization:${organizationId}`
    return this.get(key)
  }

  // 產品目錄緩存
  static async cacheProductCatalog(supplierId: string, products: any[], ttl: number = this.TTL.MEDIUM): Promise<boolean> {
    const key = `products:supplier:${supplierId}`
    return this.set(key, products, ttl)
  }

  static async getCachedProductCatalog(supplierId: string): Promise<any[] | null> {
    const key = `products:supplier:${supplierId}`
    return this.get(key)
  }

  // 清除特定模式的緩存
  static async clearPattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length === 0) {
        return 0
      }
      
      const result = await redis.del(...keys)
      return result
    } catch (error) {
      console.error('Redis CLEAR PATTERN error:', error)
      return 0
    }
  }

  // 健康檢查
  static async healthCheck(): Promise<boolean> {
    try {
      const pong = await redis.ping()
      return pong === 'PONG'
    } catch (error) {
      console.error('Redis health check failed:', error)
      return false
    }
  }
}

// Session store for NextAuth.js
export class RedisSessionStore {
  static async getSession(sessionToken: string): Promise<any | null> {
    const key = `session:${sessionToken}`
    return CacheService.get(key)
  }

  static async setSession(sessionToken: string, session: any, maxAge: number): Promise<void> {
    const key = `session:${sessionToken}`
    await CacheService.set(key, session, maxAge)
  }

  static async deleteSession(sessionToken: string): Promise<void> {
    const key = `session:${sessionToken}`
    await CacheService.del(key)
  }

  static async updateSession(sessionToken: string, session: any): Promise<void> {
    const key = `session:${sessionToken}`
    const existing = await CacheService.get(key)
    if (existing) {
      const updated = { ...existing, ...session }
      await CacheService.set(key, updated, CacheService['TTL'].DAY)
    }
  }
}

export default redis