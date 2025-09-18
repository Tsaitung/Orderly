'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import {
  Users,
  TrendingUp,
  Heart,
  DollarSign,
  Calendar,
  UserPlus,
  Repeat,
  Clock
} from 'lucide-react'

// 模擬客戶統計數據
const customerStats = {
  totalCustomers: 456,
  activeCustomers: 398,
  newCustomersThisMonth: 23,
  churnedCustomers: 12,
  averageOrderValue: 3250,
  customerLifetimeValue: 45680,
  retentionRate: 87.2,
  averageOrderFrequency: 2.3,
  loyalCustomers: 142,
  vipCustomers: 28,
  recentActivityCount: 78,
  upsellSuccessRate: 24.5
}

const statsCards = [
  {
    title: '總客戶數',
    value: customerStats.totalCustomers.toLocaleString(),
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badge: { text: `${customerStats.activeCustomers} 活躍`, variant: 'info' as const },
    trend: { value: '+5.2%', isPositive: true },
    description: '累計客戶總數'
  },
  {
    title: '客戶生命週期價值',
    value: formatCurrency(customerStats.customerLifetimeValue),
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    badge: { text: '平均CLV', variant: 'success' as const },
    trend: { value: '+12.8%', isPositive: true },
    description: '客戶平均價值'
  },
  {
    title: '客戶留存率',
    value: `${customerStats.retentionRate}%`,
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badge: { text: '目標90%', variant: 'warning' as const },
    trend: { value: '+2.3%', isPositive: true },
    description: '12個月留存率'
  },
  {
    title: '平均客單價',
    value: formatCurrency(customerStats.averageOrderValue),
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badge: { text: '本月成長', variant: 'success' as const },
    trend: { value: '+8.5%', isPositive: true },
    description: '單次訂單平均金額'
  }
]

const keyMetrics = [
  {
    label: '新客戶',
    value: customerStats.newCustomersThisMonth,
    unit: '位',
    icon: UserPlus,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    comparison: '+15% vs 上月'
  },
  {
    label: '流失客戶',
    value: customerStats.churnedCustomers,
    unit: '位',
    icon: Users,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    comparison: '-3% vs 上月'
  },
  {
    label: '訂單頻率',
    value: customerStats.averageOrderFrequency,
    unit: '次/月',
    icon: Repeat,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    comparison: '+0.2 vs 上月'
  },
  {
    label: '忠誠客戶',
    value: customerStats.loyalCustomers,
    unit: '位',
    icon: Heart,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    comparison: '+8% vs 上月'
  },
  {
    label: 'VIP客戶',
    value: customerStats.vipCustomers,
    unit: '位',
    icon: TrendingUp,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    comparison: '+5 vs 上月'
  },
  {
    label: '加購成功率',
    value: customerStats.upsellSuccessRate,
    unit: '%',
    icon: DollarSign,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    comparison: '+3.2% vs 上月'
  }
]

const customerSegments = [
  {
    segment: '高價值客戶',
    count: 28,
    percentage: 6.1,
    avgSpend: 15680,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    segment: '忠誠客戶',
    count: 142,
    percentage: 31.1,
    avgSpend: 5240,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    segment: '潛力客戶',
    count: 186,
    percentage: 40.8,
    avgSpend: 2890,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    segment: '新客戶',
    count: 73,
    percentage: 16.0,
    avgSpend: 1450,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  {
    segment: '流失風險',
    count: 27,
    percentage: 5.9,
    avgSpend: 890,
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  }
]

export default function CustomerStats() {
  return (
    <div className="space-y-6">
      {/* 主要客戶指標 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => (
          <Card key={index} className={`p-6 ${card.borderColor} border-l-4 hover:shadow-lg transition-all duration-200`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600">
                    {card.title}
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {card.value}
                    </span>
                    {card.trend && (
                      <span className={`text-sm font-medium ${
                        card.trend.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {card.trend.value}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {card.description}
                    </p>
                    <Badge variant={card.badge.variant} size="sm">
                      {card.badge.text}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 詳細指標 */}
      <Card className="p-6">
        <h3 className="font-medium text-gray-900 mb-4">客戶關係指標</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {keyMetrics.map((metric, index) => (
            <div key={index} className={`p-4 rounded-lg ${metric.bgColor} border`}>
              <div className="flex items-center space-x-2 mb-2">
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
                <span className="text-sm font-medium text-gray-700">{metric.label}</span>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold text-gray-900">
                  {metric.value} {metric.unit}
                </div>
                <div className="text-xs text-gray-600">
                  {metric.comparison}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 客戶分群概覽 */}
      <Card className="p-6">
        <h3 className="font-medium text-gray-900 mb-4">客戶分群分布</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {customerSegments.map((segment, index) => (
            <div key={index} className={`p-4 rounded-lg ${segment.bgColor} border`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className={`font-medium ${segment.color}`}>
                    {segment.segment}
                  </h4>
                  <Badge variant="outline" size="sm">
                    {segment.percentage}%
                  </Badge>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {segment.count} 位
                </div>
                <div className="text-sm text-gray-600">
                  平均消費: {formatCurrency(segment.avgSpend)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 客戶活動概況 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">本週活動</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">新訂單</span>
              <span className="font-medium text-blue-600">156 筆</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">客戶諮詢</span>
              <span className="font-medium text-green-600">43 次</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">回購訂單</span>
              <span className="font-medium text-purple-600">89 筆</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">客戶滿意度</span>
              <span className="font-medium text-yellow-600">4.6/5.0</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">待處理事項</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">待回覆諮詢</span>
              <Badge variant="warning" size="sm">12 筆</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">逾期回款</span>
              <Badge variant="destructive" size="sm">3 筆</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">生日祝福</span>
              <Badge variant="info" size="sm">8 位</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">關懷拜訪</span>
              <Badge variant="warning" size="sm">15 位</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">本月目標</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">新客戶開發</span>
                <span className="font-medium">23/30</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '76.7%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">客戶滿意度</span>
                <span className="font-medium">4.6/5.0</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">留存率</span>
                <span className="font-medium">87.2%/90%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '97%' }}></div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}