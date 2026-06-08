'use client'

import * as React from 'react'
import { Eye, CheckCircle, Package, MessageSquare, Phone, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SupplierOrder, OrderStatus } from '../types'
import { getPriorityColor, getPriorityText, formatDateTime } from '../utils'
import { OrderStatusBadge, PaymentStatusBadge } from './StatusBadge'

interface OrderCardProps {
  order: SupplierOrder
  onViewDetail: (order: SupplierOrder) => void
  onConfirmOrder: (orderId: string) => void
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void
}

export function OrderCard({
  order,
  onViewDetail,
  onConfirmOrder,
  onUpdateStatus,
}: OrderCardProps): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all hover:shadow-md',
        'border-l-4',
        getPriorityColor(order.priority)
      )}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* 基本資訊 */}
        <OrderBasicInfo order={order} />

        {/* 訂單詳情 */}
        <OrderDetails order={order} />

        {/* 時間資訊 */}
        <OrderTimeInfo order={order} />

        {/* 操作按鈕 */}
        <OrderActions
          order={order}
          onViewDetail={onViewDetail}
          onConfirmOrder={onConfirmOrder}
          onUpdateStatus={onUpdateStatus}
        />
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
  )
}

interface OrderBasicInfoProps {
  order: SupplierOrder
}

function OrderBasicInfo({ order }: OrderBasicInfoProps): React.ReactElement {
  return (
    <div className="space-y-2 lg:col-span-4">
      <div className="flex items-center space-x-3">
        <div className="font-bold text-blue-600">{order.orderNumber}</div>
        <OrderStatusBadge status={order.status} />
        <Badge variant="outline" size="sm">
          {getPriorityText(order.priority)}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="font-medium text-gray-900">{order.restaurant}</div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>聯絡人: {order.restaurantContact.name}</span>
          <Phone className="h-3 w-3" />
          <span>{order.restaurantContact.phone}</span>
        </div>
        <div className="flex items-center space-x-1 text-sm text-gray-600">
          <MapPin className="h-3 w-3" />
          <span>{order.restaurantContact.address}</span>
        </div>
      </div>
    </div>
  )
}

interface OrderDetailsProps {
  order: SupplierOrder
}

function OrderDetails({ order }: OrderDetailsProps): React.ReactElement {
  return (
    <div className="space-y-2 lg:col-span-4">
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">品項數量:</span>
          <span className="font-medium">{order.items.length} 項</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">總金額:</span>
          <span className="font-bold text-green-600">NT$ {order.totalAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">付款狀態:</span>
          <PaymentStatusBadge status={order.paymentStatus} />
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
  )
}

interface OrderTimeInfoProps {
  order: SupplierOrder
}

function OrderTimeInfo({ order }: OrderTimeInfoProps): React.ReactElement {
  return (
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
        <div>
          <span className="block text-gray-600">預估準備:</span>
          <span className="text-xs">{order.estimatedPreparationTime} 小時</span>
        </div>
      </div>
    </div>
  )
}

interface OrderActionsProps {
  order: SupplierOrder
  onViewDetail: (order: SupplierOrder) => void
  onConfirmOrder: (orderId: string) => void
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void
}

function OrderActions({
  order,
  onViewDetail,
  onConfirmOrder,
  onUpdateStatus,
}: OrderActionsProps): React.ReactElement {
  return (
    <div className="flex flex-col space-y-2 lg:col-span-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewDetail(order)}
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
          onClick={() => onConfirmOrder(order.id)}
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
          onClick={() =>
            onUpdateStatus(order.id, order.status === 'confirmed' ? 'preparing' : 'ready')
          }
          className="flex items-center space-x-1"
        >
          <Package className="h-4 w-4" />
          <span>{order.status === 'confirmed' ? '開始準備' : '準備完成'}</span>
        </Button>
      )}

      <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-blue-600">
        <MessageSquare className="h-4 w-4" />
        <span>聯絡客戶</span>
      </Button>
    </div>
  )
}
