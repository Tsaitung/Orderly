/**
 * Unified Supplier API Layer
 *
 * Consolidates SupplierService and supplier-api.ts into a single API module
 */

import { http, buildQueryString } from '../http'
import { SupplierError, wrapError, SupplierErrorCode } from './errors'
import type {
  SupplierProfile,
  SupplierProfileCreateRequest,
  SupplierProfileUpdateRequest,
  SupplierDashboard,
  SupplierDashboardMetrics,
  SupplierCustomer,
  SupplierCustomerCreateRequest,
  SupplierCustomerListResponse,
  OnboardingProgress,
  OnboardingStepUpdateRequest,
  SupplierStatusUpdateRequest,
  SupplierListResponse,
  SupplierFilterParams,
  CustomerFilterParams,
  SupplierOrder,
  OrderStats,
  OrderFilterParams,
  OrderListResponse,
  OrderStatus,
} from './types'
import type {
  InvitationSendRequest,
  InvitationSendResponse,
  InvitationDetailResponse,
  SupplierOnboardingRequest,
  SupplierOnboardingResponse,
  OrganizationResponse,
  SupplierProfileUpdateRequest as OnboardingProfileUpdateRequest,
  InvitationListResponse,
  InvitationFilter,
  PaginationState,
} from '@orderly/types'

// API paths
const SUPPLIER_SERVICE_PATH = '/api/suppliers'
const USER_SERVICE_PATH = '/users'
const PRODUCT_SERVICE_PATH = '/products'

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') {return null}
  return localStorage.getItem('access_token')
}

/**
 * Build auth headers
 */
function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Make authenticated request with error wrapping
 */
async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await http.request<T>(path, {
      ...init,
      headers: { ...getAuthHeaders(), ...init?.headers },
    })
  } catch (error) {
    throw wrapError(error)
  }
}

// ============================================================================
// Supplier Profile API
// ============================================================================

