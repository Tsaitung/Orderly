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
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            返回角色管理
          </Link>
        </div>
        
        <div className="flex items-center space-x-3">
          <Link
            href={`/platform/roles/${params.id}/edit`}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            編輯角色
          </Link>
          <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            複製角色
          </button>
          <button className="px-4 py-2 text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors">
            停用角色
          </button>
        </div>
      </div>

      <RoleDetail roleId={params.id} />
    </div>
  )
}