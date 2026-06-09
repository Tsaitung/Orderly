/**
 * Supplier Dashboard Hooks
 */

import { useState, useEffect, useCallback } from 'react'
import { supplierDashboardApi } from '../api'
import { getErrorMessage } from '../errors'
import type { SupplierDashboard, SupplierDashboardMetrics } from '../types'

/**
 * Hook to fetch supplier dashboard data
 */
export function useSupplierDashboard(organizationId?: string) {
  const [dashboard, setDashboard] = useState<SupplierDashboard | null>(null)
  const [metrics, setMetrics] = useState<SupplierDashboardMetrics | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(!!organizationId)
  const [metricsLoading, setMetricsLoading] = useState(!!organizationId)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30 seconds

  const fetchDashboard = useCallback(async () => {
    if (!organizationId) {
      return
    }

    setDashboardLoading(true)
    setDashboardError(null)
    try {
      const data = await supplierDashboardApi.getDashboard(organizationId)
      setDashboard(data)
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setDashboardError(errorMessage)
      console.error('Failed to fetch dashboard:', err)
    } finally {
      setDashboardLoading(false)
    }
  }, [organizationId])

  const fetchMetrics = useCallback(async () => {
    if (!organizationId) {
      return
    }

    setMetricsLoading(true)
    setMetricsError(null)
    try {
      const data = await supplierDashboardApi.getMetrics(organizationId)
      setMetrics(data)
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setMetricsError(errorMessage)
      console.error('Failed to fetch metrics:', err)
    } finally {
      setMetricsLoading(false)
    }
  }, [organizationId])

  // Initial fetch
  useEffect(() => {
    if (organizationId) {
      fetchDashboard()
      fetchMetrics()
    }
  }, [organizationId, fetchDashboard, fetchMetrics])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !organizationId) {
      return
    }

    const interval = setInterval(() => {
      fetchMetrics()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, organizationId, fetchMetrics, refreshInterval])

  const refreshMetrics = useCallback(async () => {
    await Promise.all([fetchDashboard(), fetchMetrics()])
  }, [fetchDashboard, fetchMetrics])

  return {
    dashboard,
    metrics,
    loading: dashboardLoading || metricsLoading,
    error: dashboardError || metricsError,
    refreshMetrics,
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
  }
}
