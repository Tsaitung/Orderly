import { Metadata } from 'next'
import { Suspense } from 'react'
import OrderManagement from '@/components/supplier/orders/OrderManagement'
import OrderStats from '@/components/supplier/orders/order-stats'
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

      {/* 完整訂單管理界面 */}
      <OrderManagement />
    </div>
  )
}