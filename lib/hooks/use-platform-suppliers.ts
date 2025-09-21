/**
 * React hooks for platform supplier management
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  platformSupplierService,
  type SupplierCard,
  type SupplierDetail,
  type SupplierStats,
  type SupplierListResponse,
  type SupplierFilterParams,
  type SupplierUpdateRequest
} from '@/lib/api/platform-supplier-service'

export interface UseSupplierStatsResult {
  stats: SupplierStats | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export interface UseSuppliersResult {
  suppliers: SupplierCard[]
  total: number
  page: number
  totalPages: number
  stats: SupplierStats | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateFilters: (newFilters: Partial<SupplierFilterParams>) => void
  resetFilters: () => void
  filters: SupplierFilterParams
}

export interface UseSupplierDetailResult {
  supplier: SupplierDetail | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateStatus: (updateData: SupplierUpdateRequest) => Promise<boolean>
}

/**
 * Hook for fetching supplier statistics
 */
export function useSupplierStats(): UseSupplierStatsResult {
  const [stats, setStats] = useState<SupplierStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await platformSupplierService.getSupplierStats()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch supplier stats')
      console.error('Failed to fetch supplier stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}

/**
 * Hook for fetching and managing suppliers list with filtering
 */
export function useSuppliers(initialFilters: SupplierFilterParams = {}): UseSuppliersResult {
  const [suppliers, setSuppliers] = useState<SupplierCard[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [stats, setStats] = useState<SupplierStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<SupplierFilterParams>({
    page: 1,
    page_size: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
    ...initialFilters
  })

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await platformSupplierService.getSuppliers(filters)
      
      setSuppliers(data.suppliers)
      setTotal(data.total)
      setPage(data.page)
      setTotalPages(data.total_pages)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suppliers')
      console.error('Failed to fetch suppliers:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const updateFilters = useCallback((newFilters: Partial<SupplierFilterParams>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      // Reset to page 1 when filters change (except when explicitly setting page)
      page: newFilters.page !== undefined ? newFilters.page : 1
    }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({
      page: 1,
      page_size: 20,
      sort_by: 'created_at',
      sort_order: 'desc'
    })
  }, [])

  return {
    suppliers,
    total,
    page,
    totalPages,
    stats,
    loading,
    error,
    refetch: fetchSuppliers,
    updateFilters,
    resetFilters,
    filters
  }
}

/**
 * Hook for fetching detailed supplier information
 */
export function useSupplierDetail(supplierId: string | null): UseSupplierDetailResult {
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null)
  const [loading, setLoading] = useState(!!supplierId)
  const [error, setError] = useState<string | null>(null)

  const fetchSupplier = useCallback(async () => {
    if (!supplierId) {
      setSupplier(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await platformSupplierService.getSupplierDetail(supplierId)
      setSupplier(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch supplier detail')
      console.error('Failed to fetch supplier detail:', err)
    } finally {
      setLoading(false)
    }
  }, [supplierId])

  useEffect(() => {
    fetchSupplier()
  }, [fetchSupplier])

  const updateStatus = useCallback(async (updateData: SupplierUpdateRequest): Promise<boolean> => {
    if (!supplierId) return false

    try {
      const updatedSupplier = await platformSupplierService.updateSupplierStatus(supplierId, updateData)
      setSupplier(updatedSupplier)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update supplier status')
      console.error('Failed to update supplier status:', err)
      return false
    }
  }, [supplierId])

  return {
    supplier,
    loading,
    error,
    refetch: fetchSupplier,
    updateStatus
  }
}

/**
 * Hook for supplier search functionality
 */
export function useSupplierSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SupplierCard[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const suppliers = await platformSupplierService.searchSuppliers(searchQuery)
      setResults(suppliers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      console.error('Supplier search failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout
    return (searchQuery: string) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => search(searchQuery), 300)
    }
  }, [search])

  useEffect(() => {
    setQuery(query)
    debouncedSearch(query)
  }, [query, debouncedSearch])

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    search: debouncedSearch
  }
}

/**
 * Hook for getting suppliers that need attention
 */
export function useSuppliersNeedingAttention() {
  const [data, setData] = useState<{
    pending_verification: SupplierCard[]
    low_performance: SupplierCard[]
    inactive: SupplierCard[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await platformSupplierService.getSuppliersNeedingAttention()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suppliers needing attention')
      console.error('Failed to fetch suppliers needing attention:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}

/**
 * Hook for activity level distribution
 */
export function useActivityDistribution() {
  const [distribution, setDistribution] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDistribution = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await platformSupplierService.getActivityDistribution()
      setDistribution(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity distribution')
      console.error('Failed to fetch activity distribution:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDistribution()
  }, [fetchDistribution])

  return {
    distribution,
    loading,
    error,
    refetch: fetchDistribution
  }
}