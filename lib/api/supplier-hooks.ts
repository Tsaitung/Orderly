/**
 * React hooks for Supplier Service API integration
 * Provides clean interface for components to interact with supplier data
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import {
  SupplierProfile,
  SupplierProfileCreateRequest,
  SupplierProfileUpdateRequest,
  SupplierDashboard,
  SupplierDashboardMetrics,
  SupplierCustomer,
  SupplierCustomerCreateRequest,
  SupplierCustomerListResponse,
  OnboardingProgress,
  SupplierFilterParams,
  CustomerFilterParams,
  SupplierOrder,
  OrderStats,
  OrderFilterParams,
  OrderListResponse,
  OrderStatus,
  ApiError,
} from './supplier-types'
import { supplierService, isSupplierApiError, getSupplierErrorMessage } from './supplier-service'

// ============================================================================
// Base Hook Types
// ============================================================================

interface UseAsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  mutate: (newData: T | null) => void
}

interface UseAsyncMutation<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>
  data: TData | null
  loading: boolean
  error: string | null
  reset: () => void
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Generic async state hook with error handling
 */
function useAsyncState<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = [],
  immediate: boolean = true
): UseAsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(immediate)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await asyncFunction()
      setData(result)
    } catch (err) {
      const errorMessage = getSupplierErrorMessage(err)
      setError(errorMessage)
      console.error('Async operation failed:', err)
    } finally {
      setLoading(false)
    }
  }, dependencies)

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])

  const mutate = useCallback((newData: T | null) => {
    setData(newData)
  }, [])

  return {
    data,
    loading,
    error,
    refetch: execute,
    mutate,
  }
}

/**
 * Generic mutation hook with error handling and success notifications
 */
function useAsyncMutation<TData, TVariables>(
  mutationFunction: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: Error, variables: TVariables) => void
    successMessage?: string
    errorMessage?: string
  } = {}
): UseAsyncMutation<TData, TVariables> {
  const [data, setData] = useState<TData | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData> => {
      try {
        setLoading(true)
        setError(null)

        const result = await mutationFunction(variables)
        setData(result)

        if (options.successMessage) {
          toast.success(options.successMessage)
        }

        options.onSuccess?.(result, variables)
        return result
      } catch (err) {
        const errorMessage = options.errorMessage || getSupplierErrorMessage(err)
        setError(errorMessage)
        toast.error(errorMessage)
        options.onError?.(err as Error, variables)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [mutationFunction, options]
  )

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return {
    mutate,
    data,
    loading,
    error,
    reset,
  }
}

// ============================================================================
// Supplier Profile Hooks
// ============================================================================

/**
 * Hook to fetch and manage supplier profile
 */
export function useSupplierProfile(organizationId?: string) {
  const result = useAsyncState(
    () => supplierService.getProfile(organizationId!),
    [organizationId],
    !!organizationId
  )

  const updateProfile = useAsyncMutation(
    (data: SupplierProfileUpdateRequest) => supplierService.updateProfile(organizationId!, data),
    {
      successMessage: '供應商資料更新成功',
      onSuccess: updatedProfile => {
        result.mutate(updatedProfile)
      },
    }
  )

  const createProfile = useAsyncMutation(
    (data: SupplierProfileCreateRequest) => supplierService.createProfile(data),
    {
      successMessage: '供應商資料建立成功',
      onSuccess: newProfile => {
        result.mutate(newProfile)
      },
    }
  )

  return {
    ...result,
    updateProfile: updateProfile.mutate,
    createProfile: createProfile.mutate,
    isUpdating: updateProfile.loading,
    isCreating: createProfile.loading,
    updateError: updateProfile.error,
    createError: createProfile.error,
  }
}

// ============================================================================
// Dashboard Hooks
// ============================================================================

/**
 * Hook to fetch supplier dashboard data
 */
export function useSupplierDashboard(organizationId?: string) {
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30 seconds

  const dashboard = useAsyncState(
    () => supplierService.getDashboard(organizationId!),
    [organizationId],
    !!organizationId
  )

  const metrics = useAsyncState(
    () => supplierService.getMetrics(organizationId!),
    [organizationId],
    !!organizationId
  )

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !organizationId) return

    const interval = setInterval(() => {
      metrics.refetch()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, organizationId, metrics.refetch])

  const refreshMetrics = useCallback(async () => {
    await Promise.all([dashboard.refetch(), metrics.refetch()])
  }, [dashboard.refetch, metrics.refetch])

  return {
    dashboard: dashboard.data,
    metrics: metrics.data,
    loading: dashboard.loading || metrics.loading,
    error: dashboard.error || metrics.error,
    refreshMetrics,
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
  }
}

