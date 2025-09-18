'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  Truck,
  Clock,
  Package,
  User
} from 'lucide-react'

interface DeliveryFiltersProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

const deliveryStatus = [
  { id: 'all', name: '全部狀態', count: 156 },
  { id: 'pending', name: '待配送', count: 23 },
  { id: 'loading', name: '裝載中', count: 8 },
  { id: 'delivering', name: '配送中', count: 18 },
  { id: 'delivered', name: '已送達', count: 89 },
  { id: 'delayed', name: '延遲', count: 5 },
  { id: 'failed', name: '配送失敗', count: 2 },
  { id: 'cancelled', name: '已取消', count: 11 }
]

const deliveryRegions = [
  { id: 'all', name: '全部地區', count: 156 },
  { id: 'taipei', name: '台北市', count: 45 },
  { id: 'new_taipei', name: '新北市', count: 38 },
  { id: 'taoyuan', name: '桃園市', count: 22 },
  { id: 'taichung', name: '台中市', count: 28 },
  { id: 'tainan', name: '台南市', count: 12 },
  { id: 'kaohsiung', name: '高雄市', count: 11 }
]

const vehicleTypes = [
  { id: 'all', name: '全部車型', count: 156 },
  { id: 'refrigerated', name: '冷藏車', count: 89 },
  { id: 'standard', name: '一般貨車', count: 67 }
]

const priorityLevels = [
  { id: 'all', name: '全部優先級', count: 156 },
  { id: 'urgent', name: '緊急', count: 12 },
  { id: 'high', name: '高', count: 34 },
  { id: 'normal', name: '普通', count: 98 },
  { id: 'low', name: '低', count: 12 }
]

const deliveryTimeSlots = [
  { id: 'all', name: '全部時段', count: 156 },
  { id: 'morning', name: '上午 (6-12)', count: 45 },
  { id: 'afternoon', name: '下午 (12-18)', count: 67 },
  { id: 'evening', name: '晚上 (18-22)', count: 34 },
  { id: 'overnight', name: '深夜 (22-6)', count: 10 }
]

const drivers = [
  { id: 'all', name: '全部司機', count: 156 },
  { id: 'zhang', name: '張大明', count: 28 },
  { id: 'li', name: '李小華', count: 32 },
  { id: 'wang', name: '王志明', count: 25 },
  { id: 'chen', name: '陳建民', count: 31 },
  { id: 'unassigned', name: '未指派', count: 40 }
]

const sortOptions = [
  { id: 'created-desc', name: '建立時間 (新到舊)' },
  { id: 'created-asc', name: '建立時間 (舊到新)' },
  { id: 'delivery_time-asc', name: '配送時間 (早到晚)' },
  { id: 'delivery_time-desc', name: '配送時間 (晚到早)' },
  { id: 'priority-desc', name: '優先級 (高到低)' },
  { id: 'distance-asc', name: '距離 (近到遠)' },
  { id: 'status-asc', name: '狀態排序' }
]

