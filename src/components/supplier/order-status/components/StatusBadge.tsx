'use client'

import * as React from 'react'
import { Clock, CheckCircle, Truck, Package, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { OrderStatus, PaymentStatus } from '../types'
import { getStatusText, getStatusVariant } from '../utils'

interface StatusIconProps {
  status: OrderStatus
  className?: string
}

export function StatusIcon({ status, className = 'h-4 w-4' }: StatusIconProps): React.ReactElement {
  const iconProps = { className }

  switch (status) {
    case 'pending':
      return <Clock {...iconProps} className={`${className} text-yellow-600`} />
    case 'confirmed':
      return <CheckCircle {...iconProps} className={`${className} text-green-600`} />
    case 'preparing':
      return <Package {...iconProps} className={`${className} text-blue-600`} />
    case 'ready':
      return <CheckCircle {...iconProps} className={`${className} text-green-500`} />
    case 'shipped':
      return <Truck {...iconProps} className={`${className} text-purple-600`} />
    case 'delivered':
      return <CheckCircle {...iconProps} className={`${className} text-green-700`} />
    case 'completed':
      return <CheckCircle {...iconProps} className={`${className} text-green-800`} />
    case 'cancelled':
      return <AlertTriangle {...iconProps} className={`${className} text-red-600`} />
    default:
      return <Clock {...iconProps} />
  }
}

interface OrderStatusBadgeProps {
  status: OrderStatus
  showIcon?: boolean
}

export function OrderStatusBadge({
  status,
  showIcon = true,
}: OrderStatusBadgeProps): React.ReactElement {
  return (
    <Badge variant={getStatusVariant(status)} className="flex items-center space-x-1">
      {showIcon && <StatusIcon status={status} />}
      <span>{getStatusText(status)}</span>
    </Badge>
  )
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps): React.ReactElement {
  switch (status) {
    case 'paid':
      return (
        <Badge variant="success" size="sm">
          已付款
        </Badge>
      )
    case 'pending':
      return (
        <Badge variant="warning" size="sm">
          待付款
        </Badge>
      )
    case 'overdue':
      return (
        <Badge variant="destructive" size="sm">
          逾期
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" size="sm">
          未知
        </Badge>
      )
  }
}

interface CustomerRatingProps {
  rating: number
  maxRating?: number
}

export function CustomerRating({ rating, maxRating = 5 }: CustomerRatingProps): React.ReactElement {
  return (
    <div className="flex items-center">
      {[...Array(maxRating)].map((_, i) => (
        <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      ))}
      <span className="ml-1 text-sm text-gray-600">
        ({rating}/{maxRating})
      </span>
    </div>
  )
}
