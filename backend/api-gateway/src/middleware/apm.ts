import { Request, Response, NextFunction } from 'express';

// APM 配置接口
interface APMConfig {
  datadog: {
    enabled: boolean;
    apiKey?: string;
    appKey?: string;
    site?: string; // datadoghq.com, datadoghq.eu, etc.
    service: string;
    version?: string;
    env: string;
  };
  newrelic: {
    enabled: boolean;
    licenseKey?: string;
    appName: string;
    logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  };
}

// 追蹤事件接口
interface TraceEvent {
  traceId: string;
  spanId: string;
  service: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, any>;
  logs: Array<{
    timestamp: number;
    level: string;
    message: string;
    fields?: Record<string, any>;
  }>;
  error?: Error;
}

// APM 指標接口
interface APMMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'distribution';
  value: number;
  tags: Record<string, string>;
  timestamp: number;
  unit?: string;
}

// 業務指標接口
interface BusinessMetric {
  orderProcessingTime: number;
  cacheHitRate: number;
  errorRate: number;
  throughput: number;
  userSessions: number;
  databaseConnections: number;
}

// APM 集成類
class APMIntegration {
  private config: APMConfig;
  private traces = new Map<string, TraceEvent>();
  private metrics: APMMetric[] = [];
  private businessMetrics: BusinessMetric = {
    orderProcessingTime: 0,
    cacheHitRate: 0,
    errorRate: 0,
    throughput: 0,
    userSessions: 0,
    databaseConnections: 0,
  };

  constructor(config: APMConfig) {
    this.config = config;
    this.initializeAPM();
  }

  private initializeAPM(): void {
    if (this.config.datadog.enabled) {
      this.initializeDatadog();
    }

    if (this.config.newrelic.enabled) {
      this.initializeNewRelic();
    }

    // 定期發送指標到 APM 服務
    setInterval(() => {
      this.flushMetrics();
    }, 30000); // 每 30 秒發送一次
  }

  private initializeDatadog(): void {
    if (!this.config.datadog.apiKey) {
      console.warn('DataDog API key not provided, skipping DataDog initialization');
      return;
    }

    console.log(`🐕 DataDog APM initialized for service: ${this.config.datadog.service}`);
    
    // 在實際實現中，這裡會初始化 DataDog 追蹤器
    // import ddTrace from 'dd-trace';
    // ddTrace.init({
    //   service: this.config.datadog.service,
    //   version: this.config.datadog.version,
    //   env: this.config.datadog.env,
    // });
  }

  private initializeNewRelic(): void {
    if (!this.config.newrelic.licenseKey) {
      console.warn('New Relic license key not provided, skipping New Relic initialization');
      return;
    }

    console.log(`📊 New Relic APM initialized for app: ${this.config.newrelic.appName}`);
    
    // 在實際實現中，這裡會初始化 New Relic
    // import newrelic from 'newrelic';
    // newrelic.setApplicationName(this.config.newrelic.appName);
  }

  // 開始新的追蹤
  startTrace(
    traceId: string,
    spanId: string,
    service: string,
    operation: string,
    tags: Record<string, any> = {}
  ): TraceEvent {
    const trace: TraceEvent = {
      traceId,
      spanId,
      service,
      operation,
      startTime: Date.now(),
      tags: {
        service,
        operation,
        environment: this.config.datadog.env,
        ...tags,
      },
      logs: [],
    };

    this.traces.set(spanId, trace);

    // 發送到 DataDog
    if (this.config.datadog.enabled) {
      this.sendDatadogTrace(trace);
    }

    // 發送到 New Relic
    if (this.config.newrelic.enabled) {
      this.sendNewRelicTrace(trace);
    }

    return trace;
  }

  // 結束追蹤
  finishTrace(spanId: string, error?: Error): void {
    const trace = this.traces.get(spanId);
    if (!trace) return;

    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    
    if (error) {
      trace.error = error;
      trace.tags.error = true;
      trace.tags['error.message'] = error.message;
      trace.tags['error.stack'] = error.stack;
    }

    // 發送完成的追蹤
    if (this.config.datadog.enabled) {
      this.sendDatadogTrace(trace);
    }

    if (this.config.newrelic.enabled) {
      this.sendNewRelicTrace(trace);
    }

    this.traces.delete(spanId);
  }

