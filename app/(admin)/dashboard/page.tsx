import type { Metadata } from 'next'
import { AdminDashboard } from '@/components/admin/AdminDashboard'

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
          <p className="text-gray-600 mt-1">
            即時監控井然 Orderly 平台的關鍵業務指標和系統狀態
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            系統正常運行
          </div>
          <div className="text-sm text-gray-500">
            最後更新：{new Date().toLocaleTimeString('zh-TW')}
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <AdminDashboard />
    </div>
  )
}