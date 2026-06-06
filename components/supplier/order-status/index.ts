/**
 * 供應商訂單狀態模組
 *
 * 提供訂單狀態追蹤、篩選和管理功能
 */

// 主要組件
export { SupplierOrderStatus, SupplierOrderStatus as default } from './SupplierOrderStatus'

// 子組件
export { OrderHeader } from './components/OrderHeader'
export { OrderFilters } from './components/OrderFilters'
export { OrderList } from './components/OrderList'
export { OrderCard } from './components/OrderCard'
export { OrderDetailDialog } from './components/OrderDetailDialog'
export {
  StatusIcon,
  OrderStatusBadge,
  PaymentStatusBadge,
  CustomerRating,
} from './components/StatusBadge'

// Hooks
export { useOrderStatus } from './hooks/useOrderStatus'

// 型別
export type {
  SupplierOrder,
  OrderStatus,
  OrderPriority,
  PaymentStatus,
  OrderItem,
  RestaurantContact,
  OrderStats,
  FilterState,
  SortState,
  SelectOption,
} from './types'

// 工具函式
export {
  getStatusText,
  getStatusVariant,
  getPriorityText,
  getPriorityColor,
  formatDateTime,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from './utils'
