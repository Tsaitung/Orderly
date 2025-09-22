import { Metadata } from 'next'
import ReconciliationWorkspace from '@/components/reconciliation/reconciliation-workspace'
import ReconciliationHeader from '@/components/reconciliation/reconciliation-header'
import ReconciliationSidebar from '@/components/reconciliation/reconciliation-sidebar'
import LiveReconciliationFeed from '@/components/reconciliation/live-reconciliation-feed'

export const metadata: Metadata = {
  title: '即時對帳系統 - 餐廳管理 | Orderly',
  description: 'AI 驅動的智能對帳系統，實現 95% 自動化對帳準確率',
}

export default function ReconciliationPage() {
  return (
    <div className="flex h-full flex-col space-y-6">
      {/* 對帳系統頁面標題 */}
      <div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">即時對帳系統</h1>
        <p className="text-gray-600">
          AI 機器學習引擎驅動的智能對帳平台，實現訂單自動匹配與異常檢測
        </p>
      </div>

      {/* 對帳操作頭部 */}
      <ReconciliationHeader />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-4">
        {/* 對帳工作區域 (佔 3/4 寬度) */}
        <div className="space-y-6 xl:col-span-3">
          <ReconciliationWorkspace />
        </div>

        {/* 即時處理側邊欄 (佔 1/4 寬度) */}
        <div className="space-y-6 xl:col-span-1">
          <ReconciliationSidebar />
          <LiveReconciliationFeed />
        </div>
      </div>
    </div>
  )
}
