import React, { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ProductStats from '@/components/supplier/products/product-stats'
import ProductFilters from '@/components/supplier/products/product-filters'
import ProductList from '@/components/supplier/products/product-list'
import { Plus } from 'lucide-react'

export default function SupplierProductsPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">產品目錄</h1>
          <p className="text-gray-600">管理產品資訊、價格策略與庫存</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            批量匯入
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            新增產品
          </Button>
        </div>
      </div>

      {/* 產品統計 */}
      <Suspense fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      }>
        <ProductStats />
      </Suspense>

      {/* 產品篩選器 */}
      <ProductFilters searchParams={searchParams} />

      {/* 產品列表 */}
      <Suspense fallback={
        <Card className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      }>
        <ProductList searchParams={searchParams} />
      </Suspense>
    </div>
  )
}