export const supplierProfileApi = {
  /**
   * Get supplier profile by organization ID
   */
  async getProfile(organizationId: string): Promise<SupplierProfile> {
    return apiRequest<SupplierProfile>(`${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}`)
  },

  /**
   * Create new supplier profile
   */
  async createProfile(data: SupplierProfileCreateRequest): Promise<SupplierProfile> {
    return apiRequest<SupplierProfile>(`${SUPPLIER_SERVICE_PATH}/suppliers`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update supplier profile
   */
  async updateProfile(
    organizationId: string,
    data: SupplierProfileUpdateRequest
  ): Promise<SupplierProfile> {
    return apiRequest<SupplierProfile>(`${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * Delete supplier profile
   */
  async deleteProfile(organizationId: string): Promise<void> {
    return apiRequest<void>(`${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}`, {
      method: 'DELETE',
    })
  },

  /**
   * Update supplier status
   */
  async updateStatus(
    organizationId: string,
    data: SupplierStatusUpdateRequest
  ): Promise<SupplierProfile> {
    return apiRequest<SupplierProfile>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/status`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  },

  /**
   * Get list of suppliers with filtering
   */
  async getSuppliers(params: SupplierFilterParams = {}): Promise<SupplierListResponse> {
    return apiRequest<SupplierListResponse>(
      `${SUPPLIER_SERVICE_PATH}/suppliers${buildQueryString(params)}`
    )
  },
}

// ============================================================================
// Dashboard & Metrics API
// ============================================================================

export const supplierDashboardApi = {
  /**
   * Get supplier dashboard data
   */
  async getDashboard(organizationId: string): Promise<SupplierDashboard> {
    return apiRequest<SupplierDashboard>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/dashboard`
    )
  },

  /**
   * Get supplier metrics
   */
  async getMetrics(organizationId: string, period?: string): Promise<SupplierDashboardMetrics> {
    const queryParams = period ? `?period=${period}` : ''
    return apiRequest<SupplierDashboardMetrics>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/metrics${queryParams}`
    )
  },
}

// ============================================================================
// Customer Management API
// ============================================================================

export const supplierCustomerApi = {
  /**
   * Get customers with filtering
   */
  async getCustomers(
    organizationId: string,
    params: CustomerFilterParams = {}
  ): Promise<SupplierCustomerListResponse> {
    return apiRequest<SupplierCustomerListResponse>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/customers${buildQueryString(params)}`
    )
  },

  /**
   * Add new customer relationship
   */
  async addCustomer(
    organizationId: string,
    data: SupplierCustomerCreateRequest
  ): Promise<SupplierCustomer> {
    return apiRequest<SupplierCustomer>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/customers`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  },

  /**
   * Update customer relationship
   */
  async updateCustomer(
    organizationId: string,
    customerId: string,
    data: Partial<SupplierCustomerCreateRequest>
  ): Promise<SupplierCustomer> {
    return apiRequest<SupplierCustomer>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/customers/${customerId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    )
  },

  /**
   * Remove customer relationship
   */
  async removeCustomer(organizationId: string, customerId: string): Promise<void> {
    return apiRequest<void>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/customers/${customerId}`,
      {
        method: 'DELETE',
      }
    )
  },

  /**
   * Get specific customer relationship
   */
  async getCustomer(organizationId: string, customerId: string): Promise<SupplierCustomer> {
    return apiRequest<SupplierCustomer>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/customers/${customerId}`
    )
  },

  /**
   * Bulk update customers
   */
  async bulkUpdateCustomers(
    organizationId: string,
    customerIds: string[],
    data: Partial<SupplierCustomerCreateRequest>
  ): Promise<SupplierCustomer[]> {
    return apiRequest<SupplierCustomer[]>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/customers/bulk`,
      {
        method: 'PUT',
        body: JSON.stringify({ customer_ids: customerIds, ...data }),
      }
    )
  },

  /**
   * Export customers to CSV/XLSX
   */
  async exportCustomers(organizationId: string, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const response = await fetch(
      `/api/bff${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/customers/export?format=${format}`,
      { headers: getAuthHeaders() }
    )
    if (!response.ok) {
      throw new SupplierError('Export failed', response.status, SupplierErrorCode.EXPORT_ERROR)
    }
    return response.blob()
  },
}

// ============================================================================
// Onboarding Management API
// ============================================================================

export const supplierOnboardingApi = {
  /**
   * Get onboarding progress
   */
  async getProgress(organizationId: string): Promise<OnboardingProgress> {
    return apiRequest<OnboardingProgress>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/onboarding`
    )
  },

  /**
   * Update onboarding step
   */
  async updateStep(
    organizationId: string,
    stepName: string,
    data: OnboardingStepUpdateRequest
  ): Promise<OnboardingProgress> {
    return apiRequest<OnboardingProgress>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/onboarding/step`,
      {
        method: 'POST',
        body: JSON.stringify({ step_name: stepName, ...data }),
      }
    )
  },

  /**
   * Complete onboarding step
   */
  async completeStep(organizationId: string, stepName: string): Promise<OnboardingProgress> {
    return apiRequest<OnboardingProgress>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/onboarding/${stepName}/complete`,
      {
        method: 'POST',
      }
    )
  },

  /**
   * Submit onboarding for review
   */
  async submitForReview(organizationId: string): Promise<OnboardingProgress> {
    return apiRequest<OnboardingProgress>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/onboarding/submit`,
      {
        method: 'POST',
      }
    )
  },
}

// ============================================================================
// Order Management API
// ============================================================================

export const supplierOrderApi = {
  /**
   * Get orders with filtering
   */
  async getOrders(
    organizationId: string,
    params: OrderFilterParams = {}
  ): Promise<OrderListResponse> {
    return apiRequest<OrderListResponse>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/orders${buildQueryString(params)}`
    )
  },

  /**
   * Get order statistics
   */
  async getOrderStats(organizationId: string): Promise<OrderStats> {
    return apiRequest<OrderStats>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/orders/stats`
    )
  },

  /**
   * Get specific order details
   */
  async getOrder(organizationId: string, orderId: string): Promise<SupplierOrder> {
    return apiRequest<SupplierOrder>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/orders/${orderId}`
    )
  },

  /**
   * Update order status
   */
  async updateOrderStatus(
    organizationId: string,
    orderId: string,
    status: OrderStatus,
    notes?: string
  ): Promise<SupplierOrder> {
    return apiRequest<SupplierOrder>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/orders/${orderId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status, notes }),
      }
    )
  },

  /**
   * Bulk update order statuses
   */
  async bulkUpdateOrderStatus(
    organizationId: string,
    orderIds: string[],
    status: OrderStatus,
    notes?: string
  ): Promise<{ updated_count: number; orders: SupplierOrder[] }> {
    return apiRequest<{ updated_count: number; orders: SupplierOrder[] }>(
      `${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/orders/bulk-status`,
      {
        method: 'PUT',
        body: JSON.stringify({ order_ids: orderIds, status, notes }),
      }
    )
  },

  /**
   * Export orders to CSV/XLSX
   */
  async exportOrders(
    organizationId: string,
    format: 'csv' | 'xlsx' = 'csv',
    params: OrderFilterParams = {}
  ): Promise<Blob> {
    const qs = buildQueryString({ format, ...params })
    const response = await fetch(
      `/api/bff${SUPPLIER_SERVICE_PATH}/suppliers/${organizationId}/orders/export${qs}`,
      { headers: getAuthHeaders() }
    )
    if (!response.ok) {
      throw new SupplierError(
        `Export failed: ${response.statusText}`,
        response.status,
        SupplierErrorCode.EXPORT_ERROR
      )
    }
    return response.blob()
  },
}

