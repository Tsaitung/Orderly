export interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'order' | 'acceptance' | 'billing' | 'system' | 'promotion';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationRequest {
  userId: string;
  title: string;
  content: string;
  type: 'order' | 'acceptance' | 'billing' | 'system' | 'promotion';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationSettings {
  id: string;
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  orderNotifications: boolean;
  acceptanceNotifications: boolean;
  billingNotifications: boolean;
  promotionNotifications: boolean;
  updatedAt: Date;
}

export interface UpdateNotificationSettingsRequest {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  smsEnabled?: boolean;
  orderNotifications?: boolean;
  acceptanceNotifications?: boolean;
  billingNotifications?: boolean;
  promotionNotifications?: boolean;
}