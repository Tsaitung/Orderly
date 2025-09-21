// ============================================================================
// 平台計費狀態管理 - Zustand Store
// ============================================================================

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  DashboardMetrics,
  SystemHealth,
  BillingAlert,
  RateConfig,
  RatingConfig,
  RateCalculationInput,
  RateCalculationResult,
  RateHistoryItem,
  SupplierBillingData,
  SupplierBillingDetail,
  SupplierQueryParams,
  SupplierFilters,
  PaginationState,
  BillingAnalytics,
  AnalyticsFilters,
  BatchResult,
  BillingAnomaly,
  RatingTier,
  PaymentStatus,
  LoadingState,
  ErrorState,
  UIState
} from '@/types/platform-billing'
import { platformBillingApi } from '@/lib/api/platform-billing'

interface PlatformBillingState {
  // ============================================================================
  // 儀表板狀態
  // ============================================================================
  dashboard: {
    metrics: DashboardMetrics | null
    systemHealth: SystemHealth | null
    alerts: BillingAlert[]
    loading: boolean
    error: string | null
    lastUpdated: Date | null
  }

  // ============================================================================
  // 費率管理狀態
  // ============================================================================
  rates: {
    configs: RateConfig[]
    ratingConfigs: RatingConfig[]
    calculator: {
      input: RateCalculationInput
      result: RateCalculationResult | null
      loading: boolean
    }
    history: RateHistoryItem[]
    loading: boolean
    error: string | null
    previewData: any | null
  }

  // ============================================================================
  // 供應商管理狀態
  // ============================================================================
  suppliers: {
    list: SupplierBillingData[]
    selectedSupplier: SupplierBillingDetail | null
    total: number
    pagination: PaginationState
    filters: SupplierFilters
    selectedIds: string[]
    loading: boolean
    error: string | null
    sortConfig: {
      key: string
      direction: 'asc' | 'desc'
    }
  }

  // ============================================================================
  // 分析狀態
  // ============================================================================
  analytics: {
    data: BillingAnalytics | null
    filters: AnalyticsFilters
    loading: boolean
    error: string | null
  }

  // ============================================================================
  // 批次操作狀態
  // ============================================================================
  batch: {
    currentTask: BatchResult | null
    history: BatchResult[]
    loading: boolean
    error: string | null
  }

  // ============================================================================
  // 異常監控狀態
  // ============================================================================
  anomalies: {
    list: BillingAnomaly[]
    loading: boolean
    error: string | null
    filter: {
      status: string
      severity: string
    }
  }

  // ============================================================================
  // UI 狀態
  // ============================================================================
  ui: UIState

  // ============================================================================
  // 操作方法
  // ============================================================================
  actions: {
    // Dashboard actions
    loadDashboardMetrics: (timeframe?: string) => Promise<void>
    loadSystemHealth: () => Promise<void>
    loadBillingAlerts: (limit?: number) => Promise<void>
    acknowledgeAlert: (alertId: string) => Promise<void>
    refreshDashboard: () => Promise<void>

    // Rate management actions
    loadRateConfigs: () => Promise<void>
    updateRateConfig: (config: Partial<RateConfig>) => Promise<void>
    loadRatingConfigs: () => Promise<void>
    updateRatingConfig: (config: Partial<RatingConfig>) => Promise<void>
    calculateRate: (input: RateCalculationInput) => Promise<void>
    loadRateHistory: (limit?: number) => Promise<void>
    previewRateChange: (config: Partial<RateConfig>) => Promise<void>
    clearRateCalculation: () => void
    updateCalculatorInput: (input: Partial<RateCalculationInput>) => void

    // Supplier management actions
    loadSuppliers: (params?: SupplierQueryParams) => Promise<void>
    loadSupplierDetail: (supplierId: string) => Promise<void>
    updateSupplierRating: (supplierId: string, rating: RatingTier, reason: string) => Promise<void>
    updateSupplierFilters: (filters: Partial<SupplierFilters>) => void
    clearSupplierFilters: () => void
    updatePagination: (pagination: Partial<PaginationState>) => void
    toggleSupplierSelection: (supplierId: string) => void
    selectAllSuppliers: () => void
    clearSupplierSelection: () => void
    updateSortConfig: (key: string, direction: 'asc' | 'desc') => void
    exportSupplierReport: (format: 'csv' | 'excel' | 'pdf') => Promise<void>

    // Analytics actions
    loadBillingAnalytics: (filters?: AnalyticsFilters) => Promise<void>
    updateAnalyticsFilters: (filters: Partial<AnalyticsFilters>) => void

    // Batch operations actions
    executeBatchOperation: (operation: any) => Promise<void>
    loadBatchStatus: (taskId: string) => Promise<void>
    cancelBatchOperation: (taskId: string) => Promise<void>
    loadBatchHistory: (limit?: number) => Promise<void>

    // Anomaly monitoring actions
    loadAnomalies: (status?: string, severity?: string, limit?: number) => Promise<void>
    updateAnomalyStatus: (anomalyId: string, status: string, notes?: string) => Promise<void>
    updateAnomalyFilter: (filter: Partial<{ status: string; severity: string }>) => void

    // UI actions
    setView: (view: 'table' | 'cards' | 'analytics') => void
    toggleExpandedRow: (id: string) => void
    clearErrors: () => void
  }
}

