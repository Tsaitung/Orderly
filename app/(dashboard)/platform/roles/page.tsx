import type { Metadata } from 'next'
import { RoleManagement } from '@/components/platform/roles/RoleManagement'

export const metadata: Metadata = {
  title: '角色管理 | 井然 Orderly',
  description: '管理平台角色、權限配置和角色模板，支援動態角色創建和細粒度權限控制。',
}

export default function RoleManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">角色管理</h1>
          <p className="text-gray-600 mt-1">
            創建和管理角色，配置權限，支援基於模板的快速角色設定
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            權限矩陣
          </button>
          <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            角色模板
          </button>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
            新增角色
          </button>
        </div>
      </div>

      <RoleManagement />
    </div>
  )
}