export default function DeliveryFilters({ searchParams }: DeliveryFiltersProps) {
  const [activeFilters, setActiveFilters] = useState({
    status: 'all',
    region: 'all',
    vehicleType: 'all',
    priority: 'all',
    timeSlot: 'all',
    driver: 'all',
    sort: 'created-desc'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const handleFilterChange = (type: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [type]: value
    }))
  }

  const clearAllFilters = () => {
    setActiveFilters({
      status: 'all',
      region: 'all',
      vehicleType: 'all',
      priority: 'all',
      timeSlot: 'all',
      driver: 'all',
      sort: 'created-desc'
    })
    setSearchQuery('')
    setDateRange({ start: '', end: '' })
  }

  const getActiveFilterCount = () => {
    let count = Object.values(activeFilters).filter(value => value !== 'all' && value !== 'created-desc').length
    if (searchQuery) count++
    if (dateRange.start || dateRange.end) count++
    return count
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
                placeholder="搜尋訂單號、客戶名稱、地址..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-36"
              placeholder="開始日期"
            />
            <span className="text-gray-400">-</span>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-36"
              placeholder="結束日期"
            />
          </div>

          {/* 快捷篩選 */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              今日配送
            </Button>
            <Button variant="outline" size="sm">
              延遲訂單
            </Button>
            <Button variant="outline" size="sm">
              緊急配送
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

        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {/* 配送狀態 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Package className="h-4 w-4 mr-1" />
              配送狀態
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {deliveryStatus.map((status) => (
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

          {/* 配送地區 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              配送地區
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {deliveryRegions.map((region) => (
                <label key={region.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="region"
                    value={region.id}
                    checked={activeFilters.region === region.id}
                    onChange={(e) => handleFilterChange('region', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="flex-1 text-sm text-gray-700">{region.name}</span>
                  <Badge variant="outline" size="sm">{region.count}</Badge>
                </label>
              ))}
            </div>
          </div>

          {/* 車輛類型 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Truck className="h-4 w-4 mr-1" />
              車輛類型
            </h4>
            <div className="space-y-2">
              {vehicleTypes.map((type) => (
                <label key={type.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="vehicleType"
                    value={type.id}
                    checked={activeFilters.vehicleType === type.id}
                    onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="flex-1 text-sm text-gray-700">{type.name}</span>
                  <Badge variant="outline" size="sm">{type.count}</Badge>
                </label>
              ))}
            </div>
          </div>

          {/* 優先級 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">優先級</h4>
            <div className="space-y-2">
              {priorityLevels.map((priority) => (
                <label key={priority.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value={priority.id}
                    checked={activeFilters.priority === priority.id}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="flex-1 text-sm text-gray-700">{priority.name}</span>
                  <Badge variant="outline" size="sm">{priority.count}</Badge>
                </label>
              ))}
            </div>
          </div>

          {/* 配送時段 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              配送時段
            </h4>
            <div className="space-y-2">
              {deliveryTimeSlots.map((slot) => (
                <label key={slot.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="timeSlot"
                    value={slot.id}
                    checked={activeFilters.timeSlot === slot.id}
                    onChange={(e) => handleFilterChange('timeSlot', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="flex-1 text-sm text-gray-700">{slot.name}</span>
                  <Badge variant="outline" size="sm">{slot.count}</Badge>
                </label>
              ))}
            </div>
          </div>

          {/* 指派司機 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <User className="h-4 w-4 mr-1" />
              指派司機
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {drivers.map((driver) => (
                <label key={driver.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="driver"
                    value={driver.id}
                    checked={activeFilters.driver === driver.id}
                    onChange={(e) => handleFilterChange('driver', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="flex-1 text-sm text-gray-700">{driver.name}</span>
                  <Badge variant="outline" size="sm">{driver.count}</Badge>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 排序選項 */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-3">排序方式</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
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
      </Card>

      {/* 當前篩選結果 */}
      {getActiveFilterCount() > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-blue-700 flex-wrap">
              <span>當前篩選:</span>
              {activeFilters.status !== 'all' && (
                <Badge variant="info" size="sm">
                  狀態: {deliveryStatus.find(s => s.id === activeFilters.status)?.name}
                </Badge>
              )}
              {activeFilters.region !== 'all' && (
                <Badge variant="info" size="sm">
                  地區: {deliveryRegions.find(r => r.id === activeFilters.region)?.name}
                </Badge>
              )}
              {activeFilters.vehicleType !== 'all' && (
                <Badge variant="info" size="sm">
                  車型: {vehicleTypes.find(v => v.id === activeFilters.vehicleType)?.name}
                </Badge>
              )}
              {activeFilters.priority !== 'all' && (
                <Badge variant="info" size="sm">
                  優先級: {priorityLevels.find(p => p.id === activeFilters.priority)?.name}
                </Badge>
              )}
              {activeFilters.driver !== 'all' && (
                <Badge variant="info" size="sm">
                  司機: {drivers.find(d => d.id === activeFilters.driver)?.name}
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
            <span className="text-sm font-medium text-blue-700">
              顯示 156 筆配送中的 89 筆
            </span>
          </div>
        </Card>
      )}
    </div>
  )
}