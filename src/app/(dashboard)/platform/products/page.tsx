import type { Metadata } from 'next'
import { SKUManagement } from '@/components/platform/products/ProductManagement'

export const metadata: Metadata = {
  title: 'SKU管理',
  description: '管理平台上的所有SKU變體，包括多供應商比較、批次追蹤、到期管理和價格分析。',
}

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SKU管理</h1>
          <p className="mt-1 text-gray-600">
            管理全平台SKU變體目錄，包括多供應商價格比較、批次追蹤與到期管理
          </p>
        </div>
      </div>

      <SKUManagement />
    </div>
  )
}
