import { z } from 'zod'

// ERP 系統標準化數據模型
export const ERPOrderSchema = z.object({
  externalId: z.string(),
  orderNumber: z.string(),
  customerCode: z.string(),
  supplierCode: z.string(),
  orderDate: z.string().datetime(),
  deliveryDate: z.string().datetime(),
  status: z.enum(['draft', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled']),
  totalAmount: z.number(),
  currency: z.string().default('TWD'),
  items: z.array(
    z.object({
      externalId: z.string(),
      productCode: z.string(),
      productName: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      lineTotal: z.number(),
      unit: z.string().optional(),
    })
  ),
  deliveryAddress: z
    .object({
      street: z.string(),
      city: z.string().optional(),
      postalCode: z.string().optional(),
      contactPerson: z.string(),
      phone: z.string(),
    })
    .optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export const ERPProductSchema = z.object({
  externalId: z.string(),
  code: z.string(),
  name: z.string(),
  category: z.string().optional(),
  description: z.string().optional(),
  basePrice: z.number(),
  unit: z.string(),
  currency: z.string().default('TWD'),
  isActive: z.boolean().default(true),
  specifications: z.record(z.any()).optional(),
  lastModified: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
})

export const ERPInventorySchema = z.object({
  productCode: z.string(),
  availableQuantity: z.number(),
  reservedQuantity: z.number().optional().default(0),
  minimumStock: z.number().optional(),
  lastUpdated: z.string().datetime(),
  location: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export const ERPCustomerSchema = z.object({
  externalId: z.string(),
  code: z.string(),
  name: z.string(),
  contactPerson: z.string(),
  email: z.string().email().optional(),
  phone: z.string(),
  address: z.object({
    street: z.string(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
  }),
  paymentTerms: z.number().optional(), // 付款天數
  creditLimit: z.number().optional(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
})

// TypeScript 類型定義
export type ERPOrder = z.infer<typeof ERPOrderSchema>
export type ERPProduct = z.infer<typeof ERPProductSchema>
export type ERPInventory = z.infer<typeof ERPInventorySchema>
export type ERPCustomer = z.infer<typeof ERPCustomerSchema>

// ERP 連接配置
export interface ERPConnectionConfig {
  type: ERPSystemType
  baseUrl: string
  authentication: {
    type: 'basic' | 'bearer' | 'oauth2' | 'apikey'
    credentials: {
      username?: string
      password?: string
      token?: string
      apiKey?: string
      clientId?: string
      clientSecret?: string
    }
  }
  settings: {
    timeout: number // 請求超時時間(ms)
    retryAttempts: number // 重試次數
    rateLimit: number // 每秒請求限制
    batchSize: number // 批次處理大小
  }
  fieldMapping: Record<string, string> // 欄位對應關係
  metadata: Record<string, any>
}

// ERP 系統類型
export type ERPSystemType =
  | 'sap_business_one'
  | 'oracle_netsuite'
  | 'microsoft_dynamics_365'
  | 'digiwin'
  | 'sage_x3'
  | 'epicor_kinetic'
  | 'infor_cloudsuite'
  | 'custom'

// 同步選項
export interface SyncOptions {
  syncDirection: 'inbound' | 'outbound' | 'bidirectional'
  includeInactive: boolean
  dateRange?: {
    from: Date
    to: Date
  }
  batchSize: number
  validateData: boolean
  dryRun: boolean
}

// 同步結果
export interface SyncResult {
  success: boolean
  totalRecords: number
  processedRecords: number
  successfulRecords: number
  failedRecords: number
  errors: Array<{
    recordId: string
    error: string
    details?: any
  }>
  warnings: Array<{
    recordId: string
    message: string
  }>
  metadata: {
    startTime: Date
    endTime: Date
    duration: number
    syncDirection: string
    batchSize: number
  }
}

// API 響應封裝
export interface ERPApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    totalCount?: number
    pageSize?: number
    currentPage?: number
    hasMore?: boolean
  }
}

// 統一的 ERP 適配器介面
export abstract class ERPAdapterInterface {
  protected config: ERPConnectionConfig
  protected isConnected: boolean = false

  constructor(config: ERPConnectionConfig) {
    this.config = config
  }

  // 連接管理
  abstract connect(): Promise<boolean>
  abstract disconnect(): Promise<void>
  abstract testConnection(): Promise<boolean>
  abstract getConnectionStatus(): { connected: boolean; lastError?: string }

  // 訂單管理
  abstract getOrders(options?: {
    dateFrom?: Date
    dateTo?: Date
    status?: string
    customerCode?: string
    pageSize?: number
    pageNumber?: number
  }): Promise<ERPApiResponse<ERPOrder[]>>

  abstract createOrder(order: ERPOrder): Promise<ERPApiResponse<ERPOrder>>
  abstract updateOrder(
    externalId: string,
    updates: Partial<ERPOrder>
  ): Promise<ERPApiResponse<ERPOrder>>
  abstract deleteOrder(externalId: string): Promise<ERPApiResponse<void>>
  abstract getOrderById(externalId: string): Promise<ERPApiResponse<ERPOrder>>

  // 產品管理
  abstract getProducts(options?: {
    category?: string
    isActive?: boolean
    lastModifiedAfter?: Date
    pageSize?: number
    pageNumber?: number
  }): Promise<ERPApiResponse<ERPProduct[]>>

  abstract createProduct(product: ERPProduct): Promise<ERPApiResponse<ERPProduct>>
  abstract updateProduct(
    externalId: string,
    updates: Partial<ERPProduct>
  ): Promise<ERPApiResponse<ERPProduct>>
  abstract deleteProduct(externalId: string): Promise<ERPApiResponse<void>>
  abstract getProductById(externalId: string): Promise<ERPApiResponse<ERPProduct>>

  // 庫存管理
  abstract getInventory(options?: {
    productCodes?: string[]
    location?: string
    lastUpdatedAfter?: Date
  }): Promise<ERPApiResponse<ERPInventory[]>>

  abstract updateInventory(updates: ERPInventory[]): Promise<ERPApiResponse<ERPInventory[]>>

  // 客戶管理
  abstract getCustomers(options?: {
    isActive?: boolean
    lastModifiedAfter?: Date
    pageSize?: number
    pageNumber?: number
  }): Promise<ERPApiResponse<ERPCustomer[]>>

  abstract createCustomer(customer: ERPCustomer): Promise<ERPApiResponse<ERPCustomer>>
  abstract updateCustomer(
    externalId: string,
    updates: Partial<ERPCustomer>
  ): Promise<ERPApiResponse<ERPCustomer>>
  abstract getCustomerById(externalId: string): Promise<ERPApiResponse<ERPCustomer>>

  // 同步操作
  abstract syncOrders(options: SyncOptions): Promise<SyncResult>
  abstract syncProducts(options: SyncOptions): Promise<SyncResult>
  abstract syncInventory(options: SyncOptions): Promise<SyncResult>
  abstract syncCustomers(options: SyncOptions): Promise<SyncResult>

  // 批次操作
  abstract batchCreateOrders(orders: ERPOrder[]): Promise<ERPApiResponse<ERPOrder[]>>
  abstract batchUpdateOrders(
    updates: Array<{ externalId: string; data: Partial<ERPOrder> }>
  ): Promise<ERPApiResponse<ERPOrder[]>>
  abstract batchCreateProducts(products: ERPProduct[]): Promise<ERPApiResponse<ERPProduct[]>>
  abstract batchUpdateProducts(
    updates: Array<{ externalId: string; data: Partial<ERPProduct> }>
  ): Promise<ERPApiResponse<ERPProduct[]>>

  // Webhook 支援
  abstract registerWebhook?(
    url: string,
    events: string[]
  ): Promise<ERPApiResponse<{ webhookId: string }>>
  abstract unregisterWebhook?(webhookId: string): Promise<ERPApiResponse<void>>
  abstract listWebhooks?(): Promise<
    ERPApiResponse<Array<{ id: string; url: string; events: string[] }>>
  >

  // 實用方法
  protected mapFieldsFromERP(data: any, mapping: Record<string, string>): any {
    const mapped: any = {}
    for (const [orderlyField, erpField] of Object.entries(mapping)) {
      if (erpField.includes('.')) {
        // 支援巢狀欄位 (例如: "customer.name")
        const keys = erpField.split('.')
        let value = data
        for (const key of keys) {
          value = value?.[key]
          if (value === undefined) break
        }
        mapped[orderlyField] = value
      } else {
        mapped[orderlyField] = data[erpField]
      }
    }
    return mapped
  }

  protected mapFieldsToERP(data: any, mapping: Record<string, string>): any {
    const mapped: any = {}
    for (const [orderlyField, erpField] of Object.entries(mapping)) {
      if (data[orderlyField] !== undefined) {
        if (erpField.includes('.')) {
          // 支援巢狀欄位設置
          const keys = erpField.split('.')
          let current = mapped
          for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {}
            current = current[keys[i]]
          }
          current[keys[keys.length - 1]] = data[orderlyField]
        } else {
          mapped[erpField] = data[orderlyField]
        }
      }
    }
    return mapped
  }

  protected validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Data validation failed: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  }

  protected async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Orderly-ERP-Adapter/2.0',
    }

    // 添加認證資訊
    switch (this.config.authentication.type) {
      case 'basic':
        const basicAuth = Buffer.from(
          `${this.config.authentication.credentials.username}:${this.config.authentication.credentials.password}`
        ).toString('base64')
        headers['Authorization'] = `Basic ${basicAuth}`
        break

      case 'bearer':
        headers['Authorization'] = `Bearer ${this.config.authentication.credentials.token}`
        break

      case 'apikey':
        headers['X-API-Key'] = this.config.authentication.credentials.apiKey!
        break
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(this.config.settings.timeout),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`ERP API request failed: ${method} ${url}`, error)
      throw error
    }
  }

  // 輔助方法：創建分頁請求參數
  protected createPaginationParams(pageSize?: number, pageNumber?: number): Record<string, any> {
    const params: Record<string, any> = {}

    if (pageSize) {
      params.limit = pageSize
      params.size = pageSize
      params.per_page = pageSize
    }

    if (pageNumber) {
      params.offset = (pageNumber - 1) * (pageSize || 20)
      params.page = pageNumber
      params.skip = (pageNumber - 1) * (pageSize || 20)
    }

    return params
  }

  // 輔助方法：處理日期格式轉換
  protected formatDateForERP(date: Date): string {
    // 大多數 ERP 系統使用 ISO 8601 格式
    return date.toISOString()
  }

  protected parseDateFromERP(dateString: string): Date {
    return new Date(dateString)
  }

  // 輔助方法：創建重試機制
  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.settings.retryAttempts
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        if (attempt === maxRetries) {
          break
        }

        // 指數退避重試延遲
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }
}

// ERP 適配器工廠
export class ERPAdapterFactory {
  private static adapters: Map<
    ERPSystemType,
    new (config: ERPConnectionConfig) => ERPAdapterInterface
  > = new Map()

  static registerAdapter(
    type: ERPSystemType,
    adapterClass: new (config: ERPConnectionConfig) => ERPAdapterInterface
  ): void {
    this.adapters.set(type, adapterClass)
  }

  static createAdapter(config: ERPConnectionConfig): ERPAdapterInterface {
    const AdapterClass = this.adapters.get(config.type)

    if (!AdapterClass) {
      throw new Error(`Unsupported ERP system type: ${config.type}`)
    }

    return new AdapterClass(config)
  }

  static getSupportedTypes(): ERPSystemType[] {
    return Array.from(this.adapters.keys())
  }

  static isSupported(type: ERPSystemType): boolean {
    return this.adapters.has(type)
  }
}

export default ERPAdapterInterface
