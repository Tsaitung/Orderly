// ============================================================================
// Customer Hierarchy Dashboard - Main Component
// ============================================================================
// Sophisticated tabbed business intelligence interface for customer management
// Replaces the simple CustomerManagement component with enhanced BI features

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
  Globe
} from 'lucide-react';

// Import existing context and hooks
import { CustomerHierarchyProvider } from '../../context/CustomerHierarchyContext';
import { useCustomerHierarchy } from '../../hooks/useCustomerHierarchy';
import { useDebounce } from '../../hooks/useDebounce';

// Import types
import type { 
  DashboardTab, 
  DashboardStatistics, 
  ActivityMetrics,
  CustomerMetrics,
  FilterOptions,
  SortOptions,
  ExportOptions
} from '../../types';

// Import tab components (to be created)
import TabNavigation from './TabNavigation';
import OverviewTab from './tabs/OverviewTab';
import GroupsTab from './tabs/GroupsTab';
import CompaniesTab from './tabs/CompaniesTab';
import LocationsTab from './tabs/LocationsTab';
import AnalyticsTab from './tabs/AnalyticsTab';

// Import shared components (to be created)
import SearchFilters from './shared/SearchFilters';

// ============================================================================
// Mock Data Service (to be replaced with real API calls)
// ============================================================================

const mockDashboardData: DashboardStatistics = {
  totalCustomers: 13,
  activeCustomers: 11,
  inactiveCustomers: 2,
  groupsCount: 13,
  companiesCount: 13,
  locationsCount: 47,
  businessUnitsCount: 125,
  totalMonthlyRevenue: 2580000,
  revenueGrowth: 15.8,
  avgActivityScore: 78.5,
  topPerformers: [
    {
      id: '1',
      name: '王品集團',
      type: 'group',
      monthlyRevenue: 450000,
      orderCount: 156,
      activityScore: 92,
      trend: 'up'
    },
    {
      id: '2', 
      name: '瓦城集團',
      type: 'group',
      monthlyRevenue: 380000,
      orderCount: 134,
      activityScore: 88,
      trend: 'up'
    },
    {
      id: '3',
      name: '漢來集團',
      type: 'group',
      monthlyRevenue: 320000,
      orderCount: 112,
      activityScore: 85,
      trend: 'stable'
    }
  ]
};

// ============================================================================
// Dashboard State Management Hook
// ============================================================================

interface UseDashboardStateReturn {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedSearch: string;
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  sortOptions: SortOptions;
  setSortOptions: (options: SortOptions) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  dashboardData: DashboardStatistics;
  isLoadingDashboard: boolean;
  refreshDashboard: () => Promise<void>;
  exportData: (options: ExportOptions) => Promise<void>;
}

