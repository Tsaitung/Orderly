'use client'

import React from 'react'
import { FolderTree, Tag, Search, Settings } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

export function CategoryManagement() {
  const [searchTerm, setSearchTerm] = React.useState('')

  // Mock statistics
  const stats = {
    totalCategories: 156,
    activeCategories: 142,
    standardizedCategories: 128,
    mappingAccuracy: 94.7
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">總類別數</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCategories}</p>
              </div>
              <FolderTree className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">活躍類別</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeCategories}</p>
              </div>
              <Tag className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">已標準化</p>
                <p className="text-2xl font-bold text-purple-600">{stats.standardizedCategories}</p>
              </div>
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">映射準確率</p>
                <p className="text-2xl font-bold text-primary-600">{stats.mappingAccuracy}%</p>
              </div>
              <FolderTree className="h-8 w-8 text-primary-600" />
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
              placeholder="搜尋產品類別..."
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
          <FolderTree className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            類別管理模組開發中
          </h3>
          <p className="text-gray-500 mb-4">
            此模組將包含類別階層編輯器、產品分類映射工具、類別績效分析和標準化執行功能
          </p>
          <Badge variant="outline">即將上線</Badge>
        </CardContent>
      </Card>
    </div>
  )
}