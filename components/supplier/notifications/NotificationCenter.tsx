'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import {
  Bell,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  Package,
  Clock,
  Truck,
  DollarSign,
  User,
  Eye,
  EyeOff,
  Filter,
  Archive,
  Trash2,
  Loader
} from 'lucide-react'

export interface Notification {
  id: string;
  type: 'order_status' | 'payment' | 'system' | 'customer' | 'product';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  order_id?: string;
  customer_id?: string;
  created_at: string;
  read: boolean;
  archived: boolean;
  metadata?: {
    order_number?: string;
    customer_name?: string;
    old_status?: string;
    new_status?: string;
    amount?: number;
  };
}

interface NotificationCenterProps {
  organizationId?: string;
  className?: string;
}

const NOTIFICATION_TYPES = {
  order_status: {
    label: '訂單狀態',
    icon: Package,
    color: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  payment: {
    label: '付款通知',
    icon: DollarSign,
    color: 'text-green-600 bg-green-50 border-green-200'
  },
  system: {
    label: '系統通知',
    icon: Info,
    color: 'text-gray-600 bg-gray-50 border-gray-200'
  },
  customer: {
    label: '客戶通知',
    icon: User,
    color: 'text-purple-600 bg-purple-50 border-purple-200'
  },
  product: {
    label: '商品通知',
    icon: Package,
    color: 'text-orange-600 bg-orange-50 border-orange-200'
  }
};

const PRIORITY_CONFIG = {
  low: { label: '低', variant: 'secondary' as const },
  medium: { label: '中', variant: 'outline' as const },
  high: { label: '高', variant: 'warning' as const },
  urgent: { label: '緊急', variant: 'destructive' as const }
};

// Mock notifications data - replace with real API
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'order_status',
    priority: 'high',
    title: '訂單狀態更新',
    message: '訂單 #ORD-2024-001 已確認，請準備出貨',
    order_id: 'ord-001',
    created_at: new Date().toISOString(),
    read: false,
    archived: false,
    metadata: {
      order_number: 'ORD-2024-001',
      customer_name: '星巴克咖啡',
      old_status: 'pending',
      new_status: 'confirmed'
    }
  },
  {
    id: '2',
    type: 'payment',
    priority: 'medium',
    title: '付款已完成',
    message: '客戶 星巴克咖啡 已完成訂單 #ORD-2024-002 的付款',
    order_id: 'ord-002',
    customer_id: 'cust-001',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    read: true,
    archived: false,
    metadata: {
      order_number: 'ORD-2024-002',
      customer_name: '星巴克咖啡',
      amount: 15000
    }
  },
  {
    id: '3',
    type: 'system',
    priority: 'low',
    title: '系統維護通知',
    message: '系統將於今晚 23:00-24:00 進行例行維護',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    read: false,
    archived: false
  },
  {
    id: '4',
    type: 'customer',
    priority: 'urgent',
    title: '緊急訂單變更',
    message: '客戶 鼎泰豐 要求緊急修改訂單 #ORD-2024-003 的配送時間',
    order_id: 'ord-003',
    customer_id: 'cust-002',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    read: false,
    archived: false,
    metadata: {
      order_number: 'ORD-2024-003',
      customer_name: '鼎泰豐'
    }
  }
];

export default function NotificationCenter({ organizationId, className = '' }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'archived' && !notification.archived) return false;
    if (filter !== 'archived' && notification.archived) return false;
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    return true;
  });

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  // Archive notification
  const archiveNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, archived: true } : n
      )
    );
  };

  // Delete notification
  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(n => n.id !== notificationId)
    );
  };

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;

  // Render notification item
  const renderNotification = (notification: Notification) => {
    const typeConfig = NOTIFICATION_TYPES[notification.type];
    const priorityConfig = PRIORITY_CONFIG[notification.priority];
    const Icon = typeConfig.icon;

    return (
      <Card 
        key={notification.id}
        className={`p-4 transition-all hover:shadow-md ${
          !notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
        }`}
      >
        <div className="flex items-start space-x-4">
          {/* Icon */}
          <div className={`p-2 rounded-full ${typeConfig.color}`}>
            <Icon className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className={`font-medium text-sm ${
                    !notification.read ? 'text-gray-900' : 'text-gray-700'
                  }`}>
                    {notification.title}
                  </h4>
                  <Badge variant={priorityConfig.variant} className="text-xs">
                    {priorityConfig.label}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {typeConfig.label}
                  </Badge>
                </div>
                
                <p className={`text-sm ${
                  !notification.read ? 'text-gray-700' : 'text-gray-600'
                }`}>
                  {notification.message}
                </p>

                {/* Metadata */}
                {notification.metadata && (
                  <div className="mt-2 space-y-1">
                    {notification.metadata.order_number && (
                      <div className="text-xs text-gray-500">
                        訂單: {notification.metadata.order_number}
                      </div>
                    )}
                    {notification.metadata.customer_name && (
                      <div className="text-xs text-gray-500">
                        客戶: {notification.metadata.customer_name}
                      </div>
                    )}
                    {notification.metadata.amount && (
                      <div className="text-xs text-gray-500">
                        金額: NT$ {notification.metadata.amount.toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-2 text-xs text-gray-500">
                  {formatDate(new Date(notification.created_at))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1 ml-4">
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsRead(notification.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => archiveNotification(notification.id)}
                  className="h-8 w-8 p-0"
                >
                  <Archive className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteNotification(notification.id)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600">載入通知中...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="h-6 w-6 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">通知中心</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="rounded-full">
              {unreadCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            全部標記已讀
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">篩選:</span>
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">全部通知</option>
            <option value="unread">未讀通知</option>
            <option value="archived">已封存</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">所有類型</option>
            {Object.entries(NOTIFICATION_TYPES).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          <div className="text-sm text-gray-500">
            共 {filteredNotifications.length} 則通知
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">沒有通知</h3>
            <p className="text-gray-500">
              {filter === 'unread' ? '所有通知都已讀取' : 
               filter === 'archived' ? '沒有已封存的通知' :
               '目前沒有任何通知'}
            </p>
          </Card>
        ) : (
          filteredNotifications.map(renderNotification)
        )}
      </div>
    </div>
  );
}