  // 添加追蹤標籤
  addTraceTag(spanId: string, key: string, value: any): void {
    const trace = this.traces.get(spanId);
    if (trace) {
      trace.tags[key] = value;
    }
  }

  // 添加追蹤日誌
  addTraceLog(spanId: string, level: string, message: string, fields?: Record<string, any>): void {
    const trace = this.traces.get(spanId);
    if (trace) {
      trace.logs.push({
        timestamp: Date.now(),
        level,
        message,
        fields,
      });
    }
  }

  // 記錄自定義指標
  recordMetric(name: string, value: number, type: APMMetric['type'] = 'gauge', tags: Record<string, string> = {}): void {
    const metric: APMMetric = {
      name: `orderly.${name}`,
      type,
      value,
      tags: {
        service: this.config.datadog.service,
        environment: this.config.datadog.env,
        ...tags,
      },
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // 立即發送重要指標
    if (name.includes('error') || name.includes('latency')) {
      this.sendMetric(metric);
    }
  }

  // 記錄業務指標
  recordBusinessMetric(metric: Partial<BusinessMetric>): void {
    Object.assign(this.businessMetrics, metric);

    // 發送業務指標到 APM
    Object.entries(metric).forEach(([key, value]) => {
      this.recordMetric(`business.${key}`, value as number, 'gauge');
    });
  }

  // 發送 DataDog 追蹤
  private sendDatadogTrace(trace: TraceEvent): void {
    if (!this.config.datadog.enabled) return;

    // 簡化版本 - 實際實現會使用 DataDog SDK
    console.log(`📤 [DataDog] Trace: ${trace.operation} (${trace.duration}ms)`, {
      traceId: trace.traceId,
      spanId: trace.spanId,
      tags: trace.tags,
    });

    // 實際實現示例：
    // const span = ddTrace.scope().active();
    // if (span) {
    //   span.setTag('operation', trace.operation);
    //   span.setTag('duration', trace.duration);
    //   Object.entries(trace.tags).forEach(([key, value]) => {
    //     span.setTag(key, value);
    //   });
    // }
  }

  // 發送 New Relic 追蹤
  private sendNewRelicTrace(trace: TraceEvent): void {
    if (!this.config.newrelic.enabled) return;

    console.log(`📤 [New Relic] Trace: ${trace.operation} (${trace.duration}ms)`, {
      traceId: trace.traceId,
      spanId: trace.spanId,
      tags: trace.tags,
    });

    // 實際實現示例：
    // newrelic.recordCustomEvent('Trace', {
    //   operation: trace.operation,
    //   duration: trace.duration,
    //   service: trace.service,
    //   ...trace.tags,
    // });
  }

  // 發送指標
  private sendMetric(metric: APMMetric): void {
    if (this.config.datadog.enabled) {
      console.log(`📊 [DataDog] Metric: ${metric.name} = ${metric.value}`, metric.tags);
    }

    if (this.config.newrelic.enabled) {
      console.log(`📊 [New Relic] Metric: ${metric.name} = ${metric.value}`, metric.tags);
    }
  }

  // 批量發送指標
  private flushMetrics(): void {
    if (this.metrics.length === 0) return;

    console.log(`📤 Flushing ${this.metrics.length} metrics to APM services`);

    this.metrics.forEach(metric => this.sendMetric(metric));
    this.metrics = [];

    // 發送業務指標摘要
    this.recordBusinessMetric({});
  }

  // 獲取 APM 狀態
  getAPMStatus(): any {
    return {
      datadog: {
        enabled: this.config.datadog.enabled,
        service: this.config.datadog.service,
        environment: this.config.datadog.env,
      },
      newrelic: {
        enabled: this.config.newrelic.enabled,
        appName: this.config.newrelic.appName,
      },
      activeTraces: this.traces.size,
      pendingMetrics: this.metrics.length,
      businessMetrics: this.businessMetrics,
    };
  }
}

// 全局 APM 實例
let apmInstance: APMIntegration | null = null;

// 初始化 APM
export function initializeAPM(config: APMConfig): APMIntegration {
  apmInstance = new APMIntegration(config);
  return apmInstance;
}

// 獲取 APM 實例
export function getAPM(): APMIntegration | null {
  return apmInstance;
}

// 擴展 Express Request 類型
declare global {
  namespace Express {
    interface Request {
      apmTrace?: TraceEvent;
    }
  }
}

// APM 中間件
export function apmMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!apmInstance) {
      return next();
    }

    const traceId = req.headers['x-trace-id'] as string || req.headers['x-correlation-id'] as string || 'unknown';
    const spanId = req.headers['x-span-id'] as string || `${Date.now()}-${Math.random()}`;
    
    const operation = `${req.method} ${req.route?.path || req.path}`;
    
    // 開始追蹤
    const trace = apmInstance.startTrace(traceId, spanId, serviceName, operation, {
      'http.method': req.method,
      'http.url': req.originalUrl,
      'http.user_agent': req.headers['user-agent'],
      'user.id': req.headers['x-user-id'],
    });

    req.apmTrace = trace;

    // 記錄請求開始
    apmInstance.addTraceLog(spanId, 'info', 'Request started', {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
    });

    // 監聽響應完成
    res.on('finish', () => {
      // 添加響應標籤
      apmInstance.addTraceTag(spanId, 'http.status_code', res.statusCode);
      apmInstance.addTraceTag(spanId, 'http.response.size', res.getHeader('content-length'));

      // 記錄響應完成
      apmInstance.addTraceLog(spanId, 'info', 'Request completed', {
        statusCode: res.statusCode,
        duration: trace.duration,
      });

      // 結束追蹤
      const error = res.statusCode >= 400 ? new Error(`HTTP ${res.statusCode}`) : undefined;
      apmInstance.finishTrace(spanId, error);

      // 記錄業務指標
      apmInstance.recordMetric('http.requests.total', 1, 'counter', {
        method: req.method,
        status_code: res.statusCode.toString(),
      });

      apmInstance.recordMetric('http.request.duration', trace.duration || 0, 'histogram', {
        method: req.method,
        route: req.route?.path || req.path,
      });

      if (res.statusCode >= 400) {
        apmInstance.recordMetric('http.errors.total', 1, 'counter', {
          status_code: res.statusCode.toString(),
        });
      }
    });

    next();
  };
}

