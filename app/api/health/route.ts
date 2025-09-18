import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

// Inline prisma connection (from lib/db.ts)
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}
const prisma = globalThis.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

// Inline Redis connection (from lib/redis.ts)
declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined
}
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const redis = globalThis.redis || new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  lazyConnect: true,
  ...(process.env.NODE_ENV === 'development' && {
    enableReadyCheck: false,
    maxRetriesPerRequest: null
  })
})
if (process.env.NODE_ENV !== 'production') {
  globalThis.redis = redis
}

// Simple health check for Redis  
const CacheService = {
  async healthCheck(): Promise<boolean> {
    try {
      await redis.ping()
      return true
    } catch {
      return false
    }
  }
}

export async function GET() {
  const strictMode = process.env.HEALTH_STRICT === '1'
  const healthChecks = {
    database: false,
    redis: false,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }

  try {
    // 測試數據庫連接
    await prisma.$queryRaw`SELECT 1`
    healthChecks.database = true
  } catch (error) {
    console.error('Database health check failed:', error)
  }

  try {
    // 測試 Redis 連接
    healthChecks.redis = await CacheService.healthCheck()
  } catch (error) {
    console.error('Redis health check failed:', error)
  }

  const isHealthy = healthChecks.database && healthChecks.redis

  try {
    // 如果健康檢查通過，獲取統計信息
    const statistics = isHealthy ? await Promise.all([
      prisma.organization.count(),
      prisma.user.count(), 
      prisma.order.count(),
      prisma.reconciliation.count()
    ]).then(([organizationCount, userCount, orderCount, reconciliationCount]) => ({
      organizations: organizationCount,
      users: userCount,
      orders: orderCount,
      reconciliations: reconciliationCount
    })) : undefined

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'degraded',
      ...healthChecks,
      statistics,
      services: {
        database: healthChecks.database ? 'connected' : 'disconnected',
        redis: healthChecks.redis ? 'connected' : 'disconnected'
      }
    }, { status: strictMode ? (isHealthy ? 200 : 503) : 200 })

  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: strictMode ? 'unhealthy' : 'degraded',
      ...healthChecks,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: strictMode ? 500 : 200 })
  }
}
