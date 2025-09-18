import type { Metadata } from 'next'
import { UserManagement } from '@/components/admin/UserManagement'

export const metadata: Metadata = {
  title: '用戶管理',
  description: '管理井然 Orderly 平台的餐廳和供應商用戶，包含權限設定和生命週期管理。',
}

export default function UserManagementPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用戶管理</h1>
          <p className="text-gray-600 mt-1">
            管理平台用戶、權限設定和帳戶生命週期
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            新增用戶
          </button>
        </div>
      </div>

      {/* User Management */}
      <UserManagement />
    </div>
  )
}