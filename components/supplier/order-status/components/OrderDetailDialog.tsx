'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { FormDialog } from '@/components/ui/accessible-modal'
import type { SupplierOrder } from '../types'
import { formatDateTime, getPriorityText, getStatusVariant } from '../utils'
import { StatusIcon, PaymentStatusBadge, CustomerRating, OrderStatusBadge } from './StatusBadge'

interface OrderDetailDialogProps {
  order: SupplierOrder | null
  isOpen: boolean
  onClose: () => void
}

export function OrderDetailDialog({
  order,
  isOpen,
  onClose,
}: OrderDetailDialogProps): React.ReactElement | null {
  if (!order) return null

  return (
    <FormDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`訂單詳情 - ${order.orderNumber}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* 訂單基本資訊 */}
        <div className="grid grid-cols-2 gap-6">
          <OrderInfoSection order={order} />
          <CustomerInfoSection order={order} />
        </div>

        {/* 訂單項目明細 */}
        <OrderItemsSection order={order} />

        {/* 狀態和備註 */}
        <div className="grid grid-cols-2 gap-6">
          <OrderStatusSection order={order} />
          {order.notes && <OrderNotesSection notes={order.notes} />}
        </div>

        {/* 標籤 */}
        {order.tags.length > 0 && <OrderTagsSection tags={order.tags} />}
      </div>
    </FormDialog>
  )
}

interface OrderInfoSectionProps {
  order: SupplierOrder
}

function OrderInfoSection({ order }: OrderInfoSectionProps): React.ReactElement {
  return (
    <div>
      <h4 className="mb-3 font-medium text-gray-900">訂單資訊</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">訂單編號:</span>
          <span className="font-medium">{order.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">下單時間:</span>
          <span>{formatDateTime(order.orderDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">要求交期:</span>
          <span>{formatDateTime(order.requestedDeliveryDate)}</span>
        </div>
        {order.confirmedDeliveryDate && (
          <div className="flex justify-between">
            <span className="text-gray-600">確認交期:</span>
            <span>{formatDateTime(order.confirmedDeliveryDate)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600">預估準備時間:</span>
          <span>{order.estimatedPreparationTime} 小時</span>
        </div>
      </div>
    </div>
  )
}

interface CustomerInfoSectionProps {
  order: SupplierOrder
}

function CustomerInfoSection({ order }: CustomerInfoSectionProps): React.ReactElement {
  return (
    <div>
      <h4 className="mb-3 font-medium text-gray-900">客戶資訊</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">餐廳名稱:</span>
          <span className="font-medium">{order.restaurant}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">聯絡人:</span>
          <span>{order.restaurantContact.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">電話:</span>
          <span>{order.restaurantContact.phone}</span>
        </div>
        <div className="col-span-2">
          <span className="text-gray-600">地址:</span>
          <p className="mt-1">{order.restaurantContact.address}</p>
        </div>
      </div>
    </div>
  )
}

interface OrderItemsSectionProps {
  order: SupplierOrder
}

function OrderItemsSection({ order }: OrderItemsSectionProps): React.ReactElement {
  return (
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
        {order.items.map(item => (
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
              NT$ {order.totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface OrderStatusSectionProps {
  order: SupplierOrder
}

function OrderStatusSection({ order }: OrderStatusSectionProps): React.ReactElement {
  return (
    <div>
      <h4 className="mb-3 font-medium text-gray-900">訂單狀態</h4>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <StatusIcon status={order.status} />
          <OrderStatusBadge status={order.status} showIcon={false} />
          <Badge variant={getStatusVariant(order.status)}>
            {getPriorityText(order.priority)}優先級
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-gray-600">付款狀態:</span>
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
        {order.customerRating && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">客戶評分:</span>
            <CustomerRating rating={order.customerRating} />
          </div>
        )}
      </div>
    </div>
  )
}

interface OrderNotesSectionProps {
  notes: string
}

function OrderNotesSection({ notes }: OrderNotesSectionProps): React.ReactElement {
  return (
    <div>
      <h4 className="mb-3 font-medium text-gray-900">特殊備註</h4>
      <div className="rounded-r border-l-4 border-yellow-400 bg-yellow-50 p-3">
        <p className="text-sm text-yellow-800">{notes}</p>
      </div>
    </div>
  )
}

interface OrderTagsSectionProps {
  tags: string[]
}

function OrderTagsSection({ tags }: OrderTagsSectionProps): React.ReactElement {
  return (
    <div>
      <h4 className="mb-3 font-medium text-gray-900">訂單標籤</h4>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <Badge key={index} variant="outline">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  )
}
