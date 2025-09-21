'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
// Local notification type (inlined from NotificationCenter to remove dependency)
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
import {
  Bell,
  Package,
  DollarSign,
  Info,
  User,
  AlertTriangle,
  CheckCircle,
  Eye,
  Archive,
  X
} from 'lucide-react'

interface NotificationBellProps {
  organizationId?: string;
  className?: string;
}

const NOTIFICATION_TYPES = {
  order_status: {
    label: '訂單狀態',
    icon: Package,
    color: 'text-blue-600'
  },
  payment: {
    label: '付款通知',
    icon: DollarSign,
    color: 'text-green-600'
  },
  system: {
    label: '系統通知',
    icon: Info,
    color: 'text-gray-600'
  },
  customer: {
    label: '客戶通知',
    icon: User,
    color: 'text-purple-600'
  },
  product: {
    label: '商品通知',
    icon: Package,
    color: 'text-orange-600'
  }
};

const PRIORITY_CONFIG = {
  low: { label: '低', variant: 'secondary' as const },
  medium: { label: '中', variant: 'outline' as const },
  high: { label: '高', variant: 'warning' as const },
  urgent: { label: '緊急', variant: 'destructive' as const }
};

// Mock notifications - replace with real API
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'order_status',
    priority: 'high',
    title: '訂單狀態更新',
    message: '訂單 #ORD-2024-001 已確認',
    order_id: 'ord-001',
    created_at: new Date().toISOString(),
    read: false,
    archived: false,
    metadata: {
      order_number: 'ORD-2024-001',
      customer_name: '星巴克咖啡',
      new_status: 'confirmed'
    }
  },
  {
    id: '2',
    type: 'customer',
    priority: 'urgent',
    title: '緊急訂單變更',
    message: '客戶要求修改配送時間',
    customer_id: 'cust-002',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    read: false,
    archived: false,
    metadata: {
      customer_name: '鼎泰豐'
    }
  },
  {
    id: '3',
    type: 'payment',
    priority: 'medium',
    title: '付款已完成',
    message: '訂單 #ORD-2024-002 付款完成',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    read: false,
    archived: false,
    metadata: {
      order_number: 'ORD-2024-002',
      amount: 15000
    }
  }
];

export default function NotificationBell({ organizationId, className = '' }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);

  // Get unread notifications
  const unreadNotifications = notifications.filter(n => !n.read && !n.archived);
  const unreadCount = unreadNotifications.length;

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
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

  // Render notification preview
  const renderNotificationPreview = (notification: Notification) => {
    const typeConfig = NOTIFICATION_TYPES[notification.type];
    const priorityConfig = PRIORITY_CONFIG[notification.priority];
    const Icon = typeConfig.icon;

    return (
      <div 
        key={notification.id}
        className="p-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
        onClick={() => markAsRead(notification.id)}
      >
        <div className="flex items-start space-x-3">
          <div className={`p-1.5 rounded-full bg-gray-100 ${typeConfig.color}`}>
            <Icon className="h-4 w-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-sm text-gray-900 truncate">
                {notification.title}
              </h4>
              {notification.priority === 'urgent' && (
                <Badge variant="destructive" className="text-xs px-1 py-0">
                  !
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-gray-600 line-clamp-2">
              {notification.message}
            </p>
            
            <div className="mt-1 text-xs text-gray-500">
              {formatDate(new Date(notification.created_at), { relative: true })}
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                archiveNotification(notification.id);
              }}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            >
              <Archive className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Bell Button */}
      <div className={`relative ${className}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>

        {/* Dropdown Preview */}
        {isOpen && (
          <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden shadow-lg z-50">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">通知</h3>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowFullModal(true);
                      setIsOpen(false);
                    }}
                    className="text-xs"
                  >
                    查看全部
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {unreadNotifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">沒有新通知</p>
                </div>
              ) : (
                <div className="group">
                  {unreadNotifications.slice(0, 5).map(renderNotificationPreview)}
                  
                  {unreadNotifications.length > 5 && (
                    <div className="p-3 text-center border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowFullModal(true);
                          setIsOpen(false);
                        }}
                        className="text-xs text-blue-600"
                      >
                        查看其他 {unreadNotifications.length - 5} 則通知
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Full Notification Modal */}
      <Dialog open={showFullModal} onOpenChange={setShowFullModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>所有通知</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="rounded-full">
                  {unreadCount}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-96">
            {notifications.filter(n => !n.archived).length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">沒有通知</h3>
                <p className="text-gray-500">目前沒有任何通知</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications
                  .filter(n => !n.archived)
                  .map(notification => {
                    const typeConfig = NOTIFICATION_TYPES[notification.type];
                    const priorityConfig = PRIORITY_CONFIG[notification.priority];
                    const Icon = typeConfig.icon;

                    return (
                      <Card 
                        key={notification.id}
                        className={`p-4 ${!notification.read ? 'bg-blue-50 border-blue-200' : ''}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full bg-gray-100 ${typeConfig.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-sm">
                                {notification.title}
                              </h4>
                              <Badge variant={priorityConfig.variant} className="text-xs">
                                {priorityConfig.label}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              {notification.message}
                            </p>
                            
                            <div className="text-xs text-gray-500">
                              {formatDate(new Date(notification.created_at))}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="h-7 w-7 p-0"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => archiveNotification(notification.id)}
                              className="h-7 w-7 p-0"
                            >
                              <Archive className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