// ============================================================================
// Customer Management Hooks
// ============================================================================

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

  const customers = useAsyncState(
    () => supplierService.getCustomers(organizationId!, params),
    [organizationId, params],
    !!organizationId
  )

  const addCustomer = useAsyncMutation(
    (data: SupplierCustomerCreateRequest) => supplierService.addCustomer(organizationId!, data),
    {
      successMessage: '客戶關係建立成功',
      onSuccess: () => {
        customers.refetch()
      },
    }
  )

  const updateCustomer = useAsyncMutation(
    ({ customerId, data }: { customerId: string; data: Partial<SupplierCustomerCreateRequest> }) =>
      supplierService.updateCustomer(organizationId!, customerId, data),
    {
      successMessage: '客戶關係更新成功',
      onSuccess: () => {
        customers.refetch()
      },
    }
  )

  const removeCustomer = useAsyncMutation(
    (customerId: string) => supplierService.removeCustomer(organizationId!, customerId),
    {
      successMessage: '客戶關係移除成功',
      onSuccess: () => {
        customers.refetch()
      },
    }
  )

  const bulkUpdateCustomers = useAsyncMutation(
    ({
      customerIds,
      data,
    }: {
      customerIds: string[]
      data: Partial<SupplierCustomerCreateRequest>
    }) => supplierService.bulkUpdateCustomers(organizationId!, customerIds, data),
    {
      successMessage: '批量更新成功',
      onSuccess: () => {
        customers.refetch()
      },
    }
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
      try {
        const blob = await supplierService.exportCustomers(organizationId!, format)
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `customers.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('客戶資料匯出成功')
      } catch (error) {
        toast.error('匯出失敗')
      }
    },
    [organizationId]
  )

  return {
    customers: customers.data?.customers || [],
    pagination: customers.data
      ? {
          total_count: customers.data.total_count,
          page: customers.data.page,
          page_size: customers.data.page_size,
          total_pages: customers.data.total_pages,
          has_next: customers.data.has_next,
          has_previous: customers.data.has_previous,
        }
      : null,
    loading: customers.loading,
    error: customers.error,
    refetch: customers.refetch,

    // Actions
    addCustomer: addCustomer.mutate,
    updateCustomer: updateCustomer.mutate,
    removeCustomer: removeCustomer.mutate,
    bulkUpdateCustomers: bulkUpdateCustomers.mutate,
    exportCustomers,

    // Loading states
    isAdding: addCustomer.loading,
    isUpdating: updateCustomer.loading,
    isRemoving: removeCustomer.loading,
    isBulkUpdating: bulkUpdateCustomers.loading,

    // Pagination
    params,
    goToPage,
    changePageSize,
    updateFilters,
    resetFilters,
  }
}

// ============================================================================
// Onboarding Hooks
// ============================================================================

/**
 * Hook to manage supplier onboarding progress
 */
export function useSupplierOnboarding(organizationId?: string) {
  const onboarding = useAsyncState(
    () => supplierService.getOnboardingProgress(organizationId!),
    [organizationId],
    !!organizationId
  )

  const updateStep = useAsyncMutation(
    ({ stepName, data }: { stepName: string; data: any }) =>
      supplierService.updateOnboardingStep(organizationId!, stepName, data),
    {
      successMessage: '步驟更新成功',
      onSuccess: updatedProgress => {
        onboarding.mutate(updatedProgress)
      },
    }
  )

  const completeStep = useAsyncMutation(
    (stepName: string) => supplierService.completeOnboardingStep(organizationId!, stepName),
    {
      successMessage: '步驟完成',
      onSuccess: updatedProgress => {
        onboarding.mutate(updatedProgress)
      },
    }
  )

  const submitForReview = useAsyncMutation(
    () => supplierService.submitOnboardingForReview(organizationId!),
    {
      successMessage: '已提交審核',
      onSuccess: updatedProgress => {
        onboarding.mutate(updatedProgress)
      },
    }
  )

  // Helper computed values
  const completedSteps = useMemo(() => {
    if (!onboarding.data) return 0
    const progress = onboarding.data
    return [
      progress.step_company_info,
      progress.step_business_documents,
      progress.step_delivery_setup,
      progress.step_product_categories,
      progress.step_verification,
    ].filter(Boolean).length
  }, [onboarding.data])

  const nextIncompleteStep = useMemo(() => {
    if (!onboarding.data) return null
    const progress = onboarding.data

    if (!progress.step_company_info) return 'company_info'
    if (!progress.step_business_documents) return 'business_documents'
    if (!progress.step_delivery_setup) return 'delivery_setup'
    if (!progress.step_product_categories) return 'product_categories'
    if (!progress.step_verification) return 'verification'

    return null
  }, [onboarding.data])

  const canSubmitForReview = useMemo(() => {
    return completedSteps >= 4 && !onboarding.data?.is_completed
  }, [completedSteps, onboarding.data?.is_completed])

  return {
    onboarding: onboarding.data,
    loading: onboarding.loading,
    error: onboarding.error,
    refetch: onboarding.refetch,

    // Actions
    updateStep: updateStep.mutate,
    completeStep: completeStep.mutate,
    submitForReview: submitForReview.mutate,

    // Loading states
    isUpdatingStep: updateStep.loading,
    isCompletingStep: completeStep.loading,
    isSubmitting: submitForReview.loading,

    // Computed values
    completedSteps,
    totalSteps: 5,
    completionPercentage: Math.round((completedSteps / 5) * 100),
    nextIncompleteStep,
    canSubmitForReview,
    isCompleted: onboarding.data?.is_completed || false,
  }
}

// ============================================================================
// Order Management Hooks
// ============================================================================

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

  const orders = useAsyncState(
    () => supplierService.getOrders(organizationId!, params),
    [organizationId, params],
    !!organizationId
  )

  const stats = useAsyncState(
    () => supplierService.getOrderStats(organizationId!),
    [organizationId],
    !!organizationId
  )

  // Individual order operations
  const updateOrderStatus = useAsyncMutation(
    ({ orderId, status, notes }: { orderId: string; status: OrderStatus; notes?: string }) =>
      supplierService.updateOrderStatus(organizationId!, orderId, status, notes),
    {
      successMessage: '訂單狀態更新成功',
      onSuccess: () => {
        orders.refetch()
        stats.refetch()
      },
    }
  )

  // Bulk operations
  const bulkUpdateOrderStatus = useAsyncMutation(
    ({ orderIds, status, notes }: { orderIds: string[]; status: OrderStatus; notes?: string }) =>
      supplierService.bulkUpdateOrderStatus(organizationId!, orderIds, status, notes),
    {
      successMessage: '批量更新成功',
      onSuccess: () => {
        orders.refetch()
        stats.refetch()
      },
    }
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
      try {
        const blob = await supplierService.exportOrders(organizationId!, format, params)
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `orders.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('訂單資料匯出成功')
      } catch (error) {
        toast.error('匯出失敗')
      }
    },
    [organizationId, params]
  )

  // Computed values for quick stats
  const quickStats = useMemo(() => {
    if (!orders.data?.orders) return null

    const orderList = orders.data.orders
    return {
      pending: orderList.filter(o => o.status === 'pending').length,
      confirmed: orderList.filter(o => o.status === 'confirmed').length,
      preparing: orderList.filter(o => o.status === 'preparing').length,
      in_transit: orderList.filter(o => o.status === 'in_transit').length,
      delivered: orderList.filter(o => o.status === 'delivered').length,
      cancelled: orderList.filter(o => o.status === 'cancelled').length,
      disputed: orderList.filter(o => o.status === 'disputed').length,
    }
  }, [orders.data?.orders])

  return {
    orders: orders.data?.orders || [],
    pagination: orders.data
      ? {
          total_count: orders.data.total_count,
          page: orders.data.page,
          page_size: orders.data.page_size,
          total_pages: orders.data.total_pages,
          has_next: orders.data.has_next,
          has_previous: orders.data.has_previous,
        }
      : null,
    stats: stats.data,
    quickStats,
    loading: orders.loading,
    statsLoading: stats.loading,
    error: orders.error || stats.error,
    refetch: orders.refetch,
    refetchStats: stats.refetch,

    // Actions
    updateOrderStatus: updateOrderStatus.mutate,
    bulkUpdateOrderStatus: bulkUpdateOrderStatus.mutate,
    exportOrders,

    // Loading states
    isUpdatingStatus: updateOrderStatus.loading,
    isBulkUpdating: bulkUpdateOrderStatus.loading,

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
  const order = useAsyncState(
    () => supplierService.getOrder(organizationId!, orderId!),
    [organizationId, orderId],
    !!(organizationId && orderId)
  )

  const updateStatus = useAsyncMutation(
    ({ status, notes }: { status: OrderStatus; notes?: string }) =>
      supplierService.updateOrderStatus(organizationId!, orderId!, status, notes),
    {
      successMessage: '訂單狀態更新成功',
      onSuccess: updatedOrder => {
        order.mutate(updatedOrder)
      },
    }
  )

  return {
    order: order.data,
    loading: order.loading,
    error: order.error,
    refetch: order.refetch,
    updateStatus: updateStatus.mutate,
    isUpdating: updateStatus.loading,
    updateError: updateStatus.error,
  }
}

