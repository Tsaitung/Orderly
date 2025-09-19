'use client'

import React from 'react'
import { Package, TrendingUp, Star, Search, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

export function ProductManagement() {
  const [searchTerm, setSearchTerm] = React.useState('')

  // Mock statistics
  const stats = {
    totalProducts: 15640,
    activeProducts: 14892,
    categoriesCount: 156,
    avgPrice: 248
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">總產品數</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">活躍產品</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeProducts.toLocaleString()}</p>
              </div>
              <Star className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">產品類別</p>
                <p className="text-2xl font-bold text-purple-600">{stats.categoriesCount}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">平均價格</p>
                <p className="text-2xl font-bold text-primary-600">NT$ {stats.avgPrice}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary-600" />
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
              placeholder="搜尋產品名稱或代碼..."
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
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            產品管理模組開發中
          </h3>
          <p className="text-gray-500 mb-4">
            此模組將包含產品目錄管理、價格比較、審批流程和標準化工具
          </p>
          <Badge variant="outline">即將上線</Badge>
        </CardContent>
      </Card>
    </div>
  )
}