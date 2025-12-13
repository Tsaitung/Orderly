// ============================================================================
// Customer Hierarchy Dashboard - Main Component
// ============================================================================
// Sophisticated tabbed business intelligence interface for customer management
// Replaces the simple CustomerManagement component with enhanced BI features

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Search,
  Download,
  Filter,
  RefreshCw,
  Settings,
  BarChart3,
  Users,
  Building2,
  MapPin,
  PieChart,
  TrendingUp,
  Calendar,
  Globe,
} from 'lucide-react'

// Import existing context and hooks
import { CustomerHierarchyProvider } from '../../context/CustomerHierarchyContext'
import { useCustomerHierarchy } from '../../hooks/useCustomerHierarchy'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { hierarchyApi } from '@/lib/api/customer-hierarchy'

// Import types
import type {
  DashboardTab,
  DashboardStatistics,
  FilterOptions,
  SortOptions,
  ExportOptions,
} from '../../types'

// Import tab components (to be created)
import TabNavigation from './TabNavigation'
import OverviewTab from './tabs/OverviewTab'
import GroupsTab from './tabs/GroupsTab'
import CompaniesTab from './tabs/CompaniesTab'
import LocationsTab from './tabs/LocationsTab'
import AnalyticsTab from './tabs/AnalyticsTab'

// Import shared components (to be created)
import SearchFilters from './shared/SearchFilters'

// Dashboard Data Helpers
const createEmptyDashboardData = (): DashboardStatistics => ({
  totalCustomers: 0,
  activeCustomers: 0,
  inactiveCustomers: 0,
  groupsCount: 0,
  companiesCount: 0,
  locationsCount: 0,
  businessUnitsCount: 0,
  totalMonthlyRevenue: 0,
  revenueGrowth: 0,
  avgActivityScore: 0,
  topPerformers: [],
})

const mapStatsToDashboard = (stats: any): DashboardStatistics => {
  const groupsCount = stats?.node_counts?.group ?? stats?.nodesByType?.group ?? 0
  const companiesCount = stats?.node_counts?.company ?? stats?.nodesByType?.company ?? 0
  const locationsCount = stats?.node_counts?.location ?? stats?.nodesByType?.location ?? 0
  const businessUnitsCount =
    stats?.node_counts?.business_unit ?? stats?.nodesByType?.business_unit ?? 0

  const activeSum =
    (stats?.active_counts?.group ?? 0) +
    (stats?.active_counts?.company ?? 0) +
    (stats?.active_counts?.location ?? 0) +
    (stats?.active_counts?.business_unit ?? 0)
  const inactiveSum =
    (stats?.inactive_counts?.group ?? 0) +
    (stats?.inactive_counts?.company ?? 0) +
    (stats?.inactive_counts?.location ?? 0) +
    (stats?.inactive_counts?.business_unit ?? 0)

  const activeCustomers = activeSum || stats?.activeNodes || 0
  const inactiveCustomers = inactiveSum || stats?.inactiveNodes || 0

  const totalCustomers = activeCustomers + inactiveCustomers

  return {
    totalCustomers,
    activeCustomers,
    inactiveCustomers,
    groupsCount,
    companiesCount,
    locationsCount,
    businessUnitsCount,
    // 目前後端未回傳營收與活躍度統計，先以 0 佔位
    totalMonthlyRevenue: 0,
    revenueGrowth: 0,
    avgActivityScore: 0,
    topPerformers: [],
  }
}

// ============================================================================
// Dashboard State Management Hook
// ============================================================================

interface UseDashboardStateReturn {
  activeTab: DashboardTab
  setActiveTab: (tab: DashboardTab) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  debouncedSearch: string
  filters: FilterOptions
  setFilters: (filters: FilterOptions) => void
  sortOptions: SortOptions
  setSortOptions: (options: SortOptions) => void
  showFilters: boolean
  setShowFilters: (show: boolean) => void
  dashboardData: DashboardStatistics
  isLoadingDashboard: boolean
  refreshDashboard: () => Promise<void>
  exportData: (options: ExportOptions) => Promise<void>
}

function useDashboardState(): UseDashboardStateReturn {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebounce(searchQuery, 300)
  const [showFilters, setShowFilters] = useState(false)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardStatistics>(() =>
    createEmptyDashboardData()
  )

  const [filters, setFilters] = useState<FilterOptions>({
    types: ['group', 'company', 'location', 'business_unit'],
    activityLevels: ['active', 'medium', 'low', 'dormant'],
    includeInactive: false,
  })

  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'name',
    direction: 'asc',
  })

  const refreshDashboard = useCallback(async () => {
    setIsLoadingDashboard(true)
    try {
      const statsResponse = await hierarchyApi.getStatistics()
      const stats = (statsResponse as any).data ?? statsResponse
      setDashboardData(mapStatsToDashboard(stats))
    } catch (error) {
      console.error('Failed to load hierarchy statistics', error)
      setDashboardData(createEmptyDashboardData())
    } finally {
      setIsLoadingDashboard(false)
    }
  }, [])

  useEffect(() => {
    refreshDashboard()
  }, [refreshDashboard])

  const exportData = useCallback(async (options: ExportOptions) => {
    // Simulate export functionality
    console.log('Exporting data with options:', options)
    // In real implementation, this would generate and download the export file
  }, [])

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    filters,
    setFilters,
    sortOptions,
    setSortOptions,
    showFilters,
    setShowFilters,
    dashboardData,
    isLoadingDashboard,
    refreshDashboard,
    exportData,
  }
}

