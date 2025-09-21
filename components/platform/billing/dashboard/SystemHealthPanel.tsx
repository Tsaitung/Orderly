'use client'

import { SystemHealth } from '@/types/platform-billing'
import { cn } from '@/lib/utils'
import { 
  Shield, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Clock,
  CreditCard,
  AlertCircle
} from 'lucide-react'

interface SystemHealthPanelProps {
  health: SystemHealth | null
  loading?: boolean
}

export function SystemHealthPanel({ health, loading }: SystemHealthPanelProps) {
  if (loading && !health) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100'
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100'
      case 'unhealthy':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4" />
      case 'degraded':
        return <AlertTriangle className="h-4 w-4" />
      case 'unhealthy':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`
  const formatUptime = (hours: number) => {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}天 ${remainingHours.toFixed(0)}小時`
  }

  const healthMetrics = [
    {
      label: '計費成功率',
      value: health?.billingSuccessRate,
      format: formatPercentage,
      icon: CreditCard,
      threshold: 99.5,
      goodColor: 'text-green-600',
      warningColor: 'text-yellow-600',
      badColor: 'text-red-600'
    },
    {
      label: '付款成功率',
      value: health?.paymentSuccessRate,
      format: formatPercentage,
      icon: CheckCircle,
      threshold: 98.0,
      goodColor: 'text-green-600',
      warningColor: 'text-yellow-600',
      badColor: 'text-red-600'
    },
    {
      label: '爭議率',
      value: health?.disputeRate,
      format: formatPercentage,
      icon: AlertTriangle,
      threshold: 2.0,
      goodColor: 'text-green-600',
      warningColor: 'text-yellow-600',
      badColor: 'text-red-600',
      inverse: true // 爭議率越低越好
    },
    {
      label: '系統正常運行時間',
      value: health?.systemUptime,
      format: formatUptime,
      icon: Clock,
      threshold: 720, // 30天
      goodColor: 'text-green-600',
      warningColor: 'text-yellow-600',
      badColor: 'text-red-600'
    }
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg',
            health ? getHealthStatusColor(health.status) : 'bg-gray-100'
          )}>
            {health ? (
              getHealthStatusIcon(health.status)
            ) : (
              <Activity className="h-4 w-4" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">系統健康度</h3>
        </div>
        
        {health && (
          <div className={cn(
            'flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium',
            getHealthStatusColor(health.status)
          )}>
            {getHealthStatusIcon(health.status)}
            <span className="capitalize">
              {health.status === 'healthy' ? '健康' : 
               health.status === 'degraded' ? '降級' : '異常'}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {healthMetrics.map((metric) => {
          const value = metric.value
          let statusColor = 'text-gray-600'
          
          if (value !== undefined) {
            if (metric.inverse) {
              // 對於爭議率等指標，數值越低越好
              if (value <= metric.threshold / 4) statusColor = metric.goodColor
              else if (value <= metric.threshold / 2) statusColor = metric.warningColor
              else statusColor = metric.badColor
            } else {
              // 對於其他指標，數值越高越好
              if (value >= metric.threshold) statusColor = metric.goodColor
              else if (value >= metric.threshold * 0.8) statusColor = metric.warningColor
              else statusColor = metric.badColor
            }
          }

          return (
            <div key={metric.label} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <metric.icon className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">
                  {metric.label}
                </span>
              </div>
              <span className={cn('text-sm font-semibold', statusColor)}>
                {value !== undefined ? metric.format(value) : '--'}
              </span>
            </div>
          )
        })}
      </div>

      {health?.lastChecked && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            最後檢查：{new Date(health.lastChecked).toLocaleString('zh-TW')}
          </p>
        </div>
      )}
    </div>
  )
}