'use client'

import * as React from 'react'
import { 
  Clock, 
  CheckCircle, 
  Truck, 
  Package,
  AlertTriangle,
  Eye,
  Edit,
  MessageSquare,
  Calendar,
  MapPin,
  Phone,
  Filter,
  Search,
  SortAsc,
  SortDesc
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AccessibleSelect } from '@/components/ui/accessible-form'
import { FormDialog } from '@/components/ui/accessible-modal'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import { cn } from '@/lib/utils'

interface SupplierOrder {
  id: string
  orderNumber: string
  restaurant: string
  restaurantContact: {
    name: string
    phone: string
    address: string
  }
  items: Array<{
    id: string
    name: string
    quantity: number
    unit: string
    unitPrice: number
    totalPrice: number
    notes?: string
  }>
  totalAmount: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  orderDate: string
  requestedDeliveryDate: string
  confirmedDeliveryDate?: string
  estimatedPreparationTime: number // 小時
  notes?: string
  paymentStatus: 'pending' | 'paid' | 'overdue'
  customerRating?: number
  tags: string[]
}

const mockSupplierOrders: SupplierOrder[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-156',
    restaurant: '台北美食餐廳',
    restaurantContact: {
      name: '張經理',
      phone: '02-1234-5678',
      address: '台北市信義區忠孝東路四段 123 號'
    },
    items: [
      { id: '1-1', name: '有機高麗菜', quantity: 20, unit: '公斤', unitPrice: 45, totalPrice: 900 },
      { id: '1-2', name: '新鮮蘿蔔', quantity: 15, unit: '公斤', unitPrice: 30, totalPrice: 450, notes: '要求特選品質' }
    ],
    totalAmount: 1350,
    status: 'pending',
    priority: 'urgent',
    orderDate: '2024-01-15 14:30',
    requestedDeliveryDate: '2024-01-16 08:00',
    estimatedPreparationTime: 4,
    notes: '急單，請優先處理',
    paymentStatus: 'pending',
    tags: ['急單', '老客戶', '蔬菜']
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-157',
    restaurant: '精緻料理',
    restaurantContact: {
      name: '李主廚',
      phone: '02-2345-6789',
      address: '台北市大安區敦化南路二段 456 號'
    },
    items: [
      { id: '2-1', name: '優質牛肉', quantity: 10, unit: '公斤', unitPrice: 800, totalPrice: 8000 },
      { id: '2-2', name: '新鮮香菇', quantity: 5, unit: '公斤', unitPrice: 120, totalPrice: 600 }
    ],
    totalAmount: 8600,
    status: 'confirmed',
    priority: 'high',
    orderDate: '2024-01-15 10:15',
    requestedDeliveryDate: '2024-01-17 14:00',
    confirmedDeliveryDate: '2024-01-17 14:00',
    estimatedPreparationTime: 8,
    paymentStatus: 'paid',
    customerRating: 5,
    tags: ['高價值', 'VIP客戶', '肉品']
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-158',
    restaurant: '美味小館',
    restaurantContact: {
      name: '王老闆',
      phone: '02-3456-7890',
      address: '台北市中山區南京東路三段 789 號'
    },
    items: [
      { id: '3-1', name: '新鮮鮭魚', quantity: 3, unit: '公斤', unitPrice: 1200, totalPrice: 3600 },
      { id: '3-2', name: '海鮮拼盤', quantity: 2, unit: '份', unitPrice: 800, totalPrice: 1600 }
    ],
    totalAmount: 5200,
    status: 'preparing',
    priority: 'medium',
    orderDate: '2024-01-14 16:45',
    requestedDeliveryDate: '2024-01-16 11:00',
    confirmedDeliveryDate: '2024-01-16 11:00',
    estimatedPreparationTime: 6,
    paymentStatus: 'paid',
    tags: ['海鮮', '定期客戶']
  },
  {
    id: '4',
    orderNumber: 'ORD-2024-159',
    restaurant: '家常菜館',
    restaurantContact: {
      name: '陳大姐',
      phone: '02-4567-8901',
      address: '台北市萬華區西門街 101 號'
    },
    items: [
      { id: '4-1', name: '季節蔬菜包', quantity: 1, unit: '箱', unitPrice: 800, totalPrice: 800 },
      { id: '4-2', name: '調味料組合', quantity: 2, unit: '組', unitPrice: 200, totalPrice: 400 }
    ],
    totalAmount: 1200,
    status: 'shipped',
    priority: 'low',
    orderDate: '2024-01-14 09:20',
    requestedDeliveryDate: '2024-01-15 16:00',
    confirmedDeliveryDate: '2024-01-15 16:00',
    estimatedPreparationTime: 2,
    paymentStatus: 'paid',
    tags: ['小額', '組合商品']
  }
]

