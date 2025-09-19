import type { Metadata } from 'next'
import { DemandItemsManagement } from '@/components/platform/demand-items/DemandItemsManagement'

export const metadata: Metadata = {
  title: '需求品項管理',
  description: '分析和管理平台需求品項，包括需求分析、趨勢預測和跨供應商庫存可見性。',
}

export default function DemandItemsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">需求品項管理</h1>
          <p className="text-gray-600 mt-1">
            分析平台需求趨勢，管理品項熱度和跨供應商庫存可見性
          </p>
        </div>
      </div>

      <DemandItemsManagement />
    </div>
  )
}