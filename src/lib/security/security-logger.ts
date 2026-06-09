/**
 * Security Logger with Structured Logging and Event Tracking
 * Implements enterprise-grade logging for security events and audit trails
 */

import crypto from 'crypto'

export interface SecurityEvent {
  level: 'info' | 'warn' | 'error' | 'critical'
  event: string
  timestamp: string
  correlationId: string
  userId?: string
  organizationId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export interface LoggerConfig {
  service: string
  environment: string
  enableConsole: boolean
  enableFileLogging: boolean
  redactSensitiveData: boolean
  maxLogSize: number
}

export class SecurityLogger {
  private static instance: SecurityLogger
  private config: LoggerConfig
  private sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'csrf',
    'ssn',
    'creditcard',
    'cvv',
  ]

  private constructor() {
    this.config = {
      service: 'orderly-platform',
      environment: process.env.NODE_ENV || 'development',
      enableConsole: true,
      enableFileLogging: process.env.NODE_ENV === 'production',
      redactSensitiveData: true,
      maxLogSize: 1024 * 1024, // 1MB
    }
  }

  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger()
    }
    return SecurityLogger.instance
  }

  /**
   * Generate correlation ID for request tracing
   */
  private generateCorrelationId(): string {
    return crypto.randomUUID()
  }

  /**
   * Redact sensitive data from log entries
   */
  private redactSensitiveData(data: any): any {
    if (!this.config.redactSensitiveData) {
      return data
    }

    if (typeof data !== 'object' || data === null) {
      return data
    }

    const redacted = { ...data }

    for (const key in redacted) {
      const lowerKey = key.toLowerCase()

      // Check if key contains sensitive information
      const isSensitive = this.sensitiveFields.some(field => lowerKey.includes(field))

      if (isSensitive) {
        if (typeof redacted[key] === 'string') {
          // Show first 4 characters for identification, rest as asterisks
          const value = redacted[key] as string
          redacted[key] =
            value.length > 4 ? `${value.substring(0, 4)}${'*'.repeat(value.length - 4)}` : '****'
        } else {
          redacted[key] = '[REDACTED]'
        }
      } else if (typeof redacted[key] === 'object') {
        // Recursively redact nested objects
        redacted[key] = this.redactSensitiveData(redacted[key])
      }
    }

    return redacted
  }

  /**
   * Format log entry with structured data
   */
  private formatLogEntry(
    level: SecurityEvent['level'],
    event: string,
    metadata: Record<string, any> = {},
    correlationId?: string
  ): SecurityEvent {
    return {
      level,
      event,
      timestamp: new Date().toISOString(),
      correlationId: correlationId || this.generateCorrelationId(),
      service: this.config.service,
      environment: this.config.environment,
      ...this.redactSensitiveData(metadata),
    }
  }

  /**
   * Output log entry to configured destinations
   */
  private writeLog(logEntry: SecurityEvent): void {
    const logString = JSON.stringify(logEntry)

    // Console logging (always enabled in development)
    if (this.config.enableConsole || this.config.environment === 'development') {
      const colorCode = this.getColorCode(logEntry.level)
      console.log(
        `${colorCode}[${logEntry.level.toUpperCase()}]${this.getColorCode('reset')} ${logString}`
      )
    }

    // File logging (production)
    if (this.config.enableFileLogging) {
      // In a real implementation, this would write to log files
      // For now, we'll use console.log for all environments
      if (logEntry.level === 'error' || logEntry.level === 'critical') {
        console.error(logString)
      }
    }

    // In production, you would also send to:
    // - Centralized logging (e.g., ELK Stack, Splunk)
    // - Security Information and Event Management (SIEM)
    // - Application Performance Monitoring (APM)
  }

  /**
   * Get ANSI color codes for console output
   */
  private getColorCode(level: string): string {
    const colors = {
      info: '\x1b[36m', // Cyan
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      critical: '\x1b[41m\x1b[37m', // White on Red
      reset: '\x1b[0m', // Reset
    }
    return colors[level as keyof typeof colors] || colors.reset
  }

  /**
   * Log info level events
   */
  public info(event: string, metadata: Record<string, any> = {}, correlationId?: string): void {
    const logEntry = this.formatLogEntry('info', event, metadata, correlationId)
    this.writeLog(logEntry)
  }

  /**
   * Log warning level events
   */
  public warn(event: string, metadata: Record<string, any> = {}, correlationId?: string): void {
    const logEntry = this.formatLogEntry('warn', event, metadata, correlationId)
    this.writeLog(logEntry)
  }

  /**
   * Log error level events
   */
  public error(event: string, metadata: Record<string, any> = {}, correlationId?: string): void {
    const logEntry = this.formatLogEntry('error', event, metadata, correlationId)
    this.writeLog(logEntry)
  }

  /**
   * Log critical level events (security incidents)
   */
  public critical(event: string, metadata: Record<string, any> = {}, correlationId?: string): void {
    const logEntry = this.formatLogEntry('critical', event, metadata, correlationId)
    this.writeLog(logEntry)

    // In production, critical events should trigger alerts
    // - Send to incident management system
    // - Trigger notifications to security team
    // - Create security incident tickets
  }

  /**
   * Log authentication events
   */
  public logAuthEvent(
    eventType:
      | 'login_attempt'
      | 'login_success'
      | 'login_failed'
      | 'logout'
      | 'token_refresh'
      | 'token_revoked',
    userId?: string,
    metadata: Record<string, any> = {}
  ): void {
    const level = eventType.includes('failed') ? 'warn' : 'info'
    this.writeLog(
      this.formatLogEntry(level, eventType, {
        userId,
        category: 'authentication',
        ...metadata,
      })
    )
  }

  /**
   * Log authorization events
   */
  public logAuthzEvent(
    eventType: 'access_granted' | 'access_denied' | 'insufficient_permissions',
    userId: string,
    resource: string,
    metadata: Record<string, any> = {}
  ): void {
    const level =
      eventType === 'access_denied' || eventType === 'insufficient_permissions' ? 'warn' : 'info'
    this.writeLog(
      this.formatLogEntry(level, eventType, {
        userId,
        resource,
        category: 'authorization',
        ...metadata,
      })
    )
  }

  /**
   * Log data access events
   */
  public logDataAccess(
    operation: 'read' | 'write' | 'update' | 'delete',
    resource: string,
    userId: string,
    metadata: Record<string, any> = {}
  ): void {
    this.writeLog(
      this.formatLogEntry('info', 'data_access', {
        operation,
        resource,
        userId,
        category: 'data_access',
        ...metadata,
      })
    )
  }

  /**
   * Log security incidents
   */
  public logSecurityIncident(
    incidentType:
      | 'brute_force'
      | 'suspicious_activity'
      | 'data_breach'
      | 'unauthorized_access'
      | 'malicious_request',
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata: Record<string, any> = {}
  ): void {
    const level = severity === 'critical' ? 'critical' : severity === 'high' ? 'error' : 'warn'
    this.writeLog(
      this.formatLogEntry(level, 'security_incident', {
        incidentType,
        severity,
        category: 'security_incident',
        ...metadata,
      })
    )
  }

  /**
   * Log API security events
   */
  public logApiSecurityEvent(
    eventType:
      | 'rate_limit_exceeded'
      | 'invalid_request'
      | 'sql_injection_attempt'
      | 'xss_attempt'
      | 'csrf_attempt',
    endpoint: string,
    metadata: Record<string, any> = {}
  ): void {
    const level = eventType.includes('attempt') ? 'error' : 'warn'
    this.writeLog(
      this.formatLogEntry(level, eventType, {
        endpoint,
        category: 'api_security',
        ...metadata,
      })
    )
  }

  /**
   * Create child logger with correlation ID
   */
  public createChildLogger(correlationId: string): SecurityLogger {
    const childLogger = Object.create(this)
    childLogger.defaultCorrelationId = correlationId
    return childLogger
  }

  /**
   * Log performance metrics with security context
   */
  public logPerformanceMetric(
    metric: string,
    value: number,
    unit: string,
    metadata: Record<string, any> = {}
  ): void {
    this.writeLog(
      this.formatLogEntry('info', 'performance_metric', {
        metric,
        value,
        unit,
        category: 'performance',
        ...metadata,
      })
    )
  }

  /**
   * Log business events with security context
   */
  public logBusinessEvent(
    eventType: string,
    userId: string,
    organizationId: string,
    metadata: Record<string, any> = {}
  ): void {
    this.writeLog(
      this.formatLogEntry('info', 'business_event', {
        eventType,
        userId,
        organizationId,
        category: 'business',
        ...metadata,
      })
    )
  }

  /**
   * Set configuration
   */
  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Flush logs (for testing)
   */
  public flush(): void {
    // In production, this would flush any buffered logs
    // For now, it's a no-op since we're using synchronous console logging
  }
}

export default SecurityLogger
