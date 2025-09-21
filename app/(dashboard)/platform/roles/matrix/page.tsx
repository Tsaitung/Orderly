import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PermissionMatrix } from '@/components/platform/roles/PermissionMatrix'

export const metadata: Metadata = {
  title: '權限矩陣 | 井然 Orderly',
  description: '檢視和管理所有角色與權限的對應關係矩陣。',
}

export default function PermissionMatrixPage() {
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
            匯出Excel
          </button>
          <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            檢查衝突
          </button>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
            批量編輯
          </button>
        </div>
      </div>

      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">權限矩陣</h1>
          <p className="text-gray-600 mt-1">
            檢視所有角色與權限的對應關係，支援快速編輯和批量調整
          </p>
        </div>

        <PermissionMatrix />
      </div>
    </div>
  )
}