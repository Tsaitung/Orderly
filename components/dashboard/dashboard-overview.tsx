'use client'

import * as React from 'react'
import { 
  ShoppingCart, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  DollarSign
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period: string
  }
  icon: React.ReactNode
  status?: 'normal' | 'warning' | 'critical' | 'good'
  description?: string
}

function MetricCard({ title, value, change, icon, status = 'normal', description }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  const getChangeIcon = () => {
    if (!change) return null
    return change.type === 'increase' ? '↗' : '↘'
  }

  const getChangeColor = () => {
    if (!change) return ''
    return change.type === 'increase' ? 'text-green-600' : 'text-red-600'
  }

  return (
    <Card className="relative overflow-hidden interactive-card" variant={status === 'good' ? 'glass-restaurant' : 'restaurant'} padding="md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={cn('p-2 rounded-lg bg-opacity-10', getStatusColor())}>
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="spacing-tight">
          <div className="text-2xl font-bold text-gray-900">
            {value}
          </div>
          
          {change && (
            <div className="flex items-center space-x-1">
              <span className={cn('text-sm font-medium', getChangeColor())}>
                {getChangeIcon()} {Math.abs(change.value)}%
              </span>
              <span className="text-sm text-gray-500">
                vs {change.period}
              </span>
            </div>
          )}
          
          {description && (
            <p className="text-xs text-gray-500 leading-relaxed">
              {description}
            </p>
          )}

          {status !== 'normal' && (
            <Badge 
              variant={
                status === 'good' ? 'success' : 
                status === 'warning' ? 'warning' : 'destructive'
              }
              size="sm"
              className="mt-2"
            >
              {status === 'good' ? '良好' : 
               status === 'warning' ? '注意' : '緊急'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardOverview() {
  // 模擬數據 - 實際應用中將從 API 獲取
  const metrics = [
    {
      title: '今日新訂單',
      value: 23,
      change: { value: 12, type: 'increase' as const, period: '昨日' },
      icon: <ShoppingCart className="h-5 w-5" />,
      status: 'good' as const,
      description: '較昨日增長，供應鏈運轉正常'
    },
    {
      title: '待驗收項目',
      value: 7,
      change: { value: 15, type: 'decrease' as const, period: '昨日' },
      icon: <Clock className="h-5 w-5" />,
      status: 'warning' as const,
      description: '有貨物等待驗收，建議優先處理'
    },
    {
      title: '對帳完成率',
      value: '94.2%',
      change: { value: 3.2, type: 'increase' as const, period: '本週' },
      icon: <CheckCircle className="h-5 w-5" />,
      status: 'good' as const,
      description: 'ML 引擎自動對帳效率穩步提升'
    },
    {
      title: '異常待處理',
      value: 2,
      icon: <AlertTriangle className="h-5 w-5" />,
      status: 'critical' as const,
      description: '有價格或數量差異需要人工審核'
    },
    {
      title: '本月採購金額',
      value: 'NT$ 127,450',
      change: { value: 8.5, type: 'increase' as const, period: '上月' },
      icon: <DollarSign className="h-5 w-5" />,
      status: 'normal' as const,
      description: '符合預算範圍，成本控制良好'
    },
    {
      title: '供應商滿意度',
      value: '4.7/5.0',
      change: { value: 0.3, type: 'increase' as const, period: '上月' },
      icon: <TrendingUp className="h-5 w-5" />,
      status: 'good' as const,
      description: '合作關係穩定，服務品質持續提升'
    }
  ]

  return (
    <section aria-labelledby="overview-title">
      <div className="sr-only">
        <h2 id="overview-title">營運指標總覽</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            icon={metric.icon}
            status={metric.status}
            description={metric.description}
          />
        ))}
      </div>
    </section>
  )
}