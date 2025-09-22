'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Filter, Calendar, MapPin, Star, TrendingUp, Download } from 'lucide-react'

interface CustomerFiltersProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

const customerSegments = [
  { id: 'all', name: '全部客戶', count: 456 },
  { id: 'champions', name: '冠軍客戶', count: 28 },
  { id: 'loyal', name: '忠誠客戶', count: 142 },
  { id: 'potential', name: '潛力客戶', count: 186 },
  { id: 'new', name: '新客戶', count: 73 },
  { id: 'at_risk', name: '流失風險', count: 27 },
]

const regions = [
  { id: 'all', name: '全部地區', count: 456 },
  { id: 'taipei', name: '台北市', count: 128 },
  { id: 'new_taipei', name: '新北市', count: 96 },
  { id: 'taoyuan', name: '桃園市', count: 67 },
  { id: 'taichung', name: '台中市', count: 85 },
  { id: 'tainan', name: '台南市', count: 45 },
  { id: 'kaohsiung', name: '高雄市', count: 35 },
]

const customerTypes = [
  { id: 'all', name: '全部類型', count: 456 },
  { id: 'restaurant', name: '餐廳', count: 298 },
  { id: 'hotel', name: '飯店', count: 89 },
  { id: 'catering', name: '團膳', count: 45 },
  { id: 'retail', name: '零售', count: 24 },
]

const orderAmountRanges = [
  { id: 'all', name: '全部金額', count: 456 },
  { id: '0-10000', name: 'NT$0-10,000', count: 156 },
  { id: '10001-50000', name: 'NT$10,001-50,000', count: 189 },
  { id: '50001-100000', name: 'NT$50,001-100,000', count: 78 },
  { id: '100001-plus', name: 'NT$100,000+', count: 33 },
]

const activityStatus = [
  { id: 'all', name: '全部狀態', count: 456 },
  { id: 'active', name: '活躍客戶', count: 398 },
  { id: 'inactive_30', name: '30天未下單', count: 35 },
  { id: 'inactive_60', name: '60天未下單', count: 15 },
  { id: 'inactive_90', name: '90天未下單', count: 8 },
]

const satisfactionLevels = [
  { id: 'all', name: '全部評價', count: 456 },
  { id: '5', name: '5星 優秀', count: 198 },
  { id: '4', name: '4星 良好', count: 167 },
  { id: '3', name: '3星 普通', count: 76 },
  { id: '2', name: '2星 待改善', count: 12 },
  { id: '1', name: '1星 差評', count: 3 },
]

const sortOptions = [
  { id: 'name-asc', name: '客戶名稱 A-Z' },
  { id: 'name-desc', name: '客戶名稱 Z-A' },
  { id: 'value-desc', name: '客戶價值高到低' },
  { id: 'value-asc', name: '客戶價值低到高' },
  { id: 'last_order-desc', name: '最近下單' },
  { id: 'first_order-desc', name: '最早下單' },
  { id: 'frequency-desc', name: '下單頻率高到低' },
  { id: 'satisfaction-desc', name: '滿意度高到低' },
]

