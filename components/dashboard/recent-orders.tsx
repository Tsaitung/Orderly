'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Eye,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  Filter,
  Search,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AccessibleSelect } from '@/components/ui/accessible-form'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import { cn } from '@/lib/utils'

interface Order {
  id: string
  orderNumber: string
  supplier: string
  items: number
  totalAmount: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
  reconciliationStatus: 'not_started' | 'processing' | 'completed' | 'failed'
  createdAt: string
  deliveryDate: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001',
    supplier: '新鮮蔬果',
    items: 8,
    totalAmount: 12500,
    status: 'delivered',
    reconciliationStatus: 'completed',
    createdAt: '2024-01-15',
    deliveryDate: '2024-01-16',
    priority: 'medium',
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-002',
    supplier: '優質肉品',
    items: 5,
    totalAmount: 18900,
    status: 'shipped',
    reconciliationStatus: 'processing',
    createdAt: '2024-01-15',
    deliveryDate: '2024-01-17',
    priority: 'high',
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-003',
    supplier: '海鮮世界',
    items: 12,
    totalAmount: 25300,
    status: 'confirmed',
    reconciliationStatus: 'not_started',
    createdAt: '2024-01-14',
    deliveryDate: '2024-01-18',
    priority: 'urgent',
  },
  {
    id: '4',
    orderNumber: 'ORD-2024-004',
    supplier: '調味料專家',
    items: 15,
    totalAmount: 8750,
    status: 'pending',
    reconciliationStatus: 'not_started',
    createdAt: '2024-01-14',
    deliveryDate: '2024-01-19',
    priority: 'low',
  },
  {
    id: '5',
    orderNumber: 'ORD-2024-005',
    supplier: '冷凍食品',
    items: 6,
    totalAmount: 15600,
    status: 'delivered',
    reconciliationStatus: 'failed',
    createdAt: '2024-01-13',
    deliveryDate: '2024-01-16',
    priority: 'medium',
  },
]

export default function RecentOrders() {
  const [orders, setOrders] = React.useState(mockOrders)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [reconciliationFilter, setReconciliationFilter] = React.useState('all')
  const { announcePolite } = useScreenReaderAnnouncer()

  const filteredOrders = React.useMemo(() => {
    return orders.filter(order => {
      const matchesSearch =
        searchTerm === '' ||
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      const matchesReconciliation =
        reconciliationFilter === 'all' || order.reconciliationStatus === reconciliationFilter

      return matchesSearch && matchesStatus && matchesReconciliation
    })
  }, [orders, searchTerm, statusFilter, reconciliationFilter])

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'delivered':
        return <Package className="h-4 w-4 text-blue-600" />
      case 'shipped':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return '已完成'
      case 'delivered':
        return '已送達'
      case 'shipped':
        return '已出貨'
      case 'confirmed':
        return '已確認'
      case 'pending':
        return '待確認'
      case 'cancelled':
        return '已取消'
    }
  }

  const getStatusVariant = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'delivered':
        return 'info'
      case 'shipped':
        return 'warning'
      case 'confirmed':
        return 'success'
      case 'pending':
        return 'secondary'
      case 'cancelled':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getReconciliationStatusText = (status: Order['reconciliationStatus']) => {
    switch (status) {
      case 'completed':
        return '已對帳'
      case 'processing':
        return '對帳中'
      case 'failed':
        return '對帳失敗'
      case 'not_started':
        return '未對帳'
    }
  }

  const getReconciliationVariant = (status: Order['reconciliationStatus']) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'processing':
        return 'warning'
      case 'failed':
        return 'destructive'
      case 'not_started':
        return 'secondary'
    }
  }

  const getPriorityColor = (priority: Order['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500'
      case 'high':
        return 'border-l-orange-500'
      case 'medium':
        return 'border-l-yellow-500'
      case 'low':
        return 'border-l-green-500'
    }
  }

  const handleSearch = React.useCallback(
    (value: string) => {
      setSearchTerm(value)
      if (value) {
        announcePolite(`搜尋結果：找到 ${filteredOrders.length} 筆訂單`)
      }
    },
    [filteredOrders.length, announcePolite]
  )

  const statusOptions = [
    { value: 'all', label: '所有狀態' },
    { value: 'pending', label: '待確認' },
    { value: 'confirmed', label: '已確認' },
    { value: 'shipped', label: '已出貨' },
    { value: 'delivered', label: '已送達' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
  ]

  const reconciliationOptions = [
    { value: 'all', label: '所有對帳狀態' },
    { value: 'not_started', label: '未對帳' },
    { value: 'processing', label: '對帳中' },
    { value: 'completed', label: '已對帳' },
    { value: 'failed', label: '對帳失敗' },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-primary-500" />
              <span>近期訂單</span>
            </CardTitle>
            <p className="mt-1 text-sm text-gray-600">最新的採購訂單和對帳狀態</p>
          </div>
          <Link href="/restaurant/orders">
            <Button variant="outline" size="sm">
              查看全部
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 搜尋和篩選 */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="搜尋訂單編號或供應商..."
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <AccessibleSelect
              label="訂單狀態"
              name="status-filter"
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-40"
            />

            <AccessibleSelect
              label="對帳狀態"
              name="reconciliation-filter"
              options={reconciliationOptions}
              value={reconciliationFilter}
              onChange={setReconciliationFilter}
              className="w-40"
            />
          </div>
        </div>

        {/* 訂單列表 */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Package className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>沒有找到符合條件的訂單</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div
                key={order.id}
                className={cn(
                  'rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50',
                  'border-l-4',
                  getPriorityColor(order.priority)
                )}
              >
                <div className="flex items-center justify-between">
                  {/* 左側：基本資訊 */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900">{order.orderNumber}</span>
                      <Badge
                        variant={getStatusVariant(order.status)}
                        size="sm"
                        className="flex items-center space-x-1"
                      >
                        {getStatusIcon(order.status)}
                        <span>{getStatusText(order.status)}</span>
                      </Badge>
                      <Badge
                        variant={getReconciliationVariant(order.reconciliationStatus)}
                        size="sm"
                      >
                        {getReconciliationStatusText(order.reconciliationStatus)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 md:grid-cols-4">
                      <div>
                        <span className="font-medium">供應商：</span>
                        {order.supplier}
                      </div>
                      <div>
                        <span className="font-medium">項目數：</span>
                        {order.items}
                      </div>
                      <div>
                        <span className="font-medium">金額：</span>
                        NT$ {order.totalAmount.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">交期：</span>
                        {new Date(order.deliveryDate).toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                  </div>

                  {/* 右側：操作按鈕 */}
                  <div className="flex items-center space-x-2">
                    <Link href={`/restaurant/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span className="hidden md:inline">查看</span>
                      </Button>
                    </Link>

                    <Button variant="ghost" size="sm" className="p-2" aria-label="更多操作">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 分頁或載入更多 */}
        {filteredOrders.length > 0 && (
          <div className="flex justify-center pt-4">
            <Button variant="outline" size="sm">
              載入更多訂單
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
