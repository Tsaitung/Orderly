import { Request, Response, NextFunction } from 'express';

// 簡化版 APM 配置
interface SimpleAPMConfig {
  enabled: boolean;
  serviceName: string;
  environment: string;
  datadogEnabled: boolean;
  newrelicEnabled: boolean;
}

// 簡化版指標記錄
interface SimpleMetric {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
}

// 簡化版追蹤記錄
interface SimpleTrace {
  traceId: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: string;
  tags: Record<string, any>;
}

// 簡化版 APM 管理器
class SimpleAPMManager {
  private config: SimpleAPMConfig;
  private metrics: SimpleMetric[] = [];
  private traces: SimpleTrace[] = [];
  private isInitialized = false;

  constructor(config: SimpleAPMConfig) {
    this.config = config;
    this.initialize();
  }

  private initialize(): void {
    if (!this.config.enabled) {
      console.log('📊 APM monitoring disabled');
      return;
    }

    console.log(`🔍 Simple APM initialized for service: ${this.config.serviceName}`);
    
    if (this.config.datadogEnabled) {
      console.log('📤 DataDog APM integration enabled (mock)');
    }
    
    if (this.config.newrelicEnabled) {
      console.log('📊 New Relic APM integration enabled (mock)');
    }

    this.isInitialized = true;

    // 定期清理舊數據
    setInterval(() => {
      this.cleanup();
    }, 60000); // 每分鐘清理一次
  }

  // 記錄指標
  recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    if (!this.isInitialized) return;

    const metric: SimpleMetric = {
      name: `orderly.${name}`,
      value,
      timestamp: Date.now(),
      tags: {
        service: this.config.serviceName,
        environment: this.config.environment,
        ...tags,
      },
    };

    this.metrics.push(metric);

    // 發送到 APM 服務（模擬）
    this.sendMetric(metric);
  }

  // 開始追蹤
  startTrace(traceId: string, operation: string, tags: Record<string, any> = {}): SimpleTrace {
    const trace: SimpleTrace = {
      traceId,
      operation,
      startTime: Date.now(),
      status: 'started',
      tags: {
        service: this.config.serviceName,
        environment: this.config.environment,
        ...tags,
      },
    };

    this.traces.push(trace);
    return trace;
  }

  // 結束追蹤
  finishTrace(traceId: string, status: string = 'completed'): void {
    const trace = this.traces.find(t => t.traceId === traceId);
    if (trace) {
      trace.endTime = Date.now();
      trace.duration = trace.endTime - trace.startTime;
      trace.status = status;

      // 發送到 APM 服務（模擬）
      this.sendTrace(trace);
    }
  }

  // 發送指標到 APM 服務（模擬）
  private sendMetric(metric: SimpleMetric): void {
    if (this.config.datadogEnabled) {
      console.log(`📤 [DataDog Mock] Metric: ${metric.name} = ${metric.value}`, metric.tags);
    }

    if (this.config.newrelicEnabled) {
      console.log(`📊 [New Relic Mock] Metric: ${metric.name} = ${metric.value}`, metric.tags);
    }
  }

  // 發送追蹤到 APM 服務（模擬）
  private sendTrace(trace: SimpleTrace): void {
    if (this.config.datadogEnabled) {
      console.log(`📤 [DataDog Mock] Trace: ${trace.operation} (${trace.duration}ms) - ${trace.status}`);
    }

    if (this.config.newrelicEnabled) {
      console.log(`📊 [New Relic Mock] Trace: ${trace.operation} (${trace.duration}ms) - ${trace.status}`);
    }
  }

  // 清理舊數據
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 小時

    // 清理舊指標
    this.metrics = this.metrics.filter(m => (now - m.timestamp) < maxAge);
    
    // 清理舊追蹤
    this.traces = this.traces.filter(t => (now - t.startTime) < maxAge);
  }

  // 獲取狀態
  getStatus(): any {
    return {
      enabled: this.config.enabled,
      initialized: this.isInitialized,
      serviceName: this.config.serviceName,
      environment: this.config.environment,
      integrations: {
        datadog: this.config.datadogEnabled,
        newrelic: this.config.newrelicEnabled,
      },
      metrics: {
        total: this.metrics.length,
        recent: this.metrics.filter(m => (Date.now() - m.timestamp) < 5 * 60 * 1000).length,
      },
      traces: {
        total: this.traces.length,
        active: this.traces.filter(t => !t.endTime).length,
        completed: this.traces.filter(t => t.endTime).length,
      },
    };
  }
}

// 全局 APM 實例
let simpleAPM: SimpleAPMManager | null = null;

// 初始化簡化 APM
export function initializeSimpleAPM(): SimpleAPMManager {
  const config: SimpleAPMConfig = {
    enabled: process.env.APM_ENABLED !== 'false',
    serviceName: process.env.SERVICE_NAME || 'orderly-api-gateway',
    environment: process.env.NODE_ENV || 'development',
    datadogEnabled: process.env.DATADOG_ENABLED === 'true',
    newrelicEnabled: process.env.NEW_RELIC_ENABLED === 'true',
  };

  simpleAPM = new SimpleAPMManager(config);
  return simpleAPM;
}

// 獲取 APM 實例
export function getSimpleAPM(): SimpleAPMManager | null {
  return simpleAPM;
}

// 擴展 Express Request 類型
declare global {
  namespace Express {
    interface Request {
      simpleTrace?: SimpleTrace;
    }
  }
}

// 簡化 APM 中間件
export function simpleAPMMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apm = getSimpleAPM();
    if (!apm) {
      return next();
    }

    const traceId = req.headers['x-trace-id'] as string || `trace-${Date.now()}-${Math.random()}`;
    const operation = `${req.method} ${req.route?.path || req.path}`;

    // 開始追蹤
    const trace = apm.startTrace(traceId, operation, {
      'http.method': req.method,
      'http.url': req.originalUrl,
      'http.user_agent': req.headers['user-agent'],
      'user.id': req.headers['x-user-id'],
    });

    req.simpleTrace = trace;

    // 記錄請求指標
    apm.recordMetric('http.requests.total', 1, {
      method: req.method,
      route: req.route?.path || req.path,
    });

    // 監聽響應完成
    res.on('finish', () => {
      // 記錄響應指標
      apm.recordMetric('http.responses.total', 1, {
        method: req.method,
        status_code: res.statusCode.toString(),
      });

      if (trace.duration) {
        apm.recordMetric('http.response_time.ms', trace.duration, {
          method: req.method,
          route: req.route?.path || req.path,
        });
      }

      // 記錄錯誤
      if (res.statusCode >= 400) {
        apm.recordMetric('http.errors.total', 1, {
          status_code: res.statusCode.toString(),
          error_type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        });
      }

      // 結束追蹤
      const status = res.statusCode >= 400 ? 'error' : 'completed';
      apm.finishTrace(traceId, status);
    });

    next();
  };
}

// 業務指標輔助函數
export const simpleAPMMetrics = {
  recordBusinessEvent(eventName: string, value: number = 1, tags: Record<string, string> = {}): void {
    const apm = getSimpleAPM();
    if (apm) {
      apm.recordMetric(`business.${eventName}`, value, tags);
    }
  },

  recordPerformance(operation: string, duration: number, tags: Record<string, string> = {}): void {
    const apm = getSimpleAPM();
    if (apm) {
      apm.recordMetric(`performance.${operation}.duration`, duration, tags);
    }
  },

  recordError(errorType: string, tags: Record<string, string> = {}): void {
    const apm = getSimpleAPM();
    if (apm) {
      apm.recordMetric(`errors.${errorType}`, 1, tags);
    }
  },
};