// ============================================================================
// Product Management Hooks
// ============================================================================

/**
 * Hook for supplier product management (placeholder for future implementation)
 */
export function useSupplierProducts(organizationId?: string) {
  // This will be implemented when product service is ready
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Placeholder functionality - to be replaced with real API calls
  const refetch = useCallback(async () => {
    // TODO: Implement when product service endpoints are available
    console.log('Product management not yet implemented')
  }, [])

  const addProduct = useCallback(async (productData: any) => {
    // TODO: Implement product creation
    console.log('Add product not yet implemented')
  }, [])

  const updateProduct = useCallback(async (productId: string, productData: any) => {
    // TODO: Implement product update
    console.log('Update product not yet implemented')
  }, [])

  const removeProduct = useCallback(async (productId: string) => {
    // TODO: Implement product removal
    console.log('Remove product not yet implemented')
  }, [])

  return {
    products,
    loading,
    error,
    refetch,
    addProduct,
    updateProduct,
    removeProduct,
    isAdding: false,
    isUpdating: false,
    isRemoving: false,
  }
}

// ============================================================================
// Finance & Analytics Hooks
// ============================================================================

/**
 * Hook for supplier financial data (placeholder for future implementation)
 */
export function useSupplierFinance(organizationId?: string) {
  // This will be implemented when finance service is ready
  const [financeData, setFinanceData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Placeholder functionality - to be replaced with real API calls
  const refetch = useCallback(async () => {
    // TODO: Implement when finance service endpoints are available
    console.log('Finance management not yet implemented')
  }, [])

  const generateReport = useCallback(async (reportType: string) => {
    // TODO: Implement report generation
    console.log('Report generation not yet implemented')
  }, [])

  return {
    financeData,
    loading,
    error,
    refetch,
    generateReport,
    isGeneratingReport: false,
  }
}

// ============================================================================
// File Upload Hook
// ============================================================================

/**
 * Hook for file uploads
 */
export function useFileUpload() {
  const upload = useAsyncMutation(
    ({ file, type }: { file: File; type: 'document' | 'image' }) =>
      supplierService.uploadFile(file, type),
    {
      successMessage: '檔案上傳成功',
    }
  )

  const uploadFile = useCallback(
    async (file: File, type: 'document' | 'image' = 'document') => {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('檔案大小不能超過 10MB')
        return null
      }

      // Validate file type
      const allowedTypes =
        type === 'image'
          ? ['image/jpeg', 'image/png', 'image/webp']
          : [
              'application/pdf',
              'image/jpeg',
              'image/png',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ]

      if (!allowedTypes.includes(file.type)) {
        toast.error('不支援的檔案格式')
        return null
      }

      return upload.mutate({ file, type })
    },
    [upload.mutate]
  )

  return {
    uploadFile,
    uploading: upload.loading,
    error: upload.error,
    uploadedFile: upload.data,
  }
}

