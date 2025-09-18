'use client'

import * as React from 'react'
import { useState, useCallback, useMemo } from 'react'
import { 
  Grid, 
  List, 
  RefreshCw, 
  AlertCircle,
  Package,
  Plus,
  SortAsc,
  SortDesc
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import SupplierCard from './supplier-card'
import type { SupplierSummary } from '@/lib/services/supplier-service'

interface SuppliersListProps {
  suppliers: SupplierSummary[]
  isLoading?: boolean
  error?: string | null
  total?: number
  hasNext?: boolean
  hasPrev?: boolean
  currentPage?: number
  totalPages?: number
  className?: string
  
  // Handlers
  onRefresh?: () => void
  onLoadMore?: () => void
  onQuickOrder?: (supplierId: string) => void
  onViewDetails?: (supplierId: string) => void
  onViewCatalog?: (supplierId: string) => void
  onSort?: (field: string, direction: 'asc' | 'desc') => void
}

type ViewMode = 'grid' | 'list'
type SortField = 'name' | 'fulfillmentRate' | 'recentOrderCount' | 'totalGMV' | 'lastOrderDate'
type SortDirection = 'asc' | 'desc'

const SuppliersList = React.forwardRef<HTMLDivElement, SuppliersListProps>(({
  suppliers,
  isLoading = false,
  error = null,
  total = 0,
  hasNext = false,
  hasPrev = false,
  currentPage = 1,
  totalPages = 1,
  className,
  onRefresh,
  onLoadMore,
  onQuickOrder,
  onViewDetails,
  onViewCatalog,
  onSort,
  ...props
}, ref) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Handle sorting
  const handleSort = useCallback((field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortField(field)
    setSortDirection(newDirection)
    onSort?.(field, newDirection)
  }, [sortField, sortDirection, onSort])

  // Sort suppliers locally if onSort is not provided
  const sortedSuppliers = useMemo(() => {
    if (onSort) return suppliers // Server-side sorting

    return [...suppliers].sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle date fields
      if (sortField === 'lastOrderDate') {
        aValue = aValue ? new Date(aValue).getTime() : 0
        bValue = bValue ? new Date(bValue).getTime() : 0
      }

      // Handle null/undefined values
      if (aValue === null && bValue === null) return 0
      if (aValue === null) return 1
      if (bValue === null) return -1

      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue, 'zh-TW')
        return sortDirection === 'asc' ? result : -result
      }

      const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      return sortDirection === 'asc' ? result : -result
    })
  }, [suppliers, sortField, sortDirection, onSort])

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className={cn(
      viewMode === 'grid' 
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
        : 'space-y-4'
    )}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="p-6 animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-xl" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="h-8 bg-gray-200 rounded" />
            <div className="h-8 bg-gray-200 rounded" />
          </div>
        </Card>
      ))}
    </div>
  )

  // Error state
  const ErrorState = () => (
    <Card className="p-8 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">載入失敗</h3>
      <p className="text-gray-600 mb-4">{error || '無法載入供應商資料，請稍後再試'}</p>
      {onRefresh && (
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          重新載入
        </Button>
      )}
    </Card>
  )

  // Empty state
  const EmptyState = () => (
    <Card className="p-8 text-center">
      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">尚無供應商</h3>
      <p className="text-gray-600 mb-4">您還沒有與任何供應商建立合作關係</p>
      <Button className="bg-[#A47864] hover:bg-[#8B6B4F]">
        <Plus className="h-4 w-4 mr-2" />
        尋找供應商
      </Button>
    </Card>
  )

  // Sort button component
  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className={cn(
        'h-8 text-xs',
        sortField === field && 'bg-[#A47864]/10 text-[#A47864]'
      )}
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />
      )}
    </Button>
  )

  if (error) return <ErrorState />
  if (isLoading) return <LoadingSkeleton />
  if (!suppliers.length) return <EmptyState />

  return (
    <div ref={ref} className={cn('space-y-6', className)} {...props}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            顯示 {suppliers.length} 個供應商
            {total > 0 && ` / 共 ${total} 個`}
          </span>
          {currentPage > 1 && totalPages > 1 && (
            <Badge variant="outline">
              第 {currentPage} 頁 / 共 {totalPages} 頁
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Sort Controls */}
          <div className="flex items-center space-x-1 mr-4">
            <span className="text-xs text-gray-500">排序：</span>
            <SortButton field="name">名稱</SortButton>
            <SortButton field="fulfillmentRate">履約率</SortButton>
            <SortButton field="recentOrderCount">訂單數</SortButton>
            <SortButton field="totalGMV">交易額</SortButton>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={cn(
                'h-7 px-2',
                viewMode === 'grid' && 'bg-[#A47864] hover:bg-[#8B6B4F]'
              )}
            >
              <Grid className="h-3 w-3" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={cn(
                'h-7 px-2',
                viewMode === 'list' && 'bg-[#A47864] hover:bg-[#8B6B4F]'
              )}
            >
              <List className="h-3 w-3" />
            </Button>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8"
            >
              <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
            </Button>
          )}
        </div>
      </div>

      {/* Suppliers Grid/List */}
      <div className={cn(
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      )}>
        {sortedSuppliers.map((supplier) => (
          <SupplierCard
            key={supplier.id}
            supplier={supplier}
            variant={viewMode === 'list' ? 'compact' : 'default'}
            onQuickOrder={onQuickOrder}
            onViewDetails={onViewDetails}
            onViewCatalog={onViewCatalog}
          />
        ))}
      </div>

      {/* Load More / Pagination */}
      {hasNext && onLoadMore && (
        <div className="text-center pt-6">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              '載入更多'
            )}
          </Button>
        </div>
      )}

      {/* Summary Footer */}
      {suppliers.length > 0 && (
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              合作中供應商：{suppliers.filter(s => s.isActive).length} 個
            </span>
            <span>
              平均履約率：{Math.round(suppliers.reduce((sum, s) => sum + s.fulfillmentRate, 0) / suppliers.length)}%
            </span>
            <span>
              總商品數：{suppliers.reduce((sum, s) => sum + s.productCount, 0)} 項
            </span>
          </div>
        </div>
      )}
    </div>
  )
})

SuppliersList.displayName = 'SuppliersList'

export default SuppliersList