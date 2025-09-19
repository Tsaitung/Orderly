import type { Metadata } from 'next'
import { ProductManagement } from '@/components/platform/products/ProductManagement'

export const metadata: Metadata = {
  title: '產品管理',
  description: '管理平台上的所有產品，包括產品目錄瀏覽、價格比較、審批流程和標準化工具。',
}

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">產品管理</h1>
          <p className="text-gray-600 mt-1">
            管理全平台產品目錄，包括價格監控、品質控制和產品標準化
          </p>
        </div>
      </div>

      <ProductManagement />
    </div>
  )
}