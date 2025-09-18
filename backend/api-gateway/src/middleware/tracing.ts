import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// 追蹤上下文接口
interface TracingContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
  flags: number;
  startTime: number;
}

// 追蹤 Span 接口
interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, any>;
  logs: Array<{
    timestamp: number;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    fields?: Record<string, any>;
  }>;
  status: 'ok' | 'error' | 'timeout';
}

// 全局追蹤存儲
class TracingStore {
  private traces = new Map<string, Span[]>();
  private activeSpans = new Map<string, Span>();

  startSpan(traceId: string, spanId: string, operationName: string, serviceName: string, parentSpanId?: string): Span {
    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      serviceName,
      startTime: Date.now(),
      tags: {},
      logs: [],
      status: 'ok',
    };

    this.activeSpans.set(spanId, span);
    
    if (!this.traces.has(traceId)) {
      this.traces.set(traceId, []);
    }
    this.traces.get(traceId)!.push(span);

    return span;
  }

  finishSpan(spanId: string, status: 'ok' | 'error' | 'timeout' = 'ok'): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.endTime = Date.now();
      span.duration = span.endTime - span.startTime;
      span.status = status;
      this.activeSpans.delete(spanId);
    }
  }

  addSpanTag(spanId: string, key: string, value: any): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  addSpanLog(spanId: string, level: 'info' | 'warn' | 'error' | 'debug', message: string, fields?: Record<string, any>): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        level,
        message,
        fields,
      });
    }
  }

  getTrace(traceId: string): Span[] | undefined {
    return this.traces.get(traceId);
  }

  getActiveSpan(spanId: string): Span | undefined {
    return this.activeSpans.get(spanId);
  }

  // 清理超時的追蹤數據 (避免內存洩漏)
  cleanup(): void {
    const now = Date.now();
    const timeout = 60 * 60 * 1000; // 1 小時

    this.traces.forEach((spans, traceId) => {
      const allFinished = spans.every(span => span.endTime !== undefined);
      const oldestSpan = spans.reduce((oldest, span) => 
        span.startTime < oldest.startTime ? span : oldest
      );

      if (allFinished && (now - oldestSpan.startTime) > timeout) {
        this.traces.delete(traceId);
      }
    });

    // 清理超時的活動 spans
    this.activeSpans.forEach((span, spanId) => {
      if ((now - span.startTime) > timeout) {
        this.finishSpan(spanId, 'timeout');
      }
    });
  }

  // 導出追蹤數據 (Jaeger 格式)
  exportJaegerTrace(traceId: string): any {
    const spans = this.getTrace(traceId);
    if (!spans) return null;

    return {
      traceID: traceId,
      spans: spans.map(span => ({
        traceID: span.traceId,
        spanID: span.spanId,
        parentSpanID: span.parentSpanId || '',
        operationName: span.operationName,
        startTime: span.startTime * 1000, // Jaeger 使用微秒
        duration: (span.duration || 0) * 1000,
        tags: Object.entries(span.tags).map(([key, value]) => ({
          key,
          type: typeof value === 'string' ? 'string' : 'number',
          value: String(value),
        })),
        logs: span.logs.map(log => ({
          timestamp: log.timestamp * 1000,
          fields: [
            { key: 'level', value: log.level },
            { key: 'message', value: log.message },
            ...Object.entries(log.fields || {}).map(([key, value]) => ({
              key,
              value: String(value),
            })),
          ],
        })),
        process: {
          serviceName: span.serviceName,
          tags: [
            { key: 'hostname', value: process.env.HOSTNAME || 'localhost' },
            { key: 'version', value: process.env.APP_VERSION || '1.0.0' },
          ],
        },
      })),
    };
  }
}

// 全局追蹤存儲實例
export const tracingStore = new TracingStore();

// 定期清理過期追蹤數據
setInterval(() => {
  tracingStore.cleanup();
}, 5 * 60 * 1000); // 每 5 分鐘清理一次

// 擴展 Express Request 類型
declare global {
  namespace Express {
    interface Request {
      tracing?: TracingContext;
      span?: Span;
    }
  }
}

