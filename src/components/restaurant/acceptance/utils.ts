/**
 * Acceptance Management Utilities
 * 驗收管理工具函數
 */

import * as React from 'react'
import { Clock, CheckCircle, AlertTriangle, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AcceptanceStatus, AcceptedItem, AcceptanceDiscrepancy } from './types'

/**
 * 取得狀態對應的圖示
 */
export function getStatusIcon(status: AcceptanceStatus): React.ReactNode {
  switch (status) {
    case 'in_progress':
      return React.createElement(Clock, { className: 'h-4 w-4 text-yellow-600' })
    case 'completed':
      return React.createElement(CheckCircle, { className: 'h-4 w-4 text-green-600' })
    case 'disputed':
      return React.createElement(AlertTriangle, { className: 'h-4 w-4 text-red-600' })
  }
}

/**
 * 取得狀態的中文文字
 */
export function getStatusText(status: AcceptanceStatus): string {
  switch (status) {
    case 'in_progress':
      return '進行中'
    case 'completed':
      return '已完成'
    case 'disputed':
      return '有爭議'
  }
}

/**
 * 取得狀態對應的 Badge variant
 */
export function getStatusVariant(
  status: AcceptanceStatus
): 'warning' | 'success' | 'destructive' | 'secondary' {
  switch (status) {
    case 'in_progress':
      return 'warning'
    case 'completed':
      return 'success'
    case 'disputed':
      return 'destructive'
    default:
      return 'secondary'
  }
}

/**
 * 產生品質評分星星
 */
export function getQualityStars(rating: number): React.ReactNode[] {
  return Array.from({ length: 5 }, (_, i) =>
    React.createElement(Star, {
      key: i,
      className: cn('h-4 w-4', i < rating ? 'fill-current text-yellow-400' : 'text-gray-300'),
    })
  )
}

/**
 * 取得品項狀況的中文文字
 */
export function getConditionText(condition: AcceptedItem['condition']): string {
  switch (condition) {
    case 'excellent':
      return '優良'
    case 'good':
      return '良好'
    case 'acceptable':
      return '可接受'
    case 'poor':
      return '差'
    case 'damaged':
      return '損壞'
  }
}

/**
 * 取得品項狀況對應的 Badge variant
 */
export function getConditionVariant(
  condition: AcceptedItem['condition']
): 'success' | 'info' | 'warning' | 'destructive' {
  switch (condition) {
    case 'excellent':
      return 'success'
    case 'good':
      return 'info'
    case 'acceptable':
      return 'warning'
    case 'poor':
    case 'damaged':
      return 'destructive'
  }
}

/**
 * 取得異常嚴重程度的中文文字
 */
export function getDiscrepancySeverityText(severity: AcceptanceDiscrepancy['severity']): string {
  switch (severity) {
    case 'minor':
      return '輕微'
    case 'major':
      return '重大'
    case 'critical':
      return '嚴重'
  }
}

/**
 * 取得異常嚴重程度對應的 Badge variant
 */
export function getDiscrepancySeverityVariant(
  severity: AcceptanceDiscrepancy['severity']
): 'warning' | 'destructive' {
  switch (severity) {
    case 'minor':
      return 'warning'
    case 'major':
    case 'critical':
      return 'destructive'
  }
}

/**
 * 格式化日期時間字串
 */
export function formatDateTime(dateString: string): string {
  if (!dateString) return '未完成'
  return new Date(dateString).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 判斷是否準時送達
 */
export function isOnTimeDelivery(deliveryTime: string, requestedDeliveryTime: string): boolean {
  if (!deliveryTime || !requestedDeliveryTime) return false
  return new Date(deliveryTime) <= new Date(requestedDeliveryTime)
}
