import type { Metadata } from 'next'
import { PlatformSidebar } from '@/components/platform/PlatformSidebar'
import { PlatformHeader } from '@/components/platform/PlatformHeader'
import { AuthGuard } from '@/components/auth/AuthGuard'

export const metadata: Metadata = {
  title: {
    template: '%s | 平台管理 - 井然 Orderly',
    default: '平台管理 - 井然 Orderly',
  },
  description: '井然 Orderly 平台管理中心，統一管理供應商、客戶、交易、產品和類別。',
}

interface PlatformLayoutProps {
  children: React.ReactNode
}

export default function PlatformLayout({ children }: PlatformLayoutProps) {
  return (
    <AuthGuard requiredRole="platform_admin">
      <div className="min-h-screen bg-gray-50 theme-platform">
        {/* Platform Header */}
        <PlatformHeader />
        
        <div className="flex">
          {/* Sidebar */}
          <PlatformSidebar />
          
          {/* Main Content */}
          <main className="flex-1 lg:ml-64 pt-16">
            <div className="p-6 space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}