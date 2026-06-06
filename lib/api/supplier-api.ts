/**
 * Supplier API - Re-export Module
 *
 * This file re-exports the supplier API objects and utilities
 * from the new supplier module structure for backward compatibility.
 * New code should import from '@/lib/api/supplier'.
 *
 * @deprecated Import from '@/lib/api/supplier' instead
 *
 * @example
 * // Old import (still works)
 * import { supplierInvitationApi, supplierProductApi } from '@/lib/api/supplier-api'
 *
 * // New import (preferred)
 * import { supplierInvitationApi, supplierProductApi } from '@/lib/api/supplier'
 */

// Re-export API objects
export {
  supplierInvitationApi,
  supplierProductApi,
  supplierPricingApi,
  InvitationApiError,
  getErrorMessage,
  isSupplierError,
  retryRequest,
} from './supplier'

// Re-export onboarding API with legacy name
export { supplierInvitationApi as supplierOnboardingApi } from './supplier'

// Create legacy API utilities object
export const supplierApiUtils = {
  isInvitationApiError: (error: unknown): error is import('./supplier').SupplierError => {
    const { isSupplierError } = require('./supplier')
    return isSupplierError(error)
  },
  getErrorMessage: (error: unknown): string => {
    const { getErrorMessage } = require('./supplier')
    return getErrorMessage(error)
  },
  retryRequest: async <T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    const { retryRequest } = require('./supplier')
    return retryRequest(apiCall, maxRetries, baseDelay)
  },
}

// Create legacy hook
export const useSupplierApi = () => {
  const {
    supplierInvitationApi,
    supplierProductApi,
    supplierPricingApi,
    getErrorMessage,
  } = require('./supplier')

  const handleApiError = (error: unknown) => {
    const message = getErrorMessage(error)
    console.error('Supplier API Error:', error)
    return message
  }

  return {
    invitationApi: supplierInvitationApi,
    onboardingApi: supplierInvitationApi,
    productApi: supplierProductApi,
    pricingApi: supplierPricingApi,
    utils: supplierApiUtils,
    handleError: handleApiError,
  }
}
