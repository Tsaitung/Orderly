import type { Metadata } from 'next'
import { CustomerManagement } from '@/components/platform/customers'

export const metadata: Metadata = {
  title: '客戶管理 | 平台管理 - 井然 Orderly',
  description: '全新架構的客戶層級管理系統，解決無限迴圈問題，提供更好的效能與使用者體驗。',
  keywords: '客戶管理,層級結構,效能優化,React,Next.js',
}

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客戶管理</h1>
          <p className="mt-1 text-gray-600">
            全新架構的客戶層級管理系統 - 簡化狀態管理，徹底解決無限迴圈問題
          </p>
        </div>
        <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
          新版本
        </div>
      </div>

      <CustomerManagement />
    </div>
  )
}
