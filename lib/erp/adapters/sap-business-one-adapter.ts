import {
  ERPAdapterInterface,
  ERPConnectionConfig,
  ERPOrder,
  ERPProduct,
  ERPInventory,
  ERPCustomer,
  ERPApiResponse,
  SyncOptions,
  SyncResult,
  ERPOrderSchema,
  ERPProductSchema,
  ERPInventorySchema,
  ERPCustomerSchema
} from '../erp-adapter-interface'

/**
 * SAP Business One ERP 適配器
 * 
 * 支援功能:
 * - Service Layer API 集成
 * - 訂單同步 (銷售訂單/採購訂單)
 * - 產品主數據同步
 * - 庫存即時查詢
 * - 客戶主數據同步
 * - Webhook 支援 (如果 SAP B1 支援)
 */
export class SAPBusinessOneAdapter extends ERPAdapterInterface {
  private sessionId?: string
  private sessionTimeout?: Date
  private lastError?: string

  // SAP B1 特定配置
  private readonly defaultFieldMapping = {
    // 訂單欄位對應
    'orderNumber': 'DocNum',
    'externalId': 'DocEntry',
    'customerCode': 'CardCode',
    'orderDate': 'DocDate',
    'deliveryDate': 'DocDeliveryDate',
    'totalAmount': 'DocTotal',
    'status': 'DocumentStatus',
    'notes': 'Comments',
    
    // 產品欄位對應
    'code': 'ItemCode',
    'name': 'ItemName',
    'basePrice': 'StandardPrice',
    'unit': 'InventoryUOM',
    'isActive': 'Valid',
    'category': 'ItemsGroupCode',
    
    // 庫存欄位對應
    'productCode': 'ItemCode',
    'availableQuantity': 'OnHand',
    'reservedQuantity': 'Committed',
    
    // 客戶欄位對應
    'code': 'CardCode',
    'name': 'CardName',
    'contactPerson': 'ContactPerson',
    'email': 'EmailAddress',
    'phone': 'Phone1',
    'isActive': 'Valid'
  }

  constructor(config: ERPConnectionConfig) {
    super(config)
    
    // 合併欄位對應
    this.config.fieldMapping = {
      ...this.defaultFieldMapping,
      ...this.config.fieldMapping
    }
  }

  async connect(): Promise<boolean> {
    try {
      const loginData = {
        CompanyDB: this.config.settings.companyDatabase || '',
        UserName: this.config.authentication.credentials.username,
        Password: this.config.authentication.credentials.password
      }

      const response = await this.makeRequest('POST', '/Login', loginData)
      
      if (response.SessionId) {
        this.sessionId = response.SessionId
        this.sessionTimeout = new Date(Date.now() + 30 * 60 * 1000) // 30分鐘有效期
        this.isConnected = true
        this.lastError = undefined
        return true
      }

      throw new Error('Login failed: No session ID received')
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Connection failed'
      this.isConnected = false
      return false
    }
  }

  async disconnect(): Promise<void> {
    if (this.sessionId) {
      try {
        await this.makeRequest('POST', '/Logout', {})
      } catch (error) {
        console.error('Logout error:', error)
      }
      
      this.sessionId = undefined
      this.sessionTimeout = undefined
    }
    
    this.isConnected = false
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.sessionId || this.isSessionExpired()) {
        return await this.connect()
      }

