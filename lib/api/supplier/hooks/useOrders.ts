/**
 * Supplier Order Management Hooks
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import { supplierOrderApi } from '../api'
import { getErrorMessage } from '../errors'
import { downloadBlob } from '../utils'
import type {
  SupplierOrder,
  OrderStats,
  OrderFilterParams,
  OrderListResponse,
  OrderStatus,
} from '../types'

/**
 * Hook to manage supplier orders with filtering and pagination
 */
export function useSupplierOrders(organizationId?: string, initialParams: OrderFilterParams = {}) {
  const [params, setParams] = useState<OrderFilterParams>({
    page: 1,
    page_size: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
    ...initialParams,
  })

  const [ordersData, setOrdersData] = useState<OrderListResponse | null>(null)
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [loading, setLoading] = useState(!!organizationId)
  const [statsLoading, setStatsLoading] = useState(!!organizationId)
  const [error, setError] = useState<string | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  const fetchOrders = useCallback(async () => {
    if (!organizationId) {return}

    setLoading(true)
    setError(null)
    try {
      const result = await supplierOrderApi.getOrders(organizationId, params)
      setOrdersData(result)
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoading(false)
    }
  }, [organizationId, params])

  const fetchStats = useCallback(async () => {
    if (!organizationId) {return}

    setStatsLoading(true)
    setStatsError(null)
    try {
      const result = await supplierOrderApi.getOrderStats(organizationId)
      setStats(result)
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setStatsError(errorMessage)
      console.error('Failed to fetch order stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    if (organizationId) {
      fetchOrders()
      fetchStats()
    }
  }, [organizationId, fetchOrders, fetchStats])

  // Individual order operations
  const updateOrderStatus = useCallback(
    async ({ orderId, status, notes }: { orderId: string; status: OrderStatus; notes?: string }) => {
      if (!organizationId) {return}

      setIsUpdatingStatus(true)
      try {
        await supplierOrderApi.updateOrderStatus(organizationId, orderId, status, notes)
        toast.success('訂單狀態更新成功')
        await Promise.all([fetchOrders(), fetchStats()])
      } catch (err) {
        const errorMessage = getErrorMessage(err)
        toast.error(errorMessage)
        throw err
      } finally {
        setIsUpdatingStatus(false)
      }
    },
    [organizationId, fetchOrders, fetchStats]
  )

  // Bulk operations
  const bulkUpdateOrderStatus = useCallback(
    async ({ orderIds, status, notes }: { orderIds: string[]; status: OrderStatus; notes?: string }) => {
      if (!organizationId) {return}

      setIsBulkUpdating(true)
      try {
        await supplierOrderApi.bulkUpdateOrderStatus(organizationId, orderIds, status, notes)
        toast.success('批量更新成功')
        await Promise.all([fetchOrders(), fetchStats()])
      } catch (err) {
        const errorMessage = getErrorMessage(err)
        toast.error(errorMessage)
        throw err
      } finally {
        setIsBulkUpdating(false)
      }
    },
    [organizationId, fetchOrders, fetchStats]
  )

  // Filtering helpers
  const updateFilters = useCallback((newFilters: Partial<OrderFilterParams>) => {
    setParams(prev => ({ ...prev, ...newFilters, page: 1 }))
  }, [])

  const resetFilters = useCallback(() => {
    setParams({
      page: 1,
      page_size: 20,
      sort_by: 'created_at',
      sort_order: 'desc',
    })
  }, [])

  // Pagination helpers
  const goToPage = useCallback((page: number) => {
    setParams(prev => ({ ...prev, page }))
  }, [])

  const changePageSize = useCallback((pageSize: number) => {
    setParams(prev => ({ ...prev, page_size: pageSize, page: 1 }))
  }, [])

  // Export functionality
  const exportOrders = useCallback(
    async (format: 'csv' | 'xlsx' = 'csv') => {
      if (!organizationId) {return}

      try {
        const blob = await supplierOrderApi.exportOrders(organizationId, format, params)
        downloadBlob(blob, `orders.${format}`)
        toast.success('訂單資料匯出成功')
      } catch (err) {
        toast.error('匯出失敗')
      }
    },
    [organizationId, params]
  )

  // Computed values for quick stats
  const quickStats = useMemo(() => {
    if (!ordersData?.orders) {return null}

    const orderList = ordersData.orders
    return {
      pending: orderList.filter(o => o.status === 'pending').length,
      confirmed: orderList.filter(o => o.status === 'confirmed').length,
      preparing: orderList.filter(o => o.status === 'preparing').length,
      in_transit: orderList.filter(o => o.status === 'in_transit').length,
      delivered: orderList.filter(o => o.status === 'delivered').length,
      cancelled: orderList.filter(o => o.status === 'cancelled').length,
      disputed: orderList.filter(o => o.status === 'disputed').length,
    }
  }, [ordersData?.orders])

  return {
    orders: ordersData?.orders || [],
    pagination: ordersData
      ? {
          total_count: ordersData.total_count,
          page: ordersData.page,
          page_size: ordersData.page_size,
          total_pages: ordersData.total_pages,
          has_next: ordersData.has_next,
          has_previous: ordersData.has_previous,
        }
      : null,
    stats,
    quickStats,
    loading,
    statsLoading,
    error: error || statsError,
    refetch: fetchOrders,
    refetchStats: fetchStats,

    // Actions
    updateOrderStatus,
    bulkUpdateOrderStatus,
    exportOrders,

    // Loading states
    isUpdatingStatus,
    isBulkUpdating,

    // Filters and pagination
    params,
    updateFilters,
    resetFilters,
    goToPage,
    changePageSize,
  }
}

/**
 * Hook to get single order details
 */
export function useSupplierOrder(organizationId?: string, orderId?: string) {
  const [order, setOrder] = useState<SupplierOrder | null>(null)
  const [loading, setLoading] = useState(!!(organizationId && orderId))
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    if (!organizationId || !orderId) {return}

    setLoading(true)
    setError(null)
    try {
      const result = await supplierOrderApi.getOrder(organizationId, orderId)
      setOrder(result)
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      console.error('Failed to fetch order:', err)
    } finally {
      setLoading(false)
    }
  }, [organizationId, orderId])

  useEffect(() => {
    if (organizationId && orderId) {
      fetchOrder()
    }
  }, [organizationId, orderId, fetchOrder])

  const updateStatus = useCallback(
    async ({ status, notes }: { status: OrderStatus; notes?: string }) => {
      if (!organizationId || !orderId) {return}

      setIsUpdating(true)
      setUpdateError(null)
      try {
        const updatedOrder = await supplierOrderApi.updateOrderStatus(
          organizationId,
          orderId,
          status,
          notes
        )
        setOrder(updatedOrder)
        toast.success('訂單狀態更新成功')
        return updatedOrder
      } catch (err) {
        const errorMessage = getErrorMessage(err)
        setUpdateError(errorMessage)
        toast.error(errorMessage)
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    [organizationId, orderId]
  )

  return {
    order,
    loading,
    error,
    refetch: fetchOrder,
    updateStatus,
    isUpdating,
    updateError,
  }
}
