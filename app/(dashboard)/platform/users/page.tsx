import type { Metadata } from 'next'
import { UserManagement } from '@/components/platform/users/UserManagement'

export const metadata: Metadata = {
  title: '使用者管理 | 井然 Orderly',
  description: '管理平台所有使用者帳號、組織歸屬和權限設定。',
}

export default function UserManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">使用者管理</h1>
          <p className="text-gray-600 mt-1">
            管理平台使用者帳號、組織歸屬和權限設定
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            匯出資料
          </button>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
            新增使用者
          </button>
        </div>
      </div>

      <UserManagement />
    </div>
  )
}