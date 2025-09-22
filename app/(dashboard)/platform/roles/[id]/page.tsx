import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RoleDetail } from '@/components/platform/roles/RoleDetail'

interface RoleDetailPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: RoleDetailPageProps): Promise<Metadata> {
  return {
    title: `角色詳情 | 井然 Orderly`,
    description: `查看和管理角色 ${params.id} 的詳細資訊、權限配置和使用狀況。`,
  }
}

export default function RoleDetailPage({ params }: RoleDetailPageProps) {
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

        <div className="flex items-center space-x-3">
          <Link
            href={`/platform/roles/${params.id}/edit`}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            編輯角色
          </Link>
          <button className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50">
            複製角色
          </button>
          <button className="rounded-md border border-red-300 bg-white px-4 py-2 text-red-600 transition-colors hover:bg-red-50">
            停用角色
          </button>
        </div>
      </div>

      <RoleDetail roleId={params.id} />
    </div>
  )
}
