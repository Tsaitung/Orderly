import type { Metadata } from 'next'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { LastUpdateTime } from '@/components/admin/LastUpdateTime'

export const metadata: Metadata = {
  title: '儀表板',
  description: '井然 Orderly 平台即時監控儀表板，追蹤關鍵業務指標和系統健康狀態。',
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">平台儀表板</h1>
          <p className="mt-1 text-gray-600">即時監控井然 Orderly 平台的關鍵業務指標和系統狀態</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            系統正常運行
          </div>
          <LastUpdateTime />
        </div>
      </div>

      {/* Dashboard Content */}
      <AdminDashboard />
    </div>
  )
}
