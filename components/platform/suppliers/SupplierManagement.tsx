'use client'

import React, { useState, useCallback } from 'react'
import {
  Search,
  Filter,
  Building2,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  MoreVertical,
  Eye,
  Edit,
  Ban,
  FileCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useSuppliers, useSupplierDetail } from '@/lib/hooks/use-platform-suppliers'
import type {
  SupplierCard as SupplierCardType,
  SupplierFilterParams,
} from '@/lib/api/platform-supplier-service'

interface SupplierCardProps {
  supplier: SupplierCardType
  onViewDetails?: (supplier: SupplierCardType) => void
  onEdit?: (supplier: SupplierCardType) => void
  onSuspend?: (supplier: SupplierCardType) => void
}

function SupplierCard({ supplier, onViewDetails, onEdit, onSuspend }: SupplierCardProps) {
  const safeNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const formatCurrency = (value: unknown): string => {
    const amount = safeNumber(value)
    return amount.toLocaleString('zh-TW')
  }

  const formatPercent = (value: unknown): string => {
    const number = safeNumber(value)
    return Number.isFinite(number) ? number.toString() : '0'
  }

  const formatDate = (value: unknown): string => {
    if (!value) return '未知'
    const date = new Date(value as string)
    return Number.isNaN(date.getTime()) ? '未知' : date.toLocaleDateString('zh-TW')
  }

  const monthlyGMV = safeNumber(supplier.monthly_gmv)
  const monthlyOrders = safeNumber(supplier.monthly_orders)
  const fulfillmentRate = safeNumber(supplier.fulfillment_rate)
  const gmvGrowthRate = safeNumber(supplier.gmv_growth_rate)
  const ordersGrowthRate = safeNumber(supplier.orders_growth_rate)
  const qualityScore = safeNumber(supplier.quality_score)
  const minimumOrderAmount = safeNumber(supplier.minimum_order_amount)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <Badge className="bg-green-100 text-green-800">營運中</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">審核中</Badge>
      case 'SUSPENDED':
        return <Badge className="bg-red-100 text-red-800">暫停營運</Badge>
      case 'DEACTIVATED':
        return <Badge className="bg-gray-100 text-gray-800">已停用</Badge>
      default:
        return <Badge variant="outline">{supplier.status_display}</Badge>
    }
  }

  const getActivityBadge = (level: string) => {
    const colors = {
      high: 'bg-green-100 text-green-800',
      moderate: 'bg-yellow-100 text-yellow-800',
      low: 'bg-red-100 text-red-800',
    }
    const labels = {
      high: '高活躍',
      moderate: '中活躍',
      low: '低活躍',
    }
    return (
      <Badge className={colors[level as keyof typeof colors]}>
        {labels[level as keyof typeof labels] || level}
      </Badge>
    )
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
              <Building2 className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{supplier.name}</CardTitle>
              <div className="mt-1 flex items-center space-x-2">
                {getStatusBadge(supplier.status)}
                {getActivityBadge(supplier.activity_level)}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails?.(supplier)}>
                <Eye className="mr-2 h-4 w-4" />
                查看詳情
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(supplier)}>
                <Edit className="mr-2 h-4 w-4" />
                編輯資料
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => onSuspend?.(supplier)}>
                <Ban className="mr-2 h-4 w-4" />
                暫停合作
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 聯絡資訊 */}
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {supplier.contact_phone && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Phone className="h-4 w-4" />
              <span>{supplier.contact_phone}</span>
            </div>
          )}
          {supplier.contact_email && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Mail className="h-4 w-4" />
              <span className="truncate">{supplier.contact_email}</span>
            </div>
          )}
          {supplier.address && (
            <div className="flex items-center space-x-2 text-gray-600 sm:col-span-2">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{supplier.address}</span>
            </div>
          )}
        </div>

        {/* 關鍵指標 */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              NT$ {(monthlyGMV / 1000).toFixed(0)}K
            </div>
            <div className="text-xs text-gray-500">月 GMV</div>
            <div
              className={cn(
                'flex items-center justify-center text-xs',
                gmvGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {gmvGrowthRate >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {gmvGrowthRate >= 0 ? '+' : ''}
              {formatPercent(gmvGrowthRate)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{monthlyOrders}</div>
            <div className="text-xs text-gray-500">月訂單</div>
            <div
              className={cn(
                'flex items-center justify-center text-xs',
                ordersGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {ordersGrowthRate >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {ordersGrowthRate >= 0 ? '+' : ''}
              {formatPercent(ordersGrowthRate)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{formatPercent(fulfillmentRate)}%</div>
            <div className="text-xs text-gray-500">履約率</div>
            <div className="flex items-center justify-center">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-3 w-3',
                      i < Math.floor(qualityScore)
                        ? 'fill-current text-yellow-400'
                        : 'text-gray-300'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              NT$ {formatCurrency(minimumOrderAmount)}
            </div>
            <div className="text-xs text-gray-500">最小訂購</div>
            <div className="text-xs text-gray-600">{supplier.payment_terms_display}</div>
          </div>
        </div>

        {/* 產品類別 */}
        {supplier.product_categories && supplier.product_categories.length > 0 && (
          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">主要類別</div>
            <div className="flex flex-wrap gap-2">
              {supplier.product_categories.slice(0, 4).map(category => (
                <Badge key={category} variant="outline" className="text-xs">
                  {category}
                </Badge>
              ))}
              {supplier.product_categories.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{supplier.product_categories.length - 4} 更多
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* 底部資訊 */}
        <div className="flex items-center justify-between border-t pt-2 text-xs text-gray-500">
          <span>加入日期: {formatDate(supplier.join_date)}</span>
          {supplier.last_order_date ? (
            <span>最後訂單: {formatDate(supplier.last_order_date)}</span>
          ) : (
            <span>尚無訂單</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function SupplierManagement() {
  // Use the real API hooks
  const {
    suppliers,
    total,
    page,
    totalPages,
    stats,
    loading,
    error,
    refetch,
    updateFilters,
    resetFilters,
    filters,
  } = useSuppliers()

  // Local state for UI
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierCardType | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  // Handle search with debouncing
  const handleSearch = useCallback(
    (value: string) => {
      setSearchTerm(value)
      updateFilters({ search: value || undefined })
    },
    [updateFilters]
  )

  // Handle filter changes
  const handleStatusFilter = useCallback(
    (status: string) => {
      updateFilters({
        status: status === 'all' ? undefined : status,
      })
    },
    [updateFilters]
  )

  const handleActivityFilter = useCallback(
    (activity: string) => {
      updateFilters({
        activity_level: activity === 'all' ? undefined : activity,
      })
    },
    [updateFilters]
  )

  // Handle pagination
  const handlePageChange = useCallback(
    (newPage: number) => {
      updateFilters({ page: newPage })
    },
    [updateFilters]
  )

  // Card actions
  const handleViewDetails = useCallback((supplier: SupplierCardType) => {
    setSelectedSupplier(supplier)
    // Could open a modal or navigate to detail page
    console.log('View details for:', supplier.name)
  }, [])

  const handleEdit = useCallback((supplier: SupplierCardType) => {
    // Navigate to edit page or open edit modal
    console.log('Edit supplier:', supplier.name)
  }, [])

  const handleSuspend = useCallback((supplier: SupplierCardType) => {
    // Show confirmation and suspend supplier
    console.log('Suspend supplier:', supplier.name)
  }, [])

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">載入失敗</h3>
            <p className="mb-4 text-gray-500">{error}</p>
            <Button onClick={refetch} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              重新載入
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">總供應商</p>
                {loading ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span className="text-gray-400">載入中...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{stats?.total_suppliers || 0}</p>
                )}
              </div>
              <Building2 className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">營運中</p>
                {loading ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span className="text-gray-400">載入中...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.active_suppliers || 0}
                  </p>
                )}
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">審核中</p>
                {loading ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span className="text-gray-400">載入中...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats?.pending_suppliers || 0}
                  </p>
                )}
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">總 GMV</p>
                {loading ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span className="text-gray-400">載入中...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-primary-600">
                    NT$ {((stats?.total_gmv || 0) / 1000000).toFixed(1)}M
                  </p>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜尋和篩選 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder="搜尋供應商名稱或聯絡人..."
                  value={searchTerm}
                  onChange={e => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <select
                value={filters.status || 'all'}
                onChange={e => handleStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">所有狀態</option>
                <option value="VERIFIED">營運中</option>
                <option value="PENDING">審核中</option>
                <option value="SUSPENDED">暫停營運</option>
                <option value="DEACTIVATED">已停用</option>
              </select>
              <select
                value={filters.activity_level || 'all'}
                onChange={e => handleActivityFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">所有活躍度</option>
                <option value="high">高活躍</option>
                <option value="moderate">中活躍</option>
                <option value="low">低活躍</option>
              </select>
              <Button variant="outline" size="sm" onClick={resetFilters} className="px-3">
                重設
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 供應商列表 */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">供應商列表 ({(total || 0).toLocaleString()})</h3>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              重新載入
            </Button>
          </div>
        </div>

        {loading && suppliers.length === 0 ? (
          // Initial loading state
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="mb-4 h-20 rounded bg-gray-200"></div>
                  <div className="mb-2 h-4 rounded bg-gray-200"></div>
                  <div className="h-4 w-3/4 rounded bg-gray-200"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : suppliers.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {suppliers.map(supplier => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onViewDetails={handleViewDetails}
                  onEdit={handleEdit}
                  onSuspend={handleSuspend}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  顯示第 {(page - 1) * filters.page_size! + 1} -{' '}
                  {Math.min(page * filters.page_size!, total || 0)} 項， 共 {(total || 0).toLocaleString()} 項
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1 || loading}
                  >
                    上一頁
                  </Button>
                  <span className="text-sm text-gray-600">
                    第 {page} 頁，共 {totalPages} 頁
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages || loading}
                  >
                    下一頁
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          // Empty state
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                {filters.search || filters.status || filters.activity_level
                  ? '找不到符合條件的供應商'
                  : '尚無供應商'}
              </h3>
              <p className="text-gray-500">
                {filters.search || filters.status || filters.activity_level
                  ? '請調整搜尋條件或篩選器重新查詢'
                  : '目前還沒有供應商加入平台'}
              </p>
              {(filters.search || filters.status || filters.activity_level) && (
                <Button variant="outline" className="mt-4" onClick={resetFilters}>
                  清除篩選條件
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
