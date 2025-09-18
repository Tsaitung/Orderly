import React, { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import LogisticsStats from '@/components/supplier/logistics/logistics-stats'
import DeliveryMap from '@/components/supplier/logistics/delivery-map'
import DeliveryFilters from '@/components/supplier/logistics/delivery-filters'
import DeliveryList from '@/components/supplier/logistics/delivery-list'
import VehicleManagement from '@/components/supplier/logistics/vehicle-management'
import { Plus, MapPin, Truck, Route, AlertTriangle } from 'lucide-react'

export default function SupplierLogisticsPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">物流追蹤管理</h1>
          <p className="text-gray-600">配送追蹤、路線優化與車輛管理</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Route className="h-4 w-4 mr-2" />
            路線規劃
          </Button>
          <Button variant="outline">
            <AlertTriangle className="h-4 w-4 mr-2" />
            異常處理
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            新增配送
          </Button>
        </div>
      </div>

      {/* 物流統計 */}
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
        <LogisticsStats />
      </Suspense>

      {/* 配送地圖與車輛狀態 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense fallback={
            <Card className="p-6 h-96 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-full bg-gray-200 rounded"></div>
            </Card>
          }>
            <DeliveryMap />
          </Suspense>
        </div>
        
        <div>
          <Suspense fallback={
            <Card className="p-6 h-96 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </Card>
          }>
            <VehicleManagement />
          </Suspense>
        </div>
      </div>

      {/* 配送篩選器 */}
      <DeliveryFilters searchParams={searchParams} />

      {/* 配送列表 */}
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
        <DeliveryList searchParams={searchParams} />
      </Suspense>
    </div>
  )
}