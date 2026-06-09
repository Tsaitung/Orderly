/**
 * 供應商訂單狀態組件
 *
 * 此檔案已重構，組件已分解至 order-status/ 目錄
 * 保留此檔案以維持向後兼容性
 *
 * @deprecated 請改用 `@/components/supplier/order-status` 導入
 */

export {
  default,
  SupplierOrderStatus,
  // 子組件
  OrderHeader,
  OrderFilters,
  OrderList,
  OrderCard,
  OrderDetailDialog,
  StatusIcon,
  OrderStatusBadge,
  PaymentStatusBadge,
  CustomerRating,
  // Hook
  useOrderStatus,
  // 型別
  type SupplierOrder,
  type OrderStatus,
  type OrderPriority,
  type PaymentStatus,
  type OrderItem,
  type RestaurantContact,
  type OrderStats,
  type FilterState,
  type SortState,
  type SelectOption,
  // 工具函式
  getStatusText,
  getStatusVariant,
  getPriorityText,
  getPriorityColor,
  formatDateTime,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from './order-status'
