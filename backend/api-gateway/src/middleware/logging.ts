import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { LogEntry, LogLevel, LogContext, BusinessEvent, PerformanceMetric, SecurityEvent } from '../../../../shared/types/src/logging';

// 擴展 Express Request 類型
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
      logger: Logger;
    }
  }
}

// Logger 類別
export class Logger {
  private serviceName: string;
  private environment: string;

  constructor(serviceName: string, environment: string = process.env.NODE_ENV || 'development') {
    this.serviceName = serviceName;
    this.environment = environment;
  }

  private createBaseContext(req: Request): LogContext {
    return {
      requestId: req.requestId,
      userId: req.headers['x-user-id'] as string,
      sessionId: req.headers['x-session-id'] as string,
      service: this.serviceName,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString(),
    };
  }

  private formatLog(entry: LogEntry): string {
    // 在生產環境中輸出 JSON 格式，開發環境中可讀格式
    if (this.environment === 'production') {
      return JSON.stringify(entry);
    } else {
      const { level, message, context } = entry;
      return `[${context.timestamp}] ${level.toUpperCase()} [${context.service}] ${context.requestId} - ${message}`;
    }
  }

  private writeLog(entry: LogEntry): void {
    const formatted = this.formatLog(entry);
    
    // 根據日誌級別選擇輸出方式
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.DEBUG:
        if (this.environment === 'development') {
          console.debug(formatted);
        }
        break;
      default:
        console.log(formatted);
    }

    // 在生產環境中，也發送到外部日誌收集系統
    if (this.environment === 'production') {
      this.sendToExternalLogging(entry);
    }
  }

  private sendToExternalLogging(entry: LogEntry): void {
    // 發送到 Google Cloud Logging, DataDog, 或其他日誌系統
    // 這裡可以集成實際的日誌系統
    try {
      // 模擬發送到外部系統
      if (process.env.DATADOG_API_KEY) {
        // DataDog 集成
      }
      if (process.env.NEWRELIC_LICENSE_KEY) {
        // New Relic 集成
      }
    } catch (error) {
      console.error('Failed to send log to external system:', error);
    }
  }

  info(message: string, req: Request, metadata?: Record<string, any>): void {
    const context = this.createBaseContext(req);
    if (metadata) {
      context.metadata = metadata;
    }

    this.writeLog({
      level: LogLevel.INFO,
      message,
      context,
    });
  }

  warn(message: string, req: Request, metadata?: Record<string, any>): void {
    const context = this.createBaseContext(req);
    if (metadata) {
      context.metadata = metadata;
    }

    this.writeLog({
      level: LogLevel.WARN,
      message,
      context,
    });
  }

  error(message: string, req: Request, error?: Error, metadata?: Record<string, any>): void {
    const context = this.createBaseContext(req);
    if (metadata) {
      context.metadata = metadata;
    }
    if (error) {
      context.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    this.writeLog({
      level: LogLevel.ERROR,
      message,
      context,
    });
  }

  debug(message: string, req: Request, metadata?: Record<string, any>): void {
    const context = this.createBaseContext(req);
    if (metadata) {
      context.metadata = metadata;
    }

    this.writeLog({
      level: LogLevel.DEBUG,
      message,
      context,
    });
  }

  // 業務事件記錄
  logBusinessEvent(req: Request, event: Omit<BusinessEvent, 'timestamp'>): void {
    const context = this.createBaseContext(req);
    const businessEvent: BusinessEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.writeLog({
      level: LogLevel.INFO,
      message: `Business Event: ${event.eventType}`,
      context,
      businessEvent,
    });
  }

  // 性能指標記錄
  logPerformanceMetric(req: Request, metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const context = this.createBaseContext(req);
    const performanceMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date().toISOString(),
    };

    this.writeLog({
      level: LogLevel.INFO,
      message: `Performance Metric: ${metric.metric}`,
      context,
      performanceMetric,
    });
  }

  // 安全事件記錄
  logSecurityEvent(req: Request, event: Omit<SecurityEvent, 'timestamp'>): void {
    const context = this.createBaseContext(req);
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    const level = event.severity === 'critical' || event.severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;

    this.writeLog({
      level,
      message: `Security Event: ${event.eventType}`,
      context,
      securityEvent,
    });
  }
}

// 請求日誌中間件
export function requestLoggingMiddleware(serviceName: string) {
  const logger = new Logger(serviceName);

  return (req: Request, res: Response, next: NextFunction): void => {
    // 生成請求 ID
    req.requestId = req.headers['x-request-id'] as string || uuidv4();
    req.startTime = Date.now();
    req.logger = logger;

    // 設置響應頭
    res.setHeader('X-Request-ID', req.requestId);

    // 記錄請求開始
    logger.info('Request started', req, {
      body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
      query: req.query,
      params: req.params,
    });

    // 監聽響應結束
    res.on('finish', () => {
      const duration = Date.now() - req.startTime;
      const context = logger['createBaseContext'](req);
      context.duration = duration;
      context.statusCode = res.statusCode;

      // 記錄響應
      const level = res.statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
      const message = `Request completed - ${res.statusCode} in ${duration}ms`;

      logger['writeLog']({
        level,
        message,
        context,
      });

      // 記錄性能指標
      logger.logPerformanceMetric(req, {
        metric: 'request_duration',
        value: duration,
        unit: 'milliseconds',
        tags: {
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode.toString(),
        },
      });

      // 記錄安全相關事件
      if (res.statusCode === 401 || res.statusCode === 403) {
        logger.logSecurityEvent(req, {
          eventType: 'authorization',
          severity: 'medium',
          userId: req.headers['x-user-id'] as string,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          details: {
            statusCode: res.statusCode,
            path: req.path,
            method: req.method,
          },
        });
      }

      // 記錄速率限制事件
      if (res.statusCode === 429) {
        logger.logSecurityEvent(req, {
          eventType: 'rate_limit',
          severity: 'medium',
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          details: {
            path: req.path,
            method: req.method,
          },
        });
      }
    });

    next();
  };
}

// 錯誤處理中間件
export function errorLoggingMiddleware(serviceName: string) {
  const logger = new Logger(serviceName);

  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    // 記錄錯誤
    logger.error('Unhandled error', req, error);

    // 記錄安全事件（如果是安全相關錯誤）
    if (error.name === 'UnauthorizedError' || error.name === 'ForbiddenError') {
      logger.logSecurityEvent(req, {
        eventType: 'authorization',
        severity: 'high',
        userId: req.headers['x-user-id'] as string,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          error: error.message,
          path: req.path,
          method: req.method,
        },
      });
    }

    next(error);
  };
}