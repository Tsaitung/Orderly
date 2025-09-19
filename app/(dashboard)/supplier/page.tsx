import { Metadata } from 'next'
import SupplierOverview from '@/components/supplier/supplier-overview'
import SupplierQuickActions from '@/components/supplier/supplier-quick-actions'
import SupplierOrderStatus from '@/components/supplier/supplier-order-status'
import SupplierRevenueChart from '@/components/supplier/supplier-revenue-chart'
import SupplierCustomerInsights from '@/components/supplier/supplier-customer-insights'
import SupplierUpcomingDeliveries from '@/components/supplier/supplier-upcoming-deliveries'

export const metadata: Metadata = {
  title: '供應商儀表板 - Orderly',
  description: '供應商營運指標總覽，包含訂單狀態、營收分析和客戶洞察'
}

export default function SupplierDashboardPage() {
  return (
    <div className="dashboard-content-spacing">
      {/* 頁面標題區塊 */}
      <div className="compact-spacing">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            供應商營運中心
          </h1>
          <p className="text-gray-600 mt-2">
            掌握訂單動態、追蹤營收表現，優化供應鏈協作效率
          </p>
        </div>
      </div>

      {/* 核心營運指標 */}
      <SupplierOverview />

      {/* 快速操作區 */}
      <SupplierQuickActions />

      {/* 主要內容網格 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
        {/* 訂單狀態追蹤 (佔 2/3 寬度) */}
        <div className="xl:col-span-2 dashboard-section-spacing">
          <SupplierOrderStatus />
          <SupplierRevenueChart />
        </div>

        {/* 客戶洞察和配送 (佔 1/3 寬度) */}
        <div className="xl:col-span-1 dashboard-section-spacing">
          <SupplierCustomerInsights />
          <SupplierUpcomingDeliveries />
        </div>
      </div>
    </div>
  )
}