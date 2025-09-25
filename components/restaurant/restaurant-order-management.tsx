'use client'

import * as React from 'react'
import {
  ShoppingCart,
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
  SortDesc,
  Plus,
  Download,
  RefreshCw,
  Settings,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AccessibleSelect } from '@/components/ui/accessible-form'
import { FormDialog } from '@/components/ui/accessible-modal'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import { cn } from '@/lib/utils'
import { getOrderStatusMeta, RESTAURANT_ORDER_STATUSES } from '@/lib/status'

interface OrderItem {
  id: string
  name: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  category: string
  notes?: string
}

interface RestaurantOrder {
  id: string
  orderNumber: string
  supplier: {
    name: string
    contact: string
    phone: string
    email: string
  }
  items: OrderItem[]
  totalAmount: number
  status:
    | 'draft'
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'shipped'
    | 'delivered'
    | 'accepted'
    | 'completed'
    | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  orderDate: string
  requestedDeliveryDate: string
  confirmedDeliveryDate?: string
  actualDeliveryDate?: string
  notes?: string
  paymentStatus: 'pending' | 'paid' | 'overdue'
  tags: string[]
  reconciliationStatus: 'pending' | 'matched' | 'discrepancy' | 'resolved'
}

const mockOrders: RestaurantOrder[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001',
    supplier: {
      name: '新鮮蔬果供應商',
      contact: '王經理',
      phone: '02-1111-2222',
      email: 'manager@fresh-veggies.com',
    },
    items: [
      {
        id: '1-1',
        name: '有機高麗菜',
        quantity: 10,
        unit: '公斤',
        unitPrice: 45,
        totalPrice: 450,
        category: '蔬菜類',
      },
      {
        id: '1-2',
        name: '新鮮蘿蔔',
        quantity: 8,
        unit: '公斤',
        unitPrice: 30,
        totalPrice: 240,
        category: '蔬菜類',
      },
    ],
    totalAmount: 690,
    status: 'pending',
    priority: 'medium',
    orderDate: '2024-01-15 09:30',
    requestedDeliveryDate: '2024-01-16 14:00',
    paymentStatus: 'pending',
    tags: ['定期訂單', '蔬菜'],
    reconciliationStatus: 'pending',
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-002',
    supplier: {
      name: '優質肉品供應商',
      contact: '李師傅',
      phone: '02-2222-3333',
      email: 'master@quality-meat.com',
    },
    items: [
      {
        id: '2-1',
        name: 'A級牛肉',
        quantity: 5,
        unit: '公斤',
        unitPrice: 800,
        totalPrice: 4000,
        category: '肉品類',
      },
      {
        id: '2-2',
        name: '新鮮豬肉',
        quantity: 3,
        unit: '公斤',
        unitPrice: 300,
        totalPrice: 900,
        category: '肉品類',
      },
    ],
    totalAmount: 4900,
    status: 'confirmed',
    priority: 'high',
    orderDate: '2024-01-14 16:15',
    requestedDeliveryDate: '2024-01-16 10:00',
    confirmedDeliveryDate: '2024-01-16 10:00',
    paymentStatus: 'pending',
    tags: ['高價值', '肉品'],
    reconciliationStatus: 'pending',
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-003',
    supplier: {
      name: '海鮮直送',
      contact: '陳老闆',
      phone: '02-3333-4444',
      email: 'boss@seafood-direct.com',
    },
    items: [
      {
        id: '3-1',
        name: '新鮮鮭魚',
        quantity: 2,
        unit: '公斤',
        unitPrice: 1200,
        totalPrice: 2400,
        category: '海鮮類',
      },
      {
        id: '3-2',
        name: '活蝦',
        quantity: 1,
        unit: '公斤',
        unitPrice: 800,
        totalPrice: 800,
        category: '海鮮類',
      },
    ],
    totalAmount: 3200,
    status: 'delivered',
    priority: 'urgent',
    orderDate: '2024-01-13 11:45',
    requestedDeliveryDate: '2024-01-15 08:00',
    confirmedDeliveryDate: '2024-01-15 08:00',
    actualDeliveryDate: '2024-01-15 08:15',
    paymentStatus: 'pending',
    tags: ['急單', '海鮮', '高品質'],
    reconciliationStatus: 'matched',
  },
  {
    id: '4',
    orderNumber: 'ORD-2024-004',
    supplier: {
      name: '調味料專家',
      contact: '張小姐',
      phone: '02-4444-5555',
      email: 'service@spice-expert.com',
    },
    items: [
      {
        id: '4-1',
        name: '特級醬油',
        quantity: 6,
        unit: '瓶',
        unitPrice: 120,
        totalPrice: 720,
        category: '調味料',
      },
      {
        id: '4-2',
        name: '香油',
        quantity: 4,
        unit: '瓶',
        unitPrice: 200,
        totalPrice: 800,
        category: '調味料',
      },
    ],
    totalAmount: 1520,
    status: 'completed',
    priority: 'low',
    orderDate: '2024-01-12 14:20',
    requestedDeliveryDate: '2024-01-14 16:00',
    confirmedDeliveryDate: '2024-01-14 16:00',
    actualDeliveryDate: '2024-01-14 15:45',
    paymentStatus: 'paid',
    tags: ['調味料', '庫存補充'],
    reconciliationStatus: 'resolved',
  },
]

