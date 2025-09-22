export type UUID = string

// Orders
export type OrderItemDTO = {
  id: UUID
  productId: UUID
  productCode: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  notes?: string
}

export type OrderDTO = {
  id: UUID
  orderNumber: string
  restaurantId: UUID
  supplierId: UUID
  status: string
  deliveryDate: string | Date
  deliveryAddress?: any
  items?: OrderItemDTO[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  notes?: string
  metadata?: Record<string, any>
  createdAt?: string | Date
  updatedAt?: string | Date
}

export type ListResponse<T> = { success: boolean; data: T[]; count: number }
export type ItemResponse<T> = { success: boolean; data: T }

// Acceptance
export type AcceptanceItemDTO = {
  id: UUID
  productCode: string
  productName: string
  deliveredQty: string
  acceptedQty: string
  unit?: string
  reason?: string
}
export type AcceptanceDTO = {
  id: UUID
  orderId: UUID
  restaurantId: UUID
  supplierId: UUID
  status: string
  acceptedDate?: string | Date
  notes?: string
  discrepancies?: any[]
  items?: AcceptanceItemDTO[]
}

// Billing
export type InvoiceDTO = {
  id: UUID
  invoiceNumber: string
  organizationId: UUID
  orderId?: UUID
  status: string
  issueDate?: string | Date
  dueDate?: string | Date
  subtotal: number
  taxAmount: number
  totalAmount: number
  metadata?: Record<string, any>
}

// Notifications
export type NotificationDTO = {
  id: UUID
  userId: UUID
  type: string
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  readAt?: string | Date
  priority: 'low' | 'medium' | 'high' | 'urgent' | string
}
