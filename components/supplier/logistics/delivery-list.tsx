'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  MapPin,
  Clock,
  Truck,
  Phone,
  Navigation,
  Package,
  User,
  AlertTriangle,
  CheckCircle,
  Eye,
  MoreVertical,
  MessageSquare,
  Route,
  Thermometer
} from 'lucide-react'

interface DeliveryListProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

// 模擬配送數據
const mockDeliveries = [
  {
    id: 'DEL-2025-001',
    orderId: 'ORD-2025-001',
    customer: {
      name: '大樂司餐廳',
      contact: '王經理',
      phone: '02-2345-6789',
      address: '台北市大安區忠孝東路四段123號'
    },
    vehicle: {
      id: 'VH-001',
      plateNumber: 'ABC-1234',
      type: 'refrigerated',
      driver: '張大明',
      driverPhone: '0912-345-678'
    },
    status: 'delivering',
    priority: 'high',
    scheduledTime: new Date('2025-09-18T14:30:00'),
    estimatedArrival: new Date('2025-09-18T14:45:00'),
    actualArrival: null,
    items: [
      { name: '有機胡蘿蔔', quantity: 20, unit: 'kg' },
      { name: '新鮮白菜', quantity: 15, unit: 'kg' }
    ],
    totalValue: 1250,
    distance: 8.5,
    temperature: -18,
    progress: 75,
    route: {
      origin: '配送中心',
      destination: '台北市大安區忠孝東路四段123號',
      estimatedDuration: 25,
      actualDuration: null
    },
    tracking: [
      { time: new Date('2025-09-18T13:00:00'), event: '訂單已備貨', location: '配送中心' },
      { time: new Date('2025-09-18T13:30:00'), event: '開始裝載', location: '配送中心' },
      { time: new Date('2025-09-18T14:00:00'), event: '出發配送', location: '配送中心' },
      { time: new Date('2025-09-18T14:20:00'), event: '配送途中', location: '台北市信義區' }
    ]
  },
  {
    id: 'DEL-2025-002',
    orderId: 'ORD-2025-002',
    customer: {
      name: '稻舍餐廳',
      contact: '林總監',
      phone: '02-8765-4321',
      address: '台北市信義區市府路45號'
    },
    vehicle: {
      id: 'VH-002',
      plateNumber: 'DEF-5678',
      type: 'standard',
      driver: '李小華',
      driverPhone: '0987-654-321'
    },
    status: 'loading',
    priority: 'normal',
    scheduledTime: new Date('2025-09-18T15:00:00'),
    estimatedArrival: new Date('2025-09-18T15:30:00'),
    actualArrival: null,
    items: [
      { name: '冷凍蝦仁', quantity: 5, unit: 'kg' },
      { name: '牛肉片', quantity: 8, unit: 'kg' }
    ],
    totalValue: 3450,
    distance: 12.3,
    temperature: null,
    progress: 0,
    route: {
      origin: '配送中心',
      destination: '台北市信義區市府路45號',
      estimatedDuration: 30,
      actualDuration: null
    },
    tracking: [
      { time: new Date('2025-09-18T14:30:00'), event: '訂單已備貨', location: '配送中心' },
      { time: new Date('2025-09-18T14:50:00'), event: '準備裝載', location: '配送中心' }
    ]
  },
  {
    id: 'DEL-2025-003',
    orderId: 'ORD-2025-003',
    customer: {
      name: '樂多多火鍋',
      contact: '陳店長',
      phone: '04-2234-5678',
      address: '台中市西屯區文心路三段789號'
    },
    vehicle: {
      id: 'VH-003',
      plateNumber: 'GHI-9012',
      type: 'refrigerated',
      driver: '王志明',
      driverPhone: '0923-456-789'
    },
    status: 'delivered',
    priority: 'normal',
    scheduledTime: new Date('2025-09-18T12:00:00'),
    estimatedArrival: new Date('2025-09-18T12:30:00'),
    actualArrival: new Date('2025-09-18T12:25:00'),
    items: [
      { name: '火鍋肉片', quantity: 10, unit: 'kg' },
      { name: '蔬菜拼盤', quantity: 5, unit: '份' }
    ],
    totalValue: 2680,
    distance: 45.2,
    temperature: -20,
    progress: 100,
    route: {
      origin: '配送中心',
      destination: '台中市西屯區文心路三段789號',
      estimatedDuration: 60,
      actualDuration: 55
    },
    tracking: [
      { time: new Date('2025-09-18T10:30:00'), event: '訂單已備貨', location: '配送中心' },
      { time: new Date('2025-09-18T11:00:00'), event: '開始裝載', location: '配送中心' },
      { time: new Date('2025-09-18T11:30:00'), event: '出發配送', location: '配送中心' },
      { time: new Date('2025-09-18T12:25:00'), event: '送達完成', location: '台中市西屯區' }
    ]
  },
  {
    id: 'DEL-2025-004',
    orderId: 'ORD-2025-004',
    customer: {
      name: '五星大飯店',
      contact: '張採購',
      phone: '07-1234-5678',
      address: '高雄市前鎮區民權二路567號'
    },
    vehicle: {
      id: 'VH-001',
      plateNumber: 'ABC-1234',
      type: 'refrigerated',
      driver: '張大明',
      driverPhone: '0912-345-678'
    },
    status: 'delayed',
    priority: 'urgent',
    scheduledTime: new Date('2025-09-18T13:00:00'),
    estimatedArrival: new Date('2025-09-18T15:30:00'),
    actualArrival: null,
    items: [
      { name: '高級海鮮', quantity: 15, unit: 'kg' },
      { name: '進口牛排', quantity: 8, unit: 'kg' }
    ],
    totalValue: 8950,
    distance: 95.6,
    temperature: -22,
    progress: 45,
    route: {
      origin: '配送中心',
      destination: '高雄市前鎮區民權二路567號',
      estimatedDuration: 120,
      actualDuration: null
    },
    tracking: [
      { time: new Date('2025-09-18T11:30:00'), event: '訂單已備貨', location: '配送中心' },
      { time: new Date('2025-09-18T12:30:00'), event: '開始裝載', location: '配送中心' },
      { time: new Date('2025-09-18T13:15:00'), event: '出發配送', location: '配送中心' },
      { time: new Date('2025-09-18T14:30:00'), event: '交通延誤', location: '台南市' }
    ]
  }
]