// ============================================================================
// Combined Hooks
// ============================================================================

/**
 * Comprehensive hook that combines all supplier data
 */
export function useSupplierData(organizationId?: string) {
  const profile = useSupplierProfile(organizationId)
  const dashboard = useSupplierDashboard(organizationId)
  const customers = useSupplierCustomers(organizationId)
  const onboarding = useSupplierOnboarding(organizationId)
  const orders = useSupplierOrders(organizationId)
  const products = useSupplierProducts(organizationId)
  const finance = useSupplierFinance(organizationId)

  const isLoading =
    profile.loading ||
    dashboard.loading ||
    customers.loading ||
    onboarding.loading ||
    orders.loading ||
    products.loading ||
    finance.loading
  const hasError = !!(
    profile.error ||
    dashboard.error ||
    customers.error ||
    onboarding.error ||
    orders.error ||
    products.error ||
    finance.error
  )

  const refetchAll = useCallback(async () => {
    await Promise.all([
      profile.refetch(),
      dashboard.refreshMetrics(),
      customers.refetch(),
      onboarding.refetch(),
      orders.refetch(),
      products.refetch(),
      finance.refetch(),
    ])
  }, [
    profile.refetch,
    dashboard.refreshMetrics,
    customers.refetch,
    onboarding.refetch,
    orders.refetch,
    products.refetch,
    finance.refetch,
  ])

  return {
    profile,
    dashboard,
    customers,
    onboarding,
    orders,
    products,
    finance,
    isLoading,
    hasError,
    refetchAll,
  }
}
