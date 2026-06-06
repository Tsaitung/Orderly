'use client'

import * as React from 'react'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import type { SupplierOrder, OrderStats, OrderStatus } from '../types'
import { getStatusText } from '../utils'

const mockSupplierOrders: SupplierOrder[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-156',
    restaurant: '台北美食餐廳',
    restaurantContact: {
      name: '張經理',
      phone: '02-1234-5678',
      address: '台北市信義區忠孝東路四段 123 號',
    },
    items: [
      { id: '1-1', name: '有機高麗菜', quantity: 20, unit: '公斤', unitPrice: 45, totalPrice: 900 },
      {
        id: '1-2',
        name: '新鮮蘿蔔',
        quantity: 15,
        unit: '公斤',
        unitPrice: 30,
        totalPrice: 450,
        notes: '要求特選品質',
      },
    ],
    totalAmount: 1350,
    status: 'pending',
    priority: 'urgent',
    orderDate: '2024-01-15 14:30',
    requestedDeliveryDate: '2024-01-16 08:00',
    estimatedPreparationTime: 4,
    notes: '急單，請優先處理',
    paymentStatus: 'pending',
    tags: ['急單', '老客戶', '蔬菜'],
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-157',
    restaurant: '精緻料理',
    restaurantContact: {
      name: '李主廚',
      phone: '02-2345-6789',
      address: '台北市大安區敦化南路二段 456 號',
    },
    items: [
      { id: '2-1', name: '優質牛肉', quantity: 10, unit: '公斤', unitPrice: 800, totalPrice: 8000 },
      { id: '2-2', name: '新鮮香菇', quantity: 5, unit: '公斤', unitPrice: 120, totalPrice: 600 },
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
    tags: ['高價值', 'VIP客戶', '肉品'],
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-158',
    restaurant: '美味小館',
    restaurantContact: {
      name: '王老闆',
      phone: '02-3456-7890',
      address: '台北市中山區南京東路三段 789 號',
    },
    items: [
      { id: '3-1', name: '新鮮鮭魚', quantity: 3, unit: '公斤', unitPrice: 1200, totalPrice: 3600 },
      { id: '3-2', name: '海鮮拼盤', quantity: 2, unit: '份', unitPrice: 800, totalPrice: 1600 },
    ],
    totalAmount: 5200,
    status: 'preparing',
    priority: 'medium',
    orderDate: '2024-01-14 16:45',
    requestedDeliveryDate: '2024-01-16 11:00',
    confirmedDeliveryDate: '2024-01-16 11:00',
    estimatedPreparationTime: 6,
    paymentStatus: 'paid',
    tags: ['海鮮', '定期客戶'],
  },
  {
    id: '4',
    orderNumber: 'ORD-2024-159',
    restaurant: '家常菜館',
    restaurantContact: {
      name: '陳大姐',
      phone: '02-4567-8901',
      address: '台北市萬華區西門街 101 號',
    },
    items: [
      { id: '4-1', name: '季節蔬菜包', quantity: 1, unit: '箱', unitPrice: 800, totalPrice: 800 },
      { id: '4-2', name: '調味料組合', quantity: 2, unit: '組', unitPrice: 200, totalPrice: 400 },
    ],
    totalAmount: 1200,
    status: 'shipped',
    priority: 'low',
    orderDate: '2024-01-14 09:20',
    requestedDeliveryDate: '2024-01-15 16:00',
    confirmedDeliveryDate: '2024-01-15 16:00',
    estimatedPreparationTime: 2,
    paymentStatus: 'paid',
    tags: ['小額', '組合商品'],
  },
]

interface UseOrderStatusReturn {
  orders: SupplierOrder[]
  filteredOrders: SupplierOrder[]
  stats: OrderStats
  searchTerm: string
  setSearchTerm: (term: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  priorityFilter: string
  setPriorityFilter: (priority: string) => void
  sortField: keyof SupplierOrder
  sortDirection: 'asc' | 'desc'
  selectedOrder: SupplierOrder | null
  setSelectedOrder: (order: SupplierOrder | null) => void
  isDetailOpen: boolean
  setIsDetailOpen: (open: boolean) => void
  handleSort: (field: keyof SupplierOrder) => void
  handleViewDetail: (order: SupplierOrder) => void
  handleConfirmOrder: (orderId: string) => void
  handleUpdateStatus: (orderId: string, newStatus: OrderStatus) => void
}

export function useOrderStatus(): UseOrderStatusReturn {
  const [orders, setOrders] = React.useState<SupplierOrder[]>(mockSupplierOrders)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [priorityFilter, setPriorityFilter] = React.useState('all')
  const [selectedOrder, setSelectedOrder] = React.useState<SupplierOrder | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [sortField, setSortField] = React.useState<keyof SupplierOrder>('orderDate')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc')

  const { announcePolite, announceSuccess } = useScreenReaderAnnouncer()

  const filteredOrders = React.useMemo(() => {
    const filtered = orders.filter(order => {
      const matchesSearch =
        searchTerm === '' ||
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.restaurant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.restaurantContact.name.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })

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

  const stats = React.useMemo((): OrderStats => {
    const pending = orders.filter(o => o.status === 'pending').length
    const urgent = orders.filter(o => o.priority === 'urgent').length
    const preparing = orders.filter(o => o.status === 'preparing').length
    const shipping = orders.filter(o => o.status === 'shipped').length

    return { pending, urgent, preparing, shipping }
  }, [orders])

  const handleSort = React.useCallback(
    (field: keyof SupplierOrder) => {
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
    (order: SupplierOrder) => {
      setSelectedOrder(order)
      setIsDetailOpen(true)
      announcePolite(`查看訂單 ${order.orderNumber} 詳細資訊`)
    },
    [announcePolite]
  )

  const handleConfirmOrder = React.useCallback(
    (orderId: string) => {
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? {
                ...order,
                status: 'confirmed' as const,
                confirmedDeliveryDate: order.requestedDeliveryDate,
              }
            : order
        )
      )
      announceSuccess('訂單已確認')
    },
    [announceSuccess]
  )

  const handleUpdateStatus = React.useCallback(
    (orderId: string, newStatus: OrderStatus) => {
      setOrders(prev =>
        prev.map(order => (order.id === orderId ? { ...order, status: newStatus } : order))
      )
      announceSuccess(`訂單狀態已更新為 ${getStatusText(newStatus)}`)
    },
    [announceSuccess]
  )

  return {
    orders,
    filteredOrders,
    stats,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    sortField,
    sortDirection,
    selectedOrder,
    setSelectedOrder,
    isDetailOpen,
    setIsDetailOpen,
    handleSort,
    handleViewDetail,
    handleConfirmOrder,
    handleUpdateStatus,
  }
}