// ============================================================================
// Invitation API
// ============================================================================

export const supplierInvitationApi = {
  /**
   * Send supplier invitation
   */
  async sendInvitation(request: InvitationSendRequest): Promise<InvitationSendResponse> {
    return apiRequest<InvitationSendResponse>(`${USER_SERVICE_PATH}/invitations/send`, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  /**
   * Verify invitation code
   */
  async verifyInvitation(code: string): Promise<InvitationDetailResponse> {
    return apiRequest<InvitationDetailResponse>(
      `${USER_SERVICE_PATH}/invitations/verify/${encodeURIComponent(code)}`
    )
  },

  /**
   * Get sent invitations (for restaurants)
   */
  async getSentInvitations(
    filters: InvitationFilter = {},
    pagination: Partial<PaginationState> = {}
  ): Promise<InvitationListResponse> {
    const params = new URLSearchParams()

    if (pagination.page) {params.append('page', pagination.page.toString())}
    if (pagination.pageSize) {params.append('page_size', pagination.pageSize.toString())}
    if (filters.status) {params.append('status_filter', filters.status)}

    const queryString = params.toString()
    const url = `${USER_SERVICE_PATH}/invitations/sent${queryString ? `?${queryString}` : ''}`

    return apiRequest<InvitationListResponse>(url)
  },

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string): Promise<{ message: string }> {
    return apiRequest(`${USER_SERVICE_PATH}/invitations/${invitationId}`, { method: 'DELETE' })
  },

  /**
   * Complete supplier onboarding (accept invitation)
   */
  async completeOnboarding(
    request: SupplierOnboardingRequest
  ): Promise<SupplierOnboardingResponse> {
    return apiRequest<SupplierOnboardingResponse>(`${USER_SERVICE_PATH}/invitations/accept`, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  /**
   * Get supplier profile (via invitation service)
   */
  async getInvitationProfile(): Promise<OrganizationResponse> {
    return apiRequest<OrganizationResponse>(`${USER_SERVICE_PATH}/invitations/profile`)
  },

  /**
   * Update supplier profile (via invitation service)
   */
  async updateInvitationProfile(
    request: OnboardingProfileUpdateRequest
  ): Promise<OrganizationResponse> {
    return apiRequest<OrganizationResponse>(`${USER_SERVICE_PATH}/invitations/profile`, {
      method: 'PUT',
      body: JSON.stringify(request),
    })
  },
}

// ============================================================================
// Product & SKU Management API
// ============================================================================

export const supplierProductApi = {
  /**
   * Get product categories
   */
  async getCategories(): Promise<unknown[]> {
    return apiRequest<unknown[]>(`${PRODUCT_SERVICE_PATH}/v1/categories`)
  },

  /**
   * Get supplier SKUs
   */
  async getSKUs(
    filters: {
      search?: string
      category?: string
      packagingType?: string
      qualityGrade?: string
      isActive?: boolean
    } = {},
    pagination: Partial<PaginationState> = {}
  ): Promise<unknown> {
    const params = new URLSearchParams()

    if (pagination.page) {params.append('page', pagination.page.toString())}
    if (pagination.pageSize) {params.append('page_size', pagination.pageSize.toString())}
    if (filters.search) {params.append('search', filters.search)}
    if (filters.category) {params.append('category', filters.category)}
    if (filters.packagingType) {params.append('packaging_type', filters.packagingType)}
    if (filters.qualityGrade) {params.append('quality_grade', filters.qualityGrade)}
    if (filters.isActive !== undefined) {params.append('is_active', filters.isActive.toString())}

    const queryString = params.toString()
    const url = `${PRODUCT_SERVICE_PATH}/v1/skus${queryString ? `?${queryString}` : ''}`

    return apiRequest(url)
  },

  /**
   * Create new SKU
   */
  async createSKU(skuData: unknown): Promise<unknown> {
    return apiRequest(`${PRODUCT_SERVICE_PATH}/v1/skus`, {
      method: 'POST',
      body: JSON.stringify(skuData),
    })
  },

  /**
   * Update SKU
   */
  async updateSKU(skuId: string, skuData: unknown): Promise<unknown> {
    return apiRequest(`${PRODUCT_SERVICE_PATH}/v1/skus/${skuId}`, {
      method: 'PUT',
      body: JSON.stringify(skuData),
    })
  },

  /**
   * Delete SKU
   */
  async deleteSKU(skuId: string): Promise<{ message: string }> {
    return apiRequest(`${PRODUCT_SERVICE_PATH}/v1/skus/${skuId}`, { method: 'DELETE' })
  },

  /**
   * Bulk SKU operations
   */
  async bulkSKUOperation(operation: string, skuIds: string[]): Promise<unknown> {
    return apiRequest(`${PRODUCT_SERVICE_PATH}/v1/skus/bulk`, {
      method: 'POST',
      body: JSON.stringify({ operation, sku_ids: skuIds }),
    })
  },

  /**
   * Import SKUs from CSV/Excel
   */
  async importSKUs(file: File, options: Record<string, unknown> = {}): Promise<unknown> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('options', JSON.stringify(options))

    const response = await fetch(`/api/bff${PRODUCT_SERVICE_PATH}/v1/skus/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    })
    if (!response.ok) {
      throw new SupplierError('Import failed', response.status, SupplierErrorCode.IMPORT_ERROR)
    }
    return response.json()
  },

  /**
   * Export SKUs to CSV/Excel
   */
  async exportSKUs(
    filters: Record<string, unknown> = {},
    format: 'csv' | 'excel' = 'csv'
  ): Promise<Blob> {
    const params = new URLSearchParams()
    params.append('format', format)
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value))
      }
    }

    const response = await fetch(`/api/bff${PRODUCT_SERVICE_PATH}/v1/skus/export?${params}`, {
      headers: getAuthHeaders(),
    })
    if (!response.ok) {
      throw new SupplierError('Export failed', response.status, SupplierErrorCode.EXPORT_ERROR)
    }
    return response.blob()
  },
}

// ============================================================================
// Pricing Management API
// ============================================================================

export const supplierPricingApi = {
  /**
   * Get pricing rules for supplier
   */
  async getPricingRules(): Promise<unknown[]> {
    return apiRequest(`${PRODUCT_SERVICE_PATH}/v1/pricing/rules`)
  },

  /**
   * Create pricing rule
   */
  async createPricingRule(ruleData: unknown): Promise<unknown> {
    return apiRequest(`${PRODUCT_SERVICE_PATH}/v1/pricing/rules`, {
      method: 'POST',
      body: JSON.stringify(ruleData),
    })
  },

  /**
   * Update pricing rule
   */
  async updatePricingRule(ruleId: string, ruleData: unknown): Promise<unknown> {
    return apiRequest(`${PRODUCT_SERVICE_PATH}/v1/pricing/rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(ruleData),
    })
  },

  /**
   * Delete pricing rule
   */
  async deletePricingRule(ruleId: string): Promise<{ message: string }> {
    return apiRequest(`${PRODUCT_SERVICE_PATH}/v1/pricing/rules/${ruleId}`, { method: 'DELETE' })
  },

  /**
   * Calculate pricing for SKUs
   */
  async calculatePricing(skuIds: string[], customerTier?: string): Promise<unknown> {
    return apiRequest(`${PRODUCT_SERVICE_PATH}/v1/pricing/calculate`, {
      method: 'POST',
      body: JSON.stringify({ sku_ids: skuIds, customer_tier: customerTier }),
    })
  },
}

// ============================================================================
// File Upload API
// ============================================================================

export const supplierFileApi = {
  /**
   * Upload file (for documents, images, etc.)
   */
  async uploadFile(
    file: File,
    type: 'document' | 'image' = 'document'
  ): Promise<{ url: string; filename: string }> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const headers = getAuthHeaders()
    // Let browser set content-type for FormData
    const response = await fetch(`/api/bff${SUPPLIER_SERVICE_PATH}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      throw new SupplierError('Upload failed', response.status, SupplierErrorCode.API_ERROR)
    }

    return response.json()
  },
}

// ============================================================================
// Utility API
// ============================================================================

export const supplierUtilityApi = {
  /**
   * Health check for supplier service
   */
  async healthCheck(): Promise<{ status: string; service: string; version: string }> {
    return apiRequest<{ status: string; service: string; version: string }>(
      `${SUPPLIER_SERVICE_PATH}/health`
    )
  },
}

// ============================================================================
// Unified Supplier API Object
// ============================================================================

/**
 * Unified supplier API object containing all API methods
 */
export const supplierApi = {
  profile: supplierProfileApi,
  dashboard: supplierDashboardApi,
  customers: supplierCustomerApi,
  onboarding: supplierOnboardingApi,
  orders: supplierOrderApi,
  invitations: supplierInvitationApi,
  products: supplierProductApi,
  pricing: supplierPricingApi,
  files: supplierFileApi,
  utility: supplierUtilityApi,
}

// ============================================================================
// Legacy SupplierService Class (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use supplierApi instead. This class is kept for backward compatibility.
 */
export class SupplierService {
  private authToken: string | null = null

  setAuthToken(token: string): void {
    this.authToken = token
  }

  // Profile methods
  getProfile = supplierProfileApi.getProfile
  createProfile = supplierProfileApi.createProfile
  updateProfile = supplierProfileApi.updateProfile
  deleteProfile = supplierProfileApi.deleteProfile
  updateStatus = supplierProfileApi.updateStatus
  getSuppliers = supplierProfileApi.getSuppliers

  // Dashboard methods
  getDashboard = supplierDashboardApi.getDashboard
  getMetrics = supplierDashboardApi.getMetrics

  // Customer methods
  getCustomers = supplierCustomerApi.getCustomers
  addCustomer = supplierCustomerApi.addCustomer
  updateCustomer = supplierCustomerApi.updateCustomer
  removeCustomer = supplierCustomerApi.removeCustomer
  getCustomer = supplierCustomerApi.getCustomer
  bulkUpdateCustomers = supplierCustomerApi.bulkUpdateCustomers
  exportCustomers = supplierCustomerApi.exportCustomers

  // Onboarding methods
  getOnboardingProgress = supplierOnboardingApi.getProgress
  updateOnboardingStep = supplierOnboardingApi.updateStep
  completeOnboardingStep = supplierOnboardingApi.completeStep
  submitOnboardingForReview = supplierOnboardingApi.submitForReview

  // Order methods
  getOrders = supplierOrderApi.getOrders
  getOrderStats = supplierOrderApi.getOrderStats
  getOrder = supplierOrderApi.getOrder
  updateOrderStatus = supplierOrderApi.updateOrderStatus
  bulkUpdateOrderStatus = supplierOrderApi.bulkUpdateOrderStatus
  exportOrders = supplierOrderApi.exportOrders

  // Utility methods
  healthCheck = supplierUtilityApi.healthCheck
  uploadFile = supplierFileApi.uploadFile
}

// Singleton instance for backward compatibility
export const supplierService = new SupplierService()
