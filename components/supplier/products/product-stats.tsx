'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import {
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Star
} from 'lucide-react'

// 模擬產品統計數據
const productStats = {
  totalProducts: 1247,
  activeProducts: 1198,
  lowStockProducts: 23,
  outOfStockProducts: 8,
  averagePrice: 450,
  totalValue: 987654,
  topSellingCount: 156,
  newProductsThisMonth: 12,
  averageRating: 4.2,
  totalReviews: 2863
}

const statsCards = [
  {
    title: '總產品數',
    value: productStats.totalProducts.toLocaleString(),
    icon: Package,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badge: { text: `${productStats.activeProducts} 上架中`, variant: 'info' as const },
    description: '平台產品總數'
  },
  {
    title: '庫存價值',
    value: formatCurrency(productStats.totalValue),
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    badge: { text: '本月+8.5%', variant: 'success' as const },
    description: '當前庫存總價值'
  },
  {
    title: '熱銷產品',
    value: productStats.topSellingCount.toString(),
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badge: { text: '排行前10%', variant: 'success' as const },
    description: '本月銷量前段班'
  },
  {
    title: '庫存預警',
    value: (productStats.lowStockProducts + productStats.outOfStockProducts).toString(),
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badge: { text: `${productStats.outOfStockProducts} 缺貨`, variant: 'warning' as const },
    description: '需要關注的產品'
  }
]

const quickStats = [
  {
    label: '平均單價',
    value: formatCurrency(productStats.averagePrice),
    icon: DollarSign,
    trend: '+12%'
  },
  {
    label: '新品上架',
    value: `${productStats.newProductsThisMonth} 個`,
    icon: Package,
    trend: '+3'
  },
  {
    label: '平均評分',
    value: `${productStats.averageRating} ⭐`,
    icon: Star,
    trend: '+0.2'
  },
  {
    label: '訂單轉換',
    value: '18.5%',
    icon: ShoppingCart,
    trend: '+2.1%'
  }
]

export default function ProductStats() {
  return (
    <div className="space-y-6">
      {/* 主要統計卡片 */}
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
                  <div className="text-2xl font-bold text-gray-900">
                    {card.value}
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

      {/* 快速統計 */}
      <Card className="p-4">
        <h3 className="font-medium text-gray-900 mb-4">快速統計</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-white rounded-lg">
                <stat.icon className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
                <div className="text-xs text-green-600 font-medium">{stat.trend}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}