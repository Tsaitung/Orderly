'use client'

import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, Settings, BarChart3, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import SuppliersList from '@/components/suppliers/suppliers-list'
import SupplierFilters, { type FilterValues } from '@/components/suppliers/supplier-filters'
import SupplierStatistics from '@/components/suppliers/supplier-statistics'
import {
  mapSupplierCardToSummary,
  mapSupplierStats,
  type SupplierStatistics as SupplierStatsType,
  type SupplierSummary,
} from '@/lib/services/supplier-service'
import { platformSupplierService } from '@/lib/api/platform-supplier-service'

export default function SuppliersPage() {
  // State management
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([])
  const [statistics, setStatistics] = useState<SupplierStatsType | null>(null)
  const [filters, setFilters] = useState<FilterValues>({ isActive: true })
  const [pagination, setPagination] = useState({
    total: 0,
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  })
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('')

  // Loading and error states
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [suppliersError, setSuppliersError] = useState<string | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)

  // UI state
  const [showStatistics, setShowStatistics] = useState(true)

  // API call functions
  const fetchSuppliers = useCallback(
    async (currentFilters: FilterValues = filters, page: number = 1) => {
      setIsLoadingSuppliers(true)
      setSuppliersError(null)

      try {
        const statusFilter =
          currentFilters.isActive === undefined
            ? undefined
            : currentFilters.isActive
              ? 'VERIFIED'
              : 'DEACTIVATED'

        const response = await platformSupplierService.getSuppliers({
          search: currentFilters.search,
          status: statusFilter,
          page,
          page_size: 20,
          sort_by: 'created_at',
          sort_order: 'desc',
        })

        const normalizedSuppliers = response.suppliers.map(mapSupplierCardToSummary)

        setSuppliers(normalizedSuppliers)
        setPagination({
          total: response.total,
          currentPage: response.page,
          totalPages: response.total_pages,
          hasNext: response.page < response.total_pages,
          hasPrev: response.page > 1,
        })

        if (response.stats) {
          setStatistics(mapSupplierStats(response.stats))
        }

        setLastUpdateTime(new Date().toLocaleString('zh-TW'))
      } catch (error) {
        console.error('Error fetching suppliers:', error)
        setSuppliersError('無法載入供應商列表，請稍後再試')
      } finally {
        setIsLoadingSuppliers(false)
      }
    },
    [filters]
  )

  const fetchStatistics = useCallback(async () => {
    setIsLoadingStats(true)
    setStatsError(null)

    try {
      const response = await platformSupplierService.getSupplierStats()
      setStatistics(mapSupplierStats(response))
    } catch (error) {
      console.error('Error fetching statistics:', error)
      setStatsError('無法載入統計資料')
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  // Event handlers
  const handleFiltersChange = useCallback(
    (newFilters: FilterValues) => {
      setFilters(newFilters)
      fetchSuppliers(newFilters, 1) // Reset to page 1 when filtering
    },
    [fetchSuppliers]
  )

  const handleRefreshSuppliers = useCallback(() => {
    fetchSuppliers(filters, pagination.currentPage)
  }, [fetchSuppliers, filters, pagination.currentPage])

  const handleRefreshStats = useCallback(() => {
    fetchStatistics()
  }, [fetchStatistics])

  const handleLoadMore = useCallback(() => {
    if (pagination.hasNext) {
      fetchSuppliers(filters, pagination.currentPage + 1)
    }
  }, [fetchSuppliers, filters, pagination])

  // Quick actions
  const handleQuickOrder = useCallback((supplierId: string) => {
    // TODO: Navigate to order creation page
    console.log('Quick order for supplier:', supplierId)
    // router.push(`/restaurant/orders/new?supplier=${supplierId}`)
  }, [])

  const handleViewDetails = useCallback((supplierId: string) => {
    // TODO: Navigate to supplier detail page
    console.log('View details for supplier:', supplierId)
    // router.push(`/restaurant/suppliers/${supplierId}`)
  }, [])

  const handleViewCatalog = useCallback((supplierId: string) => {
    // TODO: Open product catalog modal or navigate to catalog page
    console.log('View catalog for supplier:', supplierId)
  }, [])

  // Effects
  useEffect(() => {
    fetchSuppliers()
    fetchStatistics()
  }, [fetchSuppliers, fetchStatistics])

  return (
    <div className="spacing-normal theme-supplier">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">供應商管理</h1>
          <p className="text-gray-600">管理供應商關係、查看產品目錄和追蹤合作表現</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Statistics Toggle */}
          <Button
            variant={showStatistics ? 'solid' : 'outline'}
            colorScheme="supplier"
            size="sm"
            onClick={() => setShowStatistics(!showStatistics)}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            統計資訊
          </Button>

          {/* Settings */}
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            設定
          </Button>

          {/* Add Supplier */}
          <Button className="bg-supplier-500 hover:bg-supplier-600">
            <Plus className="mr-2 h-4 w-4" />
            新增供應商
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      {showStatistics && statistics && (
        <SupplierStatistics
          statistics={statistics}
          isLoading={isLoadingStats}
          error={statsError}
          onRefresh={handleRefreshStats}
        />
      )}

      {/* Quick Stats Bar (when statistics panel is hidden) */}
      {!showStatistics && statistics && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-supplier-500">
                  {statistics.activeSuppliers}
                </div>
                <div className="text-xs text-gray-500">合作中</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{statistics.totalProducts}</div>
                <div className="text-xs text-gray-500">項商品</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.averageFulfillmentRate}%
                </div>
                <div className="text-xs text-gray-500">履約率</div>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setShowStatistics(true)}>
              查看詳細統計
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <SupplierFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        isLoading={isLoadingSuppliers}
        totalSuppliers={pagination.total}
        availableZones={['台北市', '新北市', '桃園市', '台中市']} // TODO: Fetch from API
      />

      {/* Suppliers List */}
      <SuppliersList
        suppliers={suppliers}
        isLoading={isLoadingSuppliers}
        error={suppliersError}
        total={pagination.total}
        hasNext={pagination.hasNext}
        hasPrev={pagination.hasPrev}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onRefresh={handleRefreshSuppliers}
        onLoadMore={handleLoadMore}
        onQuickOrder={handleQuickOrder}
        onViewDetails={handleViewDetails}
        onViewCatalog={handleViewCatalog}
      />

      {/* Empty State Helper */}
      {!isLoadingSuppliers && suppliers.length === 0 && !suppliersError && (
        <Card className="p-12 text-center">
          <Package className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h3 className="mb-2 text-xl font-semibold text-gray-900">
            {filters.search ? '找不到符合條件的供應商' : '尚未建立供應商關係'}
          </h3>
          <p className="mx-auto mb-6 max-w-md text-gray-600">
            {filters.search
              ? '請調整搜尋條件或篩選器，或者聯繫我們協助您找到合適的供應商。'
              : '開始與供應商建立合作關係，享受自動化對帳帶來的效率提升。'}
          </p>
          <div className="flex items-center justify-center space-x-3">
            <Button className="bg-supplier-500 hover:bg-supplier-600">
              <Plus className="mr-2 h-4 w-4" />
              尋找供應商
            </Button>
            {filters.search && (
              <Button variant="outline" onClick={() => handleFiltersChange({})}>
                清除篩選
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-8">
        <div className="text-sm text-gray-500">
          {lastUpdateTime && `最後更新：${lastUpdateTime}`}
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleRefreshSuppliers}>
            <RefreshCw className="mr-2 h-4 w-4" />
            重新整理
          </Button>

          <Button variant="outline" size="sm">
            匯出資料
          </Button>
        </div>
      </div>
    </div>
  )
}
