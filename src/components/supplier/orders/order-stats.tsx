'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { useSupplierOrders } from '@/lib/api/supplier-hooks'
import { useAuth } from '@/contexts/AuthContext'
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Truck,
  Loader,
} from 'lucide-react'

interface OrderStatsProps {
  organizationId?: string
}

export default function OrderStats({ organizationId }: OrderStatsProps) {
  const { user } = useAuth()
  const effectiveOrgId = organizationId || user?.organizationId

  const { stats, quickStats, loading, statsLoading, error, refetchStats } =
    useSupplierOrders(effectiveOrgId)

  // Show loading state
  if (loading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="p-6">
              <div className="flex h-24 items-center justify-center">
                <Loader className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 p-6">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">無法載入統計資料</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={refetchStats}
              className="mt-2 text-sm text-red-600 underline hover:text-red-800"
            >
              重新載入
            </button>
          </div>
        </div>
      </Card>
    )
  }

  // Prepare stat cards with real data
  const statCards = [
    {
      title: '待處理訂單',
      value: quickStats?.pending || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      badge: { text: '需要處理', variant: 'warning' as const },
      description: '等待確認的新訂單',
    },
    {
      title: '處理中訂單',
      value: (quickStats?.confirmed || 0) + (quickStats?.preparing || 0),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badge: { text: '進行中', variant: 'info' as const },
      description: '正在備貨或配送中',
    },
    {
      title: '今日營收',
      value: formatCurrency(stats?.today_revenue_ntd || 0),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      badge: {
        text: stats?.revenue_growth_percentage
          ? `${stats.revenue_growth_percentage > 0 ? '↑' : '↓'} ${Math.abs(stats.revenue_growth_percentage)}%`
          : '--',
        variant:
          (stats?.revenue_growth_percentage || 0) >= 0
            ? ('success' as const)
            : ('destructive' as const),
      },
      description: '相較昨日',
    },
    {
      title: '準時配送率',
      value: `${stats?.on_time_delivery_rate || 0}%`,
      icon: Truck,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      badge: {
        text:
          (stats?.on_time_delivery_rate || 0) >= 95
            ? '優秀'
            : (stats?.on_time_delivery_rate || 0) >= 80
              ? '良好'
              : '需改善',
        variant:
          (stats?.on_time_delivery_rate || 0) >= 95
            ? ('success' as const)
            : (stats?.on_time_delivery_rate || 0) >= 80
              ? ('warning' as const)
              : ('destructive' as const),
      },
      description: '本月配送表現',
    },
  ]

  // Prepare urgent alerts with real data
  const urgentAlerts = []
  if ((quickStats?.pending || 0) > 10) {
    urgentAlerts.push({
      id: 1,
      type: 'urgent_order',
      message: `${quickStats?.pending} 筆待處理訂單需要處理`,
      action: '立即處理',
      severity: 'high',
    })
  }
  if ((quickStats?.disputed || 0) > 0) {
    urgentAlerts.push({
      id: 2,
      type: 'dispute',
      message: `${quickStats?.disputed} 筆訂單有爭議`,
      action: '查看詳情',
      severity: 'high',
    })
  }
  if ((stats?.on_time_delivery_rate || 100) < 80) {
    urgentAlerts.push({
      id: 3,
      type: 'delivery_performance',
      message: '準時配送率低於標準，請檢查物流狀況',
      action: '查看詳情',
      severity: 'medium',
    })
  }
  return (
    <div className="space-y-6">
      {/* 主要統計卡片 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card
            key={index}
            className={`p-6 ${stat.borderColor} border-l-4 transition-all duration-200 hover:shadow-lg`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center space-x-2">
                  <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">{stat.description}</p>
                    <Badge variant={stat.badge.variant} size="sm">
                      {stat.badge.text}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 緊急提醒 */}
      {urgentAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />
            <div className="flex-1">
              <h3 className="mb-2 font-medium text-orange-900">需要注意</h3>
              <div className="space-y-2">
                {urgentAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between border-b border-orange-200 py-2 last:border-b-0"
                  >
                    <span className="text-sm text-orange-800">{alert.message}</span>
                    <button className="text-xs font-medium text-orange-600 underline hover:text-orange-800">
                      {alert.action}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 快速概覽 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <h3 className="mb-3 font-medium text-gray-900">本月表現</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">總訂單數</span>
              <span className="font-medium">{stats?.total_orders || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">月營收</span>
              <span className="font-medium text-green-600">
                {formatCurrency(stats?.monthly_revenue_ntd || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">平均訂單金額</span>
              <span className="font-medium">
                {formatCurrency(stats?.average_order_value_ntd || 0)}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-3 font-medium text-gray-900">客戶滿意度</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-yellow-500">
                {stats?.customer_satisfaction_rating || '--'}
              </span>
              {stats?.customer_satisfaction_rating && (
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`h-4 w-4 ${i < Math.floor(stats.customer_satisfaction_rating) ? 'fill-current' : 'fill-gray-200'}`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600">基於 {stats?.total_orders || 0} 筆訂單評價</p>
            <Badge
              variant={
                (stats?.customer_satisfaction_rating || 0) >= 4.5
                  ? 'success'
                  : (stats?.customer_satisfaction_rating || 0) >= 3.5
                    ? 'warning'
                    : 'destructive'
              }
              size="sm"
            >
              {(stats?.customer_satisfaction_rating || 0) >= 4.5
                ? '優秀服務'
                : (stats?.customer_satisfaction_rating || 0) >= 3.5
                  ? '良好服務'
                  : '需要改善'}
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-3 font-medium text-gray-900">今日配送</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-blue-600">{quickStats?.delivered || 0}</span>
              <span className="text-sm text-gray-600">筆已完成</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{
                  width: `${Math.min(((quickStats?.delivered || 0) / (stats?.daily_target || 20)) * 100, 100)}%`,
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-600">
              目標: {stats?.daily_target || 20}筆 (達成率:{' '}
              {(((quickStats?.delivered || 0) / (stats?.daily_target || 20)) * 100).toFixed(1)}%)
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
