import { Metadata } from 'next'
import { Suspense } from 'react'
import FinanceOverview from '@/components/supplier/finance/finance-overview'
import InvoiceManager from '@/components/supplier/finance/invoice-manager'
import ReceivablesTracker from '@/components/supplier/finance/receivables-tracker'
import PaymentAnalytics from '@/components/supplier/finance/payment-analytics'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const metadata: Metadata = {
  title: '帳務管理 - 供應商入口 | Orderly',
  description: '應收帳款管理、發票開立、對帳管理、收款追蹤，優化財務流程'
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
  const activeTab = searchParams.tab || 'overview'

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            帳務管理
          </h1>
          <p className="text-gray-600 mt-1">
            應收帳款管理、發票開立、對帳管理，優化財務流程
          </p>
        </div>
        
        {/* 快速操作 */}
        <div className="flex items-center space-x-3">
          <button className="btn btn-outline">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            財務報表
          </button>
          <button className="btn btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            開立發票
          </button>
        </div>
      </div>

      {/* 財務概覽 - 始終顯示 */}
      <Suspense fallback={
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      }>
        <FinanceOverview />
      </Suspense>

      {/* 功能標籤頁 */}
      <Tabs value={activeTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>財務總覽</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>發票管理</span>
          </TabsTrigger>
          <TabsTrigger value="receivables" className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <span>應收帳款</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>收款分析</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              財務狀況總覽
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">本月財務指標</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">營業收入</span>
                    <span className="font-semibold text-green-600">NT$ 1,234,567</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">已收款</span>
                    <span className="font-semibold">NT$ 987,654</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">待收款</span>
                    <span className="font-semibold text-orange-600">NT$ 246,913</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-900 font-medium">收款率</span>
                    <span className="font-semibold text-blue-600">80.0%</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-3">帳齡分析</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">30天內</span>
                    <span className="font-semibold text-green-600">NT$ 180,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">31-60天</span>
                    <span className="font-semibold text-yellow-600">NT$ 45,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">61-90天</span>
                    <span className="font-semibold text-orange-600">NT$ 15,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">90天以上</span>
                    <span className="font-semibold text-red-600">NT$ 6,913</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Suspense fallback={
            <Card className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </Card>
          }>
            <InvoiceManager searchParams={searchParams} />
          </Suspense>
        </TabsContent>

        <TabsContent value="receivables" className="space-y-6">
          <Suspense fallback={
            <Card className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </Card>
          }>
            <ReceivablesTracker searchParams={searchParams} />
          </Suspense>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Suspense fallback={
            <Card className="p-6">
              <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
            </Card>
          }>
            <PaymentAnalytics />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}