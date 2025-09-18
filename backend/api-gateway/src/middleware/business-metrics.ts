import { Request, Response, NextFunction } from 'express';
import { getSimpleAPM, simpleAPMMetrics } from './apm-simple';

// 業務指標類型定義
export interface OrderMetrics {
  orderId: string;
  restaurantId: string;
  supplierId: string;
  orderValue: number;
  itemCount: number;
  orderType: 'standard' | 'express' | 'bulk';
  status: 'created' | 'confirmed' | 'preparing' | 'delivered' | 'completed' | 'cancelled';
  createdAt: number;
  completedAt?: number;
  processingTime?: number;
}

export interface UserMetrics {
  userId: string;
  userType: 'restaurant' | 'supplier' | 'admin';
  action: 'login' | 'logout' | 'register' | 'order_create' | 'order_view' | 'profile_update';
  sessionId: string;
  timestamp: number;
  duration?: number;
  deviceType: 'web' | 'mobile' | 'tablet';
  location?: string;
}

export interface SupplyChainMetrics {
  supplierId: string;
  restaurantId: string;
  responseTime: number;
  acceptanceRate: number;
  deliveryTime: number;
  qualityScore: number;
  onTimeDelivery: boolean;
  timestamp: number;
}

export interface FinancialMetrics {
  transactionId: string;
  orderId: string;
  amount: number;
  currency: 'TWD' | 'USD' | 'CNY';
  paymentMethod: 'credit_card' | 'bank_transfer' | 'digital_wallet' | 'cash';
  processingTime: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  fees: number;
  timestamp: number;
}

export interface SystemMetrics {
  service: string;
  endpoint: string;
  responseTime: number;
  statusCode: number;
  errorType?: string;
  cacheHit: boolean;
  dbQueryTime?: number;
  timestamp: number;
}

// 業務指標收集器
class BusinessMetricsCollector {
  private orderMetrics: OrderMetrics[] = [];
  private userMetrics: UserMetrics[] = [];
  private supplyChainMetrics: SupplyChainMetrics[] = [];
  private financialMetrics: FinancialMetrics[] = [];
  private systemMetrics: SystemMetrics[] = [];

  constructor() {
    // 定期清理舊數據並計算聚合指標
    setInterval(() => {
      this.calculateAggregatedMetrics();
      this.cleanup();
    }, 60000); // 每分鐘執行一次
  }

  // 記錄訂單指標
  recordOrderMetric(metric: OrderMetrics): void {
    this.orderMetrics.push(metric);
    
    // 發送到 APM
    simpleAPMMetrics.recordBusinessEvent('order.created', 1, {
      restaurant_id: metric.restaurantId,
      supplier_id: metric.supplierId,
      order_type: metric.orderType,
      item_count: metric.itemCount.toString(),
    });

    simpleAPMMetrics.recordBusinessEvent('order.value', metric.orderValue, {
      restaurant_id: metric.restaurantId,
      order_type: metric.orderType,
    });

    if (metric.processingTime) {
      simpleAPMMetrics.recordPerformance('order.processing', metric.processingTime, {
        order_type: metric.orderType,
        status: metric.status,
      });
    }

    console.log(`📊 [Business Metrics] Order: ${metric.orderId} - ${metric.status} (${metric.orderValue} TWD)`);
  }

  // 記錄用戶指標
  recordUserMetric(metric: UserMetrics): void {
    this.userMetrics.push(metric);
    
    // 發送到 APM
    simpleAPMMetrics.recordBusinessEvent(`user.${metric.action}`, 1, {
      user_type: metric.userType,
      device_type: metric.deviceType,
      location: metric.location || 'unknown',
    });

    if (metric.duration) {
      simpleAPMMetrics.recordPerformance('user.session', metric.duration, {
        user_type: metric.userType,
        device_type: metric.deviceType,
      });
    }

    console.log(`👤 [Business Metrics] User: ${metric.action} - ${metric.userType} (${metric.deviceType})`);
  }

