'use client'

import React from 'react'
import { 
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  Database,
  Wifi,
  Zap
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Mock real-time data - in production this would come from WebSocket/API
const mockDashboardData = {
  business: {
    todayGMV: 1234567,
    gmvChange: 15.2,
    activeUsers: 892,
    userChange: 8.5,
    totalOrders: 1543,
    orderChange: 12.3,
    reconciliationQueue: 23,
    queueChange: -18.2
  },
  system: {
    uptime: 99.97,
    apiLatency: 127,
    errorRate: 0.08,
    dbConnections: 45,
    maxConnections: 100
  },
  services: [
    { name: 'API Gateway', status: 'healthy' as const, responseTime: 95, uptime: 99.99 },
    { name: 'User Service', status: 'healthy' as const, responseTime: 123, uptime: 99.95 },
    { name: 'Order Service', status: 'healthy' as const, responseTime: 156, uptime: 99.92 },
    { name: 'Product Service', status: 'warning' as const, responseTime: 298, uptime: 99.87 },
    { name: 'Acceptance Service', status: 'healthy' as const, responseTime: 89, uptime: 99.98 },
    { name: 'Billing Service', status: 'healthy' as const, responseTime: 134, uptime: 99.94 }
  ],
  alerts: [
    { id: 1, type: 'warning', message: 'Product Service 響應時間異常', time: '2 分鐘前' },
    { id: 2, type: 'info', message: '新用戶註冊量增加 25%', time: '15 分鐘前' },
    { id: 3, type: 'success', message: '系統自動修復完成', time: '1 小時前' }
  ]
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

function MetricCard({ title, value, change, icon: Icon, trend, className }: MetricCardProps) {
  const getTrendColor = () => {
    if (!change) return 'text-gray-500'
    if (trend === 'up') return change > 0 ? 'text-green-600' : 'text-red-600'
    if (trend === 'down') return change < 0 ? 'text-green-600' : 'text-red-600'
    return change > 0 ? 'text-green-600' : 'text-red-600'
  }

  const TrendIcon = change && change > 0 ? TrendingUp : TrendingDown

  return (
    <Card className={cn("transition-all hover:shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change !== undefined && (
              <div className={cn("flex items-center mt-1", getTrendColor())}>
                <TrendIcon className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">
                  {Math.abs(change)}% 較昨日
                </span>
              </div>
            )}
          </div>
          <div className="p-3 bg-primary-100 rounded-full">
            <Icon className="h-6 w-6 text-primary-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ServiceStatusProps {
  services: Array<{
    name: string
    status: 'healthy' | 'warning' | 'error'
    responseTime: number
    uptime: number
  }>
}

function ServiceStatus({ services }: ServiceStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle
      case 'warning': return AlertTriangle
      case 'error': return AlertTriangle
      default: return Activity
    }
  }

  return (
    <div className="space-y-3">
      {services.map((service) => {
        const StatusIcon = getStatusIcon(service.status)
        return (
          <div key={service.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={cn("p-1 rounded-full", getStatusColor(service.status))}>
                <StatusIcon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{service.name}</div>
                <div className="text-sm text-gray-500">
                  響應時間: {service.responseTime}ms
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900">{service.uptime}%</div>
              <div className="text-sm text-gray-500">可用性</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function AdminDashboard() {
  const [data, setData] = React.useState(mockDashboardData)
  const [lastUpdated, setLastUpdated] = React.useState(new Date())

  // Simulate real-time updates
  React.useEffect(() => {
    const interval = setInterval(() => {
      // Simulate small changes in metrics
      setData(prev => ({
        ...prev,
        business: {
          ...prev.business,
          activeUsers: prev.business.activeUsers + Math.floor(Math.random() * 10 - 5),
          reconciliationQueue: Math.max(0, prev.business.reconciliationQueue + Math.floor(Math.random() * 6 - 3))
        },
        system: {
          ...prev.system,
          apiLatency: Math.max(50, prev.system.apiLatency + Math.floor(Math.random() * 20 - 10))
        }
      }))
      setLastUpdated(new Date())
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* Key Business Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">關鍵業務指標</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <MetricCard
            title="今日 GMV"
            value={`NT$ ${data.business.todayGMV.toLocaleString()}`}
            change={data.business.gmvChange}
            icon={DollarSign}
            trend="up"
          />
          <MetricCard
            title="活躍用戶"
            value={data.business.activeUsers.toLocaleString()}
            change={data.business.userChange}
            icon={Users}
            trend="up"
          />
          <MetricCard
            title="今日訂單"
            value={data.business.totalOrders.toLocaleString()}
            change={data.business.orderChange}
            icon={ShoppingCart}
            trend="up"
          />
          <MetricCard
            title="待對帳"
            value={data.business.reconciliationQueue}
            change={data.business.queueChange}
            icon={Clock}
            trend="down"
          />
        </div>
      </div>

      {/* System Performance & Service Status */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* System Performance */}
        <div className="xl:col-span-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">系統效能</h3>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  <span className="font-medium">系統可用性</span>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {data.system.uptime}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">API 延遲</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {data.system.apiLatency}ms
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">錯誤率</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {data.system.errorRate}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">DB 連接</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {data.system.dbConnections}/{data.system.maxConnections}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Service Status */}
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">服務狀態</h3>
            <Badge variant="outline" className="text-xs">
              最後更新: {lastUpdated.toLocaleTimeString('zh-TW')}
            </Badge>
          </div>
          <Card>
            <CardContent className="p-6">
              <ServiceStatus services={data.services} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Alerts */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">最新警報</h3>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {data.alerts.map((alert) => (
                <div key={alert.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                  <div className={cn(
                    "p-1 rounded-full",
                    alert.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                    alert.type === 'success' ? 'bg-green-100 text-green-600' :
                    'bg-blue-100 text-blue-600'
                  )}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{alert.message}</div>
                    <div className="text-sm text-gray-500">{alert.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}