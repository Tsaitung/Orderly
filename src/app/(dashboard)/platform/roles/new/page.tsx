import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RoleForm } from '@/components/platform/roles/RoleForm'

export const metadata: Metadata = {
  title: '新增角色 | 井然 Orderly',
  description: '創建新的系統角色，設定權限和配置。',
}

export default function NewRolePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/platform/roles"
            className="flex items-center text-gray-600 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            返回角色管理
          </Link>
        </div>
      </div>

      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">新增角色</h1>
          <p className="mt-1 text-gray-600">創建新的系統角色，設定基本資訊和權限配置</p>
        </div>

        <RoleForm mode="create" />
      </div>
    </div>
  )
}
