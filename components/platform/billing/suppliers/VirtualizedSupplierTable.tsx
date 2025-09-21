'use client'

import { useRef, useMemo, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { SupplierBillingData, PaginationState, RatingTier } from '@/types/platform-billing'
import { usePlatformBillingStore } from '@/stores/platform-billing-store'
import { cn } from '@/lib/utils'
import { 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  Edit,
  MoreHorizontal,
  Award,
  DollarSign,
  TrendingUp,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface VirtualizedSupplierTableProps {
  data: SupplierBillingData[]
  loading?: boolean
  pagination: PaginationState
  sortConfig: { key: string; direction: 'asc' | 'desc' }
  onPaginationChange: (pagination: Partial<PaginationState>) => void
}

const RATING_COLORS: Record<RatingTier, string> = {
  'Bronze': 'bg-orange-100 text-orange-800',
  'Silver': 'bg-gray-100 text-gray-800',
  'Gold': 'bg-yellow-100 text-yellow-800',
  'Platinum': 'bg-purple-100 text-purple-800'
}

const PAYMENT_STATUS_COLORS = {
  'completed': 'bg-green-100 text-green-800',
  'pending': 'bg-yellow-100 text-yellow-800',
  'processing': 'bg-blue-100 text-blue-800',
  'failed': 'bg-red-100 text-red-800',
  'overdue': 'bg-red-100 text-red-800'
}

export function VirtualizedSupplierTable({
  data,
  loading,
  pagination,
  sortConfig,
  onPaginationChange
}: VirtualizedSupplierTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierBillingData | null>(null)
  
  const {
    actions: { 
      toggleSupplierSelection, 
      selectAllSuppliers, 
      clearSupplierSelection,
      updateSortConfig,
      loadSupplierDetail
    },
    suppliers: { selectedIds }
  } = usePlatformBillingStore()

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 72, // 表格行高度
    overscan: 5
  })

  const columns = useMemo(() => [
    {
      key: 'select',
      title: '',
      width: '48px',
      render: (supplier: SupplierBillingData) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(supplier.id)}
          onChange={() => toggleSupplierSelection(supplier.id)}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
      )
    },
    {
      key: 'supplierName',
      title: '供應商',
      sortable: true,
      width: '280px',
      render: (supplier: SupplierBillingData) => (
        <div className="flex items-center space-x-3">
          <div className={cn(
            'w-2 h-2 rounded-full',
            supplier.contractStatus === 'active' ? 'bg-green-400' : 
            supplier.contractStatus === 'suspended' ? 'bg-yellow-400' : 'bg-red-400'
          )} />
          <div>
            <div className="font-medium text-gray-900">{supplier.supplierName}</div>
            <div className="text-sm text-gray-500">{supplier.businessNumber}</div>
          </div>
        </div>
      )
    },
    {
      key: 'rating',
      title: '評級',
      sortable: true,
      width: '100px',
      render: (supplier: SupplierBillingData) => (
        <div className="flex items-center space-x-1">
          <Award className="h-3 w-3 text-gray-400" />
          <span className={cn(
            'px-2 py-1 text-xs font-medium rounded-full',
            RATING_COLORS[supplier.rating]
          )}>
            {supplier.rating}
          </span>
        </div>
      )
    },
    {
      key: 'monthlyGMV',
      title: '月度 GMV',
      sortable: true,
      width: '140px',
      render: (supplier: SupplierBillingData) => (
        <div>
          <div className="font-medium text-gray-900">
            NT$ {supplier.monthlyGMV.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">
            T{supplier.currentTier} 層級
          </div>
        </div>
      )
    },
    {
      key: 'effectiveRate',
      title: '實際費率',
      sortable: true,
      width: '120px',
      render: (supplier: SupplierBillingData) => (
        <div className="text-center">
          <div className="font-medium text-gray-900">
            {supplier.effectiveRate.toFixed(2)}%
          </div>
          {supplier.ratingDiscount > 0 && (
            <div className="text-xs text-green-600">
              -{supplier.ratingDiscount.toFixed(1)}% 折扣
            </div>
          )}
        </div>
      )
    },
    {
      key: 'paymentStatus',
      title: '付款狀態',
      sortable: true,
      width: '120px',
      render: (supplier: SupplierBillingData) => (
        <span className={cn(
          'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full',
          PAYMENT_STATUS_COLORS[supplier.paymentStatus]
        )}>
          {supplier.paymentStatus === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
          {supplier.paymentStatus === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
          {supplier.paymentStatus === 'pending' && <Clock className="h-3 w-3 mr-1" />}
          {getPaymentStatusText(supplier.paymentStatus)}
        </span>
      )
    },
    {
      key: 'currentMonthCommission',
      title: '本月佣金',
      sortable: true,
      width: '140px',
      render: (supplier: SupplierBillingData) => (
        <div className="text-right">
          <div className="font-medium text-gray-900">
            NT$ {supplier.currentMonthCommission.toLocaleString()}
          </div>
          {supplier.outstandingAmount > 0 && (
            <div className="text-xs text-red-600">
              未付：{supplier.outstandingAmount.toLocaleString()}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      title: '操作',
      width: '100px',
      render: (supplier: SupplierBillingData) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleViewDetails(supplier)}
            className="text-blue-600 hover:text-blue-700"
            title="查看詳情"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEdit(supplier)}
            className="text-gray-600 hover:text-gray-700"
            title="編輯"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            className="text-gray-600 hover:text-gray-700"
            title="更多操作"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ], [selectedIds, toggleSupplierSelection])

  function getPaymentStatusText(status: string) {
    switch (status) {
      case 'completed': return '已完成'
      case 'pending': return '待付款'
      case 'processing': return '處理中'
      case 'failed': return '失敗'
      case 'overdue': return '逾期'
      default: return status
    }
  }

  const handleSort = (key: string) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    updateSortConfig(key, direction)
  }

  const handleViewDetails = async (supplier: SupplierBillingData) => {
    setSelectedSupplier(supplier)
    await loadSupplierDetail(supplier.id)
  }

  const handleEdit = (supplier: SupplierBillingData) => {
    // TODO: 實現編輯功能
    console.log('Edit supplier:', supplier)
  }

  const handleSelectAll = () => {
    if (selectedIds.length === data.length) {
      clearSupplierSelection()
    } else {
      selectAllSuppliers()
    }
  }

  const virtualItems = rowVirtualizer.getVirtualItems()

  if (loading && data.length === 0) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-[600px] overflow-hidden">
      {/* 表格標題 */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex">
          {columns.map((column) => (
            <div
              key={column.key}
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center space-x-1"
              style={{ width: column.width }}
            >
              {column.key === 'select' ? (
                <input
                  type="checkbox"
                  checked={selectedIds.length === data.length && data.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              ) : (
                <>
                  <span>{column.title}</span>
                  {column.sortable && (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="ml-1 flex flex-col"
                    >
                      <ChevronUp 
                        className={cn(
                          'h-3 w-3',
                          sortConfig.key === column.key && sortConfig.direction === 'asc'
                            ? 'text-primary-600' : 'text-gray-400'
                        )}
                      />
                      <ChevronDown 
                        className={cn(
                          'h-3 w-3 -mt-1',
                          sortConfig.key === column.key && sortConfig.direction === 'desc'
                            ? 'text-primary-600' : 'text-gray-400'
                        )}
                      />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 虛擬化表格內容 */}
      <div
        ref={tableContainerRef}
        className="h-[480px] overflow-auto"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {virtualItems.map((virtualRow) => {
            const supplier = data[virtualRow.index]
            const isSelected = selectedIds.includes(supplier.id)
            
            return (
              <div
                key={virtualRow.key}
                className={cn(
                  'absolute top-0 left-0 w-full flex items-center border-b border-gray-200 hover:bg-gray-50',
                  isSelected && 'bg-primary-50'
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className="px-4 py-4 whitespace-nowrap"
                    style={{ width: column.width }}
                  >
                    {column.render(supplier)}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* 分頁控制 */}
      <div className="px-6 py-3 bg-white border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>每頁顯示</span>
          <select
            value={pagination.limit}
            onChange={(e) => onPaginationChange({ 
              limit: Number(e.target.value), 
              page: 1 
            })}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>共 {pagination.total} 筆</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPaginationChange({ page: pagination.page - 1 })}
            disabled={!pagination.hasPrev}
            className="p-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-sm text-gray-600">
            第 {pagination.page} 頁，共 {Math.ceil(pagination.total / pagination.limit)} 頁
          </span>

          <button
            onClick={() => onPaginationChange({ page: pagination.page + 1 })}
            disabled={!pagination.hasNext}
            className="p-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 供應商詳情彈窗 */}
      {selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedSupplier.supplierName}
                  </h3>
                  <p className="text-gray-500">{selectedSupplier.businessNumber}</p>
                </div>
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">基本信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">評級</span>
                      <span className="font-medium">{selectedSupplier.rating}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">層級</span>
                      <span className="font-medium">T{selectedSupplier.currentTier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">加入時間</span>
                      <span className="font-medium">
                        {selectedSupplier.joinedDate.toLocaleDateString('zh-TW')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">業績表現</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">月度 GMV</span>
                      <span className="font-medium">
                        NT$ {selectedSupplier.monthlyGMV.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">年度 GMV</span>
                      <span className="font-medium">
                        NT$ {selectedSupplier.annualGMV.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">訂單數量</span>
                      <span className="font-medium">
                        {selectedSupplier.orderCount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">計費信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">基礎費率</span>
                      <span className="font-medium">
                        {selectedSupplier.baseRate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">實際費率</span>
                      <span className="font-medium">
                        {selectedSupplier.effectiveRate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">本月佣金</span>
                      <span className="font-medium">
                        NT$ {selectedSupplier.currentMonthCommission.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}