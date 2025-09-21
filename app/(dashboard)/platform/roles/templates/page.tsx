import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RoleTemplates } from '@/components/platform/roles/RoleTemplates'

export const metadata: Metadata = {
  title: '角色模板 | 井然 Orderly',
  description: '管理角色模板庫，包含預設模板和自定義模板。',
}

export default function RoleTemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            href="/platform/roles"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            返回角色管理
          </Link>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            匯入模板
          </button>
          <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            匯出模板
          </button>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
            新增模板
          </button>
        </div>
      </div>

      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">角色模板</h1>
          <p className="text-gray-600 mt-1">
            管理角色模板庫，快速創建標準化角色和權限配置
          </p>
        </div>

        <RoleTemplates />
      </div>
    </div>
  )
}