export default function RestaurantOrderManagement() {
  const [orders, setOrders] = React.useState(mockOrders)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [priorityFilter, setPriorityFilter] = React.useState('all')
  const [selectedOrder, setSelectedOrder] = React.useState<RestaurantOrder | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isNewOrderOpen, setIsNewOrderOpen] = React.useState(false)
  const [sortField, setSortField] = React.useState<keyof RestaurantOrder>('orderDate')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc')

  const { announcePolite, announceSuccess } = useScreenReaderAnnouncer()

  const filteredOrders = React.useMemo(() => {
    const filtered = orders.filter(order => {
      const matchesSearch =
        searchTerm === '' ||
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier.contact.toLowerCase().includes(searchTerm.toLowerCase())

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

  const handleSort = React.useCallback(
    (field: keyof RestaurantOrder) => {
      if (sortField === field) {
        setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDirection('asc')
      }
      announcePolite(`按 ${field} ${sortDirection === 'asc' ? '升序' : '降序'} 排序`)
    },
    [sortField, sortDirection, announcePolite]
  )

  const handleViewDetail = React.useCallback(
    (order: RestaurantOrder) => {
      setSelectedOrder(order)
      setIsDetailOpen(true)
      announcePolite(`查看訂單 ${order.orderNumber} 詳細資訊`)
    },
    [announcePolite]
  )

  // 狀態文案與樣式改由 '@/lib/status' 集中提供

  const getPriorityColor = (priority: RestaurantOrder['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50'
      case 'high':
        return 'border-l-orange-500 bg-orange-50'
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'low':
        return 'border-l-green-500 bg-green-50'
    }
  }

  const getPriorityText = (priority: RestaurantOrder['priority']) => {
    switch (priority) {
      case 'urgent':
        return '緊急'
      case 'high':
        return '高'
      case 'medium':
        return '中'
      case 'low':
        return '低'
    }
  }

  const getPaymentStatusBadge = (status: RestaurantOrder['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="subtle" colorScheme="green" size="sm">
            已付款
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="subtle" colorScheme="yellow" size="sm">
            待付款
          </Badge>
        )
      case 'overdue':
        return (
          <Badge variant="subtle" colorScheme="red" size="sm">
            逾期
          </Badge>
        )
    }
  }

  const getReconciliationBadge = (status: RestaurantOrder['reconciliationStatus']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" colorScheme="gray" size="sm">
            待對帳
          </Badge>
        )
      case 'matched':
        return (
          <Badge variant="solid" colorScheme="green" size="sm">
            已匹配
          </Badge>
        )
      case 'discrepancy':
        return (
          <Badge variant="outline" colorScheme="red" size="sm">
            有差異
          </Badge>
        )
      case 'resolved':
        return (
          <Badge variant="solid" colorScheme="green" size="sm">
            已解決
          </Badge>
        )
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statusOptions = [
    { value: 'all', label: '所有狀態' },
    ...RESTAURANT_ORDER_STATUSES.map(key => ({ value: key, label: getOrderStatusMeta(key).label })),
  ]

  const priorityOptions = [
    { value: 'all', label: '所有優先級' },
    { value: 'urgent', label: '緊急' },
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' },
  ]

  // 統計數據
  const stats = React.useMemo(() => {
    const pending = orders.filter(o => o.status === 'pending').length
    const urgent = orders.filter(o => o.priority === 'urgent').length
    const delivered = orders.filter(o => o.status === 'delivered').length
    const totalValue = orders.reduce((sum, o) => sum + o.totalAmount, 0)

    return { pending, urgent, delivered, totalValue }
  }, [orders])

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">待確認訂單</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">緊急訂單</p>
                <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已送達訂單</p>
                <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              </div>
              <Truck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">總訂單金額</p>
                <p className="text-2xl font-bold text-primary-600">
                  NT$ {stats.totalValue.toLocaleString()}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-primary-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作工具欄 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-primary-600" />
              <span>訂單管理</span>
            </CardTitle>

            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                重新整理
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                匯出資料
              </Button>
              <Button
                onClick={() => setIsNewOrderOpen(true)}
                className="bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                新增訂單
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 搜尋和篩選 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder="搜尋訂單編號、供應商或聯絡人..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
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
              <div className="py-8 text-center text-gray-500">
                <ShoppingCart className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>沒有找到符合條件的訂單</p>
              </div>
            ) : (
              filteredOrders.map(order => (
                <div
                  key={order.id}
                  className={cn(
                    'rounded-lg border p-4 transition-all hover:shadow-md',
                    'border-l-4',
                    getPriorityColor(order.priority)
                  )}
                >
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    {/* 基本資訊 */}
                    <div className="space-y-2 lg:col-span-4">
                      <div className="flex items-center space-x-3">
                        <div className="font-bold text-primary-600">{order.orderNumber}</div>
                        {(() => {
                          const meta = getOrderStatusMeta(order.status)
                          const Icon = meta.Icon
                          return (
                            <Badge variant={meta.variant} className="flex items-center space-x-1">
                              {Icon && <Icon className="h-4 w-4" />}
                              <span>{meta.label}</span>
                            </Badge>
                          )
                        })()}
                        <Badge variant="outline" size="sm">
                          {getPriorityText(order.priority)}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{order.supplier.name}</div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>聯絡人: {order.supplier.contact}</span>
                          <Phone className="h-3 w-3" />
                          <span>{order.supplier.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* 訂單詳情 */}
                    <div className="space-y-2 lg:col-span-4">
                      <div className="space-y-1 text-sm">
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
                        <div className="flex justify-between">
                          <span className="text-gray-600">對帳狀態:</span>
                          {getReconciliationBadge(order.reconciliationStatus)}
                        </div>
                      </div>
                    </div>

                    {/* 時間資訊 */}
                    <div className="space-y-2 lg:col-span-2">
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="block text-gray-600">下單時間:</span>
                          <span className="text-xs">{formatDateTime(order.orderDate)}</span>
                        </div>
                        <div>
                          <span className="block text-gray-600">要求交期:</span>
                          <span className="text-xs text-orange-600">
                            {formatDateTime(order.requestedDeliveryDate)}
                          </span>
                        </div>
                        {order.confirmedDeliveryDate && (
                          <div>
                            <span className="block text-gray-600">確認交期:</span>
                            <span className="text-xs text-green-600">
                              {formatDateTime(order.confirmedDeliveryDate)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 操作按鈕 */}
                    <div className="flex flex-col space-y-2 lg:col-span-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(order)}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>查看詳情</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center space-x-1 text-blue-600"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>聯絡供應商</span>
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
                    <div className="mt-3 rounded-r border-l-4 border-yellow-400 bg-yellow-50 p-2">
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
      </Card>

      {/* 訂單詳情對話框 */}
      {selectedOrder && (
        <FormDialog
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`訂單詳情 - ${selectedOrder.orderNumber}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* 基本資訊 */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="mb-3 font-medium text-gray-900">訂單資訊</h4>
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
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-medium text-gray-900">供應商資訊</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">供應商名稱:</span>
                    <span className="font-medium">{selectedOrder.supplier.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">聯絡人:</span>
                    <span>{selectedOrder.supplier.contact}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">電話:</span>
                    <span>{selectedOrder.supplier.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span>{selectedOrder.supplier.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 訂單項目明細 */}
            <div>
              <h4 className="mb-3 font-medium text-gray-900">訂單明細</h4>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <div className="grid grid-cols-6 gap-4 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                  <div className="col-span-2">品項名稱</div>
                  <div>數量</div>
                  <div>單位</div>
                  <div>單價</div>
                  <div>小計</div>
                </div>
                {selectedOrder.items.map(item => (
                  <div
                    key={item.id}
                    className="grid grid-cols-6 gap-4 border-t border-gray-100 px-4 py-3 text-sm"
                  >
                    <div className="col-span-2">
                      <div className="font-medium">{item.name}</div>
                      {item.notes && <div className="mt-1 text-xs text-gray-500">{item.notes}</div>}
                    </div>
                    <div>{item.quantity}</div>
                    <div>{item.unit}</div>
                    <div>NT$ {item.unitPrice}</div>
                    <div className="font-medium">NT$ {item.totalPrice.toLocaleString()}</div>
                  </div>
                ))}
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">總計</span>
                    <span className="text-lg font-bold text-green-600">
                      NT$ {selectedOrder.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FormDialog>
      )}

      {/* 新增訂單對話框 */}
      <FormDialog
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
        title="新增訂單"
        description="建立新的採購訂單"
        size="lg"
      >
        <div className="space-y-4">
          <div className="py-8 text-center text-gray-500">
            <ShoppingCart className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>新增訂單功能開發中...</p>
            <p className="text-sm">請聯絡系統管理員</p>
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
