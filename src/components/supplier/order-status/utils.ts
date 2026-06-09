/**
 * 供應商訂單狀態工具函式
 */

import type { OrderStatus, OrderPriority, SelectOption } from './types'

/**
 * 取得訂單狀態對應的中文文字
 */
export function getStatusText(status: OrderStatus): string {
  const statusTextMap: Record<OrderStatus, string> = {
    pending: '待確認',
    confirmed: '已確認',
    preparing: '準備中',
    ready: '待出貨',
    shipped: '已出貨',
    delivered: '已送達',
    completed: '已完成',
    cancelled: '已取消',
  }
  return statusTextMap[status]
}

/**
 * 取得訂單狀態對應的 Badge variant
 */
export function getStatusVariant(
  status: OrderStatus
): 'warning' | 'success' | 'info' | 'destructive' | 'secondary' {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'confirmed':
    case 'ready':
    case 'delivered':
    case 'completed':
      return 'success'
    case 'preparing':
    case 'shipped':
      return 'info'
    case 'cancelled':
      return 'destructive'
    default:
      return 'secondary'
  }
}

/**
 * 取得優先級對應的中文文字
 */
export function getPriorityText(priority: OrderPriority): string {
  const priorityTextMap: Record<OrderPriority, string> = {
    urgent: '緊急',
    high: '高',
    medium: '中',
    low: '低',
  }
  return priorityTextMap[priority]
}

/**
 * 取得優先級對應的樣式類別
 */
export function getPriorityColor(priority: OrderPriority): string {
  const priorityColorMap: Record<OrderPriority, string> = {
    urgent: 'border-l-red-500 bg-red-50',
    high: 'border-l-orange-500 bg-orange-50',
    medium: 'border-l-yellow-500 bg-yellow-50',
    low: 'border-l-green-500 bg-green-50',
  }
  return priorityColorMap[priority]
}

/**
 * 格式化日期時間
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 訂單狀態篩選選項
 */
export const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: '所有狀態' },
  { value: 'pending', label: '待確認' },
  { value: 'confirmed', label: '已確認' },
  { value: 'preparing', label: '準備中' },
  { value: 'ready', label: '待出貨' },
  { value: 'shipped', label: '已出貨' },
  { value: 'delivered', label: '已送達' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

/**
 * 優先級篩選選項
 */
export const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'all', label: '所有優先級' },
  { value: 'urgent', label: '緊急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]
