import { Request, Response, NextFunction } from 'express';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge, Summary } from 'prom-client';

// 收集默認系統指標 (CPU, 內存, 事件循環等)
collectDefaultMetrics({
  prefix: 'orderly_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // 垃圾回收時間桶
});

// HTTP 請求總數計數器
const httpRequestsTotal = new Counter({
  name: 'orderly_http_requests_total',
  help: 'Total number of HTTP requests made.',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register],
});

// HTTP 請求持續時間直方圖
const httpRequestDuration = new Histogram({
  name: 'orderly_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds.',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // 延遲桶
  registers: [register],
});

// HTTP 請求大小直方圖
const httpRequestSize = new Histogram({
  name: 'orderly_http_request_size_bytes',
  help: 'Size of HTTP requests in bytes.',
  labelNames: ['method', 'route', 'service'],
  buckets: [100, 1000, 10000, 100000, 1000000], // 請求大小桶
  registers: [register],
});

// HTTP 響應大小直方圖
const httpResponseSize = new Histogram({
  name: 'orderly_http_response_size_bytes',
  help: 'Size of HTTP responses in bytes.',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [100, 1000, 10000, 100000, 1000000], // 響應大小桶
  registers: [register],
});

// 當前活動連接數計量器
const httpCurrentConnections = new Gauge({
  name: 'orderly_http_current_connections',
  help: 'Current number of active HTTP connections.',
  labelNames: ['service'],
  registers: [register],
});

// 併發請求數計量器
const httpConcurrentRequests = new Gauge({
  name: 'orderly_http_concurrent_requests',
  help: 'Current number of concurrent HTTP requests.',
  labelNames: ['service'],
  registers: [register],
});

// 業務指標: 用戶會話
const userSessions = new Gauge({
  name: 'orderly_user_sessions_active',
  help: 'Number of active user sessions.',
  labelNames: ['user_type', 'service'],
  registers: [register],
});

// 業務指標: API 速率限制
const rateLimitHits = new Counter({
  name: 'orderly_rate_limit_hits_total',
  help: 'Total number of rate limit hits.',
  labelNames: ['endpoint', 'user_type', 'service'],
  registers: [register],
});

// 業務指標: 快取命中率
const cacheHits = new Counter({
  name: 'orderly_cache_hits_total',
  help: 'Total number of cache hits.',
  labelNames: ['cache_type', 'key_pattern', 'service'],
  registers: [register],
});

const cacheMisses = new Counter({
  name: 'orderly_cache_misses_total',
  help: 'Total number of cache misses.',
  labelNames: ['cache_type', 'key_pattern', 'service'],
  registers: [register],
});

// 業務指標: 數據庫連接池
const dbConnectionsActive = new Gauge({
  name: 'orderly_db_connections_active',
  help: 'Number of active database connections.',
  labelNames: ['database', 'service'],
  registers: [register],
});

const dbConnectionsIdle = new Gauge({
  name: 'orderly_db_connections_idle',
  help: 'Number of idle database connections.',
  labelNames: ['database', 'service'],
  registers: [register],
});

// 業務指標: 錯誤率
const errorRate = new Counter({
  name: 'orderly_errors_total',
  help: 'Total number of errors by type.',
  labelNames: ['error_type', 'severity', 'service', 'endpoint'],
  registers: [register],
});

// 業務指標: 服務間調用
const serviceCallsTotal = new Counter({
  name: 'orderly_service_calls_total',
  help: 'Total number of inter-service calls.',
  labelNames: ['from_service', 'to_service', 'operation', 'status'],
  registers: [register],
});

