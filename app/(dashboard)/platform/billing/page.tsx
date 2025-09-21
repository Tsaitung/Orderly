'use client'

import { useEffect } from 'react'
import { usePlatformBillingStore } from '@/stores/platform-billing-store'
import { BillingKPICard } from '@/components/platform/billing/dashboard/BillingKPICard'
import { SystemHealthPanel } from '@/components/platform/billing/dashboard/SystemHealthPanel'
import { QuickActionsPanel } from '@/components/platform/billing/dashboard/QuickActionsPanel'
import { BillingAlertsPanel } from '@/components/platform/billing/dashboard/BillingAlertsPanel'
import { LoadingSkeletons } from '@/components/platform/billing/shared/LoadingSkeletons'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { 
  DollarSign, 
  Building2, 
  Percent, 
  TrendingUp,
  RefreshCw
} from 'lucide-react'

export default function BillingDashboardPage() {
  const {
    dashboard: { metrics, systemHealth, alerts, loading, error, lastUpdated },
    actions: { loadDashboardMetrics, loadSystemHealth, loadBillingAlerts, refreshDashboard }
  } = usePlatformBillingStore()

  useEffect(() => {
    refreshDashboard()
  }, [refreshDashboard])

  if (loading && !metrics) {
    return <LoadingSkeletons type="dashboard" />
  }

  if (error && !metrics) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-800">載入失敗</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={refreshDashboard}
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
            <h1 className="text-2xl font-bold text-gray-900">計費管理總覽</h1>
            <p className="text-gray-600 mt-1">
              監控平台計費機制、系統健康度與關鍵指標
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <p className="text-sm text-gray-500">
                最後更新：{lastUpdated.toLocaleString('zh-TW')}
              </p>
            )}
            <button
              onClick={refreshDashboard}
              disabled={loading}
              className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>刷新</span>
            </button>
          </div>
        </div>

        {/* KPI 指標卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <BillingKPICard
            title="月度佣金收入"
            value={metrics?.monthlyCommission.current}
            previousValue={metrics?.monthlyCommission.previous}
            change={metrics?.monthlyCommission.change}
            changePercentage={metrics?.monthlyCommission.changePercentage}
            icon={DollarSign}
            format="currency"
            loading={loading}
          />
          
          <BillingKPICard
            title="活躍供應商"
            value={metrics?.activeSuppliers.total}
            change={metrics?.activeSuppliers.change}
            changePercentage={metrics?.activeSuppliers.changePercentage}
            icon={Building2}
            format="number"
            loading={loading}
          />
          
          <BillingKPICard
            title="平均費率"
            value={metrics?.averageRate.current}
            previousValue={metrics?.averageRate.previous}
            change={metrics?.averageRate.change}
            icon={Percent}
            format="percentage"
            loading={loading}
          />
          
          <BillingKPICard
            title="GMV 成長率"
            value={metrics?.growthRate.gmv}
            icon={TrendingUp}
            format="percentage"
            trend="up"
            loading={loading}
          />
        </div>

        {/* 系統健康度和快速操作 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SystemHealthPanel 
              health={systemHealth}
              loading={loading}
            />
          </div>
          <div>
            <QuickActionsPanel />
          </div>
        </div>

        {/* 告警面板 */}
        <BillingAlertsPanel 
          alerts={alerts}
          loading={loading}
        />
      </div>
    </ErrorBoundary>
  )
}