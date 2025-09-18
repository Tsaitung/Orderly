'use client'

import * as React from 'react'
import { 
  Truck, 
  Clock, 
  MapPin,
  Package,
  User,
  Phone,
  Navigation,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Route,
  Thermometer,
  Camera,
  MessageSquare,
  ArrowRight
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import { cn } from '@/lib/utils'

interface DeliveryItem {
  id: string
  name: string
  quantity: number
  unit: string
  category: string
  temperatureRequirement?: 'room' | 'chilled' | 'frozen'
  specialHandling?: string
}

interface UpcomingDelivery {
  id: string
  orderNumber: string
  customer: {
    name: string
    contact: string
    phone: string
    address: string
    coordinates?: { lat: number; lng: number }
  }
  scheduledDate: string
  timeSlot: string
  estimatedArrival: string
  status: 'scheduled' | 'preparing' | 'en_route' | 'delivered' | 'delayed'
  priority: 'normal' | 'high' | 'urgent'
  vehicleType: 'standard' | 'refrigerated' | 'frozen'
  driver: {
    name: string
    phone: string
    vehicleNumber: string
  }
  items: DeliveryItem[]
  totalValue: number
  specialInstructions?: string
  deliveryProof?: {
    photo?: string
    signature?: string
    timestamp?: string
  }
  estimatedDuration: number // minutes
  distance: number // km
}

const mockUpcomingDeliveries: UpcomingDelivery[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-156',
    customer: {
      name: '台北美食餐廳',
      contact: '張經理',
      phone: '02-1234-5678',
      address: '台北市信義區忠孝東路四段 123 號',
      coordinates: { lat: 25.041, lng: 121.567 }
    },
    scheduledDate: '2024-01-16',
    timeSlot: '08:00-10:00',
    estimatedArrival: '2024-01-16 08:30',
    status: 'preparing',
    priority: 'urgent',
    vehicleType: 'refrigerated',
    driver: {
      name: '陳師傅',
      phone: '0912-345-678',
      vehicleNumber: 'ABC-1234'
    },
    items: [
      {
        id: '1-1',
        name: '有機高麗菜',
        quantity: 20,
        unit: '公斤',
        category: '蔬菜類',
        temperatureRequirement: 'chilled'
      },
      {
        id: '1-2',
        name: '新鮮蘿蔔',
        quantity: 15,
        unit: '公斤',
        category: '蔬菜類',
        temperatureRequirement: 'chilled',
        specialHandling: '需特選品質'
      }
    ],
    totalValue: 1350,
    specialInstructions: '急單，請準時送達。聯絡張經理確認收貨。',
    estimatedDuration: 45,
    distance: 12.5
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-157',
    customer: {
      name: '精緻料理',
      contact: '李主廚',
      phone: '02-2345-6789',
      address: '台北市大安區敦化南路二段 456 號',
      coordinates: { lat: 25.027, lng: 121.554 }
    },
    scheduledDate: '2024-01-16',
    timeSlot: '14:00-16:00',
    estimatedArrival: '2024-01-16 14:30',
    status: 'scheduled',
    priority: 'high',
    vehicleType: 'standard',
    driver: {
      name: '王師傅',
      phone: '0923-456-789',
      vehicleNumber: 'DEF-5678'
    },
    items: [
      {
        id: '2-1',
        name: '優質牛肉',
        quantity: 10,
        unit: '公斤',
        category: '肉品類',
        temperatureRequirement: 'chilled'
      },
      {
        id: '2-2',
        name: '新鮮香菇',
        quantity: 5,
        unit: '公斤',
        category: '蔬菜類',
        temperatureRequirement: 'room'
      }
    ],
    totalValue: 8600,
    estimatedDuration: 35,
    distance: 8.2
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-158',
    customer: {
      name: '美味小館',
      contact: '王老闆',
      phone: '02-3456-7890',
      address: '台北市中山區南京東路三段 789 號',
      coordinates: { lat: 25.052, lng: 121.544 }
    },
    scheduledDate: '2024-01-16',
    timeSlot: '11:00-12:00',
    estimatedArrival: '2024-01-16 11:15',
    status: 'en_route',
    priority: 'normal',
    vehicleType: 'frozen',
    driver: {
      name: '李師傅',
      phone: '0934-567-890',
      vehicleNumber: 'GHI-9012'
    },
    items: [
      {
        id: '3-1',
        name: '新鮮鮭魚',
        quantity: 3,
        unit: '公斤',
        category: '海鮮類',
        temperatureRequirement: 'frozen'
      },
      {
        id: '3-2',
        name: '海鮮拼盤',
        quantity: 2,
        unit: '份',
        category: '海鮮類',
        temperatureRequirement: 'frozen'
      }
    ],
    totalValue: 5200,
    estimatedDuration: 30,
    distance: 6.8
  }
]

