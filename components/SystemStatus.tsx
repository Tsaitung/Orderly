'use client'

import { useState, useEffect } from 'react'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { ServiceHealth } from '@/types'

// 模擬服務健康狀態數據模板
const mockServicesTemplate = [
  {
    name: '前端應用',
    status: 'healthy' as const,
    responseTime: 45,
    url: 'http://localhost:8000',
  },
  {
    name: 'API Gateway',
    status: 'healthy' as const,
    responseTime: 120,
    url: 'http://localhost:3000/health',
  },
  {
    name: '對帳引擎',
    status: 'healthy' as const,
    responseTime: 95,
    url: '/api/reconciliation/health',
  },
  {
    name: '用戶服務',
    status: 'healthy' as const,
    responseTime: 85,
    url: '/api/users/health',
  },
  {
    name: 'ERP 整合',
    status: 'healthy' as const,
    responseTime: 150,
    url: '/api/erp/health',
  },
  {
    name: 'PostgreSQL',
    status: 'healthy' as const,
    responseTime: 25,
    url: 'postgresql://localhost:5432',
  },
  {
    name: 'Redis Cache',
    status: 'healthy' as const,
    responseTime: 15,
    url: 'redis://localhost:6379',
  },
  {
    name: '通知服務',
    status: 'healthy' as const,
    responseTime: 110,
    url: '/api/notifications/health',
  },
]

export function SystemStatus() {
  const [services, setServices] = useState<ServiceHealth[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 在客戶端初始化數據
  useEffect(() => {
    const now = new Date()
    const initialServices = mockServicesTemplate.map(service => ({
      ...service,
      lastChecked: now,
    }))
    setServices(initialServices)
    setLastUpdated(now)
  }, [])

  // 模擬即時健康檢查
  useEffect(() => {
    if (!lastUpdated) return // 等待初始化完成

    const interval = setInterval(() => {
      setServices(prevServices =>
        prevServices.map(service => ({
          ...service,
          responseTime: Math.floor(Math.random() * 100) + 10,
          lastChecked: new Date(),
          // 偶爾模擬服務異常
          status: Math.random() > 0.95 ? 'unhealthy' : 'healthy',
        }))
      )
      setLastUpdated(new Date())
    }, 5000) // 每5秒更新一次

    return () => clearInterval(interval)
  }, [lastUpdated])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // 模擬健康檢查 API 調用
    await new Promise(resolve => setTimeout(resolve, 1000))

    setServices(prevServices =>
      prevServices.map(service => ({
        ...service,
        responseTime: Math.floor(Math.random() * 100) + 10,
        lastChecked: new Date(),
        status: 'healthy' as const,
      }))
    )
    setLastUpdated(new Date())
    setIsRefreshing(false)
  }

  const healthyCount = services.filter(s => s.status === 'healthy').length
  const totalCount = services.length
  const overallHealth = healthyCount === totalCount ? 'healthy' : 'degraded'

  // 載入狀態
  if (!lastUpdated || services.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
        <div className="flex h-48 items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            <span className="text-gray-500">載入系統狀態...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
      {/* 標題和總體狀態 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={cn(
              'h-4 w-4 rounded-full',
              overallHealth === 'healthy'
                ? 'bg-reconciliation-approved'
                : 'bg-reconciliation-pending'
            )}
          />
          <h3 className="text-lg font-semibold text-gray-900">
            系統整體狀態: {overallHealth === 'healthy' ? '正常' : '部分異常'}
          </h3>
          <span className="text-sm text-gray-500">
            ({healthyCount}/{totalCount} 服務正常)
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            更新時間: {lastUpdated ? formatRelativeTime(lastUpdated) : '載入中...'}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              'btn btn-outline btn-sm',
              isRefreshing && 'cursor-not-allowed opacity-50'
            )}
          >
            {isRefreshing ? (
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                <span>檢查中...</span>
              </div>
            ) : (
              '重新檢查'
            )}
          </button>
        </div>
      </div>

      {/* 服務列表 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {services.map((service, index) => (
          <ServiceCard key={index} service={service} />
        ))}
      </div>

      {/* 底部統計 */}
      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="grid grid-cols-1 gap-4 text-center md:grid-cols-3">
          <div>
            <div className="text-2xl font-bold text-reconciliation-approved">99.9%</div>
            <div className="text-sm text-gray-500">可用性</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-reconciliation-processing">
              {Math.round(
                services.reduce((acc, s) => acc + (s.responseTime || 0), 0) / services.length
              )}
              ms
            </div>
            <div className="text-sm text-gray-500">平均響應時間</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary-600">24/7</div>
            <div className="text-sm text-gray-500">監控運行</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  const isHealthy = service.status === 'healthy'

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all duration-200 hover:shadow-md',
        isHealthy
          ? 'border-reconciliation-approved/20 bg-reconciliation-approved/5'
          : 'border-reconciliation-disputed/20 bg-reconciliation-disputed/5'
      )}
    >
      {/* 服務名稱和狀態 */}
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">{service.name}</h4>
        <div
          className={cn(
            'h-2 w-2 rounded-full',
            isHealthy ? 'bg-reconciliation-approved' : 'bg-reconciliation-disputed'
          )}
        />
      </div>

      {/* 響應時間 */}
      {service.responseTime && (
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">響應時間</span>
          <span
            className={cn(
              'font-mono text-xs font-medium',
              service.responseTime < 100
                ? 'text-reconciliation-approved'
                : service.responseTime < 300
                  ? 'text-reconciliation-pending'
                  : 'text-reconciliation-disputed'
            )}
          >
            {service.responseTime}ms
          </span>
        </div>
      )}

      {/* 最後檢查時間 */}
      <div className="text-xs text-gray-400">{formatRelativeTime(service.lastChecked)}</div>

      {/* 錯誤信息 */}
      {service.error && (
        <div className="mt-2 rounded bg-reconciliation-disputed/10 p-2 text-xs text-reconciliation-disputed">
          {service.error}
        </div>
      )}
    </div>
  )
}
