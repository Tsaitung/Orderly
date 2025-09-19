import type { Metadata } from 'next'
import { CustomerManagement } from '@/components/platform/customers/CustomerManagement'

export const metadata: Metadata = {
  title: '客戶管理',
  description: '管理平台上的所有餐廳客戶，包括客戶分析、訂閱管理和業務洞察。',
}

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客戶管理</h1>
          <p className="text-gray-600 mt-1">
            管理和分析平台上的餐廳客戶，包括業務指標、訂閱狀態和客戶洞察
          </p>
        </div>
      </div>

      <CustomerManagement />
    </div>
  )
}