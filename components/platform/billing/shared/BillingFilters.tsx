'use client'

import { useState } from 'react'
import { SupplierFilters, RatingTier, PaymentStatus } from '@/types/platform-billing'
import { cn } from '@/lib/utils'
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  DollarSign,
  Award,
  CreditCard
} from 'lucide-react'

interface BillingFiltersProps {
  filters: SupplierFilters
  onChange: (filters: Partial<SupplierFilters>) => void
  onClear: () => void
}

const RATING_OPTIONS: Array<{ value: RatingTier; label: string; color: string }> = [
  { value: 'Bronze', label: '銅級', color: 'bg-orange-100 text-orange-800' },
  { value: 'Silver', label: '銀級', color: 'bg-gray-100 text-gray-800' },
  { value: 'Gold', label: '金級', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Platinum', label: '白金級', color: 'bg-purple-100 text-purple-800' }
]

const TIER_OPTIONS = [
  { value: 1, label: '入門級 (T1)' },
  { value: 2, label: '成長級 (T2)' },
  { value: 3, label: '專業級 (T3)' },
  { value: 4, label: '企業級 (T4)' },
  { value: 5, label: '旗艦級 (T5)' }
]

const PAYMENT_STATUS_OPTIONS: Array<{ value: PaymentStatus; label: string; color: string }> = [
  { value: 'completed', label: '已完成', color: 'bg-green-100 text-green-800' },
  { value: 'pending', label: '待付款', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'processing', label: '處理中', color: 'bg-blue-100 text-blue-800' },
  { value: 'failed', label: '失敗', color: 'bg-red-100 text-red-800' },
  { value: 'overdue', label: '逾期', color: 'bg-red-100 text-red-800' }
]

export function BillingFilters({ filters, onChange, onClear }: BillingFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearchChange = (search: string) => {
    onChange({ search })
  }

  const handleRatingChange = (rating: RatingTier) => {
    const newRatings = filters.rating.includes(rating)
      ? filters.rating.filter(r => r !== rating)
      : [...filters.rating, rating]
    onChange({ rating: newRatings })
  }

  const handleTierChange = (tier: number) => {
    const newTiers = filters.tier.includes(tier)
      ? filters.tier.filter(t => t !== tier)
      : [...filters.tier, tier]
    onChange({ tier: newTiers })
  }

  const handlePaymentStatusChange = (status: PaymentStatus) => {
    const newStatuses = filters.paymentStatus.includes(status)
      ? filters.paymentStatus.filter(s => s !== status)
      : [...filters.paymentStatus, status]
    onChange({ paymentStatus: newStatuses })
  }

  const handleGMVRangeChange = (range: [number, number]) => {
    onChange({ gmvRange: range })
  }

  const handleDateRangeChange = (range: [Date, Date]) => {
    onChange({ dateRange: range })
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(0)}M`
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`
    }
    return amount.toString()
  }

  const hasActiveFilters = 
    filters.search ||
    filters.rating.length > 0 ||
    filters.tier.length > 0 ||
    filters.paymentStatus.length > 0 ||
    filters.gmvRange[0] > 0 ||
    filters.gmvRange[1] < 10000000

  return (
    <div className="space-y-4">
      {/* 基本篩選 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 搜尋框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋供應商名稱或統編..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* 評級篩選 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            評級
          </label>
          <div className="flex flex-wrap gap-2">
            {RATING_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleRatingChange(option.value)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full border transition-all',
                  filters.rating.includes(option.value)
                    ? option.color + ' ring-2 ring-primary-500'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                )}
              >
                <Award className="h-3 w-3 inline mr-1" />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 層級篩選 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            層級
          </label>
          <div className="flex flex-wrap gap-1">
            {TIER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleTierChange(option.value)}
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded border transition-colors',
                  filters.tier.includes(option.value)
                    ? 'bg-primary-100 text-primary-800 border-primary-200'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                )}
              >
                T{option.value}
              </button>
            ))}
          </div>
        </div>

        {/* 付款狀態 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            付款狀態
          </label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePaymentStatusChange(option.value)}
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded-full border transition-all',
                  filters.paymentStatus.includes(option.value)
                    ? option.color + ' ring-2 ring-primary-500'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                )}
              >
                <CreditCard className="h-3 w-3 inline mr-1" />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 進階篩選切換 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700"
        >
          <Filter className="h-4 w-4" />
          <span>{showAdvanced ? '隱藏' : '顯示'}進階篩選</span>
        </button>

        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <X className="h-4 w-4" />
            <span>清除篩選</span>
          </button>
        )}
      </div>

      {/* 進階篩選區域 */}
      {showAdvanced && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-medium text-gray-900">進階篩選選項</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GMV 範圍 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                月度 GMV 範圍
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="10000000"
                    step="50000"
                    value={filters.gmvRange[0]}
                    onChange={(e) => handleGMVRangeChange([
                      Number(e.target.value), 
                      filters.gmvRange[1]
                    ])}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-16">
                    {formatCurrency(filters.gmvRange[0])}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">至</span>
                  <input
                    type="range"
                    min="0"
                    max="10000000"
                    step="50000"
                    value={filters.gmvRange[1]}
                    onChange={(e) => handleGMVRangeChange([
                      filters.gmvRange[0], 
                      Number(e.target.value)
                    ])}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-16">
                    {formatCurrency(filters.gmvRange[1])}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  範圍：NT$ {filters.gmvRange[0].toLocaleString()} - NT$ {filters.gmvRange[1].toLocaleString()}
                </div>
              </div>
            </div>

            {/* 日期範圍 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                加入時間範圍
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={filters.dateRange[0].toISOString().split('T')[0]}
                    onChange={(e) => handleDateRangeChange([
                      new Date(e.target.value),
                      filters.dateRange[1]
                    ])}
                    className="flex-1 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">至</span>
                  <input
                    type="date"
                    value={filters.dateRange[1].toISOString().split('T')[0]}
                    onChange={(e) => handleDateRangeChange([
                      filters.dateRange[0],
                      new Date(e.target.value)
                    ])}
                    className="flex-1 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 快速日期選項 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              快速日期範圍
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '最近 7 天', days: 7 },
                { label: '最近 30 天', days: 30 },
                { label: '最近 90 天', days: 90 },
                { label: '最近一年', days: 365 }
              ].map((option) => (
                <button
                  key={option.days}
                  onClick={() => {
                    const end = new Date()
                    const start = new Date(end.getTime() - option.days * 24 * 60 * 60 * 1000)
                    handleDateRangeChange([start, end])
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 篩選摘要 */}
      {hasActiveFilters && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-sm text-blue-800">
            <Filter className="h-4 w-4" />
            <span className="font-medium">篩選條件：</span>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <span className="bg-blue-100 px-2 py-1 rounded text-xs">
                  搜尋: "{filters.search}"
                </span>
              )}
              {filters.rating.length > 0 && (
                <span className="bg-blue-100 px-2 py-1 rounded text-xs">
                  評級: {filters.rating.join(', ')}
                </span>
              )}
              {filters.tier.length > 0 && (
                <span className="bg-blue-100 px-2 py-1 rounded text-xs">
                  層級: T{filters.tier.join(', T')}
                </span>
              )}
              {filters.paymentStatus.length > 0 && (
                <span className="bg-blue-100 px-2 py-1 rounded text-xs">
                  狀態: {filters.paymentStatus.length} 個
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}