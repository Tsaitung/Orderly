/**
 * Secure Database Client with Type Safety
 * Replaces insecure mock implementation with production-ready database access
 */

import { secureDatabase, DatabaseError, SecurityError, ValidationError } from './security/database-service'
import { SecurityLogger } from './security/security-logger'

const logger = SecurityLogger.getInstance()

// Type-safe interfaces for database operations
export interface Organization {
  id: string
  name: string
  type: 'restaurant' | 'supplier'
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: string
  restaurantId: string
  supplierId: string
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  totalAmount: number
  deliveryDate: Date
  createdAt: Date
  updatedAt: Date
}

export interface Delivery {
  id: string
  orderId: string
  status: 'pending' | 'in_transit' | 'delivered'
  trackingNumber?: string
  deliveredAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Invoice {
  id: string
  orderId: string
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  dueDate: Date
  paidAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Repository pattern for type-safe database operations
export interface Repository<T> {
  findFirst(where: Partial<T>, userId?: string): Promise<T | null>
  findMany(where: Partial<T>, options?: { limit?: number; offset?: number }, userId?: string): Promise<T[]>
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, userId?: string): Promise<T>
  update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>, userId?: string): Promise<T>
  delete(id: string, userId?: string): Promise<void>
}

// Generic repository implementation with type safety
class SecureRepository<T> implements Repository<T> {
  constructor(
    private tableName: string,
    private idGenerator: () => string = () => crypto.randomUUID()
  ) {}

  async findFirst(where: Partial<T>, userId?: string): Promise<T | null> {
    try {
      const whereClause = this.buildWhereClause(where)
      const sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause.sql} LIMIT 1`
      
      const result = await secureDatabase.query<T>(
        sql,
        whereClause.params,
        { userId, correlationId: crypto.randomUUID() }
      )
      
      return result.rows[0] || null
    } catch (error) {
      logger.error('repository_find_first_error', {
        table: this.tableName,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      })
      throw new DatabaseError(`Failed to find ${this.tableName}`, { originalError: error })
    }
  }

  async findMany(
    where: Partial<T>, 
    options: { limit?: number; offset?: number } = {},
    userId?: string
  ): Promise<T[]> {
    try {
      const { limit = 100, offset = 0 } = options
      const whereClause = this.buildWhereClause(where)
      const sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause.sql} LIMIT $${whereClause.params.length + 1} OFFSET $${whereClause.params.length + 2}`
      
      const result = await secureDatabase.query<T>(
        sql,
        [...whereClause.params, limit, offset],
        { userId, correlationId: crypto.randomUUID() }
      )
      
      return result.rows
    } catch (error) {
      logger.error('repository_find_many_error', {
        table: this.tableName,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      })
      throw new DatabaseError(`Failed to find ${this.tableName} records`, { originalError: error })
    }
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, userId?: string): Promise<T> {
    try {
      const id = this.idGenerator()
      const now = new Date()
      const fullData = { id, ...data, createdAt: now, updatedAt: now }
      
      const columns = Object.keys(fullData).join(', ')
      const placeholders = Object.keys(fullData).map((_, i) => `$${i + 1}`).join(', ')
      const values = Object.values(fullData)
      
      const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`
      
      const result = await secureDatabase.query<T>(
        sql,
        values,
        { userId, correlationId: crypto.randomUUID() }
      )
      
      return result.rows[0]
    } catch (error) {
      logger.error('repository_create_error', {
        table: this.tableName,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      })
      throw new DatabaseError(`Failed to create ${this.tableName}`, { originalError: error })
    }
  }

  async update(
    id: string, 
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>, 
    userId?: string
  ): Promise<T> {
    try {
      const updateData = { ...data, updatedAt: new Date() }
      const setClause = Object.keys(updateData).map((key, i) => `${key} = $${i + 2}`).join(', ')
      const values = [id, ...Object.values(updateData)]
      
      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = $1 RETURNING *`
      
      const result = await secureDatabase.query<T>(
        sql,
        values,
        { userId, correlationId: crypto.randomUUID() }
      )
      
      if (result.rows.length === 0) {
        throw new ValidationError(`${this.tableName} with id ${id} not found`)
      }
      
      return result.rows[0]
    } catch (error) {
      logger.error('repository_update_error', {
        table: this.tableName,
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      })
      throw new DatabaseError(`Failed to update ${this.tableName}`, { originalError: error })
    }
  }

  async delete(id: string, userId?: string): Promise<void> {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = $1`
      
      const result = await secureDatabase.query(
        sql,
        [id],
        { userId, correlationId: crypto.randomUUID() }
      )
      
      if (result.rowCount === 0) {
        throw new ValidationError(`${this.tableName} with id ${id} not found`)
      }
    } catch (error) {
      logger.error('repository_delete_error', {
        table: this.tableName,
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      })
      throw new DatabaseError(`Failed to delete ${this.tableName}`, { originalError: error })
    }
  }

  private buildWhereClause(where: Partial<T>): { sql: string; params: any[] } {
    const conditions: string[] = []
    const params: any[] = []
    
    Object.entries(where).forEach(([key, value], index) => {
      if (value !== undefined) {
        conditions.push(`${key} = $${index + 1}`)
        params.push(value)
      }
    })
    
    return {
      sql: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
      params
    }
  }
}

// Create type-safe repository instances
const organizationRepository = new SecureRepository<Organization>('organizations')
const orderRepository = new SecureRepository<Order>('orders')
const deliveryRepository = new SecureRepository<Delivery>('deliveries')
const invoiceRepository = new SecureRepository<Invoice>('invoices')

// Export secure database client with type-safe repositories
export const prisma = {
  organization: organizationRepository,
  order: orderRepository,
  delivery: deliveryRepository,
  invoice: invoiceRepository,
  // Direct database access for complex queries
  $queryRaw: async (sql: TemplateStringsArray, ...params: any[]) => {
    const query = sql.join('?')
    return secureDatabase.query(query, params)
  },
  $executeRaw: async (sql: TemplateStringsArray, ...params: any[]) => {
    const query = sql.join('?')
    const result = await secureDatabase.query(query, params)
    return result.rowCount || 0
  }
}

// Database connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    return await secureDatabase.healthCheck()
  } catch (error) {
    logger.error('database_connection_check_failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return false
  }
}

// Database initialization with security setup
export async function initializeDatabase(): Promise<void> {
  try {
    await secureDatabase.initialize()
    logger.info('database_initialized', {
      host: process.env.DATABASE_HOST || 'localhost',
      database: process.env.DATABASE_NAME || 'orderly'
    })
  } catch (error) {
    logger.error('database_initialization_failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// Clean shutdown of database connections
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await secureDatabase.close()
    logger.info('database_connection_closed', {})
  } catch (error) {
    logger.error('database_close_error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Export the secure database instance for direct use
export { secureDatabase }
export type { DatabaseError, SecurityError, ValidationError }