'use client'

// 集中化的狀態定義與樣式/文案

import { CheckCircle, Clock, Truck, Package, AlertTriangle } from 'lucide-react'

export type BadgeVariant =
  | 'default'
  | 'outline'
  | 'secondary'
  | 'warning'
  | 'info'
  | 'success'
  | 'destructive'

export type OrderStatusKey =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'shipped'
  | 'delivered'
  | 'accepted'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'resolved'

export interface StatusMeta {
  label: string
  variant: BadgeVariant
  // 可選：用於表格/列表中的小圖示
  Icon?: React.ComponentType<{ className?: string }>
}

export const ORDER_STATUS_META: Record<OrderStatusKey, StatusMeta> = {
  draft: { label: '草稿', variant: 'secondary' },
  pending: { label: '待確認', variant: 'warning', Icon: Clock },
  confirmed: { label: '已確認', variant: 'info', Icon: CheckCircle },
  preparing: { label: '備貨中', variant: 'info', Icon: Package },
  ready_for_pickup: { label: '待取貨', variant: 'success', Icon: Package },
  in_transit: { label: '配送中', variant: 'info', Icon: Truck },
  shipped: { label: '已出貨', variant: 'info', Icon: Truck },
  delivered: { label: '已送達', variant: 'success', Icon: CheckCircle },
  accepted: { label: '已驗收', variant: 'success', Icon: CheckCircle },
  completed: { label: '已完成', variant: 'success', Icon: CheckCircle },
  cancelled: { label: '已取消', variant: 'destructive', Icon: AlertTriangle },
  disputed: { label: '有爭議', variant: 'destructive', Icon: AlertTriangle },
  resolved: { label: '已解決', variant: 'success', Icon: CheckCircle },
}

export const SUPPLIER_ORDER_STATUSES: OrderStatusKey[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'in_transit',
  'delivered',
  'cancelled',
  'disputed',
]

export const RESTAURANT_ORDER_STATUSES: OrderStatusKey[] = [
  'draft',
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'accepted',
  'completed',
  'cancelled',
]

export function getOrderStatusMeta(status: string | undefined | null): StatusMeta {
  if (!status) return ORDER_STATUS_META.draft
  const key = status as OrderStatusKey
  return ORDER_STATUS_META[key] || ORDER_STATUS_META.draft
}
