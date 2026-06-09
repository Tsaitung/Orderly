import React, { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import CustomerStats from '@/components/supplier/customers/customer-stats'
import CustomerFilters from '@/components/supplier/customers/customer-filters'
import CustomerList from '@/components/supplier/customers/customer-list'
import CustomerSegments from '@/components/supplier/customers/customer-segments'
import { Plus, Download, MessageSquare } from 'lucide-react'

export default function SupplierCustomersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客戶關係管理</h1>
          <p className="text-gray-600">客戶分析、關係維護與價值提升</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            匯出報表
          </Button>
          <Button variant="outline">
            <MessageSquare className="mr-2 h-4 w-4" />
            群發通知
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            新增客戶
          </Button>
        </div>
      </div>

      {/* 客戶統計 */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse p-6">
                <div className="mb-2 h-4 rounded bg-gray-200"></div>
                <div className="h-8 rounded bg-gray-200"></div>
              </Card>
            ))}
          </div>
        }
      >
        <CustomerStats />
      </Suspense>

      {/* 客戶分群分析 */}
      <Suspense
        fallback={
          <Card className="animate-pulse p-6">
            <div className="mb-4 h-6 rounded bg-gray-200"></div>
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 rounded bg-gray-200"></div>
              ))}
            </div>
          </Card>
        }
      >
        <CustomerSegments />
      </Suspense>

      {/* 客戶篩選器 */}
      <CustomerFilters searchParams={searchParams} />

      {/* 客戶列表 */}
      <Suspense
        fallback={
          <Card className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border p-4">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full bg-gray-200"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 rounded bg-gray-200"></div>
                      <div className="h-3 w-1/3 rounded bg-gray-200"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        }
      >
        <CustomerList searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
