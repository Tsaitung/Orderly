'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useOrderStatus } from './hooks/useOrderStatus'
import { OrderHeader } from './components/OrderHeader'
import { OrderFilters } from './components/OrderFilters'
import { OrderList } from './components/OrderList'
import { OrderDetailDialog } from './components/OrderDetailDialog'

export function SupplierOrderStatus(): React.ReactElement {
  const {
    filteredOrders,
    stats,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    selectedOrder,
    isDetailOpen,
    setIsDetailOpen,
    handleViewDetail,
    handleConfirmOrder,
    handleUpdateStatus,
  } = useOrderStatus()

  return (
    <Card className="h-full">
      <OrderHeader stats={stats} />

      <CardContent className="space-y-4">
        <OrderFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
        />

        <OrderList
          orders={filteredOrders}
          onViewDetail={handleViewDetail}
          onConfirmOrder={handleConfirmOrder}
          onUpdateStatus={handleUpdateStatus}
        />
      </CardContent>

      <OrderDetailDialog
        order={selectedOrder}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </Card>
  )
}

export default SupplierOrderStatus
