'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import {
  Users,
  TrendingUp,
  Target,
  Award,
  AlertTriangle,
  Eye,
  BarChart3
} from 'lucide-react'

// RFM分析客戶分群
const rfmSegments = [
  {
    id: 'champions',
    name: '冠軍客戶',
    description: '最佳客戶，最近購買，頻繁購買，消費額高',
    count: 28,
    percentage: 6.1,
    rfmScore: { r: 5, f: 5, m: 5 },
    characteristics: ['高頻購買', '高消費額', '最近活躍'],
    avgOrderValue: 15680,
    avgFrequency: 8.2,
    lastOrderDays: 3,
    strategies: ['VIP專屬服務', '新品優先體驗', '個人化推薦'],
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: Award,
    priority: 'highest'
  },
  {
    id: 'loyal_customers',
    name: '忠誠客戶',
    description: '定期購買，響應促銷活動',
    count: 142,
    percentage: 31.1,
    rfmScore: { r: 4, f: 5, m: 4 },
    characteristics: ['穩定復購', '中高消費', '促銷敏感'],
    avgOrderValue: 5240,
    avgFrequency: 4.8,
    lastOrderDays: 12,
    strategies: ['會員升級計畫', '生日優惠', '推薦獎勵'],
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Users,
    priority: 'high'
  },
  {
    id: 'potential_loyalists',
    name: '潛力客戶',
    description: '最近客戶，消費額高，需要培養忠誠度',
    count: 186,
    percentage: 40.8,
    rfmScore: { r: 5, f: 2, m: 4 },
    characteristics: ['新近客戶', '高消費潛力', '需要培養'],
    avgOrderValue: 2890,
    avgFrequency: 2.1,
    lastOrderDays: 8,
    strategies: ['歡迎計畫', '產品教育', '客服關懷'],
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: TrendingUp,
    priority: 'medium'
  },
  {
    id: 'new_customers',
    name: '新客戶',
    description: '新近購買，需要轉化成忠誠客戶',
    count: 73,
    percentage: 16.0,
    rfmScore: { r: 5, f: 1, m: 2 },
    characteristics: ['初次購買', '觀察階段', '轉化機會'],
    avgOrderValue: 1450,
    avgFrequency: 1.2,
    lastOrderDays: 15,
    strategies: ['新手指南', '首購優惠', '產品推薦'],
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: Target,
    priority: 'medium'
  },
  {
    id: 'at_risk',
    name: '流失風險',
    description: '曾經是好客戶，但最近沒有購買',
    count: 27,
    percentage: 5.9,
    rfmScore: { r: 2, f: 4, m: 4 },
    characteristics: ['長期未購', '曾經活躍', '流失風險'],
    avgOrderValue: 890,
    avgFrequency: 1.8,
    lastOrderDays: 95,
    strategies: ['喚醒活動', '特殊優惠', '客戶調研'],
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertTriangle,
    priority: 'urgent'
  }
]

// 客戶價值象限
const valueMatrix = [
  {
    quadrant: '高價值高頻',
    customers: 170,
    revenue: 2450000,
    characteristics: '核心客戶群，重點維護',
    color: 'bg-green-100 border-green-300'
  },
  {
    quadrant: '高價值低頻',
    customers: 85,
    revenue: 1890000,
    characteristics: '潛力客戶，提升頻率',
    color: 'bg-blue-100 border-blue-300'
  },
  {
    quadrant: '低價值高頻',
    customers: 123,
    revenue: 567000,
    characteristics: '價格敏感，提升客單',
    color: 'bg-yellow-100 border-yellow-300'
  },
  {
    quadrant: '低價值低頻',
    customers: 78,
    revenue: 234000,
    characteristics: '觀望客戶，需要激活',
    color: 'bg-gray-100 border-gray-300'
  }
]

