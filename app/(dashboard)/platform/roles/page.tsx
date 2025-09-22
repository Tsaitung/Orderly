import type { Metadata } from 'next'
import { RoleManagement } from '@/components/platform/roles/RoleManagement'

export const metadata: Metadata = {
  title: '角色管理 | 井然 Orderly',
  description: '管理平台角色、權限配置，支援動態角色創建和細粒度權限控制。',
}

export default function RoleManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">角色管理</h1>
          <p className="mt-1 text-gray-600">創建和管理角色，配置權限和細粒度權限控制</p>
        </div>

        <div className="flex items-center space-x-3">
          <button className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50">
            權限矩陣
          </button>
          <button className="rounded-md bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700">
            新增角色
          </button>
        </div>
      </div>

      <RoleManagement />
    </div>
  )
}
