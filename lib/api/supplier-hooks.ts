/**
 * Supplier Hooks - Re-export Module
 *
 * This file re-exports all hooks from the new supplier module structure
 * for backward compatibility. New code should import from '@/lib/api/supplier'.
 *
 * @deprecated Import from '@/lib/api/supplier' instead
 *
 * @example
 * // Old import (still works)
 * import { useSupplierProfile } from '@/lib/api/supplier-hooks'
 *
 * // New import (preferred)
 * import { useSupplierProfile } from '@/lib/api/supplier'
 */

// Re-export all hooks from the new module
export {
  useSupplierProfile,
  useSupplierDashboard,
  useSupplierCustomers,
  useSupplierOrders,
  useSupplierOrder,
  useSupplierOnboarding,
  useFileUpload,
  useSupplierProducts,
  useSupplierFinance,
  useSupplierData,
} from './supplier'