  // 記錄供應鏈指標
  recordSupplyChainMetric(metric: SupplyChainMetrics): void {
    this.supplyChainMetrics.push(metric);
    
    // 發送到 APM
    simpleAPMMetrics.recordPerformance('supplier.response', metric.responseTime, {
      supplier_id: metric.supplierId,
      restaurant_id: metric.restaurantId,
    });

    simpleAPMMetrics.recordBusinessEvent('supplier.acceptance_rate', metric.acceptanceRate, {
      supplier_id: metric.supplierId,
    });

    simpleAPMMetrics.recordPerformance('delivery.time', metric.deliveryTime, {
      supplier_id: metric.supplierId,
      on_time: metric.onTimeDelivery.toString(),
    });

    simpleAPMMetrics.recordBusinessEvent('delivery.quality_score', metric.qualityScore, {
      supplier_id: metric.supplierId,
    });

    console.log(`🚛 [Business Metrics] Supply Chain: ${metric.supplierId} → ${metric.restaurantId} (${metric.qualityScore}/100)`);
  }

  // 記錄金融指標
  recordFinancialMetric(metric: FinancialMetrics): void {
    this.financialMetrics.push(metric);
    
    // 發送到 APM
    simpleAPMMetrics.recordBusinessEvent('payment.transaction', 1, {
      payment_method: metric.paymentMethod,
      currency: metric.currency,
      status: metric.status,
    });

    simpleAPMMetrics.recordBusinessEvent('payment.amount', metric.amount, {
      currency: metric.currency,
      payment_method: metric.paymentMethod,
    });

    simpleAPMMetrics.recordPerformance('payment.processing', metric.processingTime, {
      payment_method: metric.paymentMethod,
      status: metric.status,
    });

    if (metric.fees > 0) {
      simpleAPMMetrics.recordBusinessEvent('payment.fees', metric.fees, {
        payment_method: metric.paymentMethod,
      });
    }

    console.log(`💰 [Business Metrics] Payment: ${metric.transactionId} - ${metric.amount} ${metric.currency} (${metric.status})`);
  }

  // 記錄系統指標
  recordSystemMetric(metric: SystemMetrics): void {
    this.systemMetrics.push(metric);
    
    // 發送到 APM
    simpleAPMMetrics.recordPerformance('system.response', metric.responseTime, {
      service: metric.service,
      endpoint: metric.endpoint,
      status_code: metric.statusCode.toString(),
    });

    simpleAPMMetrics.recordBusinessEvent('system.cache_hit', metric.cacheHit ? 1 : 0, {
      service: metric.service,
      endpoint: metric.endpoint,
    });

    if (metric.dbQueryTime) {
      simpleAPMMetrics.recordPerformance('database.query', metric.dbQueryTime, {
        service: metric.service,
      });
    }

    if (metric.errorType) {
      simpleAPMMetrics.recordError(metric.errorType, {
        service: metric.service,
        endpoint: metric.endpoint,
      });
    }
  }

  // 計算聚合指標
  private calculateAggregatedMetrics(): void {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);

    // 訂單聚合指標
    const recentOrders = this.orderMetrics.filter(m => m.createdAt > hourAgo);
    if (recentOrders.length > 0) {
      const avgOrderValue = recentOrders.reduce((sum, o) => sum + o.orderValue, 0) / recentOrders.length;
      const completedOrders = recentOrders.filter(o => o.status === 'completed');
      const completionRate = (completedOrders.length / recentOrders.length) * 100;
      
      simpleAPMMetrics.recordBusinessEvent('orders.hourly_count', recentOrders.length);
      simpleAPMMetrics.recordBusinessEvent('orders.avg_value', avgOrderValue);
      simpleAPMMetrics.recordBusinessEvent('orders.completion_rate', completionRate);

      console.log(`📈 [Hourly Metrics] Orders: ${recentOrders.length}, Avg Value: ${avgOrderValue.toFixed(2)}, Completion: ${completionRate.toFixed(1)}%`);
    }

    // 用戶聚合指標
    const recentUsers = this.userMetrics.filter(m => m.timestamp > hourAgo);
    if (recentUsers.length > 0) {
      const uniqueUsers = new Set(recentUsers.map(u => u.userId)).size;
      const avgSessionTime = recentUsers
        .filter(u => u.duration)
        .reduce((sum, u) => sum + (u.duration || 0), 0) / recentUsers.filter(u => u.duration).length;

      simpleAPMMetrics.recordBusinessEvent('users.hourly_active', uniqueUsers);
      if (!isNaN(avgSessionTime)) {
        simpleAPMMetrics.recordBusinessEvent('users.avg_session_time', avgSessionTime);
      }

      console.log(`👥 [Hourly Metrics] Active Users: ${uniqueUsers}, Avg Session: ${avgSessionTime ? avgSessionTime.toFixed(0) : 'N/A'}s`);
    }

