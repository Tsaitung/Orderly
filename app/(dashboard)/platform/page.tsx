import type { Metadata } from 'next'
import { PlatformDashboard } from '@/components/platform/PlatformDashboard'

export const metadata: Metadata = {
  title: '平台總覽',
  description: '井然 Orderly 平台管理總覽，即時監控關鍵業務指標、系統狀態和運營數據。',
}

export default function PlatformDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">平台總覽</h1>
          <p className="mt-1 text-gray-600">
            監控井然 Orderly 平台的關鍵業務指標、系統狀態和運營數據
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            系統正常運行
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <PlatformDashboard />
    </div>
  )
}
