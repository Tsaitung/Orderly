'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Navigation,
  Truck,
  Clock,
  Route,
  ZoomIn,
  ZoomOut,
  Layers,
  Maximize,
  RefreshCw
} from 'lucide-react'

// 模擬配送地圖數據
const deliveryVehicles = [
  {
    id: 'VH-001',
    driverName: '張大明',
    phone: '0912-345-678',
    currentLocation: { lat: 25.0330, lng: 121.5654, address: '台北市大安區忠孝東路' },
    destination: { lat: 25.0478, lng: 121.5319, address: '台北市中山區南京東路' },
    status: 'delivering',
    progress: 65,
    eta: '15分鐘',
    orderId: 'ORD-2025-001',
    customerName: '大樂司餐廳',
    deliveryTime: '14:30',
    route: [
      { lat: 25.0330, lng: 121.5654 },
      { lat: 25.0350, lng: 121.5620 },
      { lat: 25.0420, lng: 121.5480 },
      { lat: 25.0478, lng: 121.5319 }
    ]
  },
  {
    id: 'VH-002',
    driverName: '李小華',
    phone: '0987-654-321',
    currentLocation: { lat: 25.0174, lng: 121.5385, address: '台北市中正區羅斯福路' },
    destination: { lat: 25.0112, lng: 121.5522, address: '台北市信義區市府路' },
    status: 'loading',
    progress: 0,
    eta: '準備出發',
    orderId: 'ORD-2025-002',
    customerName: '稻舍餐廳',
    deliveryTime: '15:00',
    route: []
  },
  {
    id: 'VH-003',
    driverName: '王志明',
    phone: '0923-456-789',
    currentLocation: { lat: 24.1477, lng: 120.6736, address: '台中市西屯區文心路' },
    destination: { lat: 24.1635, lng: 120.6467, address: '台中市北屯區崇德路' },
    status: 'delivered',
    progress: 100,
    eta: '已送達',
    orderId: 'ORD-2025-003',
    customerName: '樂多多火鍋',
    deliveryTime: '已完成',
    route: []
  }
]

const mapLayers = [
  { id: 'satellite', name: '衛星地圖', active: false },
  { id: 'traffic', name: '交通狀況', active: true },
  { id: 'routes', name: '配送路線', active: true },
  { id: 'zones', name: '配送區域', active: false }
]

