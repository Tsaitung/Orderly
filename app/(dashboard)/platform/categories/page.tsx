import type { Metadata } from 'next'
import { CategoryManagement } from '@/components/platform/categories/CategoryManagement'

export const metadata: Metadata = {
  title: '類別管理',
  description: '管理平台產品類別，包括類別階層編輯、產品分類映射和標準化執行。',
}

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">類別管理</h1>
          <p className="mt-1 text-gray-600">管理產品類別階層，執行分類標準化和績效分析</p>
        </div>
      </div>

      <CategoryManagement />
    </div>
  )
}
