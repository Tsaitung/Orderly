'use client'

import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'
import {
  Search,
  Filter,
  X,
  ChevronDown,
  MapPin,
  Star,
  Package,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface FilterValues {
  search?: string
  isActive?: boolean
  fulfillmentRateMin?: number
  productCountMin?: number
  hasRecentOrders?: boolean
  deliveryZones?: string[]
  performanceLevel?: 'excellent' | 'good' | 'average' | 'poor'
}

interface SupplierFiltersProps {
  filters: FilterValues
  onFiltersChange: (filters: FilterValues) => void
  isLoading?: boolean
  className?: string

  // Available filter options (populated from API)
  availableZones?: string[]
  totalSuppliers?: number
}

const SupplierFilters = React.forwardRef<HTMLDivElement, SupplierFiltersProps>(
  (
    {
      filters,
      onFiltersChange,
      isLoading = false,
      className,
      availableZones = [],
      totalSuppliers = 0,
      ...props
    },
    ref
  ) => {
    const [searchValue, setSearchValue] = useState(filters.search || '')
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [localFilters, setLocalFilters] = useState<FilterValues>(filters)

    // Debounced search
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

    // Update local filters when props change
    useEffect(() => {
      setLocalFilters(filters)
      setSearchValue(filters.search || '')
    }, [filters])

    // Handle search input with debouncing
    const handleSearchChange = useCallback(
      (value: string) => {
        setSearchValue(value)

        if (searchTimeout) {
          clearTimeout(searchTimeout)
        }

        const timeout = setTimeout(() => {
          const newFilters = { ...localFilters, search: value || undefined }
          setLocalFilters(newFilters)
          onFiltersChange(newFilters)
        }, 300) // 300ms debounce

        setSearchTimeout(timeout)
      },
      [localFilters, onFiltersChange, searchTimeout]
    )

    // Handle filter changes
    const handleFilterChange = useCallback(
      (key: keyof FilterValues, value: any) => {
        const newFilters = {
          ...localFilters,
          [key]: value === '' || value === null ? undefined : value,
        }
        setLocalFilters(newFilters)
        onFiltersChange(newFilters)
      },
      [localFilters, onFiltersChange]
    )

    // Toggle filter value
    const toggleFilter = useCallback(
      (key: keyof FilterValues, value: any) => {
        const currentValue = localFilters[key]
        const newValue = currentValue === value ? undefined : value
        handleFilterChange(key, newValue)
      },
      [localFilters, handleFilterChange]
    )

    // Clear all filters
    const clearFilters = useCallback(() => {
      setSearchValue('')
      setLocalFilters({})
      onFiltersChange({})
    }, [onFiltersChange])

    // Count active filters
    const activeFilterCount = Object.keys(localFilters).filter(key => {
      const value = localFilters[key as keyof FilterValues]
      return value !== undefined && value !== null && value !== ''
    }).length

    // Quick filter buttons
    const quickFilters = [
      {
        label: '高效供應商',
        key: 'fulfillmentRateMin' as keyof FilterValues,
        value: 90,
        icon: Star,
        description: '履約率 ≥ 90%',
      },
      {
        label: '活躍合作',
        key: 'hasRecentOrders' as keyof FilterValues,
        value: true,
        icon: TrendingUp,
        description: '近期有訂單往來',
      },
      {
        label: '豐富商品',
        key: 'productCountMin' as keyof FilterValues,
        value: 50,
        icon: Package,
        description: '商品數 ≥ 50',
      },
    ]

    return (
      <div ref={ref} className={cn('space-y-4', className)} {...props}>
        {/* Main Search Bar */}
        <Card className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="搜尋供應商名稱..."
                value={searchValue}
                onChange={e => handleSearchChange(e.target.value)}
                className="pl-10 pr-4"
                disabled={isLoading}
              />
              {searchValue && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 transform p-0"
                  onClick={() => handleSearchChange('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Advanced Filters Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={cn(
                'relative',
                activeFilterCount > 0 && 'border-[primary-500] text-[primary-500]'
              )}
            >
              <Filter className="mr-2 h-4 w-4" />
              進階篩選
              <ChevronDown
                className={cn('ml-2 h-4 w-4 transition-transform', showAdvanced && 'rotate-180')}
              />
              {activeFilterCount > 0 && (
                <Badge className="absolute -right-2 -top-2 h-5 w-5 bg-[primary-500] p-0 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                清除篩選
              </Button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="mt-4 flex flex-wrap gap-2">
            {quickFilters.map(filter => {
              const isActive = localFilters[filter.key] === filter.value
              const Icon = filter.icon

              return (
                <Button
                  key={filter.label}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFilter(filter.key, filter.value)}
                  className={cn(
                    'h-8 text-xs',
                    isActive && 'bg-[primary-500] hover:bg-[primary-600]'
                  )}
                  title={filter.description}
                >
                  <Icon className="mr-1 h-3 w-3" />
                  {filter.label}
                </Button>
              )
            })}
          </div>
        </Card>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <Card className="border-[primary-500]/20 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">合作狀態</label>
                <div className="flex space-x-2">
                  <Button
                    variant={localFilters.isActive === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleFilter('isActive', true)}
                    className={cn(
                      'text-xs',
                      localFilters.isActive === true && 'bg-[primary-500] hover:bg-[primary-600]'
                    )}
                  >
                    合作中
                  </Button>
                  <Button
                    variant={localFilters.isActive === false ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleFilter('isActive', false)}
                    className={cn(
                      'text-xs',
                      localFilters.isActive === false && 'bg-[primary-500] hover:bg-[primary-600]'
                    )}
                  >
                    暫停中
                  </Button>
                </div>
              </div>

              {/* Performance Level */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">表現等級</label>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { label: '優秀', value: 'excellent', min: 95 },
                    { label: '良好', value: 'good', min: 85 },
                    { label: '一般', value: 'average', min: 70 },
                    { label: '待改善', value: 'poor', min: 0 },
                  ].map(level => (
                    <Button
                      key={level.value}
                      variant={
                        localFilters.performanceLevel === level.value ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => toggleFilter('performanceLevel', level.value)}
                      className={cn(
                        'text-xs',
                        localFilters.performanceLevel === level.value &&
                          'bg-[primary-500] hover:bg-[primary-600]'
                      )}
                      title={`履約率 ≥ ${level.min}%`}
                    >
                      {level.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Product Count Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">商品數量</label>
                <div className="flex space-x-2">
                  {[10, 25, 50, 100].map(count => (
                    <Button
                      key={count}
                      variant={localFilters.productCountMin === count ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleFilter('productCountMin', count)}
                      className={cn(
                        'text-xs',
                        localFilters.productCountMin === count &&
                          'bg-[primary-500] hover:bg-[primary-600]'
                      )}
                    >
                      {count}+
                    </Button>
                  ))}
                </div>
              </div>

              {/* Delivery Zones */}
              {availableZones.length > 0 && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">
                    <MapPin className="mr-1 inline h-4 w-4" />
                    配送區域
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableZones.map(zone => {
                      const isSelected = localFilters.deliveryZones?.includes(zone)

                      return (
                        <Button
                          key={zone}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            const currentZones = localFilters.deliveryZones || []
                            const newZones = isSelected
                              ? currentZones.filter(z => z !== zone)
                              : [...currentZones, zone]

                            handleFilterChange(
                              'deliveryZones',
                              newZones.length > 0 ? newZones : undefined
                            )
                          }}
                          className={cn(
                            'text-xs',
                            isSelected && 'bg-[primary-500] hover:bg-[primary-600]'
                          )}
                        >
                          {zone}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  <Calendar className="mr-1 inline h-4 w-4" />
                  活躍度
                </label>
                <Button
                  variant={localFilters.hasRecentOrders ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFilter('hasRecentOrders', !localFilters.hasRecentOrders)}
                  className={cn(
                    'w-full text-xs',
                    localFilters.hasRecentOrders && 'bg-[primary-500] hover:bg-[primary-600]'
                  )}
                >
                  僅顯示近期有訂單
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Active Filters Summary */}
        {activeFilterCount > 0 && (
          <div className="bg-[primary-500]/5 flex items-center justify-between rounded-lg p-3 text-sm text-gray-600">
            <span>
              已套用 {activeFilterCount} 個篩選條件
              {totalSuppliers > 0 && ` · 找到 ${totalSuppliers} 個供應商`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 px-2 text-[primary-500] hover:text-[primary-600]"
            >
              <X className="mr-1 h-3 w-3" />
              清除全部
            </Button>
          </div>
        )}
      </div>
    )
  }
)

SupplierFilters.displayName = 'SupplierFilters'

export default SupplierFilters
