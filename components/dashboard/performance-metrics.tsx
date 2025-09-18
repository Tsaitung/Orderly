'use client'

import * as React from 'react'
import { 
  TrendingUp, 
  TrendingDown,
  Target,
  Clock,
  DollarSign,
  Users
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface MetricItem {
  title: string
  value: string | number
  target?: number
  unit?: string
  trend?: {
    direction: 'up' | 'down'
    value: number
    period: string
    isGood: boolean
  }
  status: 'excellent' | 'good' | 'warning' | 'poor'
}

export default function PerformanceMetrics() {
  const metrics: MetricItem[] = [
    {
      title: '對帳準確率',
      value: 94.2,
      target: 95,
      unit: '%',
      trend: {
        direction: 'up',
        value: 2.1,
        period: '本週',
        isGood: true
      },
      status: 'good'
    },
    {
      title: '平均處理時間',
      value: 2.3,
      target: 5.0,
      unit: '分鐘',
      trend: {
        direction: 'down',
        value: 35,
        period: '本月',
        isGood: true
      },
      status: 'excellent'
    },
    {
      title: '成本節省',
      value: 12850,
      unit: 'NT$',
      trend: {
        direction: 'up',
        value: 18,
        period: '本月',
        isGood: true
      },
      status: 'excellent'
    },
    {
      title: '供應商回應率',
      value: 87.5,
      target: 90,
      unit: '%',
      trend: {
        direction: 'down',
        value: 3.2,
        period: '本週',
        isGood: false
      },
      status: 'warning'
    },
    {
      title: '訂單準時率',
      value: 91.8,
      target: 95,
      unit: '%',
      trend: {
        direction: 'up',
        value: 4.5,
        period: '本月',
        isGood: true
      },
      status: 'good'
    }
  ]

  const getStatusColor = (status: MetricItem['status']) => {
    switch (status) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'warning': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
    }
  }

  const getStatusBadge = (status: MetricItem['status']) => {
    switch (status) {
      case 'excellent': return { variant: 'success' as const, text: '優秀' }
      case 'good': return { variant: 'info' as const, text: '良好' }
      case 'warning': return { variant: 'warning' as const, text: '注意' }
      case 'poor': return { variant: 'destructive' as const, text: '需改善' }
    }
  }

  const getTargetProgress = (value: number, target?: number) => {
    if (!target) return null
    return Math.min((value / target) * 100, 100)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5 text-[#A47864]" />
          <span>績效指標</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          關鍵營運指標追蹤與目標達成率
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {metrics.map((metric, index) => {
          const progress = getTargetProgress(Number(metric.value), metric.target)
          const statusBadge = getStatusBadge(metric.status)
          
          return (
            <div key={index} className="space-y-3">
              {/* 指標標題和狀態 */}
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 text-sm">
                  {metric.title}
                </h4>
                <Badge 
                  variant={statusBadge.variant}
                  size="sm"
                >
                  {statusBadge.text}
                </Badge>
              </div>

              {/* 數值和趨勢 */}
              <div className="flex items-center justify-between">
                <div className="flex items-baseline space-x-1">
                  <span className={cn('text-2xl font-bold', getStatusColor(metric.status))}>
                    {typeof metric.value === 'number' 
                      ? metric.value.toLocaleString() 
                      : metric.value
                    }
                  </span>
                  {metric.unit && (
                    <span className="text-sm text-gray-500">
                      {metric.unit}
                    </span>
                  )}
                </div>

                {metric.trend && (
                  <div className={cn(
                    'flex items-center space-x-1 text-xs',
                    metric.trend.isGood 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  )}>
                    {metric.trend.direction === 'up' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>
                      {metric.trend.value}% vs {metric.trend.period}
                    </span>
                  </div>
                )}
              </div>

              {/* 目標進度條 */}
              {metric.target && progress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>目標: {metric.target}{metric.unit}</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={progress} 
                    className="h-2"
                    variant={
                      progress >= 100 ? 'success' :
                      progress >= 80 ? 'default' :
                      progress >= 60 ? 'warning' : 'destructive'
                    }
                  />
                </div>
              )}
            </div>
          )
        })}

        {/* 總體評分 */}
        <div className="pt-4 border-t border-gray-200">
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-[#A47864]">
              8.7
            </div>
            <div className="text-sm text-gray-600">
              總體效能評分
            </div>
            <div className="flex justify-center">
              <Badge variant="success" size="sm">
                表現優秀
              </Badge>
            </div>
          </div>
        </div>

        {/* 建議改善 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-medium text-blue-900 mb-2 flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            建議改善
          </h5>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 供應商回應率低於目標，建議主動聯繫慢回應供應商</li>
            <li>• 訂單準時率可進一步優化，考慮調整交期預估算法</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}