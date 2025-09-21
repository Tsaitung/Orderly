import { Metadata } from 'next'
import { Suspense } from 'react'
import SupplierFinanceDashboard from '@/components/supplier/finance/SupplierFinanceDashboard'
import BillingSettings from '@/components/supplier/finance/BillingSettings'
import MonthlyStatements from '@/components/supplier/finance/MonthlyStatements'
import PaymentHistory from '@/components/supplier/finance/PaymentHistory'
import RatingBenefits from '@/components/supplier/finance/RatingBenefits'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const metadata: Metadata = {
  title: '財務管理 - 供應商入口 | Orderly',
  description: '訂閱管理、帳單查詢、付款記錄、評級權益，完整的財務管理解決方案'
}

interface FinancePageProps {
  searchParams: {
    tab?: string
    status?: string
    customer?: string
    dateFrom?: string
    dateTo?: string
  }
}

export default function SupplierFinancePage({ searchParams }: FinancePageProps) {
  const activeTab = searchParams.tab || 'dashboard'

  return (
    <div className="space-y-6">
      {/* 功能標籤頁 */}
      <Tabs value={activeTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>財務儀表板</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>訂閱設定</span>
          </TabsTrigger>
          <TabsTrigger value="statements" className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>月度帳單</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>付款記錄</span>
          </TabsTrigger>
          <TabsTrigger value="rating" className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>評級權益</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <Suspense fallback={
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </Card>
              ))}
            </div>
          }>
            <SupplierFinanceDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Suspense fallback={
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="grid grid-cols-3 gap-4">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="h-32 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          }>
            <BillingSettings />
          </Suspense>
        </TabsContent>

        <TabsContent value="statements" className="space-y-6">
          <Suspense fallback={
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-4">
                    {[...Array(5)].map((_, j) => (
                      <div key={j} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          }>
            <MonthlyStatements />
          </Suspense>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Suspense fallback={
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-4">
                    {[...Array(5)].map((_, j) => (
                      <div key={j} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          }>
            <PaymentHistory />
          </Suspense>
        </TabsContent>

        <TabsContent value="rating" className="space-y-6">
          <Suspense fallback={
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="h-24 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          }>
            <RatingBenefits />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}