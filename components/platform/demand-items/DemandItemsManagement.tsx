'use client'

import React from 'react'
import { TrendingUp, BarChart3, Search, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

export function DemandItemsManagement() {
  const [searchTerm, setSearchTerm] = React.useState('')

  // Mock statistics
  const stats = {
    hotItems: 342,
    trendingItems: 89,
    demandGrowth: 15.8,
    forecastAccuracy: 92.3
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">熱門品項</p>
                <p className="text-2xl font-bold text-gray-900">{stats.hotItems}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">趨勢品項</p>
                <p className="text-2xl font-bold text-orange-600">{stats.trendingItems}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">需求成長</p>
                <p className="text-2xl font-bold text-green-600">{stats.demandGrowth}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">預測準確率</p>
                <p className="text-2xl font-bold text-blue-600">{stats.forecastAccuracy}%</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜尋區域 */}
      <Card>
        <CardContent className="p-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜尋需求品項..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 開發中提示 */}
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            需求品項分析模組開發中
          </h3>
          <p className="text-gray-500 mb-4">
            此模組將包含需求趨勢分析、品項熱度排名、跨供應商庫存監控和預測性需求分析
          </p>
          <Badge variant="outline">即將上線</Badge>
        </CardContent>
      </Card>
    </div>
  )
}