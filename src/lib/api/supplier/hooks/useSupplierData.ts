/**
 * Combined Supplier Data Hook
 *
 * Provides a comprehensive hook that combines all supplier data
 */

import { useCallback } from 'react'
import { useSupplierProfile } from './useProfile'
import { useSupplierDashboard } from './useDashboard'
import { useSupplierCustomers } from './useCustomers'
import { useSupplierOnboarding } from './useOnboarding'
import { useSupplierOrders } from './useOrders'
import { useSupplierProducts, useSupplierFinance } from './useProducts'

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

  const { refetch: refetchProfile } = profile
  const { refreshMetrics } = dashboard
  const { refetch: refetchCustomers } = customers
  const { refetch: refetchOnboarding } = onboarding
  const { refetch: refetchOrders } = orders
  const { refetch: refetchProducts } = products
  const { refetch: refetchFinance } = finance

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
      refetchProfile(),
      refreshMetrics(),
      refetchCustomers(),
      refetchOnboarding(),
      refetchOrders(),
      refetchProducts(),
      refetchFinance(),
    ])
  }, [
    refetchProfile,
    refreshMetrics,
    refetchCustomers,
    refetchOnboarding,
    refetchOrders,
    refetchProducts,
    refetchFinance,
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