    // 供應鏈聚合指標
    const recentSupplyChain = this.supplyChainMetrics.filter(m => m.timestamp > hourAgo);
    if (recentSupplyChain.length > 0) {
      const avgResponseTime = recentSupplyChain.reduce((sum, s) => sum + s.responseTime, 0) / recentSupplyChain.length;
      const avgQualityScore = recentSupplyChain.reduce((sum, s) => sum + s.qualityScore, 0) / recentSupplyChain.length;
      const onTimeRate = (recentSupplyChain.filter(s => s.onTimeDelivery).length / recentSupplyChain.length) * 100;

      simpleAPMMetrics.recordBusinessEvent('supply_chain.avg_response_time', avgResponseTime);
      simpleAPMMetrics.recordBusinessEvent('supply_chain.avg_quality_score', avgQualityScore);
      simpleAPMMetrics.recordBusinessEvent('supply_chain.on_time_rate', onTimeRate);

      console.log(`🏭 [Hourly Metrics] Supply Chain - Response: ${avgResponseTime.toFixed(0)}ms, Quality: ${avgQualityScore.toFixed(1)}, On-time: ${onTimeRate.toFixed(1)}%`);
    }

    // 金融聚合指標
    const recentFinancial = this.financialMetrics.filter(m => m.timestamp > hourAgo);
    if (recentFinancial.length > 0) {
      const totalVolume = recentFinancial.reduce((sum, f) => sum + f.amount, 0);
      const avgTransactionValue = totalVolume / recentFinancial.length;
      const successRate = (recentFinancial.filter(f => f.status === 'completed').length / recentFinancial.length) * 100;

      simpleAPMMetrics.recordBusinessEvent('financial.hourly_volume', totalVolume);
      simpleAPMMetrics.recordBusinessEvent('financial.avg_transaction_value', avgTransactionValue);
      simpleAPMMetrics.recordBusinessEvent('financial.success_rate', successRate);

      console.log(`💳 [Hourly Metrics] Financial - Volume: ${totalVolume.toFixed(0)}, Avg: ${avgTransactionValue.toFixed(0)}, Success: ${successRate.toFixed(1)}%`);
    }
  }

  // 清理舊數據
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 小時

    this.orderMetrics = this.orderMetrics.filter(m => (now - m.createdAt) < maxAge);
    this.userMetrics = this.userMetrics.filter(m => (now - m.timestamp) < maxAge);
    this.supplyChainMetrics = this.supplyChainMetrics.filter(m => (now - m.timestamp) < maxAge);
    this.financialMetrics = this.financialMetrics.filter(m => (now - m.timestamp) < maxAge);
    this.systemMetrics = this.systemMetrics.filter(m => (now - m.timestamp) < maxAge);
  }

  // 獲取業務指標摘要
  getMetricsSummary(): any {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);

    return {
      orders: {
        total: this.orderMetrics.length,
        recent: this.orderMetrics.filter(m => m.createdAt > hourAgo).length,
        completed: this.orderMetrics.filter(m => m.status === 'completed').length,
        avgValue: this.orderMetrics.length > 0 
          ? this.orderMetrics.reduce((sum, o) => sum + o.orderValue, 0) / this.orderMetrics.length 
          : 0,
      },
      users: {
        total: this.userMetrics.length,
        unique: new Set(this.userMetrics.map(u => u.userId)).size,
        recentActions: this.userMetrics.filter(m => m.timestamp > hourAgo).length,
      },
      supplyChain: {
        total: this.supplyChainMetrics.length,
        recent: this.supplyChainMetrics.filter(m => m.timestamp > hourAgo).length,
        avgQuality: this.supplyChainMetrics.length > 0
          ? this.supplyChainMetrics.reduce((sum, s) => sum + s.qualityScore, 0) / this.supplyChainMetrics.length
          : 0,
      },
      financial: {
        total: this.financialMetrics.length,
        recent: this.financialMetrics.filter(m => m.timestamp > hourAgo).length,
        totalVolume: this.financialMetrics.reduce((sum, f) => sum + f.amount, 0),
      },
      system: {
        total: this.systemMetrics.length,
        recent: this.systemMetrics.filter(m => m.timestamp > hourAgo).length,
        avgResponseTime: this.systemMetrics.length > 0
          ? this.systemMetrics.reduce((sum, s) => sum + s.responseTime, 0) / this.systemMetrics.length
          : 0,
      },
    };
  }
}

