/**
 * Supplier Service - Re-export Module
 *
 * This file re-exports the SupplierService class and related utilities
 * from the new supplier module structure for backward compatibility.
 * New code should import from '@/lib/api/supplier'.
 *
 * @deprecated Import from '@/lib/api/supplier' instead
 *
 * @example
 * // Old import (still works)
 * import { supplierService, SupplierApiError } from '@/lib/api/supplier-service'
 *
 * // New import (preferred)
 * import { supplierService, SupplierError } from '@/lib/api/supplier'
 */

// Re-export service and error classes
export {
  SupplierService,
  supplierService,
  SupplierApiError,
  isSupplierError as isSupplierApiError,
  getErrorMessage as getSupplierErrorMessage,
} from './supplier'
