// ============================================================================
// Customer Hierarchy - Main Export
// ============================================================================
// Clean entry point for the customer hierarchy system

export { CustomerManagement } from './components/CustomerManagement'
export {
  CustomerHierarchyProvider,
  useCustomerHierarchyContext,
} from './context/CustomerHierarchyContext'
export { useCustomerHierarchy } from './hooks/useCustomerHierarchy'
export { customerHierarchyService } from './services/customerHierarchyService'
export type * from './types'

// Version information
export const CUSTOMER_HIERARCHY_VERSION = '2.0.0'
export const CUSTOMER_HIERARCHY_BUILD = new Date().toISOString()
