import { Metadata } from 'next'
import { Suspense } from 'react'
import OrderList from '@/components/supplier/orders/order-list'
import OrderStats from '@/components/supplier/orders/order-stats'
import OrderFilters from '@/components/supplier/orders/order-filters'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = {
  title: '訂單管理 - 供應商入口 | Orderly',
  description: '管理所有訂單，快速處理待確認訂單，追蹤配送狀態，提升供應鏈效率'
}

interface OrderPageProps {
  searchParams: {
    status?: string
    customer?: string
    dateFrom?: string
    dateTo?: string
    search?: string
    page?: string
  }
}

export default function SupplierOrdersPage({ searchParams }: OrderPageProps) {
  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            訂單管理
          </h1>
          <p className="text-gray-600 mt-1">
            管理所有訂單，快速處理待確認訂單，追蹤配送狀態
          </p>
        </div>
        
        {/* 快速操作 */}
        <div className="flex items-center space-x-3">
          <button className="btn btn-outline">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            導出報表
          </button>
          <button className="btn btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            批次處理
          </button>
        </div>
      </div>

      {/* 訂單統計卡片 */}
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
        <OrderStats />
      </Suspense>

      {/* 篩選與搜索 */}
      <Card className="p-6">
        <OrderFilters searchParams={searchParams} />
      </Card>

      {/* 訂單列表 */}
      <Card className="p-6">
        <Suspense fallback={
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        }>
          <OrderList searchParams={searchParams} />
        </Suspense>
      </Card>
    </div>
  )
}