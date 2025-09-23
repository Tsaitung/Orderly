import { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { HeroSection } from '@/components/HeroSection'
import { ReconciliationDemo } from '@/components/ReconciliationDemo'
import { NavigationHeader } from '@/components/NavigationHeader'
import { RoleSelector } from '@/components/RoleSelector'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// 使用 dynamic import 載入 SystemStatus，禁用 SSR
const SystemStatus = dynamic(
  () => import('@/components/SystemStatus').then(mod => ({ default: mod.SystemStatus })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
        <div className="flex h-48 items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            <span className="text-gray-500">載入系統狀態...</span>
          </div>
        </div>
      </div>
    ),
  }
)

export const metadata: Metadata = {
  title: '井然 Orderly - 餐飲供應鏈自動化對帳平台',
  description:
    '透過 ERP 整合和 API 優先架構，實現下單到結算全流程自動化，將對帳時間從8小時縮短至30分鐘。',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50">
      {/* Navigation Header */}
      <NavigationHeader />

      {/* Hero Section */}
      <ErrorBoundary>
        <HeroSection />
      </ErrorBoundary>

      {/* Role Selector - Choose Restaurant or Supplier */}
      <RoleSelector />

      {/* System Status */}
      <section className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">系統狀態監控</h2>
            <p className="text-gray-600">即時監控所有服務健康狀態，確保 99.5% 可用性</p>
          </div>
          <SystemStatus />
        </div>
      </section>

      {/* Reconciliation Demo */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">自動化對帳展示</h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              體驗我們的核心功能：智能對帳引擎如何將繁瑣的手工對帳工作自動化， 從 8 小時縮短至 30
              分鐘，準確率達 95% 以上。
            </p>
          </div>
          <ReconciliationDemo />
        </div>
      </section>

      {/* Features Overview */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">核心功能特色</h2>
            <p className="text-lg text-gray-600">為餐飲業打造的全方位供應鏈數位化解決方案</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1: 自動化對帳 */}
            <div className="rounded-lg border border-gray-200 p-6 text-center transition-shadow hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <svg
                  className="h-8 w-8 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">自動化對帳</h3>
              <p className="text-gray-600">
                智能匹配訂單、送貨單、發票，95% 準確率自動處理對帳工作，大幅減少人工錯誤
              </p>
            </div>

            {/* Feature 2: ERP 整合 */}
            <div className="rounded-lg border border-gray-200 p-6 text-center transition-shadow hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-reconciliation-processing/10">
                <svg
                  className="h-8 w-8 text-reconciliation-processing"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">深度 ERP 整合</h3>
              <p className="text-gray-600">
                支援台灣主流 ERP 系統，提供標準 API 接口，無縫整合現有工作流程
              </p>
            </div>

            {/* Feature 3: 即時監控 */}
            <div className="rounded-lg border border-gray-200 p-6 text-center transition-shadow hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-reconciliation-approved/10">
                <svg
                  className="h-8 w-8 text-reconciliation-approved"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">即時監控分析</h3>
              <p className="text-gray-600">
                全天候監控交易狀態，提供詳細分析報表，幫助優化供應鏈效率
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-8 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h3 className="mb-2 text-2xl font-bold">井然 Orderly</h3>
            <p className="mb-4 text-gray-400">餐飲供應鏈自動化對帳平台</p>
            <div className="flex justify-center space-x-4 text-sm text-gray-400">
              <span>© 2025 Orderly Platform</span>
              <span>•</span>
              <span>Version 2.0.3</span>
              <span>•</span>
              <span>Built with Next.js 14</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