      // 測試 API 調用
      await this.makeRequest('GET', '/Companies')
      return true
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Connection test failed'
      return false
    }
  }

  getConnectionStatus(): { connected: boolean; lastError?: string } {
    return {
      connected: this.isConnected && !!this.sessionId && !this.isSessionExpired(),
      lastError: this.lastError
    }
  }

  // 訂單管理
  async getOrders(options?: {
    dateFrom?: Date
    dateTo?: Date
    status?: string
    customerCode?: string
    pageSize?: number
    pageNumber?: number
  }): Promise<ERPApiResponse<ERPOrder[]>> {
    try {
      await this.ensureConnected()

      let filter = ''
      const filters: string[] = []

      if (options?.dateFrom) {
        filters.push(`DocDate ge '${this.formatDateForERP(options.dateFrom).split('T')[0]}'`)
      }

      if (options?.dateTo) {
        filters.push(`DocDate le '${this.formatDateForERP(options.dateTo).split('T')[0]}'`)
      }

      if (options?.customerCode) {
        filters.push(`CardCode eq '${options.customerCode}'`)
      }

      if (options?.status) {
        const sapStatus = this.mapOrderStatusToSAP(options.status)
        filters.push(`DocumentStatus eq '${sapStatus}'`)
      }

      if (filters.length > 0) {
        filter = `$filter=${filters.join(' and ')}`
      }

      const pagination = this.createPaginationParams(options?.pageSize, options?.pageNumber)
      const paginationQuery = Object.entries(pagination)
        .map(([key, value]) => `$${key}=${value}`)
        .join('&')

      let query = ''
      if (filter || paginationQuery) {
        query = '?' + [filter, paginationQuery].filter(Boolean).join('&')
      }

      const response = await this.makeRequest('GET', `/Orders${query}`)
      
      const orders: ERPOrder[] = response.value?.map((sapOrder: any) => this.mapSAPOrderToStandard(sapOrder)) || []

      return {
        success: true,
        data: orders,
        metadata: {
          totalCount: response['@odata.count'],
          pageSize: options?.pageSize,
          currentPage: options?.pageNumber,
          hasMore: !!response['@odata.nextLink']
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get orders'
      }
    }
  }

  async createOrder(order: ERPOrder): Promise<ERPApiResponse<ERPOrder>> {
    try {
      await this.ensureConnected()
      
      const sapOrder = this.mapStandardOrderToSAP(order)
      const response = await this.makeRequest('POST', '/Orders', sapOrder)
      
      const createdOrder = this.mapSAPOrderToStandard(response)
      
      return {
        success: true,
        data: createdOrder
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order'
      }
    }
  }

  async updateOrder(externalId: string, updates: Partial<ERPOrder>): Promise<ERPApiResponse<ERPOrder>> {
    try {
      await this.ensureConnected()
      
      const sapUpdates = this.mapStandardOrderToSAP(updates as ERPOrder)
      const response = await this.makeRequest('PATCH', `/Orders(${externalId})`, sapUpdates)
      
      const updatedOrder = this.mapSAPOrderToStandard(response)
      
      return {
        success: true,
        data: updatedOrder
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update order'
      }
    }
  }

  async deleteOrder(externalId: string): Promise<ERPApiResponse<void>> {
    try {
      await this.ensureConnected()
      
      // SAP B1 通常不允許刪除訂單，而是取消
      await this.makeRequest('PATCH', `/Orders(${externalId})`, {
        DocumentStatus: 'bost_Close'
      })
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete order'
      }
    }
  }

  async getOrderById(externalId: string): Promise<ERPApiResponse<ERPOrder>> {
    try {
      await this.ensureConnected()
      
      const response = await this.makeRequest('GET', `/Orders(${externalId})`)
      const order = this.mapSAPOrderToStandard(response)
      
      return {
        success: true,
        data: order
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get order'
      }
    }
  }

  // 產品管理
  async getProducts(options?: {
    category?: string
    isActive?: boolean
    lastModifiedAfter?: Date
    pageSize?: number
    pageNumber?: number
  }): Promise<ERPApiResponse<ERPProduct[]>> {
    try {
      await this.ensureConnected()

      let filter = ''
      const filters: string[] = []

      if (options?.category) {
        filters.push(`ItemsGroupCode eq ${options.category}`)
      }

      if (options?.isActive !== undefined) {
        filters.push(`Valid eq '${options.isActive ? 'Y' : 'N'}'`)
      }

      if (options?.lastModifiedAfter) {
        filters.push(`UpdateDate ge '${this.formatDateForERP(options.lastModifiedAfter).split('T')[0]}'`)
      }

      if (filters.length > 0) {
        filter = `$filter=${filters.join(' and ')}`
      }

      const pagination = this.createPaginationParams(options?.pageSize, options?.pageNumber)
      const paginationQuery = Object.entries(pagination)
        .map(([key, value]) => `$${key}=${value}`)
        .join('&')

      let query = ''
      if (filter || paginationQuery) {
        query = '?' + [filter, paginationQuery].filter(Boolean).join('&')
      }

      const response = await this.makeRequest('GET', `/Items${query}`)
      
      const products: ERPProduct[] = response.value?.map((sapItem: any) => this.mapSAPItemToStandard(sapItem)) || []

      return {
        success: true,
        data: products,
        metadata: {
          totalCount: response['@odata.count'],
          pageSize: options?.pageSize,
          currentPage: options?.pageNumber,
          hasMore: !!response['@odata.nextLink']
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get products'
      }
    }
  }

  async createProduct(product: ERPProduct): Promise<ERPApiResponse<ERPProduct>> {
    try {
      await this.ensureConnected()
      
      const sapItem = this.mapStandardItemToSAP(product)
      const response = await this.makeRequest('POST', '/Items', sapItem)
      
      const createdProduct = this.mapSAPItemToStandard(response)
      
      return {
        success: true,
        data: createdProduct
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create product'
      }
    }
  }

  async updateProduct(externalId: string, updates: Partial<ERPProduct>): Promise<ERPApiResponse<ERPProduct>> {
    try {
      await this.ensureConnected()
      
      const sapUpdates = this.mapStandardItemToSAP(updates as ERPProduct)
      const response = await this.makeRequest('PATCH', `/Items('${externalId}')`, sapUpdates)
      
      const updatedProduct = this.mapSAPItemToStandard(response)
      
      return {
        success: true,
        data: updatedProduct
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product'
      }
    }
  }

  async deleteProduct(externalId: string): Promise<ERPApiResponse<void>> {
    try {
      await this.ensureConnected()
      
      // SAP B1 標記為無效而不是刪除
      await this.makeRequest('PATCH', `/Items('${externalId}')`, {
        Valid: 'N'
      })
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product'
      }
    }
  }

  async getProductById(externalId: string): Promise<ERPApiResponse<ERPProduct>> {
    try {
      await this.ensureConnected()
      
      const response = await this.makeRequest('GET', `/Items('${externalId}')`)
      const product = this.mapSAPItemToStandard(response)
      
      return {
        success: true,
        data: product
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get product'
      }
    }
  }

  // 庫存管理
  async getInventory(options?: {
    productCodes?: string[]
    location?: string
    lastUpdatedAfter?: Date
  }): Promise<ERPApiResponse<ERPInventory[]>> {
    try {
      await this.ensureConnected()

      let filter = ''
      const filters: string[] = []

      if (options?.productCodes && options.productCodes.length > 0) {
        const codeFilter = options.productCodes.map(code => `ItemCode eq '${code}'`).join(' or ')
        filters.push(`(${codeFilter})`)
      }

      if (options?.location) {
        filters.push(`WhsCode eq '${options.location}'`)
      }

      if (filters.length > 0) {
        filter = `$filter=${filters.join(' and ')}`
      }

      const query = filter ? `?${filter}` : ''
      const response = await this.makeRequest('GET', `/ItemWarehouseInfoCollection${query}`)
      
      const inventory: ERPInventory[] = response.value?.map((sapInventory: any) => this.mapSAPInventoryToStandard(sapInventory)) || []

      return {
        success: true,
        data: inventory
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get inventory'
      }
    }
  }

  async updateInventory(updates: ERPInventory[]): Promise<ERPApiResponse<ERPInventory[]>> {
    try {
      await this.ensureConnected()
      
      const results: ERPInventory[] = []
      
      for (const update of updates) {
        try {
          const sapUpdate = this.mapStandardInventoryToSAP(update)
          const response = await this.makeRequest('PATCH', `/ItemWarehouseInfoCollection(ItemCode='${update.productCode}',WarehouseCode='01')`, sapUpdate)
          results.push(this.mapSAPInventoryToStandard(response))
        } catch (error) {
          console.error(`Failed to update inventory for ${update.productCode}:`, error)
        }
      }
      
      return {
        success: true,
        data: results
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update inventory'
      }
    }
  }

  // 客戶管理
  async getCustomers(options?: {
    isActive?: boolean
    lastModifiedAfter?: Date
    pageSize?: number
    pageNumber?: number
  }): Promise<ERPApiResponse<ERPCustomer[]>> {
    try {
      await this.ensureConnected()

      let filter = ''
      const filters: string[] = []

      if (options?.isActive !== undefined) {
        filters.push(`Valid eq '${options.isActive ? 'Y' : 'N'}'`)
      }

      if (options?.lastModifiedAfter) {
        filters.push(`UpdateDate ge '${this.formatDateForERP(options.lastModifiedAfter).split('T')[0]}'`)
      }

      if (filters.length > 0) {
        filter = `$filter=${filters.join(' and ')}`
      }

      const pagination = this.createPaginationParams(options?.pageSize, options?.pageNumber)
      const paginationQuery = Object.entries(pagination)
        .map(([key, value]) => `$${key}=${value}`)
        .join('&')

      let query = ''
      if (filter || paginationQuery) {
        query = '?' + [filter, paginationQuery].filter(Boolean).join('&')
      }

      const response = await this.makeRequest('GET', `/BusinessPartners${query}`)
      
      const customers: ERPCustomer[] = response.value?.map((sapCustomer: any) => this.mapSAPCustomerToStandard(sapCustomer)) || []

      return {
        success: true,
        data: customers,
        metadata: {
          totalCount: response['@odata.count'],
          pageSize: options?.pageSize,
          currentPage: options?.pageNumber,
          hasMore: !!response['@odata.nextLink']
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get customers'
      }
    }
  }

  async createCustomer(customer: ERPCustomer): Promise<ERPApiResponse<ERPCustomer>> {
    try {
      await this.ensureConnected()
      
      const sapCustomer = this.mapStandardCustomerToSAP(customer)
      const response = await this.makeRequest('POST', '/BusinessPartners', sapCustomer)
      
      const createdCustomer = this.mapSAPCustomerToStandard(response)
      
      return {
        success: true,
        data: createdCustomer
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create customer'
      }
    }
  }

  async updateCustomer(externalId: string, updates: Partial<ERPCustomer>): Promise<ERPApiResponse<ERPCustomer>> {
    try {
      await this.ensureConnected()
      
      const sapUpdates = this.mapStandardCustomerToSAP(updates as ERPCustomer)
      const response = await this.makeRequest('PATCH', `/BusinessPartners('${externalId}')`, sapUpdates)
      
      const updatedCustomer = this.mapSAPCustomerToStandard(response)
      
      return {
        success: true,
        data: updatedCustomer
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update customer'
      }
    }
  }

  async getCustomerById(externalId: string): Promise<ERPApiResponse<ERPCustomer>> {
    try {
      await this.ensureConnected()
      
      const response = await this.makeRequest('GET', `/BusinessPartners('${externalId}')`)
      const customer = this.mapSAPCustomerToStandard(response)
      
      return {
        success: true,
        data: customer
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get customer'
      }
    }
  }

  // 同步操作（簡化實現）
  async syncOrders(options: SyncOptions): Promise<SyncResult> {
    const startTime = new Date()
    const result: SyncResult = {
      success: false,
      totalRecords: 0,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      errors: [],
      warnings: [],
      metadata: {
        startTime,
        endTime: new Date(),
        duration: 0,
        syncDirection: options.syncDirection,
        batchSize: options.batchSize
      }
    }

    try {
      // 實現同步邏輯...
      result.success = true
    } catch (error) {
      result.errors.push({
        recordId: 'sync',
        error: error instanceof Error ? error.message : 'Sync failed'
      })
    }

    result.metadata.endTime = new Date()
    result.metadata.duration = result.metadata.endTime.getTime() - startTime.getTime()
    
    return result
  }

  async syncProducts(options: SyncOptions): Promise<SyncResult> {
    // 實現產品同步邏輯...
    return this.syncOrders(options) // 簡化實現
  }

  async syncInventory(options: SyncOptions): Promise<SyncResult> {
    // 實現庫存同步邏輯...
    return this.syncOrders(options) // 簡化實現
  }

  async syncCustomers(options: SyncOptions): Promise<SyncResult> {
    // 實現客戶同步邏輯...
    return this.syncOrders(options) // 簡化實現
  }

  // 批次操作（簡化實現）
  async batchCreateOrders(orders: ERPOrder[]): Promise<ERPApiResponse<ERPOrder[]>> {
    const results: ERPOrder[] = []
    for (const order of orders) {
      const result = await this.createOrder(order)
      if (result.success && result.data) {
        results.push(result.data)
      }
    }
    return { success: true, data: results }
  }

  async batchUpdateOrders(updates: Array<{ externalId: string; data: Partial<ERPOrder> }>): Promise<ERPApiResponse<ERPOrder[]>> {
    const results: ERPOrder[] = []
    for (const update of updates) {
      const result = await this.updateOrder(update.externalId, update.data)
      if (result.success && result.data) {
        results.push(result.data)
      }
    }
    return { success: true, data: results }
  }

  async batchCreateProducts(products: ERPProduct[]): Promise<ERPApiResponse<ERPProduct[]>> {
    const results: ERPProduct[] = []
    for (const product of products) {
      const result = await this.createProduct(product)
      if (result.success && result.data) {
        results.push(result.data)
      }
    }
    return { success: true, data: results }
  }

  async batchUpdateProducts(updates: Array<{ externalId: string; data: Partial<ERPProduct> }>): Promise<ERPApiResponse<ERPProduct[]>> {
    const results: ERPProduct[] = []
    for (const update of updates) {
      const result = await this.updateProduct(update.externalId, update.data)
      if (result.success && result.data) {
        results.push(result.data)
      }
    }
    return { success: true, data: results }
  }

  // 私有輔助方法
  private async ensureConnected(): Promise<void> {
    if (!this.isConnected || !this.sessionId || this.isSessionExpired()) {
      const connected = await this.connect()
      if (!connected) {
        throw new Error('Unable to connect to SAP Business One')
      }
    }
  }

  private isSessionExpired(): boolean {
    return !this.sessionTimeout || new Date() >= this.sessionTimeout
  }

  private mapOrderStatusToSAP(orderlyStatus: string): string {
    const statusMap: Record<string, string> = {
      'draft': 'bost_Open',
      'confirmed': 'bost_Open',
      'shipped': 'bost_Open',
      'delivered': 'bost_Open',
      'completed': 'bost_Close',
      'cancelled': 'bost_Close'
    }
    return statusMap[orderlyStatus] || 'bost_Open'
  }

  private mapSAPOrderToStandard(sapOrder: any): ERPOrder {
    return this.mapFieldsFromERP(sapOrder, this.config.fieldMapping) as ERPOrder
  }

  private mapStandardOrderToSAP(order: ERPOrder): any {
    return this.mapFieldsToERP(order, this.config.fieldMapping)
  }

  private mapSAPItemToStandard(sapItem: any): ERPProduct {
    return this.mapFieldsFromERP(sapItem, this.config.fieldMapping) as ERPProduct
  }

  private mapStandardItemToSAP(product: ERPProduct): any {
    return this.mapFieldsToERP(product, this.config.fieldMapping)
  }

  private mapSAPInventoryToStandard(sapInventory: any): ERPInventory {
    return this.mapFieldsFromERP(sapInventory, this.config.fieldMapping) as ERPInventory
  }

  private mapStandardInventoryToSAP(inventory: ERPInventory): any {
    return this.mapFieldsToERP(inventory, this.config.fieldMapping)
  }

  private mapSAPCustomerToStandard(sapCustomer: any): ERPCustomer {
    return this.mapFieldsFromERP(sapCustomer, this.config.fieldMapping) as ERPCustomer
  }

  private mapStandardCustomerToSAP(customer: ERPCustomer): any {
    return this.mapFieldsToERP(customer, this.config.fieldMapping)
  }

  protected async makeRequest(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', endpoint: string, data?: any): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Orderly-SAP-B1-Adapter/2.0'
    }

    // 添加 SAP B1 Session Cookie
    if (this.sessionId && endpoint !== '/Login') {
      headers['Cookie'] = `B1SESSION=${this.sessionId}`
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(this.config.settings.timeout)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // SAP B1 有時返回空響應
      const text = await response.text()
      return text ? JSON.parse(text) : {}
    } catch (error) {
      console.error(`SAP B1 API request failed: ${method} ${url}`, error)
      throw error
    }
  }
}

export default SAPBusinessOneAdapter