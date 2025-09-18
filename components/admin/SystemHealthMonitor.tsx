'use client'

import React from 'react'
import { 
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Cpu,
  HardDrive,
  Wifi,
  Database,
  Server,
  Zap,
  RefreshCw
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Mock system health data
const mockHealthData = {
  overview: {
    totalServices: 12,
    healthyServices: 10,
    warningServices: 2,
    errorServices: 0,
    uptime: 99.97
  },
  services: [
    {
      name: 'API Gateway',
      status: 'healthy' as const,
      uptime: 99.99,
      responseTime: 95,
      lastCheck: new Date(Date.now() - 30000),
      metrics: {
        cpu: 25,
        memory: 68,
        requests: 1250,
        errors: 2
      }
    },
    {
      name: 'User Service',
      status: 'healthy' as const,
      uptime: 99.95,
      responseTime: 123,
      lastCheck: new Date(Date.now() - 45000),
      metrics: {
        cpu: 42,
        memory: 73,
        requests: 890,
        errors: 0
      }
    },
    {
      name: 'Order Service',
      status: 'healthy' as const,
      uptime: 99.92,
      responseTime: 156,
      lastCheck: new Date(Date.now() - 20000),
      metrics: {
        cpu: 38,
        memory: 65,
        requests: 2340,
        errors: 5
      }
    },
    {
      name: 'Product Service',
      status: 'warning' as const,
      uptime: 99.87,
      responseTime: 298,
      lastCheck: new Date(Date.now() - 60000),
      metrics: {
        cpu: 78,
        memory: 89,
        requests: 1780,
        errors: 12
      }
    },
    {
      name: 'Acceptance Service',
      status: 'healthy' as const,
      uptime: 99.98,
      responseTime: 89,
      lastCheck: new Date(Date.now() - 15000),
      metrics: {
        cpu: 22,
        memory: 45,
        requests: 567,
        errors: 1
      }
    },
    {
      name: 'Billing Service',
      status: 'healthy' as const,
      uptime: 99.94,
      responseTime: 134,
      lastCheck: new Date(Date.now() - 35000),
      metrics: {
        cpu: 31,
        memory: 58,
        requests: 445,
        errors: 0
      }
    },
    {
      name: 'Notification Service',
      status: 'warning' as const,
      uptime: 99.85,
      responseTime: 267,
      lastCheck: new Date(Date.now() - 90000),
      metrics: {
        cpu: 65,
        memory: 82,
        requests: 3240,
        errors: 8
      }
    },
    {
      name: 'Redis Cache',
      status: 'healthy' as const,
      uptime: 99.99,
      responseTime: 12,
      lastCheck: new Date(Date.now() - 10000),
      metrics: {
        cpu: 18,
        memory: 34,
        requests: 8940,
        errors: 0
      }
    }
  ],
  infrastructure: {
    database: {
      status: 'healthy' as const,
      connections: 45,
      maxConnections: 100,
      queryTime: 23,
      slowQueries: 2
    },
    cache: {
      status: 'healthy' as const,
      hitRate: 94.5,
      memoryUsage: 68,
      connections: 234
    },
    storage: {
      status: 'healthy' as const,
      used: 234,
      total: 1024,
      iops: 1250
    }
  }
}

interface ServiceCardProps {
  service: {
    name: string
    status: 'healthy' | 'warning' | 'error'
    uptime: number
    responseTime: number
    lastCheck: Date
    metrics: {
      cpu: number
      memory: number
      requests: number
      errors: number
    }
  }
}

function ServiceCard({ service }: ServiceCardProps) {
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
      case 'error': return XCircle
      default: return Activity
    }
  }

  const StatusIcon = getStatusIcon(service.status)

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{service.name}</CardTitle>
          <div className={cn("p-1 rounded-full", getStatusColor(service.status))}>
            <StatusIcon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">可用性</div>
            <div className="font-semibold">{service.uptime}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">響應時間</div>
            <div className="font-semibold">{service.responseTime}ms</div>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-1">
              <Cpu className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">CPU</span>
            </div>
            <span className="text-xs font-medium">{service.metrics.cpu}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={cn(
                "h-1.5 rounded-full",
                service.metrics.cpu > 80 ? "bg-red-500" :
                service.metrics.cpu > 60 ? "bg-yellow-500" : "bg-green-500"
              )}
              style={{ width: `${service.metrics.cpu}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-1">
              <HardDrive className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">Memory</span>
            </div>
            <span className="text-xs font-medium">{service.metrics.memory}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={cn(
                "h-1.5 rounded-full",
                service.metrics.memory > 80 ? "bg-red-500" :
                service.metrics.memory > 60 ? "bg-yellow-500" : "bg-green-500"
              )}
              style={{ width: `${service.metrics.memory}%` }}
            />
          </div>
        </div>

        {/* Request Stats */}
        <div className="pt-2 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-gray-500">請求數</div>
              <div className="font-medium">{service.metrics.requests.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-500">錯誤數</div>
              <div className={cn(
                "font-medium",
                service.metrics.errors > 0 ? "text-red-600" : "text-green-600"
              )}>
                {service.metrics.errors}
              </div>
            </div>
          </div>
        </div>

        {/* Last Check */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>
              最後檢查: {Math.floor((Date.now() - service.lastCheck.getTime()) / 1000)}秒前
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function SystemHealthMonitor() {
  const [data, setData] = React.useState(mockHealthData)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [lastUpdated, setLastUpdated] = React.useState(new Date())

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLastUpdated(new Date())
    setIsRefreshing(false)
  }

  // Auto-refresh every 30 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => ({
        ...prev,
        services: prev.services.map(service => ({
          ...service,
          lastCheck: new Date(),
          responseTime: service.responseTime + Math.floor(Math.random() * 20 - 10),
          metrics: {
            ...service.metrics,
            cpu: Math.max(0, Math.min(100, service.metrics.cpu + Math.floor(Math.random() * 10 - 5))),
            memory: Math.max(0, Math.min(100, service.metrics.memory + Math.floor(Math.random() * 6 - 3)))
          }
        }))
      }))
      setLastUpdated(new Date())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">總服務數</p>
                <p className="text-2xl font-bold text-gray-900">{data.overview.totalServices}</p>
              </div>
              <Server className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">正常服務</p>
                <p className="text-2xl font-bold text-green-600">{data.overview.healthyServices}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">警告服務</p>
                <p className="text-2xl font-bold text-yellow-600">{data.overview.warningServices}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">整體可用性</p>
                <p className="text-2xl font-bold text-green-600">{data.overview.uptime}%</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            最後更新: {lastUpdated.toLocaleTimeString('zh-TW')}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          <span>刷新狀態</span>
        </Button>
      </div>

      {/* Service Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {data.services.map((service) => (
          <ServiceCard key={service.name} service={service} />
        ))}
      </div>

      {/* Infrastructure Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-600" />
              <span>資料庫</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">連接數</span>
              <span className="font-medium">
                {data.infrastructure.database.connections}/{data.infrastructure.database.maxConnections}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">查詢時間</span>
              <span className="font-medium">{data.infrastructure.database.queryTime}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">慢查詢</span>
              <span className="font-medium text-yellow-600">{data.infrastructure.database.slowQueries}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-purple-600" />
              <span>快取系統</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">命中率</span>
              <span className="font-medium text-green-600">{data.infrastructure.cache.hitRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">記憶體使用</span>
              <span className="font-medium">{data.infrastructure.cache.memoryUsage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">連接數</span>
              <span className="font-medium">{data.infrastructure.cache.connections}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5 text-green-600" />
              <span>儲存系統</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">使用空間</span>
              <span className="font-medium">
                {data.infrastructure.storage.used}GB / {data.infrastructure.storage.total}GB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">IOPS</span>
              <span className="font-medium">{data.infrastructure.storage.iops.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${(data.infrastructure.storage.used / data.infrastructure.storage.total) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}