// 全局業務指標收集器實例
const businessMetrics = new BusinessMetricsCollector();

// 業務指標中間件
export function businessMetricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // 監聽響應完成
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      
      // 記錄系統指標
      const systemMetric: SystemMetrics = {
        service: 'api-gateway',
        endpoint: req.route?.path || req.path,
        responseTime,
        statusCode: res.statusCode,
        errorType: res.statusCode >= 400 ? 'http_error' : undefined,
        cacheHit: res.getHeader('X-Cache-Status') === 'HIT',
        timestamp: Date.now(),
      };

      businessMetrics.recordSystemMetric(systemMetric);

      // 根據端點記錄特定業務指標
      if (req.path.includes('/orders') && req.method === 'POST') {
        // 模擬訂單創建指標
        const orderMetric: OrderMetrics = {
          orderId: `order-${Date.now()}`,
          restaurantId: req.headers['x-user-id'] as string || 'unknown',
          supplierId: req.body?.supplierId || 'supplier-1',
          orderValue: req.body?.total || Math.floor(Math.random() * 5000) + 500,
          itemCount: req.body?.items?.length || Math.floor(Math.random() * 10) + 1,
          orderType: req.body?.type || 'standard',
          status: 'created',
          createdAt: Date.now(),
        };

        businessMetrics.recordOrderMetric(orderMetric);
      }

      if (req.path.includes('/auth/login') && req.method === 'POST') {
        // 模擬用戶登入指標
        const userMetric: UserMetrics = {
          userId: req.body?.userId || 'user-demo',
          userType: req.body?.userType || 'restaurant',
          action: 'login',
          sessionId: req.headers['x-session-id'] as string || 'session-demo',
          timestamp: Date.now(),
          deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web',
        };

        businessMetrics.recordUserMetric(userMetric);
      }
    });

    next();
  };
}

// 業務指標輔助函數
export const businessMetricsHelper = {
  // 訂單指標
  recordOrder: (metric: OrderMetrics) => businessMetrics.recordOrderMetric(metric),
  updateOrderStatus: (orderId: string, status: OrderMetrics['status'], completedAt?: number) => {
    console.log(`📊 [Business Metrics] Order Status Update: ${orderId} → ${status}`);
    simpleAPMMetrics.recordBusinessEvent(`order.status.${status}`, 1, { order_id: orderId });
  },

  // 用戶指標
  recordUser: (metric: UserMetrics) => businessMetrics.recordUserMetric(metric),
  recordUserAction: (userId: string, action: string, userType: string = 'unknown') => {
    const metric: UserMetrics = {
      userId,
      userType: userType as UserMetrics['userType'],
      action: action as UserMetrics['action'],
      sessionId: `session-${Date.now()}`,
      timestamp: Date.now(),
      deviceType: 'web',
    };
    businessMetrics.recordUserMetric(metric);
  },

  // 供應鏈指標
  recordSupplyChain: (metric: SupplyChainMetrics) => businessMetrics.recordSupplyChainMetric(metric),
  recordDelivery: (supplierId: string, restaurantId: string, deliveryTime: number, onTime: boolean) => {
    const metric: SupplyChainMetrics = {
      supplierId,
      restaurantId,
      responseTime: Math.floor(Math.random() * 5000) + 1000,
      acceptanceRate: Math.floor(Math.random() * 30) + 70,
      deliveryTime,
      qualityScore: Math.floor(Math.random() * 20) + 80,
      onTimeDelivery: onTime,
      timestamp: Date.now(),
    };
    businessMetrics.recordSupplyChainMetric(metric);
  },

  // 金融指標
  recordFinancial: (metric: FinancialMetrics) => businessMetrics.recordFinancialMetric(metric),
  recordPayment: (transactionId: string, orderId: string, amount: number, method: string, status: string) => {
    const metric: FinancialMetrics = {
      transactionId,
      orderId,
      amount,
      currency: 'TWD',
      paymentMethod: method as FinancialMetrics['paymentMethod'],
      processingTime: Math.floor(Math.random() * 3000) + 500,
      status: status as FinancialMetrics['status'],
      fees: amount * 0.029, // 2.9% processing fee
      timestamp: Date.now(),
    };
    businessMetrics.recordFinancialMetric(metric);
  },

  // 獲取指標摘要
  getSummary: () => businessMetrics.getMetricsSummary(),
};

// 導出業務指標收集器
export { businessMetrics };