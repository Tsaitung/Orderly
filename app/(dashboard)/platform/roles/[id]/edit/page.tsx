import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RoleForm } from '@/components/platform/roles/RoleForm'

interface EditRolePageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: EditRolePageProps): Promise<Metadata> {
  return {
    title: `編輯角色 | 井然 Orderly`,
    description: `編輯角色 ${params.id} 的資訊、權限配置和設定。`,
  }
}

export default function EditRolePage({ params }: EditRolePageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/platform/roles/${params.id}`}
            className="flex items-center text-gray-600 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            返回角色詳情
          </Link>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href={`/platform/roles/${params.id}`}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            取消編輯
          </Link>
        </div>
      </div>

      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">編輯角色</h1>
          <p className="mt-1 text-gray-600">修改角色資訊、權限配置和進階設定</p>
        </div>

        <RoleForm mode="edit" roleId={params.id} />
      </div>
    </div>
  )
}
