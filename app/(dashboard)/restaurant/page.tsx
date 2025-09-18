import { Metadata } from 'next'
import DashboardOverview from '@/components/dashboard/dashboard-overview'
import QuickActions from '@/components/dashboard/quick-actions'
import RecentOrders from '@/components/dashboard/recent-orders'
import ReconciliationStatus from '@/components/dashboard/reconciliation-status'
import PerformanceMetrics from '@/components/dashboard/performance-metrics'

export const metadata: Metadata = {
  title: '儀表板總覽 - 餐廳管理 | Orderly',
  description: '餐廳營運指標總覽，包含訂單狀態、對帳進度和績效分析'
}

export default function RestaurantDashboardPage() {
  return (
    <div className="spacing-tight theme-restaurant">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          儀表板總覽
        </h1>
        <p className="text-gray-600">
          查看餐廳營運狀況、訂單處理進度和重要業務指標
        </p>
      </div>

      {/* 核心指標卡片 */}
      <DashboardOverview />

      {/* 快速操作 */}
      <QuickActions />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 對帳狀態 (佔 2/3 寬度) */}
        <div className="xl:col-span-2">
          <ReconciliationStatus />
        </div>

        {/* 績效指標 (佔 1/3 寬度) */}
        <div className="xl:col-span-1">
          <PerformanceMetrics />
        </div>
      </div>

      {/* 近期訂單 */}
      <RecentOrders />
    </div>
  )
}