export default function CustomerSegments() {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'segments' | 'matrix'>('segments')

  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      highest: { label: '最高優先', variant: 'destructive' as const },
      high: { label: '高優先', variant: 'warning' as const },
      medium: { label: '中優先', variant: 'info' as const },
      urgent: { label: '緊急處理', variant: 'destructive' as const }
    }
    return priorityMap[priority as keyof typeof priorityMap] || priorityMap.medium
  }

  return (
    <div className="space-y-6">
      {/* 分析模式切換 */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">客戶分群分析</h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('segments')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'segments' 
                  ? 'bg-white shadow-sm text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              RFM分群
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'matrix' 
                  ? 'bg-white shadow-sm text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              價值矩陣
            </button>
          </div>
        </div>
      </Card>

      {/* RFM分群視圖 */}
      {viewMode === 'segments' && (
        <div className="space-y-6">
          {/* RFM說明 */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-2">RFM分析說明</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
                  <div>
                    <strong>R (Recency)</strong>: 最近購買時間，分數1-5，越近分數越高
                  </div>
                  <div>
                    <strong>F (Frequency)</strong>: 購買頻率，分數1-5，頻率越高分數越高
                  </div>
                  <div>
                    <strong>M (Monetary)</strong>: 消費金額，分數1-5，金額越高分數越高
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 分群卡片 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {rfmSegments.map((segment) => {
              const priorityInfo = getPriorityBadge(segment.priority)
              const isSelected = selectedSegment === segment.id

              return (
                <Card 
                  key={segment.id}
                  className={`p-6 cursor-pointer transition-all duration-200 ${
                    isSelected ? 'ring-2 ring-blue-300' : 'hover:shadow-lg'
                  } ${segment.borderColor} border-l-4`}
                  onClick={() => setSelectedSegment(isSelected ? null : segment.id)}
                >
                  <div className="space-y-4">
                    {/* 分群標題 */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${segment.bgColor}`}>
                          <segment.icon className={`h-5 w-5 ${segment.color}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{segment.name}</h3>
                          <p className="text-sm text-gray-600">{segment.count} 位客戶 ({segment.percentage}%)</p>
                        </div>
                      </div>
                      <Badge variant={priorityInfo.variant} size="sm">
                        {priorityInfo.label}
                      </Badge>
                    </div>

                    {/* RFM分數 */}
                    <div className="flex items-center space-x-4">
                      <div className="text-sm">
                        <span className="text-gray-600">RFM評分:</span>
                        <span className="ml-2 font-mono font-medium">
                          R{segment.rfmScore.r} F{segment.rfmScore.f} M{segment.rfmScore.m}
                        </span>
                      </div>
                    </div>

                    {/* 關鍵指標 */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(segment.avgOrderValue)}
                        </div>
                        <div className="text-xs text-gray-600">平均客單價</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-gray-900">
                          {segment.avgFrequency}
                        </div>
                        <div className="text-xs text-gray-600">月均頻率</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-gray-900">
                          {segment.lastOrderDays}
                        </div>
                        <div className="text-xs text-gray-600">天前下單</div>
                      </div>
                    </div>

                    {/* 客戶特徵 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">客戶特徵</h4>
                      <div className="flex flex-wrap gap-1">
                        {segment.characteristics.map((char, index) => (
                          <Badge key={index} variant="outline" size="sm">
                            {char}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* 展開的詳細信息 */}
                    {isSelected && (
                      <div className="space-y-3 pt-3 border-t">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">分群描述</h4>
                          <p className="text-sm text-gray-600">{segment.description}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">營銷策略</h4>
                          <div className="space-y-1">
                            {segment.strategies.map((strategy, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                                <span className="text-sm text-gray-600">{strategy}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex space-x-2 pt-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            <Eye className="h-4 w-4 mr-2" />
                            查看客戶
                          </Button>
                          <Button size="sm" className="flex-1">
                            執行策略
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* 價值矩陣視圖 */}
      {viewMode === 'matrix' && (
        <div className="space-y-6">
          {/* 矩陣說明 */}
          <Card className="p-4 bg-purple-50 border-purple-200">
            <div className="flex items-start space-x-3">
              <Target className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-purple-900 mb-2">客戶價值矩陣</h3>
                <p className="text-sm text-purple-800">
                  根據客戶消費金額(價值)和購買頻率將客戶分為四個象限，幫助制定差異化策略
                </p>
              </div>
            </div>
          </Card>

          {/* 價值矩陣 */}
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-4 h-96">
              {valueMatrix.map((quadrant, index) => (
                <div key={index} className={`p-6 rounded-lg ${quadrant.color} flex flex-col justify-center space-y-4`}>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {quadrant.quadrant}
                    </h3>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-gray-900">
                        {quadrant.customers} 位
                      </div>
                      <div className="text-lg font-semibold text-blue-600">
                        {formatCurrency(quadrant.revenue)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {quadrant.characteristics}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 象限分析 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-medium text-gray-900 mb-4">象限策略建議</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-1"></div>
                  <div>
                    <div className="font-medium text-gray-900">高價值高頻</div>
                    <div className="text-sm text-gray-600">維護關係，提供VIP服務</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mt-1"></div>
                  <div>
                    <div className="font-medium text-gray-900">高價值低頻</div>
                    <div className="text-sm text-gray-600">增加接觸頻率，建立信任</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1"></div>
                  <div>
                    <div className="font-medium text-gray-900">低價值高頻</div>
                    <div className="text-sm text-gray-600">交叉銷售，提升客單價</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-gray-500 rounded-full mt-1"></div>
                  <div>
                    <div className="font-medium text-gray-900">低價值低頻</div>
                    <div className="text-sm text-gray-600">教育引導，激活潛力</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-medium text-gray-900 mb-4">收入貢獻度</h3>
              <div className="space-y-4">
                {valueMatrix.map((quadrant, index) => {
                  const percentage = (quadrant.revenue / 5141000) * 100
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{quadrant.quadrant}</span>
                        <span className="font-medium">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}