const serviceCallDuration = new Histogram({
  name: 'orderly_service_call_duration_seconds',
  help: 'Duration of inter-service calls in seconds.',
  labelNames: ['from_service', 'to_service', 'operation', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// 業務指標: 訂單處理
const orderProcessingTime = new Summary({
  name: 'orderly_order_processing_duration_seconds',
  help: 'Time spent processing orders.',
  labelNames: ['status', 'restaurant_type', 'service'],
  percentiles: [0.5, 0.75, 0.9, 0.95, 0.99],
  registers: [register],
});

// 業務指標: 系統健康度
const systemHealth = new Gauge({
  name: 'orderly_system_health_score',
  help: 'Overall system health score (0-100).',
  labelNames: ['component', 'service'],
  registers: [register],
});

// 擴展 Express Request 類型
declare global {
  namespace Express {
    interface Request {
      metricsStartTime?: number;
      metricsLabels?: Record<string, string>;
    }
  }
}

// Prometheus 指標中間件
export function prometheusMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    req.metricsStartTime = startTime;

    // 增加併發請求計數
    httpConcurrentRequests.inc({ service: serviceName });

    // 設置基本標籤
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      service: serviceName,
    };
    req.metricsLabels = labels;

    // 記錄請求大小
    const requestSize = parseInt(req.headers['content-length'] || '0');
    if (requestSize > 0) {
      httpRequestSize.observe(labels, requestSize);
    }

    // 監聽響應完成
    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000; // 轉換為秒
      const finalLabels = {
        ...labels,
        status_code: res.statusCode.toString(),
      };

      // 記錄基本指標
      httpRequestsTotal.inc(finalLabels);
      httpRequestDuration.observe(finalLabels, duration);

      // 記錄響應大小
      const responseSize = parseInt(res.getHeader('content-length') as string || '0');
      if (responseSize > 0) {
        httpResponseSize.observe(finalLabels, responseSize);
      }

      // 減少併發請求計數
      httpConcurrentRequests.dec({ service: serviceName });

      // 記錄錯誤
      if (res.statusCode >= 400) {
        let errorType = 'client_error';
        let severity = 'medium';

        if (res.statusCode >= 500) {
          errorType = 'server_error';
          severity = 'high';
        } else if (res.statusCode === 429) {
          errorType = 'rate_limit';
          severity = 'low';
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          errorType = 'auth_error';
          severity = 'medium';
        }

        errorRate.inc({
          error_type: errorType,
          severity,
          service: serviceName,
          endpoint: req.route?.path || req.path,
        });
      }

      // 記錄速率限制命中
      if (res.statusCode === 429) {
        const userType = req.headers['x-user-role'] as string || 'anonymous';
        rateLimitHits.inc({
          endpoint: req.route?.path || req.path,
          user_type: userType,
          service: serviceName,
        });
      }
    });

    next();
  };
}

// 業務指標幫助函數
export const businessMetrics = {
  // 記錄用戶會話
  recordUserSession(userType: string, serviceName: string, delta: number = 1): void {
    userSessions.set({ user_type: userType, service: serviceName }, delta);
  },

  // 記錄快取命中
  recordCacheHit(cacheType: string, keyPattern: string, serviceName: string): void {
    cacheHits.inc({ cache_type: cacheType, key_pattern: keyPattern, service: serviceName });
  },

  // 記錄快取未命中
  recordCacheMiss(cacheType: string, keyPattern: string, serviceName: string): void {
    cacheMisses.inc({ cache_type: cacheType, key_pattern: keyPattern, service: serviceName });
  },

  // 記錄數據庫連接狀態
  recordDbConnections(database: string, serviceName: string, active: number, idle: number): void {
    dbConnectionsActive.set({ database, service: serviceName }, active);
    dbConnectionsIdle.set({ database, service: serviceName }, idle);
  },

  // 記錄服務間調用
  recordServiceCall(fromService: string, toService: string, operation: string, duration: number, success: boolean): void {
    const status = success ? 'success' : 'error';
    serviceCallsTotal.inc({ from_service: fromService, to_service: toService, operation, status });
    serviceCallDuration.observe({ from_service: fromService, to_service: toService, operation, status }, duration / 1000);
  },

  // 記錄訂單處理時間
  recordOrderProcessing(duration: number, status: string, restaurantType: string, serviceName: string): void {
    orderProcessingTime.observe(
      { status, restaurant_type: restaurantType, service: serviceName },
      duration / 1000
    );
  },

  // 更新系統健康度
  updateSystemHealth(component: string, serviceName: string, score: number): void {
    systemHealth.set({ component, service: serviceName }, Math.max(0, Math.min(100, score)));
  },

  // 增加當前連接數
  incrementConnections(serviceName: string): void {
    httpCurrentConnections.inc({ service: serviceName });
  },

  // 減少當前連接數
  decrementConnections(serviceName: string): void {
    httpCurrentConnections.dec({ service: serviceName });
  },
};

// 創建 Prometheus 指標端點
export function createPrometheusEndpoint() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } catch (error) {
      res.status(500).end('Error collecting metrics');
    }
  };
}

// 獲取指標摘要 (用於健康檢查)
export function getMetricsSummary() {
  const metrics = register.getSingleMetric('orderly_http_requests_total') as Counter<string>;
  const connections = register.getSingleMetric('orderly_http_current_connections') as Gauge<string>;
  
  return {
    totalRequests: metrics ? metrics['hashMap'] : {},
    activeConnections: connections ? connections['hashMap'] : {},
    registeredMetrics: register.getMetricsAsArray().length,
    timestamp: new Date().toISOString(),
  };
}

// 重置指標 (用於測試)
export function resetMetrics(): void {
  register.resetMetrics();
}

// 自定義指標註冊
export function registerCustomMetric(metric: any): void {
  register.registerMetric(metric);
}

// 獲取所有指標名稱
export function getMetricNames(): string[] {
  return register.getMetricsAsArray().map(metric => metric.name);
}

// 導出預設的 register 以供其他模組使用
export { register as prometheusRegister };