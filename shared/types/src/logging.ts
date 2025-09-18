// 共享日誌類型定義
export interface LogContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  service: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  timestamp: string;
  duration?: number;
  statusCode?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
}

export interface BusinessEvent {
  eventType: string;
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  metric: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  timestamp: string;
}

export interface SecurityEvent {
  eventType: 'authentication' | 'authorization' | 'data_access' | 'rate_limit' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  userAgent?: string;
  details: Record<string, any>;
  timestamp: string;
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context: LogContext;
  businessEvent?: BusinessEvent;
  performanceMetric?: PerformanceMetric;
  securityEvent?: SecurityEvent;
}