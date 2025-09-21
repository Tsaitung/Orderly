'use client'

import { useEffect } from 'react'
import { usePlatformBillingStore } from '@/stores/platform-billing-store'
import { VirtualizedSupplierTable } from '@/components/platform/billing/suppliers/VirtualizedSupplierTable'
import { BillingAnalyticsCharts } from '@/components/platform/billing/suppliers/BillingAnalyticsCharts'
import { BatchOperationPanel } from '@/components/platform/billing/suppliers/BatchOperationPanel'
import { AnomalyMonitorPanel } from '@/components/platform/billing/suppliers/AnomalyMonitorPanel'
import { BillingFilters } from '@/components/platform/billing/shared/BillingFilters'
import { LoadingSkeletons } from '@/components/platform/billing/shared/LoadingSkeletons'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { 
  Users, 
  BarChart3, 
  Settings, 
  RefreshCw,
  Download,
  Filter,
  AlertTriangle
} from 'lucide-react'

export default function SupplierBillingPage() {
  const {
    suppliers: { 
      list, 
      total, 
      pagination, 
      filters, 
      selectedIds, 
      loading, 
      error,
      sortConfig
    },
    analytics: { data: analyticsData, loading: analyticsLoading },
    anomalies: { list: anomalies, loading: anomaliesLoading },
    actions: { 
      loadSuppliers, 
      loadBillingAnalytics,
      loadAnomalies,
      updateSupplierFilters,
      clearSupplierFilters,
      updatePagination,
      exportSupplierReport
    }
  } = usePlatformBillingStore()

  useEffect(() => {
    loadSuppliers()
    loadBillingAnalytics()
    loadAnomalies('open', undefined, 10)
  }, [loadSuppliers, loadBillingAnalytics, loadAnomalies])

  const handleRefresh = () => {
    loadSuppliers()
    loadBillingAnalytics()
    loadAnomalies('open', undefined, 10)
  }

  const handleFilterChange = (newFilters: any) => {
    updateSupplierFilters(newFilters)
    // 重新載入數據
    loadSuppliers()
  }

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      await exportSupplierReport(format)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  if (loading && list.length === 0) {
    return <LoadingSkeletons type="dashboard" />
  }

  if (error && list.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-800">載入失敗</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">供應商計費總覽</h1>
            <p className="text-gray-600 mt-1">
              管理供應商計費資料、分析表現並執行批次操作
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <select
                onChange={(e) => handleExport(e.target.value as any)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500"
                defaultValue=""
              >
                <option value="" disabled>匯出報表</option>
                <option value="csv">CSV 格式</option>
                <option value="excel">Excel 格式</option>
                <option value="pdf">PDF 格式</option>
              </select>
              <Download className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>刷新</span>
            </button>
          </div>
        </div>

        {/* 統計概覽 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">總供應商數</p>
                <p className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">本月總 GMV</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData?.revenue.totalRevenue 
                    ? `NT$ ${analyticsData.revenue.totalRevenue.toLocaleString()}`
                    : '--'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">平均費率</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData?.commissions.averageCommissionRate 
                    ? `${analyticsData.commissions.averageCommissionRate.toFixed(2)}%`
                    : '--'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">異常警報</p>
                <p className="text-2xl font-bold text-gray-900">
                  {anomalies.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 篩選器 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">篩選條件</h3>
          </div>
          
          <BillingFilters
            filters={filters}
            onChange={handleFilterChange}
            onClear={clearSupplierFilters}
          />
        </div>

        {/* 主要內容區域 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 供應商表格 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    供應商列表
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>
                      已選擇 {selectedIds.length} 個供應商
                    </span>
                    <span>
                      顯示 {list.length} / {total}
                    </span>
                  </div>
                </div>
              </div>
              
              <VirtualizedSupplierTable
                data={list}
                loading={loading}
                pagination={pagination}
                sortConfig={sortConfig}
                onPaginationChange={updatePagination}
              />
            </div>
          </div>

          {/* 側邊欄 */}
          <div className="space-y-6">
            {/* 批次操作面板 */}
            <BatchOperationPanel selectedCount={selectedIds.length} />
            
            {/* 異常監控面板 */}
            <AnomalyMonitorPanel 
              anomalies={anomalies}
              loading={anomaliesLoading}
            />
          </div>
        </div>

        {/* 分析圖表 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">計費分析</h3>
          </div>
          
          <BillingAnalyticsCharts
            data={analyticsData}
            loading={analyticsLoading}
          />
        </div>
      </div>
    </ErrorBoundary>
  )
}