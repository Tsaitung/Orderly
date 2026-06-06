/**
 * 供應商訂單狀態相關型別定義
 */

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export type OrderPriority = 'low' | 'medium' | 'high' | 'urgent'

export type PaymentStatus = 'pending' | 'paid' | 'overdue'

export interface OrderItem {
  id: string
  name: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  notes?: string
}

export interface RestaurantContact {
  name: string
  phone: string
  address: string
}

export interface SupplierOrder {
  id: string
  orderNumber: string
  restaurant: string
  restaurantContact: RestaurantContact
  items: OrderItem[]
  totalAmount: number
  status: OrderStatus
  priority: OrderPriority
  orderDate: string
  requestedDeliveryDate: string
  confirmedDeliveryDate?: string
  estimatedPreparationTime: number
  notes?: string
  paymentStatus: PaymentStatus
  customerRating?: number
  tags: string[]
}

export interface OrderStats {
  pending: number
  urgent: number
  preparing: number
  shipping: number
}

export interface FilterState {
  searchTerm: string
  statusFilter: string
  priorityFilter: string
}

export interface SortState {
  field: keyof SupplierOrder
  direction: 'asc' | 'desc'
}

export interface SelectOption {
  value: string
  label: string
}