export const usePlatformBillingStore = create<PlatformBillingState>()(
  devtools(
    (set, get) => ({
      // ============================================================================
      // 初始狀態
      // ============================================================================
      dashboard: {
        metrics: null,
        systemHealth: null,
        alerts: [],
        loading: false,
        error: null,
        lastUpdated: null
      },

      rates: {
        configs: [],
        ratingConfigs: [],
        calculator: {
          input: {
            gmv: 100000,
            rating: 'Silver'
          },
          result: null,
          loading: false
        },
        history: [],
        loading: false,
        error: null,
        previewData: null
      },

      suppliers: {
        list: [],
        selectedSupplier: null,
        total: 0,
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          hasNext: false,
          hasPrev: false
        },
        filters: {
          rating: [],
          tier: [],
          paymentStatus: [],
          gmvRange: [0, 10000000],
          dateRange: [new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()],
          search: ''
        },
        selectedIds: [],
        loading: false,
        error: null,
        sortConfig: {
          key: 'name',
          direction: 'asc'
        }
      },

      analytics: {
        data: null,
        filters: {
          period: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date(),
            granularity: 'day'
          }
        },
        loading: false,
        error: null
      },

      batch: {
        currentTask: null,
        history: [],
        loading: false,
        error: null
      },

      anomalies: {
        list: [],
        loading: false,
        error: null,
        filter: {
          status: '',
          severity: ''
        }
      },

      ui: {
        selectedSupplierIds: [],
        filters: {
          rating: [],
          tier: [],
          paymentStatus: [],
          gmvRange: [0, 10000000],
          dateRange: [new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()],
          search: ''
        },
        view: 'table',
        expandedRows: [],
        sortConfig: {
          key: 'name',
          direction: 'asc'
        }
      },

      // ============================================================================
      // 操作方法實現
      // ============================================================================
      actions: {
        // Dashboard actions
        loadDashboardMetrics: async (timeframe = '30d') => {
          try {
            set(state => ({
              dashboard: { ...state.dashboard, loading: true, error: null }
            }))

            const metrics = await platformBillingApi.getDashboardMetrics(timeframe)
            
            set(state => ({
              dashboard: {
                ...state.dashboard,
                metrics,
                loading: false,
                lastUpdated: new Date()
              }
            }))
          } catch (error) {
            set(state => ({
              dashboard: {
                ...state.dashboard,
                loading: false,
                error: error instanceof Error ? error.message : 'Failed to load metrics'
              }
            }))
          }
        },

        loadSystemHealth: async () => {
          try {
            const systemHealth = await platformBillingApi.getSystemHealth()
            
            set(state => ({
              dashboard: {
                ...state.dashboard,
                systemHealth
              }
            }))
          } catch (error) {
            console.error('Failed to load system health:', error)
          }
        },

        loadBillingAlerts: async (limit) => {
          try {
            const alerts = await platformBillingApi.getBillingAlerts(limit)
            
            set(state => ({
              dashboard: {
                ...state.dashboard,
                alerts
              }
            }))
          } catch (error) {
            console.error('Failed to load alerts:', error)
          }
        },

        acknowledgeAlert: async (alertId: string) => {
          try {
            await platformBillingApi.acknowledgeAlert(alertId)
            
            set(state => ({
              dashboard: {
                ...state.dashboard,
                alerts: state.dashboard.alerts.map(alert =>
                  alert.id === alertId
                    ? { ...alert, acknowledged: true, acknowledgedBy: 'current_user' }
                    : alert
                )
              }
            }))
          } catch (error) {
            console.error('Failed to acknowledge alert:', error)
          }
        },

        refreshDashboard: async () => {
          const { actions } = get()
          await Promise.all([
            actions.loadDashboardMetrics(),
            actions.loadSystemHealth(),
            actions.loadBillingAlerts(10)
          ])
        },

        // Rate management actions
        loadRateConfigs: async () => {
          try {
            set(state => ({
              rates: { ...state.rates, loading: true, error: null }
            }))

            const configs = await platformBillingApi.getRateConfigs()
            
            set(state => ({
              rates: { ...state.rates, configs, loading: false }
            }))
          } catch (error) {
            set(state => ({
              rates: {
                ...state.rates,
                loading: false,
                error: error instanceof Error ? error.message : 'Failed to load rate configs'
              }
            }))
          }
        },

        updateRateConfig: async (config: Partial<RateConfig>) => {
          try {
            const updatedConfig = await platformBillingApi.updateRateConfig(config)
            
            set(state => ({
              rates: {
                ...state.rates,
                configs: config.id
                  ? state.rates.configs.map(c => c.id === config.id ? updatedConfig : c)
                  : [...state.rates.configs, updatedConfig]
              }
            }))
          } catch (error) {
            console.error('Failed to update rate config:', error)
            throw error
          }
        },

        loadRatingConfigs: async () => {
          try {
            const ratingConfigs = await platformBillingApi.getRatingConfigs()
            
            set(state => ({
              rates: { ...state.rates, ratingConfigs }
            }))
          } catch (error) {
            console.error('Failed to load rating configs:', error)
          }
        },

        updateRatingConfig: async (config: Partial<RatingConfig>) => {
          try {
            const updatedConfig = await platformBillingApi.updateRatingConfig(config)
            
            set(state => ({
              rates: {
                ...state.rates,
                ratingConfigs: config.id
                  ? state.rates.ratingConfigs.map(c => c.id === config.id ? updatedConfig : c)
                  : [...state.rates.ratingConfigs, updatedConfig]
              }
            }))
          } catch (error) {
            console.error('Failed to update rating config:', error)
            throw error
          }
        },

        calculateRate: async (input: RateCalculationInput) => {
          try {
            set(state => ({
              rates: {
                ...state.rates,
                calculator: { ...state.rates.calculator, loading: true }
              }
            }))

            const result = await platformBillingApi.calculateRate(input)
            
            set(state => ({
              rates: {
                ...state.rates,
                calculator: { input, result, loading: false }
              }
            }))
          } catch (error) {
            set(state => ({
              rates: {
                ...state.rates,
                calculator: { ...state.rates.calculator, loading: false }
              }
            }))
            console.error('Failed to calculate rate:', error)
          }
        },

        loadRateHistory: async (limit) => {
          try {
            const history = await platformBillingApi.getRateHistory(limit)
            
            set(state => ({
              rates: { ...state.rates, history }
            }))
          } catch (error) {
            console.error('Failed to load rate history:', error)
          }
        },

        previewRateChange: async (config: Partial<RateConfig>) => {
          try {
            const previewData = await platformBillingApi.previewRateChange(config)
            
            set(state => ({
              rates: { ...state.rates, previewData }
            }))
          } catch (error) {
            console.error('Failed to preview rate change:', error)
          }
        },

        clearRateCalculation: () => {
          set(state => ({
            rates: {
              ...state.rates,
              calculator: {
                ...state.rates.calculator,
                result: null
              }
            }
          }))
        },

        updateCalculatorInput: (input: Partial<RateCalculationInput>) => {
          set(state => ({
            rates: {
              ...state.rates,
              calculator: {
                ...state.rates.calculator,
                input: { ...state.rates.calculator.input, ...input }
              }
            }
          }))
        },

        // Supplier management actions
        loadSuppliers: async (params = {}) => {
          try {
            set(state => ({
              suppliers: { ...state.suppliers, loading: true, error: null }
            }))

            const { filters, pagination, sortConfig } = get().suppliers
            
            const queryParams: SupplierQueryParams = {
              page: pagination.page,
              limit: pagination.limit,
              sortBy: sortConfig.key as any,
              sortOrder: sortConfig.direction,
              ...params
            }

            // 應用篩選器
            if (filters.search) queryParams.search = filters.search
            if (filters.rating.length > 0) queryParams.rating = filters.rating
            if (filters.tier.length > 0) queryParams.tier = filters.tier
            if (filters.paymentStatus.length > 0) queryParams.paymentStatus = filters.paymentStatus
            
            const result = await platformBillingApi.getSuppliers(queryParams)
            
            set(state => ({
              suppliers: {
                ...state.suppliers,
                list: result.data,
                total: result.pagination.total,
                pagination: {
                  page: result.pagination.page,
                  limit: result.pagination.limit,
                  total: result.pagination.total,
                  hasNext: result.pagination.hasNext,
                  hasPrev: result.pagination.hasPrev
                },
                loading: false
              }
            }))
          } catch (error) {
            set(state => ({
              suppliers: {
                ...state.suppliers,
                loading: false,
                error: error instanceof Error ? error.message : 'Failed to load suppliers'
              }
            }))
          }
        },

        loadSupplierDetail: async (supplierId: string) => {
          try {
            const selectedSupplier = await platformBillingApi.getSupplierDetail(supplierId)
            
            set(state => ({
              suppliers: { ...state.suppliers, selectedSupplier }
            }))
          } catch (error) {
            console.error('Failed to load supplier detail:', error)
          }
        },

        updateSupplierRating: async (supplierId: string, rating: RatingTier, reason: string) => {
          try {
            await platformBillingApi.updateSupplierRating(supplierId, rating, reason)
            
            // Refresh supplier list
            await get().actions.loadSuppliers()
          } catch (error) {
            console.error('Failed to update supplier rating:', error)
            throw error
          }
        },

        updateSupplierFilters: (filters: Partial<SupplierFilters>) => {
          set(state => ({
            suppliers: {
              ...state.suppliers,
              filters: { ...state.suppliers.filters, ...filters },
              pagination: { ...state.suppliers.pagination, page: 1 } // Reset to first page
            }
          }))
        },

        clearSupplierFilters: () => {
          set(state => ({
            suppliers: {
              ...state.suppliers,
              filters: {
                rating: [],
                tier: [],
                paymentStatus: [],
                gmvRange: [0, 10000000],
                dateRange: [new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()],
                search: ''
              },
              pagination: { ...state.suppliers.pagination, page: 1 }
            }
          }))
        },

        updatePagination: (pagination: Partial<PaginationState>) => {
          set(state => ({
            suppliers: {
              ...state.suppliers,
              pagination: { ...state.suppliers.pagination, ...pagination }
            }
          }))
        },

        toggleSupplierSelection: (supplierId: string) => {
          set(state => ({
            suppliers: {
              ...state.suppliers,
              selectedIds: state.suppliers.selectedIds.includes(supplierId)
                ? state.suppliers.selectedIds.filter(id => id !== supplierId)
                : [...state.suppliers.selectedIds, supplierId]
            }
          }))
        },

        selectAllSuppliers: () => {
          set(state => ({
            suppliers: {
              ...state.suppliers,
              selectedIds: state.suppliers.list.map(s => s.id)
            }
          }))
        },

        clearSupplierSelection: () => {
          set(state => ({
            suppliers: {
              ...state.suppliers,
              selectedIds: []
            }
          }))
        },

        updateSortConfig: (key: string, direction: 'asc' | 'desc') => {
          set(state => ({
            suppliers: {
              ...state.suppliers,
              sortConfig: { key, direction }
            }
          }))
        },

        exportSupplierReport: async (format: 'csv' | 'excel' | 'pdf') => {
          try {
            const { filters, pagination } = get().suppliers
            const blob = await platformBillingApi.exportSupplierReport(format, {
              search: filters.search || undefined,
              rating: filters.rating.length > 0 ? filters.rating : undefined,
              tier: filters.tier.length > 0 ? filters.tier : undefined,
              paymentStatus: filters.paymentStatus.length > 0 ? filters.paymentStatus : undefined
            })

            // 觸發下載
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `suppliers-report.${format}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          } catch (error) {
            console.error('Failed to export report:', error)
            throw error
          }
        },

        // Analytics actions
        loadBillingAnalytics: async (filters) => {
          try {
            set(state => ({
              analytics: { ...state.analytics, loading: true, error: null }
            }))

            const analyticsFilters = filters || get().analytics.filters
            const data = await platformBillingApi.getBillingAnalytics(analyticsFilters)
            
            set(state => ({
              analytics: { ...state.analytics, data, loading: false }
            }))
          } catch (error) {
            set(state => ({
              analytics: {
                ...state.analytics,
                loading: false,
                error: error instanceof Error ? error.message : 'Failed to load analytics'
              }
            }))
          }
        },

        updateAnalyticsFilters: (filters: Partial<AnalyticsFilters>) => {
          set(state => ({
            analytics: {
              ...state.analytics,
              filters: { ...state.analytics.filters, ...filters }
            }
          }))
        },

        // Batch operations actions
        executeBatchOperation: async (operation) => {
          try {
            set(state => ({
              batch: { ...state.batch, loading: true, error: null }
            }))

            const result = await platformBillingApi.executeBatchOperation(operation)
            
            set(state => ({
              batch: { ...state.batch, currentTask: result, loading: false }
            }))
          } catch (error) {
            set(state => ({
              batch: {
                ...state.batch,
                loading: false,
                error: error instanceof Error ? error.message : 'Failed to execute batch operation'
              }
            }))
          }
        },

        loadBatchStatus: async (taskId: string) => {
          try {
            const result = await platformBillingApi.getBatchStatus(taskId)
            
            set(state => ({
              batch: { ...state.batch, currentTask: result }
            }))
          } catch (error) {
            console.error('Failed to load batch status:', error)
          }
        },

        cancelBatchOperation: async (taskId: string) => {
          try {
            await platformBillingApi.cancelBatchOperation(taskId)
            
            set(state => ({
              batch: { ...state.batch, currentTask: null }
            }))
          } catch (error) {
            console.error('Failed to cancel batch operation:', error)
          }
        },

        loadBatchHistory: async (limit) => {
          try {
            const history = await platformBillingApi.getBatchHistory(limit)
            
            set(state => ({
              batch: { ...state.batch, history }
            }))
          } catch (error) {
            console.error('Failed to load batch history:', error)
          }
        },

        // Anomaly monitoring actions
        loadAnomalies: async (status, severity, limit) => {
          try {
            set(state => ({
              anomalies: { ...state.anomalies, loading: true, error: null }
            }))

            const list = await platformBillingApi.getAnomalies(status, severity, limit)
            
            set(state => ({
              anomalies: { ...state.anomalies, list, loading: false }
            }))
          } catch (error) {
            set(state => ({
              anomalies: {
                ...state.anomalies,
                loading: false,
                error: error instanceof Error ? error.message : 'Failed to load anomalies'
              }
            }))
          }
        },

        updateAnomalyStatus: async (anomalyId: string, status: string, notes) => {
          try {
            await platformBillingApi.updateAnomalyStatus(anomalyId, status, notes)
            
            set(state => ({
              anomalies: {
                ...state.anomalies,
                list: state.anomalies.list.map(anomaly =>
                  anomaly.id === anomalyId
                    ? { ...anomaly, status: status as any, resolutionNotes: notes }
                    : anomaly
                )
              }
            }))
          } catch (error) {
            console.error('Failed to update anomaly status:', error)
            throw error
          }
        },

        updateAnomalyFilter: (filter) => {
          set(state => ({
            anomalies: {
              ...state.anomalies,
              filter: { ...state.anomalies.filter, ...filter }
            }
          }))
        },

        // UI actions
        setView: (view: 'table' | 'cards' | 'analytics') => {
          set(state => ({
            ui: { ...state.ui, view }
          }))
        },

        toggleExpandedRow: (id: string) => {
          set(state => ({
            ui: {
              ...state.ui,
              expandedRows: state.ui.expandedRows.includes(id)
                ? state.ui.expandedRows.filter(rowId => rowId !== id)
                : [...state.ui.expandedRows, id]
            }
          }))
        },

        clearErrors: () => {
          set(state => ({
            dashboard: { ...state.dashboard, error: null },
            rates: { ...state.rates, error: null },
            suppliers: { ...state.suppliers, error: null },
            analytics: { ...state.analytics, error: null },
            batch: { ...state.batch, error: null },
            anomalies: { ...state.anomalies, error: null }
          }))
        }
      }
    }),
    {
      name: 'platform-billing-store',
      partialize: (state) => ({
        // 只持久化 UI 狀態和篩選器
        ui: state.ui,
        suppliers: {
          filters: state.suppliers.filters,
          pagination: state.suppliers.pagination,
          sortConfig: state.suppliers.sortConfig
        },
        analytics: {
          filters: state.analytics.filters
        }
      })
    }
  )
)