export default function DeliveryList({ searchParams }: DeliveryListProps) {
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([])
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null)

  const getStatusInfo = (status: string) => {
    const statusMap = {
      pending: { label: '待配送', variant: 'outline' as const, color: 'text-gray-600' },
      loading: { label: '裝載中', variant: 'warning' as const, color: 'text-orange-600' },
      delivering: { label: '配送中', variant: 'info' as const, color: 'text-blue-600' },
      delivered: { label: '已送達', variant: 'success' as const, color: 'text-green-600' },
      delayed: { label: '延遲', variant: 'destructive' as const, color: 'text-red-600' },
      failed: { label: '配送失敗', variant: 'destructive' as const, color: 'text-red-600' },
      cancelled: { label: '已取消', variant: 'outline' as const, color: 'text-gray-600' }
    }
    return statusMap[status as keyof typeof statusMap] || statusMap.pending
  }

  const getPriorityInfo = (priority: string) => {
    const priorityMap = {
      urgent: { label: '緊急', variant: 'destructive' as const },
      high: { label: '高', variant: 'warning' as const },
      normal: { label: '普通', variant: 'outline' as const },
      low: { label: '低', variant: 'outline' as const }
    }
    return priorityMap[priority as keyof typeof priorityMap] || priorityMap.normal
  }

  const getVehicleTypeIcon = (type: string) => {
    return type === 'refrigerated' ? (
      <div className="flex items-center space-x-1">
        <Truck className="h-4 w-4" />
        <Thermometer className="h-3 w-3 text-blue-500" />
      </div>
    ) : (
      <Truck className="h-4 w-4" />
    )
  }

  const toggleDeliveryExpansion = (deliveryId: string) => {
    setExpandedDelivery(expandedDelivery === deliveryId ? null : deliveryId)
  }

  const toggleSelectDelivery = (deliveryId: string) => {
    setSelectedDeliveries(prev => 
      prev.includes(deliveryId) 
        ? prev.filter(id => id !== deliveryId)
        : [...prev, deliveryId]
    )
  }

  const selectAllDeliveries = () => {
    setSelectedDeliveries(mockDeliveries.map(d => d.id))
  }

  const clearSelection = () => {
    setSelectedDeliveries([])
  }

  return (
    <Card className="p-6">
      {/* 列表標題與批量操作 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">配送列表</h2>
          <Badge variant="outline">共 {mockDeliveries.length} 筆配送</Badge>
        </div>

        {selectedDeliveries.length > 0 && (
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              已選取 {selectedDeliveries.length} 筆
            </span>
            <Button variant="outline" size="sm">
              <Route className="h-4 w-4 mr-2" />
              批量規劃
            </Button>
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              通知客戶
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              取消選取
            </Button>
          </div>
        )}
      </div>

      {/* 全選控制 */}
      <div className="flex items-center space-x-4 mb-4 pb-4 border-b">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedDeliveries.length === mockDeliveries.length}
            onChange={selectedDeliveries.length === mockDeliveries.length ? clearSelection : selectAllDeliveries}
            className="rounded text-blue-600"
          />
          <span className="text-sm text-gray-700">全選</span>
        </label>
        <span className="text-sm text-gray-500">
          顯示 1-{mockDeliveries.length} 筆，共 156 筆配送
        </span>
      </div>

      {/* 配送列表 */}
      <div className="space-y-4">
        {mockDeliveries.map((delivery) => {
          const statusInfo = getStatusInfo(delivery.status)
          const priorityInfo = getPriorityInfo(delivery.priority)
          const isExpanded = expandedDelivery === delivery.id
          const isSelected = selectedDeliveries.includes(delivery.id)
          const isDelayed = delivery.status === 'delayed' || 
                          (delivery.estimatedArrival && new Date() > delivery.estimatedArrival && delivery.status === 'delivering')

          return (
            <div 
              key={delivery.id} 
              className={`border rounded-lg transition-all duration-200 ${
                isSelected ? 'border-blue-300 bg-blue-50' : 
                isDelayed ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center space-x-4">
                  {/* 選擇框 */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectDelivery(delivery.id)}
                    className="rounded text-blue-600"
                  />

                  {/* 配送圖標 */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      {getVehicleTypeIcon(delivery.vehicle.type)}
                    </div>
                  </div>

                  {/* 配送基本資訊 */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div className="md:col-span-2">
                      <div className="font-medium text-gray-900">{delivery.id}</div>
                      <div className="text-sm text-gray-500">
                        訂單: {delivery.orderId}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={statusInfo.variant} size="sm">
                          {statusInfo.label}
                        </Badge>
                        <Badge variant={priorityInfo.variant} size="sm">
                          {priorityInfo.label}
                        </Badge>
                        {isDelayed && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-gray-900">{delivery.customer.name}</div>
                      <div className="text-sm text-gray-500">{delivery.customer.contact}</div>
                      <div className="text-xs text-gray-400 max-w-24 truncate">
                        {delivery.customer.address}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-gray-900">
                        {delivery.vehicle.plateNumber}
                      </div>
                      <div className="text-sm text-gray-500">{delivery.vehicle.driver}</div>
                      <div className="text-xs text-gray-400">
                        {delivery.distance} km
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="font-semibold text-blue-600">
                        {formatCurrency(delivery.totalValue)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {delivery.items.length} 項商品
                      </div>
                      {delivery.temperature && (
                        <div className="text-xs text-blue-600">
                          {delivery.temperature}°C
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <div className="text-sm font-medium">
                        {formatDate(delivery.scheduledTime, { timeStyle: 'short' })}
                      </div>
                      <div className="text-xs text-gray-500">預定時間</div>
                      {delivery.status === 'delivering' && (
                        <div className="text-xs text-blue-600">
                          ETA: {formatDate(delivery.estimatedArrival, { timeStyle: 'short' })}
                        </div>
                      )}
                      {delivery.actualArrival && (
                        <div className="text-xs text-green-600">
                          實際: {formatDate(delivery.actualArrival, { timeStyle: 'short' })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleDeliveryExpansion(delivery.id)}
                    >
                      {isExpanded ? '收起' : '詳情'}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Navigation className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 配送進度條 */}
                {delivery.status === 'delivering' && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">配送進度</span>
                      <span className="font-medium">{delivery.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${delivery.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* 展開的詳細資訊 */}
              {isExpanded && (
                <div className="border-t bg-gray-50 p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 配送詳情 */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">配送詳情</h4>
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm font-medium text-gray-700 mb-2">收件地址</div>
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div>
                              <div className="text-sm">{delivery.customer.address}</div>
                              <div className="text-xs text-gray-500">
                                聯絡人: {delivery.customer.contact} ({delivery.customer.phone})
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm font-medium text-gray-700 mb-2">配送商品</div>
                          <div className="space-y-1">
                            {delivery.items.map((item, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{item.name}</span>
                                <span className="text-gray-600">
                                  {item.quantity} {item.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 聯絡司機 */}
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm font-medium text-gray-700 mb-2">司機資訊</div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{delivery.vehicle.driver}</span>
                            </div>
                            <Button size="sm" variant="outline">
                              <Phone className="h-3 w-3 mr-1" />
                              {delivery.vehicle.driverPhone}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 追蹤記錄 */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">追蹤記錄</h4>
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm font-medium text-gray-700 mb-2">路線資訊</div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">起點</span>
                              <span>{delivery.route.origin}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">終點</span>
                              <span>{delivery.route.destination}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">預計耗時</span>
                              <span>{delivery.route.estimatedDuration} 分鐘</span>
                            </div>
                            {delivery.route.actualDuration && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">實際耗時</span>
                                <span className="text-green-600">
                                  {delivery.route.actualDuration} 分鐘
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded border max-h-48 overflow-y-auto">
                          <div className="text-sm font-medium text-gray-700 mb-2">配送歷程</div>
                          <div className="space-y-2">
                            {(delivery.tracking || []).map((track, index) => (
                              <div key={index} className="flex items-start space-x-3">
                                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{track.event}</div>
                                  <div className="text-xs text-gray-500">
                                    {formatDate(track.time)} • {track.location}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 快速操作 */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      最後更新: {delivery.tracking && delivery.tracking.length > 0 ? formatDate(delivery.tracking[delivery.tracking.length - 1]!.time) : '無資料'}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        即時追蹤
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        通知客戶
                      </Button>
                      <Button variant="outline" size="sm">
                        <Route className="h-4 w-4 mr-2" />
                        重新規劃
                      </Button>
                      {delivery.status === 'delayed' && (
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          處理延遲
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 分頁控制 */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <div className="text-sm text-gray-500">
          顯示第 1-4 筆，共 156 筆配送
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" disabled>
            上一頁
          </Button>
          <Button variant="outline" size="sm">
            下一頁
          </Button>
        </div>
      </div>
    </Card>
  )
}