// 追蹤中間件
export function tracingMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 從請求頭獲取追蹤信息
    const traceId = req.headers['x-trace-id'] as string || uuidv4();
    const parentSpanId = req.headers['x-span-id'] as string;
    const spanId = uuidv4();

    // 設置追蹤上下文
    req.tracing = {
      traceId,
      spanId,
      parentSpanId,
      flags: 1, // sampled
      startTime: Date.now(),
    };

    // 開始新的 span
    const operationName = `${req.method} ${req.route?.path || req.path}`;
    req.span = tracingStore.startSpan(traceId, spanId, operationName, serviceName, parentSpanId);

    // 添加基本標籤
    tracingStore.addSpanTag(spanId, 'http.method', req.method);
    tracingStore.addSpanTag(spanId, 'http.url', req.originalUrl);
    tracingStore.addSpanTag(spanId, 'http.user_agent', req.headers['user-agent']);
    tracingStore.addSpanTag(spanId, 'user.id', req.headers['x-user-id']);
    tracingStore.addSpanTag(spanId, 'component', 'http');

    // 設置響應頭
    res.setHeader('X-Trace-ID', traceId);
    res.setHeader('X-Span-ID', spanId);

    // 監聽響應完成
    res.on('finish', () => {
      // 添加響應標籤
      tracingStore.addSpanTag(spanId, 'http.status_code', res.statusCode);
      
      // 根據狀態碼確定 span 狀態
      let status: 'ok' | 'error' | 'timeout' = 'ok';
      if (res.statusCode >= 400) {
        status = 'error';
      }

      // 完成 span
      tracingStore.finishSpan(spanId, status);

      // 記錄追蹤日誌
      if (req.logger) {
        req.logger.info('Trace completed', req, {
          traceId,
          spanId,
          parentSpanId,
          duration: req.span?.duration,
          status,
        });
      }
    });

    next();
  };
}

// 服務間調用追蹤
export function createServiceCall(req: Request, targetService: string, operationName: string) {
  if (!req.tracing) {
    throw new Error('No tracing context found in request');
  }

  const childSpanId = uuidv4();
  const childSpan = tracingStore.startSpan(
    req.tracing.traceId,
    childSpanId,
    operationName,
    targetService,
    req.tracing.spanId
  );

  // 添加服務調用標籤
  tracingStore.addSpanTag(childSpanId, 'span.kind', 'client');
  tracingStore.addSpanTag(childSpanId, 'peer.service', targetService);
  tracingStore.addSpanTag(childSpanId, 'component', 'http-client');

  return {
    spanId: childSpanId,
    span: childSpan,
    headers: {
      'X-Trace-ID': req.tracing.traceId,
      'X-Span-ID': childSpanId,
      'X-Parent-Span-ID': req.tracing.spanId,
    },
    finish: (status: 'ok' | 'error' | 'timeout' = 'ok', error?: Error) => {
      if (error) {
        tracingStore.addSpanTag(childSpanId, 'error', true);
        tracingStore.addSpanTag(childSpanId, 'error.message', error.message);
        tracingStore.addSpanLog(childSpanId, 'error', 'Service call error', {
          'error.name': error.name,
          'error.stack': error.stack,
        });
      }
      tracingStore.finishSpan(childSpanId, status);
    },
  };
}

// 追蹤數據 API 端點
export function createTracingRoutes() {
  const express = require('express');
  const router = express.Router();

  // 獲取特定追蹤
  router.get('/traces/:traceId', (req: Request, res: Response) => {
    const { traceId } = req.params;
    const trace = tracingStore.getTrace(traceId);
    
    if (!trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    return res.json({
      traceId,
      spans: trace,
    });
  });

  // 獲取 Jaeger 格式的追蹤數據
  router.get('/traces/:traceId/jaeger', (req: Request, res: Response) => {
    const { traceId } = req.params;
    const jaegerTrace = tracingStore.exportJaegerTrace(traceId);
    
    if (!jaegerTrace) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    return res.json(jaegerTrace);
  });

  // 追蹤系統健康檢查
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      activeSpans: tracingStore['activeSpans'].size,
      totalTraces: tracingStore['traces'].size,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

// 輔助函數：為當前請求添加追蹤標籤
export function addTraceTag(req: Request, key: string, value: any): void {
  if (req.span) {
    tracingStore.addSpanTag(req.span.spanId, key, value);
  }
}

// 輔助函數：為當前請求添加追蹤日誌
export function addTraceLog(req: Request, level: 'info' | 'warn' | 'error' | 'debug', message: string, fields?: Record<string, any>): void {
  if (req.span) {
    tracingStore.addSpanLog(req.span.spanId, level, message, fields);
  }
}