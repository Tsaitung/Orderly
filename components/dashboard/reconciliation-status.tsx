'use client'

import * as React from 'react'
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Zap,
  TrendingUp,
  Settings,
  RefreshCw
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import { cn } from '@/lib/utils'

interface ReconciliationItem {
  id: string
  supplier: string
  orderNumber: string
  type: 'price' | 'quantity' | 'quality' | 'auto'
  status: 'processing' | 'completed' | 'failed' | 'pending'
  confidence: number
  amount: number
  discrepancy?: {
    field: string
    expected: string | number
    actual: string | number
  }
  timestamp: string
  processingTime: number
}

const mockReconciliationData: ReconciliationItem[] = [
  {
    id: '1',
    supplier: '新鮮蔬果',
    orderNumber: 'ORD-2024-001',
    type: 'auto',
    status: 'completed',
    confidence: 98.5,
    amount: 12500,
    timestamp: '2024-01-15 14:30',
    processingTime: 2.3
  },
  {
    id: '2',
    supplier: '優質肉品',
    orderNumber: 'ORD-2024-002',
    type: 'price',
    status: 'pending',
    confidence: 67.2,
    amount: 8900,
    discrepancy: {
      field: '單價',
      expected: 350,
      actual: 380
    },
    timestamp: '2024-01-15 15:45',
    processingTime: 0
  },
  {
    id: '3',
    supplier: '海鮮世界',
    orderNumber: 'ORD-2024-003',
    type: 'quantity',
    status: 'processing',
    confidence: 45.1,
    amount: 15200,
    discrepancy: {
      field: '數量',
      expected: 20,
      actual: 18
    },
    timestamp: '2024-01-15 16:20',
    processingTime: 1.7
  }
]

export default function ReconciliationStatus() {
  const [data, setData] = React.useState(mockReconciliationData)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const { announcePolite, announceSuccess } = useScreenReaderAnnouncer()

  const stats = React.useMemo(() => {
    const total = data.length
    const completed = data.filter(item => item.status === 'completed').length
    const pending = data.filter(item => item.status === 'pending').length
    const processing = data.filter(item => item.status === 'processing').length
    const avgConfidence = data.reduce((sum, item) => sum + item.confidence, 0) / total
    const avgProcessingTime = data
      .filter(item => item.processingTime > 0)
      .reduce((sum, item) => sum + item.processingTime, 0) / 
      data.filter(item => item.processingTime > 0).length

    return {
      total,
      completed,
      pending,
      processing,
      completionRate: (completed / total) * 100,
      avgConfidence,
      avgProcessingTime
    }
  }, [data])

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true)
    announcePolite('正在重新整理對帳狀態')
    
    // 模擬 API 請求
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsRefreshing(false)
    announceSuccess('對帳狀態已更新')
  }, [announcePolite, announceSuccess])

  const handleProcessItem = React.useCallback((itemId: string) => {
    setData(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, status: 'processing' as const }
        : item
    ))
    announcePolite('開始處理對帳項目')
  }, [announcePolite])

  const getStatusIcon = (status: ReconciliationItem['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'processing': return <Clock className="h-4 w-4 text-blue-600" />
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusText = (status: ReconciliationItem['status']) => {
    switch (status) {
      case 'completed': return '已完成'
      case 'pending': return '待處理'
      case 'processing': return '處理中'
      case 'failed': return '失敗'
    }
  }

  const getTypeText = (type: ReconciliationItem['type']) => {
    switch (type) {
      case 'auto': return '自動對帳'
      case 'price': return '價格差異'
      case 'quantity': return '數量差異'
      case 'quality': return '品質問題'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600'
    if (confidence >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-[#A47864]" />
            <span>AI 對帳引擎狀態</span>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            機器學習驅動的自動對帳系統即時狀態
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          <span>重新整理</span>
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 統計概覽 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">
              {stats.completed}
            </div>
            <div className="text-sm text-green-600">已完成</div>
          </div>
          
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">
              {stats.pending}
            </div>
            <div className="text-sm text-yellow-600">待處理</div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">
              {stats.processing}
            </div>
            <div className="text-sm text-blue-600">處理中</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#A47864]">
              {stats.completionRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">完成率</div>
          </div>
        </div>

        {/* 效能指標 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">平均置信度</span>
              <span className={cn('font-medium', getConfidenceColor(stats.avgConfidence))}>
                {stats.avgConfidence.toFixed(1)}%
              </span>
            </div>
            <Progress value={stats.avgConfidence} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">平均處理時間</span>
              <span className="font-medium text-gray-900">
                {stats.avgProcessingTime.toFixed(1)}s
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <TrendingUp className="h-3 w-3" />
              <span>比目標快 70%</span>
            </div>
          </div>
        </div>

        {/* 對帳項目列表 */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">近期對帳項目</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getStatusIcon(item.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {item.supplier}
                      </span>
                      <Badge variant="outline" size="sm">
                        {item.orderNumber}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500">
                        {getTypeText(item.type)}
                      </span>
                      <span className={cn('text-xs font-medium', getConfidenceColor(item.confidence))}>
                        置信度 {item.confidence.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-500">
                        NT$ {item.amount.toLocaleString()}
                      </span>
                    </div>
                    {item.discrepancy && (
                      <div className="text-xs text-red-600 mt-1">
                        {item.discrepancy.field}差異: {item.discrepancy.expected} → {item.discrepancy.actual}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={
                      item.status === 'completed' ? 'success' :
                      item.status === 'pending' ? 'warning' :
                      item.status === 'processing' ? 'info' : 'destructive'
                    }
                    size="sm"
                  >
                    {getStatusText(item.status)}
                  </Badge>
                  
                  {item.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleProcessItem(item.id)}
                      className="text-xs"
                    >
                      處理
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            設定閾值
          </Button>
          <Button variant="outline" size="sm">
            查看完整報告
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}