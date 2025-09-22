/**
 * Secure Database Service
 * Replaces insecure mock database with type-safe, parameterized queries
 */

import { Pool, PoolClient, QueryResult } from 'pg'
import { SecurityLogger } from './security-logger'

const logger = SecurityLogger.getInstance()

export interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
  maxConnections: number
  connectionTimeoutMs: number
  idleTimeoutMs: number
  statementTimeoutMs: number
}

export interface QueryOptions {
  timeout?: number
  correlationId?: string
  userId?: string
  logQuery?: boolean
}

export interface TransactionCallback<T> {
  (client: SecureDatabaseClient): Promise<T>
}

export class SecureDatabaseClient {
  private pool: Pool
  private config: DatabaseConfig
  private isInitialized = false

  constructor(config?: Partial<DatabaseConfig>) {
    this.config = {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME || 'orderly',
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production',
      maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20'),
      connectionTimeoutMs: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '30000'),
      idleTimeoutMs: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '600000'),
      statementTimeoutMs: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '30000'),
      ...config,
    }

    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      max: this.config.maxConnections,
      connectionTimeoutMillis: this.config.connectionTimeoutMs,
      idleTimeoutMillis: this.config.idleTimeoutMs,
      statement_timeout: this.config.statementTimeoutMs,
      application_name: 'orderly-platform',
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', client => {
      logger.info('database_connection_established', {
        host: this.config.host,
        database: this.config.database,
      })
    })

    this.pool.on('error', err => {
      logger.error('database_pool_error', {
        error: err.message,
        code: (err as any).code,
      })
    })

    this.pool.on('remove', () => {
      logger.info('database_connection_removed', {})
    })
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Test connection
      await this.query('SELECT 1 as test', [], { logQuery: false })
      this.isInitialized = true
      logger.info('database_service_initialized', {
        host: this.config.host,
        database: this.config.database,
        maxConnections: this.config.maxConnections,
      })
    } catch (error) {
      logger.error('database_initialization_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        host: this.config.host,
        database: this.config.database,
      })
      throw error
    }
  }

  /**
   * Execute a parameterized query with security logging
   */
  public async query<T = any>(
    sql: string,
    params: (string | number | boolean | Date | null)[] = [],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const startTime = Date.now()
    const correlationId = options.correlationId || crypto.randomUUID()

    // Validate SQL to prevent injection
    this.validateSqlQuery(sql)

    // Validate parameters
    this.validateParameters(params)

    if (options.logQuery !== false) {
      logger.info('database_query_start', {
        correlationId,
        userId: options.userId,
        query: this.sanitizeQueryForLogging(sql),
        paramCount: params.length,
      })
    }

    try {
      const result = await this.pool.query<T>(sql, params)
      const duration = Date.now() - startTime

      if (options.logQuery !== false) {
        logger.info('database_query_success', {
          correlationId,
          userId: options.userId,
          rowCount: result.rowCount,
          duration,
        })
      }

      // Log data access for audit
      if (options.userId) {
        logger.logDataAccess(this.getOperationType(sql), this.getTableName(sql), options.userId, {
          correlationId,
          rowCount: result.rowCount,
          duration,
        })
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      logger.error('database_query_error', {
        correlationId,
        userId: options.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        query: this.sanitizeQueryForLogging(sql),
        duration,
      })

      throw new DatabaseError('Query execution failed', {
        originalError: error,
        correlationId,
        query: sql,
        params: params.length,
      })
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  public async transaction<T>(
    callback: TransactionCallback<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const correlationId = options.correlationId || crypto.randomUUID()
    const client = await this.pool.connect()

    logger.info('database_transaction_start', {
      correlationId,
      userId: options.userId,
    })

    try {
      await client.query('BEGIN')

      const transactionClient = new TransactionClient(client, correlationId, options.userId)
      const result = await callback(transactionClient)

      await client.query('COMMIT')

      logger.info('database_transaction_commit', {
        correlationId,
        userId: options.userId,
      })

      return result
    } catch (error) {
      await client.query('ROLLBACK')

      logger.error('database_transaction_rollback', {
        correlationId,
        userId: options.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get connection pool statistics
   */
  public getPoolStats(): {
    totalCount: number
    idleCount: number
    waitingCount: number
  } {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    }
  }

  /**
   * Health check for the database connection
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1 as health_check', [], { logQuery: false })
      return true
    } catch (error) {
      logger.error('database_health_check_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return false
    }
  }

  /**
   * Close all connections
   */
  public async close(): Promise<void> {
    await this.pool.end()
    logger.info('database_pool_closed', {})
  }

  /**
   * Validate SQL query to prevent injection attacks
   */
  private validateSqlQuery(sql: string): void {
    // Remove comments and normalize whitespace
    const normalizedSql = sql
      .replace(/--.*$/gm, '') // Remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()

    // Check for dangerous patterns
    const dangerousPatterns = [
      /;\s*(drop|truncate|delete|alter|create|exec|execute)\s+/,
      /union\s+select/,
      /'\s*or\s+['"]?1['"]?\s*=\s*['"]?1/,
      /'\s*;\s*(drop|delete|update|insert|create|alter)/,
      /xp_cmdshell|sp_executesql|exec\s*\(/,
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(normalizedSql)) {
        logger.logSecurityIncident('sql_injection_attempt', 'high', {
          suspiciousQuery: sql.substring(0, 200),
          pattern: pattern.toString(),
        })
        throw new SecurityError('Potentially malicious SQL detected')
      }
    }
  }

  /**
   * Validate query parameters
   */
  private validateParameters(params: any[]): void {
    for (const param of params) {
      if (param !== null && param !== undefined) {
        const type = typeof param
        if (!['string', 'number', 'boolean'].includes(type) && !(param instanceof Date)) {
          throw new ValidationError(`Invalid parameter type: ${type}`)
        }

        // Check for suspicious string content
        if (type === 'string') {
          const str = param as string
          if (str.length > 10000) {
            throw new ValidationError('Parameter too long')
          }

          // Check for SQL injection patterns in parameters
          const suspiciousPatterns = [/'/, /union\s+select/i, /drop\s+table/i, /delete\s+from/i]

          for (const pattern of suspiciousPatterns) {
            if (pattern.test(str)) {
              logger.logSecurityIncident('sql_injection_attempt', 'medium', {
                suspiciousParameter: str.substring(0, 100),
              })
              break
            }
          }
        }
      }
    }
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQueryForLogging(sql: string): string {
    return sql
      .replace(/password\s*=\s*\$\d+/gi, 'password = [REDACTED]')
      .replace(/token\s*=\s*\$\d+/gi, 'token = [REDACTED]')
      .replace(/secret\s*=\s*\$\d+/gi, 'secret = [REDACTED]')
  }

  /**
   * Extract operation type from SQL
   */
  private getOperationType(sql: string): 'read' | 'write' | 'update' | 'delete' {
    const normalizedSql = sql.trim().toLowerCase()

    if (normalizedSql.startsWith('select')) return 'read'
    if (normalizedSql.startsWith('insert')) return 'write'
    if (normalizedSql.startsWith('update')) return 'update'
    if (normalizedSql.startsWith('delete')) return 'delete'

    return 'read' // Default fallback
  }

  /**
   * Extract table name from SQL (simplified)
   */
  private getTableName(sql: string): string {
    const normalizedSql = sql.trim().toLowerCase()

    // Simple regex to extract table name (this could be more sophisticated)
    const tableMatch = normalizedSql.match(/(?:from|into|update|join)\s+([a-zA-Z_][a-zA-Z0-9_]*)/)

    return tableMatch ? tableMatch[1] : 'unknown'
  }
}

/**
 * Transaction client wrapper
 */
class TransactionClient {
  constructor(
    private client: PoolClient,
    private correlationId: string,
    private userId?: string
  ) {}

  async query<T = any>(
    sql: string,
    params: (string | number | boolean | Date | null)[] = []
  ): Promise<QueryResult<T>> {
    try {
      const result = await this.client.query<T>(sql, params)

      logger.info('database_transaction_query', {
        correlationId: this.correlationId,
        userId: this.userId,
        rowCount: result.rowCount,
      })

      return result
    } catch (error) {
      logger.error('database_transaction_query_error', {
        correlationId: this.correlationId,
        userId: this.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }
}

/**
 * Custom error classes
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public details: any = {}
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SecurityError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Export singleton instance
export const secureDatabase = new SecureDatabaseClient()

export default SecureDatabaseClient
