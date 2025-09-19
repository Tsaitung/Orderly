'use client'

import * as React from 'react'
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Zap,
  RefreshCw,
  Brain,
  TrendingUp,
  Pause,
  Play
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import { cn } from '@/lib/utils'

interface LiveEvent {
  id: string
  type: 'processing' | 'matched' | 'discrepancy' | 'failed' | 'manual_review' | 'system'
  orderNumber?: string
  supplier?: string
  message: string
  confidence?: number
  amount?: number
  processingTime?: number
  timestamp: Date
  severity: 'info' | 'success' | 'warning' | 'error'
}

interface SystemMetrics {
  throughput: number // 每分鐘處理筆數
  activeConnections: number
  memoryUsage: number
  cpuUsage: number
  queueSize: number
  errorRate: number
}

export default function LiveReconciliationFeed() {
  const [events, setEvents] = React.useState<LiveEvent[]>([])
  const [isLive, setIsLive] = React.useState(true)
  const [metrics, setMetrics] = React.useState<SystemMetrics>({
    throughput: 42,
    activeConnections: 8,
    memoryUsage: 68.5,
    cpuUsage: 23.7,
    queueSize: 15,
    errorRate: 2.1
  })
  const [autoScroll, setAutoScroll] = React.useState(true)
  const feedRef = React.useRef<HTMLDivElement>(null)
  const { announcePolite } = useScreenReaderAnnouncer()

  // 模擬即時事件
  React.useEffect(() => {
    if (!isLive) return

    // @ts-ignore - Complex type narrowing issues with event generation
    const generateEvent = (): LiveEvent => {
      const eventTypes = ['processing', 'matched', 'discrepancy', 'failed', 'manual_review', 'system'] as const
      const suppliers = ['新鮮蔬果', '優質肉品', '海鮮世界', '調味料專家', '冷凍食品']
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)]
      
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      const timestamp = new Date()

      switch (type) {
        case 'processing':
          return {
            id,
            type: 'processing' as const,
            timestamp,
            orderNumber: `ORD-2024-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
            supplier: suppliers[Math.floor(Math.random() * suppliers.length)]!,
            message: '開始 AI 對帳處理',
            confidence: 85 + Math.random() * 15,
            amount: Math.floor(Math.random() * 50000) + 5000,
            severity: 'info' as const
          }
        
        case 'matched':
          return {
            id,
            type: 'matched' as const,
            timestamp,
            orderNumber: `ORD-2024-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
            supplier: suppliers[Math.floor(Math.random() * suppliers.length)]!,
            message: '自動對帳成功',
            confidence: 90 + Math.random() * 10,
            amount: Math.floor(Math.random() * 50000) + 5000,
            processingTime: 1.2 + Math.random() * 2,
            severity: 'success'
          }
        
        case 'discrepancy':
          return {
            id,
            type: type as typeof type,
            timestamp,
            orderNumber: `ORD-2024-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
            supplier: suppliers[Math.floor(Math.random() * suppliers.length)]!,
            message: '發現價格差異，標記人工審核',
            confidence: 60 + Math.random() * 25,
            amount: Math.floor(Math.random() * 50000) + 5000,
            processingTime: 2.5 + Math.random() * 3,
            severity: 'warning'
          }
        
        case 'failed':
          return {
            id,
            type: type as typeof type,
            timestamp,
            orderNumber: `ORD-2024-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
            supplier: suppliers[Math.floor(Math.random() * suppliers.length)]!,
            message: '無法找到對應發票',
            confidence: Math.random() * 40,
            amount: Math.floor(Math.random() * 50000) + 5000,
            severity: 'error'
          }
        
        case 'manual_review':
          return {
            id,
            type: type as typeof type,
            timestamp,
            orderNumber: `ORD-2024-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
            supplier: suppliers[Math.floor(Math.random() * suppliers.length)]!,
            message: '分配給人工審核員處理',
            confidence: 45 + Math.random() * 30,
            amount: Math.floor(Math.random() * 50000) + 5000,
            severity: 'info'
          }
        
        case 'system':
          const systemMessages = [
            'ML 模型置信度提升至 89.2%',
            '批次處理完成，處理 25 筆訂單',
            'ERP 同步連接正常',
            '記憶體使用率優化完成',
            '新增 3 筆待處理訂單'
          ]
          return {
            id,
            type: type as typeof type,
            timestamp,
            message: systemMessages[Math.floor(Math.random() * systemMessages.length)]!,
            severity: 'info'
          }
        
        default:
          return {
            id,
            type: 'system' as const,
            timestamp,
            message: '未知事件類型',
            severity: 'info' as const
          }
      }
    }

    const interval = setInterval(() => {
      const newEvent = generateEvent()
      setEvents(prev => [newEvent, ...prev.slice(0, 49)]) // 保持最新 50 筆

      // 更新系統指標
      setMetrics(prev => ({
        throughput: Math.max(0, prev.throughput + (Math.random() - 0.5) * 10),
        activeConnections: Math.max(1, prev.activeConnections + Math.floor((Math.random() - 0.5) * 3)),
        memoryUsage: Math.max(0, Math.min(100, prev.memoryUsage + (Math.random() - 0.5) * 5)),
        cpuUsage: Math.max(0, Math.min(100, prev.cpuUsage + (Math.random() - 0.5) * 8)),
        queueSize: Math.max(0, prev.queueSize + Math.floor((Math.random() - 0.5) * 5)),
        errorRate: Math.max(0, Math.min(10, prev.errorRate + (Math.random() - 0.5) * 1))
      }))
    }, 2000 + Math.random() * 3000) // 2-5 秒隨機間隔

    return () => clearInterval(interval)
  }, [isLive])

  // 自動捲動到最新事件
  React.useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = 0
    }
  }, [events, autoScroll])

  const toggleLiveFeed = React.useCallback(() => {
    setIsLive(prev => !prev)
    announcePolite(isLive ? '即時饋送已暫停' : '即時饋送已啟動')
  }, [isLive, announcePolite])

  const clearEvents = React.useCallback(() => {
    setEvents([])
    announcePolite('事件記錄已清除')
  }, [announcePolite])

  const getEventIcon = (type: LiveEvent['type'], severity: LiveEvent['severity']) => {
    switch (type) {
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      case 'matched':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'discrepancy':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'manual_review':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'system':
        return <Brain className="h-4 w-4 text-purple-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getSeverityColor = (severity: LiveEvent['severity']) => {
    switch (severity) {
      case 'success': return 'border-l-green-500 bg-green-50'
      case 'warning': return 'border-l-yellow-500 bg-yellow-50'
      case 'error': return 'border-l-red-500 bg-red-50'
      default: return 'border-l-blue-500 bg-blue-50'
    }
  }

  const getMetricColor = (value: number, threshold: { warning: number; critical: number }) => {
    if (value >= threshold.critical) return 'text-red-600'
    if (value >= threshold.warning) return 'text-yellow-600'
    return 'text-green-600'
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('zh-TW', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Activity className={cn('h-5 w-5 text-primary-500', isLive && 'animate-pulse')} />
            <span>即時活動饋送</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLiveFeed}
              className="p-2"
              aria-label={isLive ? '暫停即時饋送' : '啟動即時饋送'}
            >
              {isLive ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearEvents}
              className="p-2"
              aria-label="清除事件記錄"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 pb-4">
        {/* 系統指標 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">處理效率</span>
              <span className={getMetricColor(metrics.throughput, { warning: 30, critical: 20 })}>
                {metrics.throughput.toFixed(0)}/min
              </span>
            </div>
            <Progress value={Math.min(100, metrics.throughput * 2)} className="h-1" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">記憶體</span>
              <span className={getMetricColor(metrics.memoryUsage, { warning: 80, critical: 90 })}>
                {metrics.memoryUsage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={metrics.memoryUsage} 
              className="h-1"
              variant={metrics.memoryUsage >= 90 ? 'destructive' : metrics.memoryUsage >= 80 ? 'warning' : 'default'}
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">CPU</span>
              <span className={getMetricColor(metrics.cpuUsage, { warning: 70, critical: 85 })}>
                {metrics.cpuUsage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={metrics.cpuUsage} 
              className="h-1"
              variant={metrics.cpuUsage >= 85 ? 'destructive' : metrics.cpuUsage >= 70 ? 'warning' : 'default'}
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">佇列</span>
              <span className={getMetricColor(metrics.queueSize, { warning: 20, critical: 50 })}>
                {metrics.queueSize}
              </span>
            </div>
            <Progress 
              value={Math.min(100, metrics.queueSize * 2)} 
              className="h-1"
              variant={metrics.queueSize >= 50 ? 'destructive' : metrics.queueSize >= 20 ? 'warning' : 'default'}
            />
          </div>
        </div>

        {/* 連線狀態 */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className={cn('w-2 h-2 rounded-full', isLive ? 'bg-green-500' : 'bg-gray-400')} />
            <span className="text-sm text-gray-700">
              {isLive ? '即時連線' : '已暫停'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {metrics.activeConnections} 個活躍連線
          </div>
        </div>

        {/* 事件列表 */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              即時事件 ({events.length})
            </h4>
            <label className="flex items-center space-x-2 text-xs">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-gray-600">自動捲動</span>
            </label>
          </div>

          <div 
            ref={feedRef}
            className="space-y-2 max-h-80 overflow-y-auto"
          >
            {events.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暫無即時事件</p>
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    'p-3 border-l-4 rounded-r-lg transition-all duration-300',
                    getSeverityColor(event.severity)
                  )}
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {getEventIcon(event.type, event.severity)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {event.orderNumber && (
                            <span className="text-primary-500">{event.orderNumber}</span>
                          )}
                          {event.supplier && (
                            <span className="text-gray-600 ml-2">{event.supplier}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex-shrink-0">
                          {formatTimestamp(event.timestamp)}
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-700">
                        {event.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {event.confidence && (
                            <div className="text-xs text-gray-500">
                              置信度: <span className="font-medium">{event.confidence.toFixed(1)}%</span>
                            </div>
                          )}
                          {event.amount && (
                            <div className="text-xs text-gray-500">
                              NT$ {event.amount.toLocaleString()}
                            </div>
                          )}
                        </div>
                        {event.processingTime && (
                          <div className="text-xs text-gray-500">
                            {event.processingTime.toFixed(1)}s
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 統計摘要 */}
        <div className="pt-3 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1">
              <div className="text-lg font-bold text-green-600">
                {events.filter(e => e.severity === 'success').length}
              </div>
              <div className="text-xs text-gray-600">成功</div>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-bold text-yellow-600">
                {events.filter(e => e.severity === 'warning').length}
              </div>
              <div className="text-xs text-gray-600">警告</div>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-bold text-red-600">
                {events.filter(e => e.severity === 'error').length}
              </div>
              <div className="text-xs text-gray-600">錯誤</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}