export default function CustomerFilters({ searchParams }: CustomerFiltersProps) {
  const [activeFilters, setActiveFilters] = useState({
    segment: 'all',
    region: 'all',
    type: 'all',
    amount: 'all',
    activity: 'all',
    satisfaction: 'all',
    sort: 'name-asc',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const handleFilterChange = (type: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [type]: value,
    }))
  }

  const clearAllFilters = () => {
    setActiveFilters({
      segment: 'all',
      region: 'all',
      type: 'all',
      amount: 'all',
      activity: 'all',
      satisfaction: 'all',
      sort: 'name-asc',
    })
    setSearchQuery('')
    setDateRange({ start: '', end: '' })
  }

  const getActiveFilterCount = () => {
    let count = Object.values(activeFilters).filter(
      value => value !== 'all' && value !== 'name-asc'
    ).length
    if (searchQuery) count++
    if (dateRange.start || dateRange.end) count++
    return count
  }

  const exportFilters = () => {
    // 匯出當前篩選條件
    console.log('Export filters:', { activeFilters, searchQuery, dateRange })
  }

  return (
    <div className="space-y-4">
      {/* 搜尋與快捷操作 */}
      <Card className="p-4">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div className="max-w-md flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="搜尋客戶名稱、電話、email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 日期範圍 */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <Input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-36"
              placeholder="開始日期"
            />
            <span className="text-gray-400">-</span>
            <Input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-36"
              placeholder="結束日期"
            />
          </div>

          {/* 快捷操作 */}
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={exportFilters}>
              <Download className="mr-2 h-4 w-4" />
              匯出
            </Button>
          </div>
        </div>
      </Card>

      {/* 篩選器 */}
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-6">
          {/* 客戶分群 */}
          <div>
            <h4 className="mb-3 flex items-center text-sm font-medium text-gray-700">
              <TrendingUp className="mr-1 h-4 w-4" />
              客戶分群
            </h4>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {customerSegments.map(segment => (
                <label key={segment.id} className="flex cursor-pointer items-center space-x-2">
                  <input
                    type="radio"
                    name="segment"
                    value={segment.id}
                    checked={activeFilters.segment === segment.id}
                    onChange={e => handleFilterChange('segment', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="flex-1 text-sm text-gray-700">{segment.name}</span>
                  <Badge variant="outline" size="sm">
                    {segment.count}
                  </Badge>
                </label>
              ))}
            </div>
          </div>

          {/* 地區分布 */}
          <div>
            <h4 className="mb-3 flex items-center text-sm font-medium text-gray-700">
              <MapPin className="mr-1 h-4 w-4" />
              地區分布
            </h4>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {regions.map(region => (
                <label key={region.id} className="flex cursor-pointer items-center space-x-2">
                  <input
                    type="radio"
                    name="region"
                    value={region.id}
                    checked={activeFilters.region === region.id}
                    onChange={e => handleFilterChange('region', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="flex-1 text-sm text-gray-700">{region.name}</span>
                  <Badge variant="outline" size="sm">
                    {region.count}
                  </Badge>
                </label>
              ))}
            </div>
          </div>

          {/* 客戶類型 */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-700">客戶類型</h4>
            <div className="space-y-2">
              {customerTypes.map(type => (
                <label key={type.id} className="flex cursor-pointer items-center space-x-2">
                  <input
                    type="radio"
                    name="type"
                    value={type.id}
                    checked={activeFilters.type === type.id}
                    onChange={e => handleFilterChange('type', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="flex-1 text-sm text-gray-700">{type.name}</span>
                  <Badge variant="outline" size="sm">
                    {type.count}
                  </Badge>
                </label>
              ))}
            </div>
          </div>

          {/* 消費金額 */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-700">月消費額</h4>
            <div className="space-y-2">
              {orderAmountRanges.map(range => (
                <label key={range.id} className="flex cursor-pointer items-center space-x-2">
                  <input
                    type="radio"
                    name="amount"
                    value={range.id}
                    checked={activeFilters.amount === range.id}
                    onChange={e => handleFilterChange('amount', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="flex-1 text-sm text-gray-700">{range.name}</span>
                  <Badge variant="outline" size="sm">
                    {range.count}
                  </Badge>
                </label>
              ))}
            </div>
          </div>

          {/* 活躍狀態 */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-700">活躍狀態</h4>
            <div className="space-y-2">
              {activityStatus.map(status => (
                <label key={status.id} className="flex cursor-pointer items-center space-x-2">
                  <input
                    type="radio"
                    name="activity"
                    value={status.id}
                    checked={activeFilters.activity === status.id}
                    onChange={e => handleFilterChange('activity', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="flex-1 text-sm text-gray-700">{status.name}</span>
                  <Badge variant="outline" size="sm">
                    {status.count}
                  </Badge>
                </label>
              ))}
            </div>
          </div>

          {/* 滿意度評價 */}
          <div>
            <h4 className="mb-3 flex items-center text-sm font-medium text-gray-700">
              <Star className="mr-1 h-4 w-4" />
              滿意度評價
            </h4>
            <div className="space-y-2">
              {satisfactionLevels.map(level => (
                <label key={level.id} className="flex cursor-pointer items-center space-x-2">
                  <input
                    type="radio"
                    name="satisfaction"
                    value={level.id}
                    checked={activeFilters.satisfaction === level.id}
                    onChange={e => handleFilterChange('satisfaction', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="flex-1 text-sm text-gray-700">{level.name}</span>
                  <Badge variant="outline" size="sm">
                    {level.count}
                  </Badge>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 排序選項 */}
        <div className="mt-6 border-t pt-4">
          <h4 className="mb-3 text-sm font-medium text-gray-700">排序方式</h4>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
            {sortOptions.map(option => (
              <label key={option.id} className="flex cursor-pointer items-center space-x-2">
                <input
                  type="radio"
                  name="sort"
                  value={option.id}
                  checked={activeFilters.sort === option.id}
                  onChange={e => handleFilterChange('sort', e.target.value)}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">{option.name}</span>
              </label>
            ))}
          </div>
        </div>
      </Card>

      {/* 當前篩選結果 */}
      {getActiveFilterCount() > 0 && (
        <Card className="border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-blue-700">
              <span>當前篩選:</span>
              {activeFilters.segment !== 'all' && (
                <Badge variant="info" size="sm">
                  分群: {customerSegments.find(s => s.id === activeFilters.segment)?.name}
                </Badge>
              )}
              {activeFilters.region !== 'all' && (
                <Badge variant="info" size="sm">
                  地區: {regions.find(r => r.id === activeFilters.region)?.name}
                </Badge>
              )}
              {activeFilters.type !== 'all' && (
                <Badge variant="info" size="sm">
                  類型: {customerTypes.find(t => t.id === activeFilters.type)?.name}
                </Badge>
              )}
              {activeFilters.activity !== 'all' && (
                <Badge variant="info" size="sm">
                  狀態: {activityStatus.find(a => a.id === activeFilters.activity)?.name}
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="info" size="sm">
                  搜尋: {searchQuery}
                </Badge>
              )}
              {(dateRange.start || dateRange.end) && (
                <Badge variant="info" size="sm">
                  日期: {dateRange.start} ~ {dateRange.end}
                </Badge>
              )}
            </div>
            <span className="text-sm font-medium text-blue-700">顯示 456 位客戶中的 234 位</span>
          </div>
        </Card>
      )}
    </div>
  )
}
