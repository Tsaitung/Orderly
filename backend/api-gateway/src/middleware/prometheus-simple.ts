import { Request, Response, NextFunction } from 'express';

// 簡化版本的指標收集器，用於演示 Prometheus 集成
interface MetricData {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  value: number | Record<string, number>;
  labels?: Record<string, string>;
  timestamp: number;
}

// 內存中的指標存儲
class SimpleMetricsCollector {
  private metrics = new Map<string, MetricData>();
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  // 記錄計數器
  incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const key = this.createKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    
    this.metrics.set(key, {
      name,
      type: 'counter',
      help: `Counter metric: ${name}`,
      value: current + value,
      labels,
      timestamp: Date.now(),
    });
  }

  // 設置計量器
  setGauge(name: string, labels: Record<string, string> = {}, value: number): void {
    const key = this.createKey(name, labels);
    this.gauges.set(key, value);
    
    this.metrics.set(key, {
      name,
      type: 'gauge',
      help: `Gauge metric: ${name}`,
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  // 記錄直方圖數據
  observeHistogram(name: string, labels: Record<string, string> = {}, value: number): void {
    const key = this.createKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
    
    this.metrics.set(key, {
      name,
      type: 'histogram',
      help: `Histogram metric: ${name}`,
      value: this.calculateHistogramStats(values),
      labels,
      timestamp: Date.now(),
    });
  }

  // 生成 Prometheus 格式輸出
  getPrometheusFormat(): string {
    let output = '';
    const metricsByName = new Map<string, MetricData[]>();
    
    // 按指標名稱分組
    this.metrics.forEach((metric) => {
      if (!metricsByName.has(metric.name)) {
        metricsByName.set(metric.name, []);
      }
      metricsByName.get(metric.name)!.push(metric);
    });

    // 生成 Prometheus 格式
    metricsByName.forEach((metrics, name) => {
      const firstMetric = metrics[0];
      output += `# HELP ${name} ${firstMetric.help}\n`;
      output += `# TYPE ${name} ${firstMetric.type}\n`;
      
      metrics.forEach((metric) => {
        const labelsStr = this.formatLabels(metric.labels || {});
        if (typeof metric.value === 'number') {
          output += `${name}${labelsStr} ${metric.value}\n`;
        } else {
          // 直方圖統計
          const stats = metric.value as Record<string, number>;
          Object.entries(stats).forEach(([key, value]) => {
            output += `${name}_${key}${labelsStr} ${value}\n`;
          });
        }
      });
      output += '\n';
    });

    return output;
  }

  // 獲取指標摘要
  getMetricsSummary(): any {
    return {
      totalMetrics: this.metrics.size,
      counters: this.counters.size,
      gauges: this.gauges.size,
      histograms: this.histograms.size,
      lastUpdate: new Date().toISOString(),
    };
  }

  // 重置所有指標
  reset(): void {
    this.metrics.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  private createKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  private formatLabels(labels: Record<string, string>): string {
    const labelEntries = Object.entries(labels);
    if (labelEntries.length === 0) return '';
    
    const labelStr = labelEntries
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `{${labelStr}}`;
  }

  private calculateHistogramStats(values: number[]): Record<string, number> {
    if (values.length === 0) return {};
    
    const sorted = values.sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      sum,
      p50: this.percentile(sorted, 0.5),
      p90: this.percentile(sorted, 0.9),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
}

// 全局指標收集器實例
const metricsCollector = new SimpleMetricsCollector();

// 擴展 Express Request 類型
declare global {
  namespace Express {
    interface Request {
      metricsStartTime?: number;
    }
  }
}

// Prometheus 指標中間件
export function prometheusMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    req.metricsStartTime = startTime;

    // 增加併發請求計數
    metricsCollector.setGauge('orderly_http_concurrent_requests', { service: serviceName }, 1);

    // 監聽響應完成
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const labels = {
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode.toString(),
        service: serviceName,
      };

      // 記錄基本指標
      metricsCollector.incrementCounter('orderly_http_requests_total', labels);
      metricsCollector.observeHistogram('orderly_http_request_duration_ms', labels, duration);

      // 記錄錯誤
      if (res.statusCode >= 400) {
        const errorLabels = {
          ...labels,
          error_type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        };
        metricsCollector.incrementCounter('orderly_errors_total', errorLabels);
      }

      // 更新系統健康度（簡化計算）
      const healthScore = res.statusCode < 400 ? 100 : res.statusCode < 500 ? 75 : 50;
      metricsCollector.setGauge('orderly_system_health_score', { service: serviceName }, healthScore);
    });

    next();
  };
}

// 業務指標幫助函數
export const businessMetrics = {
  recordUserSession(userType: string, serviceName: string, count: number): void {
    metricsCollector.setGauge('orderly_user_sessions_active', { user_type: userType, service: serviceName }, count);
  },

  recordCacheHit(cacheType: string, serviceName: string): void {
    metricsCollector.incrementCounter('orderly_cache_hits_total', { cache_type: cacheType, service: serviceName });
  },

  recordCacheMiss(cacheType: string, serviceName: string): void {
    metricsCollector.incrementCounter('orderly_cache_misses_total', { cache_type: cacheType, service: serviceName });
  },

  recordServiceCall(fromService: string, toService: string, duration: number, success: boolean): void {
    const labels = { from_service: fromService, to_service: toService, status: success ? 'success' : 'error' };
    metricsCollector.incrementCounter('orderly_service_calls_total', labels);
    metricsCollector.observeHistogram('orderly_service_call_duration_ms', labels, duration);
  },

  updateSystemHealth(component: string, serviceName: string, score: number): void {
    metricsCollector.setGauge('orderly_system_health_score', { component, service: serviceName }, score);
  },
};

// 創建 Prometheus 指標端點
export function createPrometheusEndpoint() {
  return (req: Request, res: Response): void => {
    try {
      // 添加一些系統指標
      const memUsage = process.memoryUsage();
      metricsCollector.setGauge('orderly_process_resident_memory_bytes', {}, memUsage.rss);
      metricsCollector.setGauge('orderly_process_heap_bytes', {}, memUsage.heapUsed);
      metricsCollector.setGauge('orderly_process_uptime_seconds', {}, process.uptime());

      res.set('Content-Type', 'text/plain');
      res.send(metricsCollector.getPrometheusFormat());
    } catch (error) {
      res.status(500).send('Error collecting metrics');
    }
  };
}

// 獲取指標摘要
export function getMetricsSummary() {
  return metricsCollector.getMetricsSummary();
}

// 重置指標（用於測試）
export function resetMetrics(): void {
  metricsCollector.reset();
}

// 導出指標收集器
export { metricsCollector };