// ============================================================================
// Main Dashboard Implementation
// ============================================================================

function CustomerHierarchyDashboardImplementation() {
  // Dashboard state (filters/search and statistics)
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    filters,
    setFilters,
    sortOptions,
    setSortOptions,
    showFilters,
    setShowFilters,
    dashboardData,
    isLoadingDashboard,
    refreshDashboard,
    exportData,
  } = useDashboardState()

  // Get hierarchy data
  const {
    tree,
    selectedNodeId,
    searchResults,
    isLoading,
    error,
    loadTree,
    search,
    clearSearch,
    clearError,
  } = useCustomerHierarchy({
    autoLoad: true,
    includeInactive: filters.includeInactive,
  })

  // Effect to trigger search when debounced value changes
  useEffect(() => {
    if (debouncedSearch.trim()) {
      search(debouncedSearch)
    } else {
      clearSearch()
    }
  }, [debouncedSearch, search, clearSearch])

  // Memoized tab content based on active tab
  const tabContent = useMemo(() => {
    const commonProps = {
      tree,
      searchResults,
      filters,
      sortOptions,
      searchQuery: debouncedSearch,
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewTab dashboardData={dashboardData} {...commonProps} />
      case 'groups':
        return <GroupsTab {...commonProps} />
      case 'companies':
        return <CompaniesTab {...commonProps} />
      case 'locations':
        return <LocationsTab {...commonProps} />
      case 'analytics':
        return <AnalyticsTab dashboardData={dashboardData} {...commonProps} />
      default:
        return <OverviewTab dashboardData={dashboardData} {...commonProps} />
    }
  }, [activeTab, tree, searchResults, filters, sortOptions, debouncedSearch, dashboardData])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    clearError()
    await Promise.all([loadTree(), refreshDashboard()])
  }, [clearError, loadTree, refreshDashboard])

  // Handle export
  const handleExport = useCallback(async () => {
    await exportData({
      format: 'excel',
      includeMetrics: true,
      includeActivity: true,
      selectedOnly: false,
    })
  }, [exportData])

  // Error state
  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto max-w-md">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-red-300" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">載入客戶資料時發生錯誤</h3>
          <p className="mb-4 text-gray-500">{error}</p>
          <Button onClick={handleRefresh} loading={isLoading || isLoadingDashboard}>
            <RefreshCw className="mr-2 h-4 w-4" />
            重試
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">客戶層級總覽</h1>
          <p className="mt-1 text-gray-600">統一管理客戶組織架構與業務表現</p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            匯出資料
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={isLoading || isLoadingDashboard}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            重新整理
          </Button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Card variant="filled" colorScheme="primary" className="text-center">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <div className="text-2xl font-bold text-primary-900">
              {dashboardData.activeCustomers}
            </div>
            <div className="text-xs text-primary-700">活躍客戶</div>
          </CardContent>
        </Card>

        <Card variant="filled" colorScheme="gray" className="text-center">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{dashboardData.groupsCount}</div>
            <div className="text-xs text-gray-700">客戶集團</div>
          </CardContent>
        </Card>

        <Card variant="filled" colorScheme="gray" className="text-center">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-center">
              <Globe className="h-5 w-5 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{dashboardData.companiesCount}</div>
            <div className="text-xs text-gray-700">公司數量</div>
          </CardContent>
        </Card>

        <Card variant="filled" colorScheme="gray" className="text-center">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{dashboardData.locationsCount}</div>
            <div className="text-xs text-gray-700">營業據點</div>
          </CardContent>
        </Card>

        <Card variant="filled" colorScheme="green" className="text-center">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-900">{dashboardData.revenueGrowth}%</div>
            <div className="text-xs text-green-700">營收成長</div>
          </CardContent>
        </Card>

        <Card variant="filled" colorScheme="platform" className="text-center">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-platform-600" />
            </div>
            <div className="text-2xl font-bold text-platform-900">
              {Math.round(dashboardData.avgActivityScore)}
            </div>
            <div className="text-xs text-platform-700">平均活躍度</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="搜尋客戶、集團、公司..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant={showFilters ? 'solid' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              colorScheme="gray"
            >
              <Filter className="mr-2 h-4 w-4" />
              篩選條件
              {Object.values(filters).some(v =>
                Array.isArray(v) ? v.length < 4 : v !== false
              ) && (
                <Badge variant="secondary" className="ml-2">
                  已套用
                </Badge>
              )}
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 border-t pt-4">
              <SearchFilters
                filters={filters}
                onFiltersChange={setFilters}
                sortOptions={sortOptions}
                onSortChange={setSortOptions}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          overview: dashboardData.totalCustomers,
          groups: dashboardData.groupsCount,
          companies: dashboardData.companiesCount,
          locations: dashboardData.locationsCount,
          analytics: 0,
        }}
      />

      {/* Tab Content */}
      <div className="min-h-[600px]">{tabContent}</div>
    </div>
  )
}

// ============================================================================
// Main Export with Provider
// ============================================================================

interface CustomerHierarchyDashboardProps {
  className?: string
}

export function CustomerHierarchyDashboard({ className }: CustomerHierarchyDashboardProps) {
  return (
    <CustomerHierarchyProvider>
      <div className={cn(className)}>
        <CustomerHierarchyDashboardImplementation />
      </div>
    </CustomerHierarchyProvider>
  )
}

export default CustomerHierarchyDashboard
