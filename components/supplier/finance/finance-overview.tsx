'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar
} from 'lucide-react'

// 模擬財務數據
const financeData = {
  totalRevenue: 1234567,
  receivables: 246913,
  collected: 987654,
  overdue: 68450,
  collectionRate: 80.0,
  averagePaymentDays: 22,
  invoicesPending: 3,
  invoicesOverdue: 2
}

const financeCards = [
  {
    title: '應收帳款',
    value: formatCurrency(financeData.receivables),
    icon: DollarSign,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badge: { text: '待收款', variant: 'warning' as const },
    trend: { value: '-5.2%', isPositive: false },
    description: '尚未收到的款項'
  },
  {
    title: '已收款項',
    value: formatCurrency(financeData.collected),
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    badge: { text: '已完成', variant: 'success' as const },
    trend: { value: '+12.3%', isPositive: true },
    description: '本月已收到的款項'
  },
  {
    title: '收款率',
    value: `${financeData.collectionRate}%`,
    icon: TrendingUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badge: { text: '目標85%', variant: 'info' as const },
    trend: { value: '+2.1%', isPositive: true },
    description: '收款效率'
  },
  {
    title: '平均收款天數',
    value: `${financeData.averagePaymentDays}天`,
    icon: Clock,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    badge: { text: '優於目標', variant: 'success' as const },
    trend: { value: '-3天', isPositive: true },
    description: '相較上月改善'
  }
]

const urgentItems = [
  {
    id: 1,
    type: 'overdue',
    title: '逾期帳款',
    amount: financeData.overdue,
    count: financeData.invoicesOverdue,
    severity: 'high',
    action: '立即催收'
  },
  {
    id: 2,
    type: 'pending',
    title: '待開發票',
    count: financeData.invoicesPending,
    severity: 'medium',
    action: '處理開票'
  }
]

export default function FinanceOverview() {
  return (
    <div className="space-y-6">
      {/* 主要財務指標 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {financeCards.map((card, index) => (
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

      {/* 緊急提醒 */}
      {urgentItems.some(item => item.count > 0) && (
        <Card className="p-4 border-orange-200 bg-orange-50">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-orange-900 mb-3">財務提醒</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {urgentItems.filter(item => item.count > 0).map((item) => (
                  <div key={item.id} className="bg-white rounded-lg p-3 border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                      <Badge variant={item.severity === 'high' ? 'destructive' : 'warning'} size="sm">
                        {item.count} 筆
                      </Badge>
                    </div>
                    {item.amount && (
                      <p className="text-sm text-gray-600 mb-2">
                        金額: {formatCurrency(item.amount)}
                      </p>
                    )}
                    <button className="text-xs font-medium text-orange-600 hover:text-orange-800 underline">
                      {item.action}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 快速統計 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">收款進度</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">本月目標</span>
              <span className="font-medium">{formatCurrency(1500000)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${(financeData.collected / 1500000) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">已收款</span>
              <span className="font-medium text-blue-600">{formatCurrency(financeData.collected)}</span>
            </div>
            <p className="text-xs text-gray-500">
              達成率: {((financeData.collected / 1500000) * 100).toFixed(1)}%
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">帳齡分布</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">30天內</span>
              <span className="text-sm font-medium text-green-600">72%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">31-60天</span>
              <span className="text-sm font-medium text-yellow-600">18%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">61-90天</span>
              <span className="text-sm font-medium text-orange-600">7%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">90天以上</span>
              <span className="text-sm font-medium text-red-600">3%</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">本月發票</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">已開立</span>
              <Badge variant="success" size="sm">156 張</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">待開立</span>
              <Badge variant="warning" size="sm">{financeData.invoicesPending} 張</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">已付款</span>
              <Badge variant="info" size="sm">128 張</Badge>
            </div>
            <div className="border-t pt-2 mt-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-900">付款率</span>
                <span className="text-sm font-medium text-blue-600">82.1%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}