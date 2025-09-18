import { Request, Response } from 'express';
import logger from '../middleware/logger';

// Mock data - in production this would come from database
const mockDashboardData = {
  business: {
    todayGMV: 1234567,
    gmvChange: 15.2,
    activeUsers: 892,
    userChange: 8.5,
    totalOrders: 1543,
    orderChange: 12.3,
    reconciliationQueue: 23,
    queueChange: -18.2
  },
  system: {
    uptime: 99.97,
    apiLatency: 127,
    errorRate: 0.08,
    dbConnections: 45,
    maxConnections: 100
  },
  services: [
    { name: 'API Gateway', status: 'healthy', responseTime: 95, uptime: 99.99 },
    { name: 'User Service', status: 'healthy', responseTime: 123, uptime: 99.95 },
    { name: 'Order Service', status: 'healthy', responseTime: 156, uptime: 99.92 },
    { name: 'Product Service', status: 'warning', responseTime: 298, uptime: 99.87 },
    { name: 'Acceptance Service', status: 'healthy', responseTime: 89, uptime: 99.98 },
    { name: 'Billing Service', status: 'healthy', responseTime: 134, uptime: 99.94 }
  ],
  alerts: [
    { id: 1, type: 'warning', message: 'Product Service 響應時間異常', time: '2 分鐘前' },
    { id: 2, type: 'info', message: '新用戶註冊量增加 25%', time: '15 分鐘前' },
    { id: 3, type: 'success', message: '系統自動修復完成', time: '1 小時前' }
  ]
};

export const getDashboardData = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Dashboard data requested');

    // Simulate real-time data variations
    const variations = {
      activeUsers: Math.floor(Math.random() * 10 - 5),
      apiLatency: Math.floor(Math.random() * 20 - 10),
      reconciliationQueue: Math.floor(Math.random() * 6 - 3)
    };

    const realTimeData = {
      ...mockDashboardData,
      business: {
        ...mockDashboardData.business,
        activeUsers: Math.max(0, mockDashboardData.business.activeUsers + variations.activeUsers),
        reconciliationQueue: Math.max(0, mockDashboardData.business.reconciliationQueue + variations.reconciliationQueue)
      },
      system: {
        ...mockDashboardData.system,
        apiLatency: Math.max(50, mockDashboardData.system.apiLatency + variations.apiLatency)
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: realTimeData,
      service: 'admin-service'
    });
  } catch (error) {
    logger.error('Error fetching dashboard data', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      service: 'admin-service'
    });
  }
};

export const getBusinessMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '24h' } = req.query;
    
    logger.info('Business metrics requested', { period });

    // Mock metrics based on period
    const metrics = {
      gmv: {
        current: 1234567,
        previous: 1072345,
        change: 15.2
      },
      orders: {
        current: 1543,
        previous: 1376,
        change: 12.1
      },
      users: {
        active: 892,
        new: 45,
        retained: 847
      },
      revenue: {
        commission: 37038,
        subscription: 15900,
        total: 52938
      }
    };

    res.json({
      success: true,
      data: {
        period,
        metrics,
        timestamp: new Date().toISOString()
      },
      service: 'admin-service'
    });
  } catch (error) {
    logger.error('Error fetching business metrics', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business metrics',
      service: 'admin-service'
    });
  }
};