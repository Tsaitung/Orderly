import type { Metadata } from 'next'
import { SystemHealthMonitor } from '@/components/admin/SystemHealthMonitor'

export const metadata: Metadata = {
  title: '系統健康監控',
  description: '即時監控井然 Orderly 平台所有服務的健康狀態和效能指標。',
}

export default function SystemHealthPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系統健康監控</h1>
          <p className="mt-1 text-gray-600">即時監控所有微服務的健康狀態、效能指標和可用性</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            所有服務正常
          </div>
        </div>
      </div>

      {/* System Health Monitor */}
      <SystemHealthMonitor />
    </div>
  )
}
