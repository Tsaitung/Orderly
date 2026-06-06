/**
 * Supplier Customer Management Hooks
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { supplierCustomerApi } from '../api'
import { getErrorMessage } from '../errors'
import { downloadBlob } from '../utils'
import type {
  SupplierCustomer,
  SupplierCustomerCreateRequest,
  SupplierCustomerListResponse,
  CustomerFilterParams,
} from '../types'

/**
 * Hook to manage supplier customers with pagination
 */
export function useSupplierCustomers(
  organizationId?: string,
  initialParams: CustomerFilterParams = {}
) {
  const [params, setParams] = useState<CustomerFilterParams>({
    page: 1,
    page_size: 20,
    ...initialParams,
  })

  const [data, setData] = useState<SupplierCustomerListResponse | null>(null)
  const [loading, setLoading] = useState(!!organizationId)
  const [error, setError] = useState<string | null>(null)

  const [isAdding, setIsAdding] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  const fetchCustomers = useCallback(async () => {
    if (!organizationId) {return}

    setLoading(true)
    setError(null)
    try {
      const result = await supplierCustomerApi.getCustomers(organizationId, params)
      setData(result)
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      console.error('Failed to fetch customers:', err)
    } finally {
      setLoading(false)
    }
  }, [organizationId, params])

  useEffect(() => {
    if (organizationId) {
      fetchCustomers()
    }
  }, [organizationId, fetchCustomers])

  const addCustomer = useCallback(
    async (customerData: SupplierCustomerCreateRequest) => {
      if (!organizationId) {return}

      setIsAdding(true)
      try {
        await supplierCustomerApi.addCustomer(organizationId, customerData)
        toast.success('客戶關係建立成功')
        await fetchCustomers()
      } catch (err) {
        const errorMessage = getErrorMessage(err)
        toast.error(errorMessage)
        throw err
      } finally {
        setIsAdding(false)
      }
    },
    [organizationId, fetchCustomers]
  )

  const updateCustomer = useCallback(
    async ({ customerId, data: updateData }: { customerId: string; data: Partial<SupplierCustomerCreateRequest> }) => {
      if (!organizationId) {return}

      setIsUpdating(true)
      try {
        await supplierCustomerApi.updateCustomer(organizationId, customerId, updateData)
        toast.success('客戶關係更新成功')
        await fetchCustomers()
      } catch (err) {
        const errorMessage = getErrorMessage(err)
        toast.error(errorMessage)
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    [organizationId, fetchCustomers]
  )

  const removeCustomer = useCallback(
    async (customerId: string) => {
      if (!organizationId) {return}

      setIsRemoving(true)
      try {
        await supplierCustomerApi.removeCustomer(organizationId, customerId)
        toast.success('客戶關係移除成功')
        await fetchCustomers()
      } catch (err) {
        const errorMessage = getErrorMessage(err)
        toast.error(errorMessage)
        throw err
      } finally {
        setIsRemoving(false)
      }
    },
    [organizationId, fetchCustomers]
  )

  const bulkUpdateCustomers = useCallback(
    async ({
      customerIds,
      data: updateData,
    }: {
      customerIds: string[]
      data: Partial<SupplierCustomerCreateRequest>
    }) => {
      if (!organizationId) {return}

      setIsBulkUpdating(true)
      try {
        await supplierCustomerApi.bulkUpdateCustomers(organizationId, customerIds, updateData)
        toast.success('批量更新成功')
        await fetchCustomers()
      } catch (err) {
        const errorMessage = getErrorMessage(err)
        toast.error(errorMessage)
        throw err
      } finally {
        setIsBulkUpdating(false)
      }
    },
    [organizationId, fetchCustomers]
  )

  // Pagination helpers
  const goToPage = useCallback((page: number) => {
    setParams(prev => ({ ...prev, page }))
  }, [])

  const changePageSize = useCallback((pageSize: number) => {
    setParams(prev => ({ ...prev, page_size: pageSize, page: 1 }))
  }, [])

  const updateFilters = useCallback((newFilters: Partial<CustomerFilterParams>) => {
    setParams(prev => ({ ...prev, ...newFilters, page: 1 }))
  }, [])

  const resetFilters = useCallback(() => {
    setParams({ page: 1, page_size: 20 })
  }, [])

  // Export functionality
  const exportCustomers = useCallback(
    async (format: 'csv' | 'xlsx' = 'csv') => {
      if (!organizationId) {return}

      try {
        const blob = await supplierCustomerApi.exportCustomers(organizationId, format)
        downloadBlob(blob, `customers.${format}`)
        toast.success('客戶資料匯出成功')
      } catch (err) {
        toast.error('匯出失敗')
      }
    },
    [organizationId]
  )

  return {
    customers: data?.customers || [],
    pagination: data
      ? {
          total_count: data.total_count,
          page: data.page,
          page_size: data.page_size,
          total_pages: data.total_pages,
          has_next: data.has_next,
          has_previous: data.has_previous,
        }
      : null,
    loading,
    error,
    refetch: fetchCustomers,

    // Actions
    addCustomer,
    updateCustomer,
    removeCustomer,
    bulkUpdateCustomers,
    exportCustomers,

    // Loading states
    isAdding,
    isUpdating,
    isRemoving,
    isBulkUpdating,

    // Pagination
    params,
    goToPage,
    changePageSize,
    updateFilters,
    resetFilters,
  }
}
