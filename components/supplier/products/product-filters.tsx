'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search,
  Filter,
  SortAsc,
  Grid,
  List,
  Download,
  RefreshCw
} from 'lucide-react'

interface ProductFiltersProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

const categories = [
  { id: 'all', name: '全部類別', count: 1247 },
  { id: 'vegetables', name: '蔬菜類', count: 342 },
  { id: 'meat', name: '肉類', count: 198 },
  { id: 'seafood', name: '海鮮類', count: 156 },
  { id: 'dairy', name: '乳製品', count: 89 },
  { id: 'grains', name: '穀物類', count: 234 },
  { id: 'condiments', name: '調料類', count: 178 },
  { id: 'frozen', name: '冷凍食品', count: 145 }
]

const stockStatus = [
  { id: 'all', name: '全部狀態', count: 1247 },
  { id: 'in_stock', name: '有庫存', count: 1198 },
  { id: 'low_stock', name: '庫存不足', count: 23 },
  { id: 'out_of_stock', name: '缺貨', count: 8 },
  { id: 'discontinued', name: '停售', count: 18 }
]

const priceRanges = [
  { id: 'all', name: '全部價格', count: 1247 },
  { id: '0-100', name: 'NT$0-100', count: 342 },
  { id: '101-500', name: 'NT$101-500', count: 456 },
  { id: '501-1000', name: 'NT$501-1,000', count: 289 },
  { id: '1001-plus', name: 'NT$1,000+', count: 160 }
]

const sortOptions = [
  { id: 'name-asc', name: '名稱 A-Z' },
  { id: 'name-desc', name: '名稱 Z-A' },
  { id: 'price-asc', name: '價格低到高' },
  { id: 'price-desc', name: '價格高到低' },
  { id: 'stock-asc', name: '庫存少到多' },
  { id: 'stock-desc', name: '庫存多到少' },
  { id: 'sales-desc', name: '銷量高到低' },
  { id: 'created-desc', name: '最新上架' }
]

export default function ProductFilters({ searchParams }: ProductFiltersProps) {
  const [activeFilters, setActiveFilters] = useState({
    category: 'all',
    status: 'all',
    priceRange: 'all',
    sort: 'name-asc'
  })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')

  const handleFilterChange = (type: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [type]: value
    }))
  }

  const clearAllFilters = () => {
    setActiveFilters({
      category: 'all',
      status: 'all',
      priceRange: 'all',
      sort: 'name-asc'
    })
    setSearchQuery('')
  }

  const getActiveFilterCount = () => {
    return Object.values(activeFilters).filter(value => value !== 'all' && value !== 'name-asc').length
  }

  return (
    <div className="space-y-4">
      {/* 搜尋與快捷操作 */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜尋產品名稱、SKU、品牌..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* 視圖模式切換 */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>

            {/* 快捷操作 */}
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              匯出
            </Button>
            
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              重新整理
            </Button>
          </div>
        </div>
      </Card>

      {/* 篩選器 */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Filter className="h-4 w-4 text-gray-400" />
            <h3 className="font-medium text-gray-900">篩選條件</h3>
            {getActiveFilterCount() > 0 && (
              <Badge variant="info" size="sm">
                {getActiveFilterCount()} 個條件
              </Badge>
            )}
          </div>
          
          {getActiveFilterCount() > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllFilters}>
              清除全部
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 產品類別 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">產品類別</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    value={category.id}
                    checked={activeFilters.category === category.id}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="flex-1 text-sm text-gray-700">{category.name}</span>
                  <Badge variant="outline" size="sm">{category.count}</Badge>
                </label>
              ))}
            </div>
          </div>

          {/* 庫存狀態 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">庫存狀態</h4>
            <div className="space-y-2">
              {stockStatus.map((status) => (
                <label key={status.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={status.id}
                    checked={activeFilters.status === status.id}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="flex-1 text-sm text-gray-700">{status.name}</span>
                  <Badge variant="outline" size="sm">{status.count}</Badge>
                </label>
              ))}
            </div>
          </div>

          {/* 價格區間 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">價格區間</h4>
            <div className="space-y-2">
              {priceRanges.map((range) => (
                <label key={range.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="priceRange"
                    value={range.id}
                    checked={activeFilters.priceRange === range.id}
                    onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="flex-1 text-sm text-gray-700">{range.name}</span>
                  <Badge variant="outline" size="sm">{range.count}</Badge>
                </label>
              ))}
            </div>
          </div>

          {/* 排序方式 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">排序方式</h4>
            <div className="space-y-2">
              {sortOptions.map((option) => (
                <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sort"
                    value={option.id}
                    checked={activeFilters.sort === option.id}
                    onChange={(e) => handleFilterChange('sort', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{option.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 當前篩選結果 */}
      {getActiveFilterCount() > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-blue-700">
              <span>當前篩選:</span>
              {activeFilters.category !== 'all' && (
                <Badge variant="info" size="sm">
                  類別: {categories.find(c => c.id === activeFilters.category)?.name}
                </Badge>
              )}
              {activeFilters.status !== 'all' && (
                <Badge variant="info" size="sm">
                  狀態: {stockStatus.find(s => s.id === activeFilters.status)?.name}
                </Badge>
              )}
              {activeFilters.priceRange !== 'all' && (
                <Badge variant="info" size="sm">
                  價格: {priceRanges.find(p => p.id === activeFilters.priceRange)?.name}
                </Badge>
              )}
            </div>
            <span className="text-sm font-medium text-blue-700">
              顯示 1,247 項產品中的 892 項
            </span>
          </div>
        </Card>
      )}
    </div>
  )
}