function useDashboardState(): UseDashboardStateReturn {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  
  const [filters, setFilters] = useState<FilterOptions>({
    types: ['group', 'company', 'location', 'business_unit'],
    activityLevels: ['active', 'medium', 'low', 'dormant'],
    includeInactive: false
  });

  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'name',
    direction: 'asc'
  });

  const refreshDashboard = useCallback(async () => {
    setIsLoadingDashboard(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real implementation, this would fetch fresh dashboard data
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  const exportData = useCallback(async (options: ExportOptions) => {
    // Simulate export functionality
    console.log('Exporting data with options:', options);
    // In real implementation, this would generate and download the export file
  }, []);

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
    dashboardData: mockDashboardData,
    isLoadingDashboard,
    refreshDashboard,
    exportData
  };
}

// ============================================================================
// Main Dashboard Implementation
// ============================================================================

function CustomerHierarchyDashboardImplementation() {
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
    exportData
  } = useDashboardState();

  // Get existing hierarchy data and functionality
  const {
    tree,
    selectedNodeId,
    searchResults,
    isLoading,
    error,
    loadTree,
    search,
    clearSearch,
    clearError
  } = useCustomerHierarchy({
    autoLoad: true,
    includeInactive: filters.includeInactive
  });

  // Effect to trigger search when debounced value changes
  useEffect(() => {
    if (debouncedSearch.trim()) {
      search(debouncedSearch);
    } else {
      clearSearch();
    }
  }, [debouncedSearch, search, clearSearch]);

  // Memoized tab content based on active tab
  const tabContent = useMemo(() => {
    const commonProps = {
      tree,
      searchResults,
      filters,
      sortOptions,
      searchQuery: debouncedSearch
    };

    switch (activeTab) {
      case 'overview':
        return <OverviewTab dashboardData={dashboardData} {...commonProps} />;
      case 'groups':
        return <GroupsTab {...commonProps} />;
      case 'companies':
        return <CompaniesTab {...commonProps} />;
      case 'locations':
        return <LocationsTab {...commonProps} />;
      case 'analytics':
        return <AnalyticsTab dashboardData={dashboardData} {...commonProps} />;
      default:
        return <OverviewTab dashboardData={dashboardData} {...commonProps} />;
    }
  }, [activeTab, tree, searchResults, filters, sortOptions, debouncedSearch, dashboardData]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    clearError();
    await Promise.all([
      loadTree(),
      refreshDashboard()
    ]);
  }, [clearError, loadTree, refreshDashboard]);

  // Handle export
  const handleExport = useCallback(async () => {
    await exportData({
      format: 'excel',
      includeMetrics: true,
      includeActivity: true,
      selectedOnly: false
    });
  }, [exportData]);

  // Error state
  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="max-w-md mx-auto">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-red-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">載入客戶資料時發生錯誤</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={handleRefresh} loading={isLoading || isLoadingDashboard}>
            <RefreshCw className="mr-2 h-4 w-4" />
            重試
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">客戶層級總覽</h1>
          <p className="text-gray-600 mt-1">統一管理客戶組織架構與業務表現</p>
        </div>
        
        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline" 
            size="sm"
            onClick={handleExport}
          >
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card variant="filled" colorScheme="primary" className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
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
            <div className="flex items-center justify-center mb-2">
              <Building2 className="h-5 w-5 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {dashboardData.groupsCount}
            </div>
            <div className="text-xs text-gray-700">客戶集團</div>
          </CardContent>
        </Card>

        <Card variant="filled" colorScheme="gray" className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <Globe className="h-5 w-5 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {dashboardData.companiesCount}
            </div>
            <div className="text-xs text-gray-700">公司數量</div>
          </CardContent>
        </Card>

        <Card variant="filled" colorScheme="gray" className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <MapPin className="h-5 w-5 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {dashboardData.locationsCount}
            </div>
            <div className="text-xs text-gray-700">營業據點</div>
          </CardContent>
        </Card>

        <Card variant="filled" colorScheme="green" className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-900">
              {dashboardData.revenueGrowth}%
            </div>
            <div className="text-xs text-green-700">營收成長</div>
          </CardContent>
        </Card>

        <Card variant="filled" colorScheme="platform" className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
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
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜尋客戶、集團、公司..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              {Object.values(filters).some(v => Array.isArray(v) ? v.length < 4 : v !== false) && (
                <Badge variant="secondary" className="ml-2">
                  已套用
                </Badge>
              )}
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
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
          analytics: 0
        }}
      />

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {tabContent}
      </div>
    </div>
  );
}

// ============================================================================
// Main Export with Provider
// ============================================================================

interface CustomerHierarchyDashboardProps {
  className?: string;
}

export function CustomerHierarchyDashboard({ className }: CustomerHierarchyDashboardProps) {
  return (
    <CustomerHierarchyProvider>
      <div className={cn(className)}>
        <CustomerHierarchyDashboardImplementation />
      </div>
    </CustomerHierarchyProvider>
  );
}

export default CustomerHierarchyDashboard;