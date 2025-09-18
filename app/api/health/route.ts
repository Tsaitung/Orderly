import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CacheService } from '@/lib/redis'

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
