'use client'

import { useState, useEffect, useCallback } from 'react'
import { Notification } from '@/components/supplier/notifications/NotificationCenter'

interface NotificationHookResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveNotification: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refetch: () => Promise<void>;
  createNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'read' | 'archived'>) => Promise<void>;
}

interface UseNotificationsOptions {
  organizationId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  filter?: {
    type?: string;
    priority?: string;
    read?: boolean;
    archived?: boolean;
  };
}

// Mock API functions - replace with real API calls
const mockApiDelay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

const generateMockNotifications = (): Notification[] => [
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
  },
  {
    id: '5',
    type: 'product',
    priority: 'medium',
    title: '庫存不足警告',
    message: '商品「台灣茶葉禮盒」庫存僅剩 5 件，建議及時補貨',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    read: false,
    archived: false,
    metadata: {
      product_name: '台灣茶葉禮盒',
      stock_level: 5
    }
  }
];

export function useNotifications(options: UseNotificationsOptions = {}): NotificationHookResult {
  const {
    organizationId,
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    filter = {}
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      
      // Mock API call - replace with real API
      await mockApiDelay(300);
      
      // In real implementation, this would be:
      // const response = await fetch(`/api/v2/notifications?org=${organizationId}`);
      // const data = await response.json();
      
      const mockData = generateMockNotifications();
      
      // Apply filters
      let filteredData = mockData;
      if (filter.type) {
        filteredData = filteredData.filter(n => n.type === filter.type);
      }
      if (filter.priority) {
        filteredData = filteredData.filter(n => n.priority === filter.priority);
      }
      if (typeof filter.read === 'boolean') {
        filteredData = filteredData.filter(n => n.read === filter.read);
      }
      if (typeof filter.archived === 'boolean') {
        filteredData = filteredData.filter(n => n.archived === filter.archived);
      }
      
      setNotifications(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入通知失敗');
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, filter]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Mock API call - replace with real API
      await mockApiDelay(200);
      
      // In real implementation:
      // await fetch(`/api/v2/notifications/${notificationId}/read`, { method: 'POST' });
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '標記已讀失敗');
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      // Mock API call - replace with real API
      await mockApiDelay(300);
      
      // In real implementation:
      // await fetch(`/api/v2/notifications/mark-all-read`, { method: 'POST' });
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '標記全部已讀失敗');
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

  // Archive notification
  const archiveNotification = useCallback(async (notificationId: string) => {
    try {
      // Mock API call - replace with real API
      await mockApiDelay(200);
      
      // In real implementation:
      // await fetch(`/api/v2/notifications/${notificationId}/archive`, { method: 'POST' });
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, archived: true } : n
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '封存通知失敗');
      console.error('Failed to archive notification:', err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      // Mock API call - replace with real API
      await mockApiDelay(200);
      
      // In real implementation:
      // await fetch(`/api/v2/notifications/${notificationId}`, { method: 'DELETE' });
      
      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除通知失敗');
      console.error('Failed to delete notification:', err);
    }
  }, []);

  // Create new notification
  const createNotification = useCallback(async (
    notification: Omit<Notification, 'id' | 'created_at' | 'read' | 'archived'>
  ) => {
    try {
      // Mock API call - replace with real API
      await mockApiDelay(200);
      
      const newNotification: Notification = {
        ...notification,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        read: false,
        archived: false
      };
      
      // In real implementation:
      // const response = await fetch('/api/v2/notifications', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(notification)
      // });
      // const newNotification = await response.json();
      
      setNotifications(prev => [newNotification, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立通知失敗');
      console.error('Failed to create notification:', err);
    }
  }, []);

  // Refetch notifications
  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchNotifications();
  }, [fetchNotifications]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    refetch,
    createNotification
  };
}

// Helper function to create order status notification
export function createOrderStatusNotification(
  orderId: string,
  orderNumber: string,
  customerName: string,
  oldStatus: string,
  newStatus: string
): Omit<Notification, 'id' | 'created_at' | 'read' | 'archived'> {
  const statusLabels: Record<string, string> = {
    pending: '待處理',
    confirmed: '已確認',
    preparing: '備貨中',
    ready_for_pickup: '待取貨',
    in_transit: '配送中',
    delivered: '已送達',
    cancelled: '已取消',
    disputed: '有爭議'
  };

  return {
    type: 'order_status',
    priority: newStatus === 'cancelled' || newStatus === 'disputed' ? 'high' : 'medium',
    title: '訂單狀態更新',
    message: `訂單 #${orderNumber} 狀態已從「${statusLabels[oldStatus] || oldStatus}」更新為「${statusLabels[newStatus] || newStatus}」`,
    order_id: orderId,
    metadata: {
      order_number: orderNumber,
      customer_name: customerName,
      old_status: oldStatus,
      new_status: newStatus
    }
  };
}

// Helper function to create payment notification
export function createPaymentNotification(
  orderId: string,
  orderNumber: string,
  customerName: string,
  amount: number
): Omit<Notification, 'id' | 'created_at' | 'read' | 'archived'> {
  return {
    type: 'payment',
    priority: 'medium',
    title: '付款已完成',
    message: `客戶 ${customerName} 已完成訂單 #${orderNumber} 的付款，金額 NT$ ${amount.toLocaleString()}`,
    order_id: orderId,
    metadata: {
      order_number: orderNumber,
      customer_name: customerName,
      amount
    }
  };
}