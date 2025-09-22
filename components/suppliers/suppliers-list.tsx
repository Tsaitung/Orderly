'use client'

import * as React from 'react'
import { useState, useCallback, useMemo } from 'react'
import { Grid, List, RefreshCw, AlertCircle, Package, Plus, SortAsc, SortDesc } from 'lucide-react'
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

const SuppliersList = React.forwardRef<HTMLDivElement, SuppliersListProps>(
  (
    {
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
    },
    ref
  ) => {
    const [viewMode, setViewMode] = useState<ViewMode>('grid')
    const [sortField, setSortField] = useState<SortField>('name')
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

    // Handle sorting
    const handleSort = useCallback(
      (field: SortField) => {
        const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
        setSortField(field)
        setSortDirection(newDirection)
        onSort?.(field, newDirection)
      },
      [sortField, sortDirection, onSort]
    )

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
      <div
        className={cn(
          viewMode === 'grid' ? 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'
        )}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse p-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-xl bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="h-8 rounded bg-gray-200" />
              <div className="h-8 rounded bg-gray-200" />
            </div>
          </Card>
        ))}
      </div>
    )

    // Error state
    const ErrorState = () => (
      <Card className="p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h3 className="mb-2 text-lg font-semibold text-gray-900">載入失敗</h3>
        <p className="mb-4 text-gray-600">{error || '無法載入供應商資料，請稍後再試'}</p>
        {onRefresh && (
          <Button onClick={onRefresh} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            重新載入
          </Button>
        )}
      </Card>
    )

    // Empty state
    const EmptyState = () => (
      <Card className="p-8 text-center">
        <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mb-2 text-lg font-semibold text-gray-900">尚無供應商</h3>
        <p className="mb-4 text-gray-600">您還沒有與任何供應商建立合作關係</p>
        <Button className="bg-[primary-500] hover:bg-[primary-600]">
          <Plus className="mr-2 h-4 w-4" />
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
          sortField === field && 'bg-[primary-500]/10 text-[primary-500]'
        )}
      >
        {children}
        {sortField === field &&
          (sortDirection === 'asc' ? (
            <SortAsc className="ml-1 h-3 w-3" />
          ) : (
            <SortDesc className="ml-1 h-3 w-3" />
          ))}
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
            <div className="mr-4 flex items-center space-x-1">
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
                  viewMode === 'grid' && 'bg-[primary-500] hover:bg-[primary-600]'
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
                  viewMode === 'list' && 'bg-[primary-500] hover:bg-[primary-600]'
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
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'
              : 'space-y-4'
          )}
        >
          {sortedSuppliers.map(supplier => (
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
          <div className="pt-6 text-center">
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : '載入更多'}
            </Button>
          </div>
        )}

        {/* Summary Footer */}
        {suppliers.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>合作中供應商：{suppliers.filter(s => s.isActive).length} 個</span>
              <span>
                平均履約率：
                {Math.round(
                  suppliers.reduce((sum, s) => sum + s.fulfillmentRate, 0) / suppliers.length
                )}
                %
              </span>
              <span>總商品數：{suppliers.reduce((sum, s) => sum + s.productCount, 0)} 項</span>
            </div>
          </div>
        )}
      </div>
    )
  }
)

SuppliersList.displayName = 'SuppliersList'

export default SuppliersList
