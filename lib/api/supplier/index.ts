/**
 * Supplier API Module
 *
 * Unified entry point for all supplier-related API functionality
 *
 * @example
 * // Import hooks
 * import { useSupplierProfile, useSupplierOrders } from '@/lib/api/supplier'
 *
 * // Import API directly
 * import { supplierApi } from '@/lib/api/supplier'
 *
 * // Import types
 * import type { SupplierProfile, OrderStatus } from '@/lib/api/supplier'
 *
 * // Import error handling
 * import { SupplierError, getErrorMessage } from '@/lib/api/supplier'
 */

// ============================================================================
// Error Handling
// ============================================================================

export {
  SupplierError,
  SupplierApiError,
  InvitationApiError,
  SupplierErrorCode,
  wrapError,
  isSupplierError,
  getErrorMessage,
  retryRequest,
} from './errors'
export type { SupplierErrorCodeType } from './errors'

// ============================================================================
// Types
// ============================================================================

export * from './types'

// ============================================================================
// API
// ============================================================================

export {
  // Unified API object
  supplierApi,
  // Individual API modules
  supplierProfileApi,
  supplierDashboardApi,
  supplierCustomerApi,
  supplierOnboardingApi,
  supplierOrderApi,
  supplierInvitationApi,
  supplierProductApi,
  supplierPricingApi,
  supplierFileApi,
  supplierUtilityApi,
  // Legacy class (deprecated)
  SupplierService,
  supplierService,
} from './api'

// ============================================================================
// Hooks
// ============================================================================

export {
  // Profile hooks
  useSupplierProfile,
  // Dashboard hooks
  useSupplierDashboard,
  // Customer hooks
  useSupplierCustomers,
  // Order hooks
  useSupplierOrders,
  useSupplierOrder,
  // Onboarding hooks
  useSupplierOnboarding,
  // File upload hooks
  useFileUpload,
  // Product and finance hooks (placeholders)
  useSupplierProducts,
  useSupplierFinance,
  // Combined data hook
  useSupplierData,
} from './hooks'

// ============================================================================
// Utilities
// ============================================================================

export {
  // Async state hooks
  useAsyncState,
  useAsyncMutation,
  // File utilities
  downloadBlob,
  validateFileSize,
  validateFileType,
  FILE_TYPES,
  MAX_FILE_SIZE,
  // Pagination utilities
  extractPaginationInfo,
  // Date utilities
  formatDateForApi,
  formatDateForDisplay,
  formatDateTimeForDisplay,
  // Currency utilities
  formatCurrency,
  // Misc utilities
  debounce,
} from './utils'

export type {
  UseAsyncState,
  UseAsyncMutation,
  UseAsyncMutationOptions,
  PaginationInfo,
} from './utils'
