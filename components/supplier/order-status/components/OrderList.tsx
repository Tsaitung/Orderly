'use client'

import * as React from 'react'
import { Package } from 'lucide-react'
import type { SupplierOrder, OrderStatus } from '../types'
import { OrderCard } from './OrderCard'

interface OrderListProps {
  orders: SupplierOrder[]
  onViewDetail: (order: SupplierOrder) => void
  onConfirmOrder: (orderId: string) => void
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void
}

export function OrderList({
  orders,
  onViewDetail,
  onConfirmOrder,
  onUpdateStatus,
}: OrderListProps): React.ReactElement {
  if (orders.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-3">
      {orders.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          onViewDetail={onViewDetail}
          onConfirmOrder={onConfirmOrder}
          onUpdateStatus={onUpdateStatus}
        />
      ))}
    </div>
  )
}

function EmptyState(): React.ReactElement {
  return (
    <div className="py-8 text-center text-gray-500">
      <Package className="mx-auto mb-4 h-12 w-12 opacity-50" />
      <p>沒有找到符合條件的訂單</p>
    </div>
  )
}