export default function DeliveryMap() {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [mapView, setMapView] = useState('normal')
  const [activeLayers, setActiveLayers] = useState(['traffic', 'routes'])
  const [isFullscreen, setIsFullscreen] = useState(false)

  const getStatusColor = (status: string) => {
    const statusMap = {
      loading: 'bg-orange-500',
      delivering: 'bg-blue-500',
      delivered: 'bg-green-500',
      delayed: 'bg-red-500',
      returning: 'bg-purple-500'
    }
    return statusMap[status as keyof typeof statusMap] || 'bg-gray-500'
  }

  const getStatusLabel = (status: string) => {
    const statusMap = {
      loading: '裝載中',
      delivering: '配送中',
      delivered: '已送達',
      delayed: '延遲',
      returning: '返程中'
    }
    return statusMap[status as keyof typeof statusMap] || '未知'
  }

  const toggleLayer = (layerId: string) => {
    setActiveLayers(prev => 
      prev.includes(layerId) 
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    )
  }

  return (
    <Card className={`${isFullscreen ? 'fixed inset-4 z-50' : ''} transition-all duration-300`}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">實時配送地圖</h3>
            <Badge variant="info" size="sm">
              {deliveryVehicles.filter(v => v.status === 'delivering').length} 車配送中
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* 地圖區域 (模擬) */}
        <div className={`bg-gray-100 flex items-center justify-center relative ${isFullscreen ? 'h-[calc(100vh-8rem)]' : 'h-96'}`}>
          {/* 地圖背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50">
            {/* 模擬街道網格 */}
            <svg className="absolute inset-0 w-full h-full opacity-20">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#374151" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* 配送車輛標記 */}
          {deliveryVehicles.map((vehicle, index) => (
            <div
              key={vehicle.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 ${
                selectedVehicle === vehicle.id ? 'scale-125 z-10' : 'hover:scale-110'
              }`}
              style={{
                left: `${20 + index * 25}%`,
                top: `${30 + index * 15}%`
              }}
              onClick={() => setSelectedVehicle(vehicle.id)}
            >
              <div className="relative">
                <div className={`w-8 h-8 rounded-full ${getStatusColor(vehicle.status)} flex items-center justify-center shadow-lg`}>
                  <Truck className="h-4 w-4 text-white" />
                </div>
                <div className={`absolute -top-2 -right-2 w-4 h-4 ${getStatusColor(vehicle.status)} rounded-full border-2 border-white`}>
                  <div className="w-full h-full rounded-full animate-ping opacity-75"></div>
                </div>
              </div>
            </div>
          ))}

          {/* 配送路線 (模擬) */}
          {activeLayers.includes('routes') && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <path
                d="M 20% 30% Q 30% 20% 45% 45%"
                stroke="#3B82F6"
                strokeWidth="3"
                fill="none"
                strokeDasharray="10,5"
                className="animate-pulse"
              />
              <path
                d="M 45% 45% Q 60% 60% 70% 75%"
                stroke="#10B981"
                strokeWidth="3"
                fill="none"
              />
            </svg>
          )}

          {/* 地圖中心顯示 */}
          <div className="text-center text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">台北市配送區域</p>
            <p className="text-xs">點擊車輛查看詳細資訊</p>
          </div>
        </div>

        {/* 圖層控制 */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Layers className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">圖層</span>
          </div>
          <div className="space-y-2">
            {mapLayers.map((layer) => (
              <label key={layer.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeLayers.includes(layer.id)}
                  onChange={() => toggleLayer(layer.id)}
                  className="rounded text-blue-600"
                />
                <span className="text-xs text-gray-600">{layer.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 選中車輛詳情 */}
        {selectedVehicle && (
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
            {(() => {
              const vehicle = deliveryVehicles.find(v => v.id === selectedVehicle)
              if (!vehicle) return null
              
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">{vehicle.id}</h4>
                    <button
                      onClick={() => setSelectedVehicle(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">司機</span>
                      <span className="text-sm font-medium">{vehicle.driverName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">狀態</span>
                      <Badge 
                        variant={vehicle.status === 'delivering' ? 'info' : 
                                vehicle.status === 'delivered' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {getStatusLabel(vehicle.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">訂單</span>
                      <span className="text-sm font-medium">{vehicle.orderId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">客戶</span>
                      <span className="text-sm font-medium">{vehicle.customerName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">預計到達</span>
                      <span className="text-sm font-medium text-blue-600">{vehicle.eta}</span>
                    </div>
                  </div>

                  {vehicle.status === 'delivering' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">配送進度</span>
                        <span className="font-medium">{vehicle.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${vehicle.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Navigation className="h-3 w-3 mr-1" />
                      導航
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Clock className="h-3 w-3 mr-1" />
                      追蹤
                    </Button>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* 快速統計 */}
      <div className="p-4 border-t bg-gray-50">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-600">
              {deliveryVehicles.filter(v => v.status === 'delivering').length}
            </div>
            <div className="text-xs text-gray-600">配送中</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {deliveryVehicles.filter(v => v.status === 'delivered').length}
            </div>
            <div className="text-xs text-gray-600">已送達</div>
          </div>
          <div>
            <div className="text-lg font-bold text-orange-600">
              {deliveryVehicles.filter(v => v.status === 'loading').length}
            </div>
            <div className="text-xs text-gray-600">準備中</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600">
              {deliveryVehicles.length}
            </div>
            <div className="text-xs text-gray-600">總車輛</div>
          </div>
        </div>
      </div>
    </Card>
  )
}