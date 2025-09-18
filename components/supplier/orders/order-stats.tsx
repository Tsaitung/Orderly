'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Truck
} from 'lucide-react'

// 模擬統計數據
const statsData = {
  totalOrders: 156,
  pendingOrders: 12,
  processingOrders: 8,
  todayRevenue: 45690,
  monthlyRevenue: 1234567,
  averageOrderValue: 5480,
  onTimeDeliveryRate: 98.5,
  customerSatisfaction: 4.8,
  urgentOrders: 3,
  deliveredToday: 15
}

const statCards = [
  {
    title: '待處理訂單',
    value: statsData.pendingOrders,
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badge: { text: '需要處理', variant: 'warning' as const },
    trend: { value: '+2', isPositive: false },
    description: '等待確認的新訂單'
  },
  {
    title: '處理中訂單',
    value: statsData.processingOrders,
    icon: ShoppingCart,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badge: { text: '進行中', variant: 'info' as const },
    trend: { value: '+5', isPositive: true },
    description: '正在備貨或配送中'
  },
  {
    title: '今日營收',
    value: formatCurrency(statsData.todayRevenue),
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    badge: { text: '↑ 12%', variant: 'success' as const },
    trend: { value: '+8.2%', isPositive: true },
    description: '相較昨日成長'
  },
  {
    title: '準時配送率',
    value: `${statsData.onTimeDeliveryRate}%`,
    icon: Truck,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    badge: { text: '優秀', variant: 'success' as const },
    trend: { value: '+0.3%', isPositive: true },
    description: '本月配送表現'
  }
]

const urgentAlerts = [
  {
    id: 1,
    type: 'urgent_order',
    message: `${statsData.urgentOrders} 筆緊急訂單需要優先處理`,
    action: '立即處理',
    severity: 'high'
  },
  {
    id: 2,
    type: 'delivery_delay',
    message: '2 筆訂單可能延遲配送',
    action: '查看詳情',
    severity: 'medium'
  }
]

export default function OrderStats() {
  return (
    <div className="space-y-6">
      {/* 主要統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className={`p-6 ${stat.borderColor} border-l-4 hover:shadow-lg transition-all duration-200`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </span>
                    {stat.trend && (
                      <span className={`text-sm font-medium ${
                        stat.trend.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.trend.value}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {stat.description}
                    </p>
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
        <Card className="p-4 border-orange-200 bg-orange-50">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-orange-900 mb-2">需要注意</h3>
              <div className="space-y-2">
                {urgentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between py-2 border-b border-orange-200 last:border-b-0">
                    <span className="text-sm text-orange-800">
                      {alert.message}
                    </span>
                    <button className="text-xs font-medium text-orange-600 hover:text-orange-800 underline">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-medium text-gray-900 mb-3">本月表現</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">總訂單數</span>
              <span className="font-medium">{statsData.totalOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">月營收</span>
              <span className="font-medium text-green-600">
                {formatCurrency(statsData.monthlyRevenue)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">平均訂單金額</span>
              <span className="font-medium">
                {formatCurrency(statsData.averageOrderValue)}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-medium text-gray-900 mb-3">客戶滿意度</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-yellow-500">
                {statsData.customerSatisfaction}
              </span>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-600">
              基於 {statsData.totalOrders} 筆訂單評價
            </p>
            <Badge variant="success" size="sm">
              優秀服務
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-medium text-gray-900 mb-3">今日配送</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-blue-600">
                {statsData.deliveredToday}
              </span>
              <span className="text-sm text-gray-600">筆已完成</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${(statsData.deliveredToday / 20) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600">
              目標: 20筆 (達成率: {((statsData.deliveredToday / 20) * 100).toFixed(1)}%)
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}