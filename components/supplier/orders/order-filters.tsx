'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Filter,
  Calendar,
  X,
  Download,
  RefreshCw
} from 'lucide-react'

interface OrderFiltersProps {
  searchParams: {
    status?: string
    customer?: string
    dateFrom?: string
    dateTo?: string
    search?: string
    page?: string
  }
}

const statusOptions = [
  { value: '', label: '全部狀態', count: 156 },
  { value: 'pending', label: '待確認', count: 12, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: '已確認', count: 25, color: 'bg-blue-100 text-blue-800' },
  { value: 'processing', label: '處理中', count: 18, color: 'bg-purple-100 text-purple-800' },
  { value: 'shipping', label: '配送中', count: 32, color: 'bg-indigo-100 text-indigo-800' },
  { value: 'delivered', label: '已送達', count: 65, color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: '已取消', count: 4, color: 'bg-red-100 text-red-800' }
]

const customerOptions = [
  { value: '', label: '全部客戶' },
  { value: 'REST-001', label: '大樂司餐廳' },
  { value: 'REST-002', label: '烤食組合' },
  { value: 'REST-003', label: '稻舍餐廳' },
  { value: 'REST-004', label: '樂多多火鍋' },
  { value: 'REST-005', label: '美味小館' }
]

const priorityOptions = [
  { value: '', label: '全部優先級' },
  { value: 'low', label: '低優先級' },
  { value: 'normal', label: '普通' },
  { value: 'high', label: '高優先級' },
  { value: 'urgent', label: '緊急' }
]

const quickDateRanges = [
  { label: '今天', days: 0 },
  { label: '昨天', days: 1 },
  { label: '最近7天', days: 7 },
  { label: '最近30天', days: 30 },
  { label: '本月', days: 'month' as const },
  { label: '上月', days: 'lastMonth' as const }
]

export default function OrderFilters({ searchParams }: OrderFiltersProps) {
  const router = useRouter()
  const searchParamsInstance = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.search || '')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // 計算當前篩選器數量
  const activeFiltersCount = Object.values(searchParams).filter(value => value && value !== '').length

  const updateSearchParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParamsInstance)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // 重置頁碼
    params.delete('page')
    router.push(`/supplier/orders?${params.toString()}`)
  }

  const clearAllFilters = () => {
    router.push('/supplier/orders')
    setSearchTerm('')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateSearchParams('search', searchTerm)
  }

  const handleQuickDateRange = (days: number | 'month' | 'lastMonth') => {
    const today = new Date()
    let dateFrom: string
    let dateTo: string

    if (days === 'month') {
      dateFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]!
      dateTo = today.toISOString().split('T')[0]!
    } else if (days === 'lastMonth') {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      dateFrom = lastMonth.toISOString().split('T')[0]!
      dateTo = lastMonthEnd.toISOString().split('T')[0]!
    } else {
      dateFrom = new Date(today.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!
      dateTo = today.toISOString().split('T')[0]!
    }

    updateSearchParams('dateFrom', dateFrom)
    updateSearchParams('dateTo', dateTo)
  }

  return (
    <div className="space-y-4">
      {/* 搜索和基本篩選 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索訂單號、客戶名稱或產品..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  updateSearchParams('search', '')
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>

        {/* 快速操作 */}
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>篩選</span>
            {activeFiltersCount > 0 && (
              <Badge variant="info" size="sm">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            導出
          </Button>

          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* 狀態篩選標籤 */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => updateSearchParams('status', option.value)}
            className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              searchParams.status === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{option.label}</span>
            <Badge
              variant="outline"
              size="sm"
              className={`${
                searchParams.status === option.value
                  ? 'border-white text-white'
                  : 'border-gray-400 text-gray-600'
              }`}
            >
              {option.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* 進階篩選 */}
      {showAdvancedFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 客戶篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                客戶
              </label>
              <select
                value={searchParams.customer || ''}
                onChange={(e) => updateSearchParams('customer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {customerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 日期範圍 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                訂單日期
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={searchParams.dateFrom || ''}
                  onChange={(e) => updateSearchParams('dateFrom', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="date"
                  value={searchParams.dateTo || ''}
                  onChange={(e) => updateSearchParams('dateTo', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 金額範圍 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                訂單金額
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="最低金額"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="最高金額"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* 快速日期選擇 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              快速日期範圍
            </label>
            <div className="flex flex-wrap gap-2">
              {quickDateRanges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => handleQuickDateRange(range.days)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* 篩選操作 */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {activeFiltersCount > 0 && (
                <span>已套用 {activeFiltersCount} 個篩選條件</span>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                清除全部
              </Button>
              <Button size="sm" onClick={() => setShowAdvancedFilters(false)}>
                套用篩選
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 活動篩選標籤 */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">已套用篩選:</span>
          {searchParams.status && (
            <Badge variant="info" className="flex items-center space-x-1">
              <span>狀態: {statusOptions.find(s => s.value === searchParams.status)?.label}</span>
              <button
                onClick={() => updateSearchParams('status', '')}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchParams.customer && (
            <Badge variant="info" className="flex items-center space-x-1">
              <span>客戶: {customerOptions.find(c => c.value === searchParams.customer)?.label}</span>
              <button
                onClick={() => updateSearchParams('customer', '')}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchParams.search && (
            <Badge variant="info" className="flex items-center space-x-1">
              <span>搜索: {searchParams.search}</span>
              <button
                onClick={() => {
                  updateSearchParams('search', '')
                  setSearchTerm('')
                }}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
