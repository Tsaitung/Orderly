export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'
export type NotificationType = 'order_status' | 'payment' | 'system' | 'customer' | 'product'

export interface Notification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  order_id?: string
  customer_id?: string
  created_at: string
  read: boolean
  archived: boolean
  metadata?: {
    order_number?: string
    customer_name?: string
    old_status?: string
    new_status?: string
    amount?: number
  }
}