export default function SupplierOrderStatus() {
  const [orders, setOrders] = React.useState(mockSupplierOrders)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [priorityFilter, setPriorityFilter] = React.useState('all')
  const [selectedOrder, setSelectedOrder] = React.useState<SupplierOrder | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [sortField, setSortField] = React.useState<keyof SupplierOrder>('orderDate')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc')

  const { announcePolite, announceSuccess } = useScreenReaderAnnouncer()

  const filteredOrders = React.useMemo(() => {
    let filtered = orders.filter(order => {
      const matchesSearch = searchTerm === '' || 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.restaurant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.restaurantContact.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })

    // 排序
    filtered.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue)
        return sortDirection === 'asc' ? comparison : -comparison
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue
        return sortDirection === 'asc' ? comparison : -comparison
      }
      
      return 0
    })

    return filtered
  }, [orders, searchTerm, statusFilter, priorityFilter, sortField, sortDirection])

  const handleSort = React.useCallback((field: keyof SupplierOrder) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    announcePolite(`按 ${field} ${sortDirection === 'asc' ? '升序' : '降序'} 排序`)
  }, [sortField, sortDirection, announcePolite])

  const handleViewDetail = React.useCallback((order: SupplierOrder) => {
    setSelectedOrder(order)
    setIsDetailOpen(true)
    announcePolite(`查看訂單 ${order.orderNumber} 詳細資訊`)
  }, [announcePolite])

  const handleConfirmOrder = React.useCallback((orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'confirmed' as const, confirmedDeliveryDate: order.requestedDeliveryDate }
        : order
    ))
    announceSuccess('訂單已確認')
  }, [announceSuccess])

  const handleUpdateStatus = React.useCallback((orderId: string, newStatus: SupplierOrder['status']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus }
        : order
    ))
    announceSuccess(`訂單狀態已更新為 ${getStatusText(newStatus)}`)
  }, [announceSuccess])

  const getStatusIcon = (status: SupplierOrder['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'confirmed': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'preparing': return <Package className="h-4 w-4 text-blue-600" />
      case 'ready': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'shipped': return <Truck className="h-4 w-4 text-purple-600" />
      case 'delivered': return <CheckCircle className="h-4 w-4 text-green-700" />
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-800" />
      case 'cancelled': return <AlertTriangle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusText = (status: SupplierOrder['status']) => {
    switch (status) {
      case 'pending': return '待確認'
      case 'confirmed': return '已確認'
      case 'preparing': return '準備中'
      case 'ready': return '待出貨'
      case 'shipped': return '已出貨'
      case 'delivered': return '已送達'
      case 'completed': return '已完成'
      case 'cancelled': return '已取消'
    }
  }

  const getStatusVariant = (status: SupplierOrder['status']) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'confirmed': case 'ready': case 'delivered': case 'completed': return 'success'
      case 'preparing': case 'shipped': return 'info'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  const getPriorityColor = (priority: SupplierOrder['priority']) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50'
      case 'high': return 'border-l-orange-500 bg-orange-50'
      case 'medium': return 'border-l-yellow-500 bg-yellow-50'
      case 'low': return 'border-l-green-500 bg-green-50'
    }
  }

  const getPriorityText = (priority: SupplierOrder['priority']) => {
    switch (priority) {
      case 'urgent': return '緊急'
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
    }
  }

  const getPaymentStatusBadge = (status: SupplierOrder['paymentStatus']) => {
    switch (status) {
      case 'paid': return <Badge variant="success" size="sm">已付款</Badge>
      case 'pending': return <Badge variant="warning" size="sm">待付款</Badge>
      case 'overdue': return <Badge variant="destructive" size="sm">逾期</Badge>
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const statusOptions = [
    { value: 'all', label: '所有狀態' },
    { value: 'pending', label: '待確認' },
    { value: 'confirmed', label: '已確認' },
    { value: 'preparing', label: '準備中' },
    { value: 'ready', label: '待出貨' },
    { value: 'shipped', label: '已出貨' },
    { value: 'delivered', label: '已送達' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' }
  ]

  const priorityOptions = [
    { value: 'all', label: '所有優先級' },
    { value: 'urgent', label: '緊急' },
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' }
  ]

  // 統計數據
  const stats = React.useMemo(() => {
    const pending = orders.filter(o => o.status === 'pending').length
    const urgent = orders.filter(o => o.priority === 'urgent').length
    const preparing = orders.filter(o => o.status === 'preparing').length
    const shipping = orders.filter(o => o.status === 'shipped').length
    
    return { pending, urgent, preparing, shipping }
  }, [orders])

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-600" />
            <span>訂單狀態追蹤</span>
          </CardTitle>
          
          {/* 快速統計 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Badge variant="warning" className="h-6">
                待確認 {stats.pending}
              </Badge>
              <Badge variant="destructive" className="h-6">
                緊急 {stats.urgent}
              </Badge>
              <Badge variant="info" className="h-6">
                準備中 {stats.preparing}
              </Badge>
              <Badge variant="secondary" className="h-6">
                配送中 {stats.shipping}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 搜尋和篩選 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜尋訂單編號、餐廳或聯絡人..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <AccessibleSelect
            label="訂單狀態"
            name="status-filter"
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          
          <AccessibleSelect
            label="優先級"
            name="priority-filter"
            options={priorityOptions}
            value={priorityFilter}
            onChange={setPriorityFilter}
          />
        </div>

        {/* 訂單列表 */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>沒有找到符合條件的訂單</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className={cn(
                  'border rounded-lg p-4 transition-all hover:shadow-md',
                  'border-l-4',
                  getPriorityColor(order.priority)
                )}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* 基本資訊 */}
                  <div className="lg:col-span-4 space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="font-bold text-blue-600">
                        {order.orderNumber}
                      </div>
                      <Badge 
                        variant={getStatusVariant(order.status)}
                        className="flex items-center space-x-1"
                      >
                        {getStatusIcon(order.status)}
                        <span>{getStatusText(order.status)}</span>
                      </Badge>
                      <Badge variant="outline" size="sm">
                        {getPriorityText(order.priority)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">
                        {order.restaurant}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center space-x-2">
                        <span>聯絡人: {order.restaurantContact.name}</span>
                        <Phone className="h-3 w-3" />
                        <span>{order.restaurantContact.phone}</span>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{order.restaurantContact.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* 訂單詳情 */}
                  <div className="lg:col-span-4 space-y-2">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">品項數量:</span>
                        <span className="font-medium">{order.items.length} 項</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">總金額:</span>
                        <span className="font-bold text-green-600">
                          NT$ {order.totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">付款狀態:</span>
                        {getPaymentStatusBadge(order.paymentStatus)}
                      </div>
                      {order.customerRating && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">客戶評分:</span>
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={i < order.customerRating! ? 'text-yellow-400' : 'text-gray-300'}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 時間資訊 */}
                  <div className="lg:col-span-2 space-y-2">
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-gray-600 block">下單時間:</span>
                        <span className="text-xs">{formatDateTime(order.orderDate)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 block">要求交期:</span>
                        <span className="text-xs text-orange-600">
                          {formatDateTime(order.requestedDeliveryDate)}
                        </span>
                      </div>
                      {order.confirmedDeliveryDate && (
                        <div>
                          <span className="text-gray-600 block">確認交期:</span>
                          <span className="text-xs text-green-600">
                            {formatDateTime(order.confirmedDeliveryDate)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600 block">預估準備:</span>
                        <span className="text-xs">{order.estimatedPreparationTime} 小時</span>
                      </div>
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="lg:col-span-2 flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetail(order)}
                      className="flex items-center space-x-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>查看詳情</span>
                    </Button>
                    
                    {order.status === 'pending' && (
                      <Button
                        variant="solid"
                        colorScheme="green"
                        size="sm"
                        onClick={() => handleConfirmOrder(order.id)}
                        className="flex items-center space-x-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>確認訂單</span>
                      </Button>
                    )}
                    
                    {(order.status === 'confirmed' || order.status === 'preparing') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, 
                          order.status === 'confirmed' ? 'preparing' : 'ready'
                        )}
                        className="flex items-center space-x-1"
                      >
                        <Package className="h-4 w-4" />
                        <span>
                          {order.status === 'confirmed' ? '開始準備' : '準備完成'}
                        </span>
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-1 text-blue-600"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>聯絡客戶</span>
                    </Button>
                  </div>
                </div>

                {/* 標籤 */}
                {order.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* 備註 */}
                {order.notes && (
                  <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
                    <p className="text-sm text-yellow-800">
                      <strong>備註:</strong> {order.notes}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* 訂單詳情對話框 */}
      {selectedOrder && (
        <FormDialog
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`訂單詳情 - ${selectedOrder.orderNumber}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* 訂單基本資訊 */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">訂單資訊</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">訂單編號:</span>
                    <span className="font-medium">{selectedOrder.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">下單時間:</span>
                    <span>{formatDateTime(selectedOrder.orderDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">要求交期:</span>
                    <span>{formatDateTime(selectedOrder.requestedDeliveryDate)}</span>
                  </div>
                  {selectedOrder.confirmedDeliveryDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">確認交期:</span>
                      <span>{formatDateTime(selectedOrder.confirmedDeliveryDate)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">預估準備時間:</span>
                    <span>{selectedOrder.estimatedPreparationTime} 小時</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">客戶資訊</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">餐廳名稱:</span>
                    <span className="font-medium">{selectedOrder.restaurant}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">聯絡人:</span>
                    <span>{selectedOrder.restaurantContact.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">電話:</span>
                    <span>{selectedOrder.restaurantContact.phone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">地址:</span>
                    <p className="mt-1">{selectedOrder.restaurantContact.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 訂單項目明細 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">訂單明細</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 grid grid-cols-6 gap-4 text-sm font-medium text-gray-700">
                  <div className="col-span-2">品項名稱</div>
                  <div>數量</div>
                  <div>單位</div>
                  <div>單價</div>
                  <div>小計</div>
                </div>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="px-4 py-3 grid grid-cols-6 gap-4 text-sm border-t border-gray-100">
                    <div className="col-span-2">
                      <div className="font-medium">{item.name}</div>
                      {item.notes && (
                        <div className="text-xs text-gray-500 mt-1">{item.notes}</div>
                      )}
                    </div>
                    <div>{item.quantity}</div>
                    <div>{item.unit}</div>
                    <div>NT$ {item.unitPrice}</div>
                    <div className="font-medium">NT$ {item.totalPrice.toLocaleString()}</div>
                  </div>
                ))}
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">總計</span>
                    <span className="text-lg font-bold text-green-600">
                      NT$ {selectedOrder.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 狀態和備註 */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">訂單狀態</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedOrder.status)}
                    <span className="font-medium">{getStatusText(selectedOrder.status)}</span>
                    <Badge variant={getStatusVariant(selectedOrder.status)}>
                      {getPriorityText(selectedOrder.priority)}優先級
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">付款狀態:</span>
                    {getPaymentStatusBadge(selectedOrder.paymentStatus)}
                  </div>
                  {selectedOrder.customerRating && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">客戶評分:</span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={i < selectedOrder.customerRating! ? 'text-yellow-400' : 'text-gray-300'}
                          >
                            ★
                          </span>
                        ))}
                        <span className="ml-1 text-sm text-gray-600">
                          ({selectedOrder.customerRating}/5)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">特殊備註</h4>
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
                    <p className="text-sm text-yellow-800">{selectedOrder.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 標籤 */}
            {selectedOrder.tags.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">訂單標籤</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FormDialog>
      )}
    </Card>
  )
}