// APM 業務指標輔助函數
export const apmMetrics = {
  recordOrderProcessed(orderId: string, duration: number, success: boolean): void {
    const apm = getAPM();
    if (!apm) return;
    
    apm.recordMetric('orders.processed.total', 1, 'counter', {
      status: success ? 'success' : 'error',
    });
    
    apm.recordMetric('orders.processing.duration', duration, 'histogram');
    
    apm.recordBusinessMetric({
      orderProcessingTime: duration,
    });
  },

  recordCacheOperation(operation: 'hit' | 'miss', cacheType: string): void {
    const apm = getAPM();
    if (!apm) return;
    
    apm.recordMetric(`cache.${operation}.total`, 1, 'counter', {
      cache_type: cacheType,
    });
  },

  recordDatabaseQuery(queryType: string, duration: number, success: boolean): void {
    const apm = getAPM();
    if (!apm) return;
    
    apm.recordMetric('database.queries.total', 1, 'counter', {
      query_type: queryType,
      status: success ? 'success' : 'error',
    });
    
    apm.recordMetric('database.query.duration', duration, 'histogram', {
      query_type: queryType,
    });
  },

  recordUserSession(action: 'login' | 'logout', userType: string): void {
    const apm = getAPM();
    if (!apm) return;
    
    apm.recordMetric(`users.${action}.total`, 1, 'counter', {
      user_type: userType,
    });
  },
};

// 預設 APM 配置
export const defaultAPMConfig: APMConfig = {
  datadog: {
    enabled: process.env.DATADOG_ENABLED === 'true',
    apiKey: process.env.DATADOG_API_KEY,
    appKey: process.env.DATADOG_APP_KEY,
    site: process.env.DATADOG_SITE || 'datadoghq.com',
    service: process.env.SERVICE_NAME || 'orderly-api-gateway',
    version: process.env.APP_VERSION || '1.0.0',
    env: process.env.NODE_ENV || 'development',
  },
  newrelic: {
    enabled: process.env.NEW_RELIC_ENABLED === 'true',
    licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
    appName: process.env.NEW_RELIC_APP_NAME || 'Orderly API Gateway',
    logLevel: (process.env.NEW_RELIC_LOG_LEVEL as any) || 'info',
  },
};