export default function SupplierUpcomingDeliveries() {
  const [selectedDelivery, setSelectedDelivery] = React.useState<UpcomingDelivery | null>(null)
  const [showCompleted, setShowCompleted] = React.useState(false)
  const { announcePolite, announceSuccess } = useScreenReaderAnnouncer()

  const getStatusIcon = (status: UpcomingDelivery['status']) => {
    switch (status) {
      case 'scheduled': return <Calendar className="h-4 w-4 text-blue-600" />
      case 'preparing': return <Package className="h-4 w-4 text-yellow-600" />
      case 'en_route': return <Truck className="h-4 w-4 text-green-600" />
      case 'delivered': return <CheckCircle className="h-4 w-4 text-green-700" />
      case 'delayed': return <AlertTriangle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusText = (status: UpcomingDelivery['status']) => {
    switch (status) {
      case 'scheduled': return '已排程'
      case 'preparing': return '準備中'
      case 'en_route': return '配送中'
      case 'delivered': return '已送達'
      case 'delayed': return '延遲'
    }
  }

  const getStatusVariant = (status: UpcomingDelivery['status']) => {
    switch (status) {
      case 'scheduled': return 'info'
      case 'preparing': return 'warning'
      case 'en_route': return 'success'
      case 'delivered': return 'success'
      case 'delayed': return 'destructive'
      default: return 'secondary'
    }
  }

  const getPriorityColor = (priority: UpcomingDelivery['priority']) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50'
      case 'high': return 'border-l-orange-500 bg-orange-50'
      case 'normal': return 'border-l-blue-500 bg-blue-50'
    }
  }

  const getVehicleIcon = (vehicleType: UpcomingDelivery['vehicleType']) => {
    switch (vehicleType) {
      case 'refrigerated': return <Thermometer className="h-4 w-4 text-blue-600" />
      case 'frozen': return <Thermometer className="h-4 w-4 text-cyan-600" />
      default: return <Truck className="h-4 w-4 text-gray-600" />
    }
  }

  const getVehicleText = (vehicleType: UpcomingDelivery['vehicleType']) => {
    switch (vehicleType) {
      case 'refrigerated': return '冷藏車'
      case 'frozen': return '冷凍車'
      case 'standard': return '標準貨車'
    }
  }

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric'
    })
  }

  const handleDeliverySelect = React.useCallback((delivery: UpcomingDelivery) => {
    setSelectedDelivery(delivery)
    announcePolite(`已選擇配送單：${delivery.orderNumber}`)
  }, [announcePolite])

  const handleStatusUpdate = React.useCallback((deliveryId: string, newStatus: UpcomingDelivery['status']) => {
    announceSuccess(`配送狀態已更新為：${getStatusText(newStatus)}`)
  }, [announceSuccess])

  const todayDeliveries = mockUpcomingDeliveries.filter(d => 
    new Date(d.scheduledDate).toDateString() === new Date().toDateString()
  )

  const stats = React.useMemo(() => {
    const total = mockUpcomingDeliveries.length
    const preparing = mockUpcomingDeliveries.filter(d => d.status === 'preparing').length
    const enRoute = mockUpcomingDeliveries.filter(d => d.status === 'en_route').length
    const urgent = mockUpcomingDeliveries.filter(d => d.priority === 'urgent').length
    
    return { total, preparing, enRoute, urgent }
  }, [])

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Truck className="h-5 w-5 text-green-600" />
            <span>今日配送排程</span>
          </CardTitle>
          
          {/* 快速統計 */}
          <div className="flex items-center space-x-2">
            <Badge variant="warning" size="sm">
              準備中 {stats.preparing}
            </Badge>
            <Badge variant="success" size="sm">
              配送中 {stats.enRoute}
            </Badge>
            <Badge variant="destructive" size="sm">
              緊急 {stats.urgent}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 今日配送概覽 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">今日配送</p>
                <p className="text-xl font-bold text-green-700">{todayDeliveries.length}</p>
              </div>
              <Truck className="h-6 w-6 text-green-500" />
            </div>
          </div>

          <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">總距離</p>
                <p className="text-xl font-bold text-blue-700">
                  {todayDeliveries.reduce((sum, d) => sum + d.distance, 0).toFixed(1)}km
                </p>
              </div>
              <Route className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        {/* 配送清單 */}
        <div className="space-y-3">
          {todayDeliveries.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>今日暫無配送排程</p>
            </div>
          ) : (
            todayDeliveries.map((delivery) => (
              <div
                key={delivery.id}
                className={cn(
                  'border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer',
                  'border-l-4',
                  getPriorityColor(delivery.priority)
                )}
                onClick={() => handleDeliverySelect(delivery)}
              >
                <div className="space-y-3">
                  {/* 配送基本資訊 */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {delivery.orderNumber}
                        </span>
                        <Badge 
                          variant={getStatusVariant(delivery.status)}
                          className="flex items-center space-x-1"
                        >
                          {getStatusIcon(delivery.status)}
                          <span>{getStatusText(delivery.status)}</span>
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center space-x-2">
                          <User className="h-3 w-3" />
                          <span>{delivery.customer.name} • {delivery.customer.contact}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-3 w-3" />
                          <span>{delivery.customer.address}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-3 w-3" />
                          <span>{delivery.timeSlot} • 預計 {formatTime(delivery.estimatedArrival)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        NT$ {delivery.totalValue.toLocaleString()}
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-600">
                        {getVehicleIcon(delivery.vehicleType)}
                        <span>{getVehicleText(delivery.vehicleType)}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {delivery.distance}km • {delivery.estimatedDuration}分鐘
                      </div>
                    </div>
                  </div>

                  {/* 司機資訊 */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-3 w-3 text-gray-600" />
                      </div>
                      <span className="text-gray-700">
                        {delivery.driver.name} • {delivery.driver.vehicleNumber}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-blue-600">
                        <Phone className="h-3 w-3 mr-1" />
                        <span className="text-xs">聯絡</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-green-600">
                        <Navigation className="h-3 w-3 mr-1" />
                        <span className="text-xs">導航</span>
                      </Button>
                    </div>
                  </div>

                  {/* 商品摘要 */}
                  <div className="text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Package className="h-3 w-3" />
                      <span>
                        {delivery.items.length} 項商品：
                        {delivery.items.slice(0, 2).map(item => item.name).join('、')}
                        {delivery.items.length > 2 && '等'}
                      </span>
                    </div>
                  </div>

                  {/* 特殊指示 */}
                  {delivery.specialInstructions && (
                    <div className="p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded-r text-sm">
                      <p className="text-yellow-800">
                        <strong>特殊指示：</strong> {delivery.specialInstructions}
                      </p>
                    </div>
                  )}

                  {/* 操作按鈕 */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      {delivery.status === 'en_route' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-1"
                        >
                          <Camera className="h-3 w-3" />
                          <span>拍照存證</span>
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center space-x-1 text-blue-600"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>客戶聯絡</span>
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <span>查看詳情</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 配送提醒 */}
        <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2 flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>配送提醒</span>
          </h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• 冷鏈商品請確保溫度維持</li>
            <li>• 送達前請聯絡客戶確認收貨</li>
            <li>• 完成配送後記得拍照存證</li>
            <li>• 異常狀況請即時回報調度中心</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}