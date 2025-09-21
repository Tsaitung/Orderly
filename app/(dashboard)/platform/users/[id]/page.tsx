import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { UserDetail } from '@/components/platform/users/UserDetail'

interface UserDetailPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: UserDetailPageProps): Promise<Metadata> {
  return {
    title: `使用者詳情 | 井然 Orderly`,
    description: `查看和管理使用者 ${params.id} 的詳細資訊、組織歸屬和權限設定。`,
  }
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            href="/platform/users"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            返回使用者清單
          </Link>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            編輯使用者
          </button>
          <button className="px-4 py-2 text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors">
            停用帳號
          </button>
        </div>
      </div>

      <UserDetail userId={params.id} />
    </div>
  )
}