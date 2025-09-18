import { prisma } from '@/lib/db'
import { CacheService } from '@/lib/redis'
import crypto from 'crypto'
import { z } from 'zod'

export interface WebhookEndpoint {
  id: string
  organizationId: string
  url: string
  events: WebhookEventType[]
  secret: string
  isActive: boolean
  description?: string
  createdAt: Date
  updatedAt: Date
  lastTriggered?: Date
  successCount: number
  failureCount: number
  metadata?: Record<string, any>
}

export type WebhookEventType = 
  | 'order.created'
  | 'order.updated'
  | 'order.confirmed'
  | 'order.shipped'
  | 'order.delivered'
  | 'order.accepted'
  | 'order.completed'
  | 'order.cancelled'
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'product.price_changed'
  | 'reconciliation.started'
  | 'reconciliation.completed'
  | 'reconciliation.disputed'
  | 'reconciliation.resolved'
  | 'inventory.updated'
  | 'inventory.low_stock'
  | 'payment.processed'
  | 'payment.failed'
  | 'user.created'
  | 'user.updated'
  | 'organization.updated'

export interface WebhookPayload {
  id: string
  type: WebhookEventType
  timestamp: string
  organizationId: string
  data: Record<string, any>
  version: string
  idempotencyKey?: string
}

export interface WebhookDeliveryAttempt {
  id: string
  webhookEndpointId: string
  eventId: string
  url: string
  payload: WebhookPayload
  httpStatus?: number
  responseBody?: string
  responseHeaders?: Record<string, string>
  errorMessage?: string
  attemptNumber: number
  deliveredAt?: Date
  createdAt: Date
}

export interface WebhookDeliveryConfig {
  maxRetries: number           // 最大重試次數 (預設: 5)
  retryIntervals: number[]     // 重試間隔(秒) [30, 60, 300, 900, 3600]
  timeout: number              // 請求超時(ms) (預設: 10000)
  allowInsecure: boolean       // 是否允許不安全的 HTTPS (預設: false)
  userAgent: string            // User-Agent (預設: Orderly-Webhooks/2.0)
}

const WebhookEndpointSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.string()).min(1, 'At least one event type is required'),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
})

export class WebhookManager {
  private static readonly DEFAULT_CONFIG: WebhookDeliveryConfig = {
    maxRetries: 5,
    retryIntervals: [30, 60, 300, 900, 3600], // 30s, 1m, 5m, 15m, 1h
    timeout: 10000, // 10 seconds
    allowInsecure: false,
    userAgent: 'Orderly-Webhooks/2.0'
  }

  private config: WebhookDeliveryConfig

  constructor(config: Partial<WebhookDeliveryConfig> = {}) {
    this.config = { ...WebhookManager.DEFAULT_CONFIG, ...config }
  }

  /**
   * 註冊新的 webhook 端點
   */
  async registerEndpoint(
    organizationId: string,
    endpointData: z.infer<typeof WebhookEndpointSchema>
  ): Promise<WebhookEndpoint> {
    // 驗證輸入數據
    const validatedData = WebhookEndpointSchema.parse(endpointData)

    // 檢查組織是否存在
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    })

    if (!organization) {
      throw new Error(`Organization ${organizationId} not found`)
    }

    // 檢查 URL 是否已存在
    const existingEndpoint = await this.getEndpointByUrl(organizationId, validatedData.url)
    if (existingEndpoint) {
      throw new Error(`Webhook endpoint for URL ${validatedData.url} already exists`)
    }

    // 生成安全的簽名密鑰
    const secret = this.generateWebhookSecret()

    // 驗證 webhook 端點可達性
    await this.validateEndpointReachability(validatedData.url)

    // 創建 webhook 端點記錄
    const endpointId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const webhookData = {
      id: endpointId,
      organizationId,
      url: validatedData.url,
      events: validatedData.events as WebhookEventType[],
      secret,
      isActive: validatedData.isActive,
      description: validatedData.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      successCount: 0,
      failureCount: 0
    }

    // 儲存到系統配置表（作為 JSON 數據）
    await prisma.systemConfig.create({
      data: {
        key: `webhook:endpoint:${endpointId}`,
        value: webhookData,
        category: 'webhooks'
      }
    })

    // 快取端點信息
    await CacheService.set(`webhook:${organizationId}:${endpointId}`, webhookData, 3600)

    return webhookData
  }

  /**
   * 更新 webhook 端點
   */
  async updateEndpoint(
    organizationId: string,
    endpointId: string,
    updates: Partial<z.infer<typeof WebhookEndpointSchema>>
  ): Promise<WebhookEndpoint> {
    const existingEndpoint = await this.getEndpoint(organizationId, endpointId)
    if (!existingEndpoint) {
      throw new Error(`Webhook endpoint ${endpointId} not found`)
    }

    // 如果更新 URL，需要驗證新 URL
    if (updates.url && updates.url !== existingEndpoint.url) {
      await this.validateEndpointReachability(updates.url)
    }

    const updatedEndpoint = {
      ...existingEndpoint,
      ...updates,
      updatedAt: new Date()
    }

    // 更新數據庫
    await prisma.systemConfig.updateMany({
      where: {
        key: `webhook:endpoint:${endpointId}`,
        category: 'webhooks'
      },
      data: {
        value: updatedEndpoint,
        updatedAt: new Date()
      }
    })

    // 更新快取
    await CacheService.set(`webhook:${organizationId}:${endpointId}`, updatedEndpoint, 3600)

    return updatedEndpoint
  }

  /**
   * 獲取組織的所有 webhook 端點
   */
  async getEndpoints(organizationId: string): Promise<WebhookEndpoint[]> {
    try {
      const configs = await prisma.systemConfig.findMany({
        where: {
          key: {
            startsWith: 'webhook:endpoint:'
          },
          category: 'webhooks'
        }
      })

      return configs
        .map(config => config.value as any)
        .filter(endpoint => endpoint.organizationId === organizationId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      console.error('Failed to get webhook endpoints:', error)
      return []
    }
  }

  /**
   * 獲取單一 webhook 端點
   */
  async getEndpoint(organizationId: string, endpointId: string): Promise<WebhookEndpoint | null> {
    try {
      // 先嘗試從快取獲取
      const cached = await CacheService.get<WebhookEndpoint>(`webhook:${organizationId}:${endpointId}`)
      if (cached) {
        return cached
      }

      // 從數據庫獲取
      const config = await prisma.systemConfig.findFirst({
        where: {
          key: `webhook:endpoint:${endpointId}`,
          category: 'webhooks'
        }
      })

      if (!config) return null

      const endpoint = config.value as any
      if (endpoint.organizationId !== organizationId) return null

      // 快取結果
      await CacheService.set(`webhook:${organizationId}:${endpointId}`, endpoint, 3600)

      return endpoint
    } catch (error) {
      console.error('Failed to get webhook endpoint:', error)
      return null
    }
  }

  /**
   * 根據 URL 獲取端點
   */
  async getEndpointByUrl(organizationId: string, url: string): Promise<WebhookEndpoint | null> {
    const endpoints = await this.getEndpoints(organizationId)
    return endpoints.find(endpoint => endpoint.url === url) || null
  }

  /**
   * 刪除 webhook 端點
   */
  async deleteEndpoint(organizationId: string, endpointId: string): Promise<boolean> {
    try {
      const endpoint = await this.getEndpoint(organizationId, endpointId)
      if (!endpoint) {
        return false
      }

      // 從數據庫刪除
      await prisma.systemConfig.deleteMany({
        where: {
          key: `webhook:endpoint:${endpointId}`,
          category: 'webhooks'
        }
      })

      // 從快取中刪除
      await CacheService.del(`webhook:${organizationId}:${endpointId}`)

      return true
    } catch (error) {
      console.error('Failed to delete webhook endpoint:', error)
      return false
    }
  }

  /**
   * 觸發 webhook 事件
   */
  async triggerEvent(
    organizationId: string,
    eventType: WebhookEventType,
    eventData: Record<string, any>,
    idempotencyKey?: string
  ): Promise<void> {
    try {
      // 獲取訂閱此事件的端點
      const endpoints = await this.getEndpoints(organizationId)
      const subscribedEndpoints = endpoints.filter(
        endpoint => endpoint.isActive && endpoint.events.includes(eventType)
      )

      if (subscribedEndpoints.length === 0) {
        console.log(`No active webhook endpoints for event ${eventType}`)
        return
      }

      // 創建 webhook 負載
      const payload: WebhookPayload = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: eventType,
        timestamp: new Date().toISOString(),
        organizationId,
        data: eventData,
        version: '2.0',
        idempotencyKey
      }

      // 並行發送到所有訂閱的端點
      const deliveryPromises = subscribedEndpoints.map(endpoint =>
        this.deliverWebhook(endpoint, payload)
      )

      await Promise.allSettled(deliveryPromises)
    } catch (error) {
      console.error('Failed to trigger webhook event:', error)
    }
  }

  /**
   * 發送 webhook 到端點
   */
  private async deliverWebhook(endpoint: WebhookEndpoint, payload: WebhookPayload): Promise<void> {
    const attemptId = `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    let attempt = 1
    let lastError: Error | null = null

    while (attempt <= this.config.maxRetries) {
      try {
        const deliveryAttempt: WebhookDeliveryAttempt = {
          id: attemptId,
          webhookEndpointId: endpoint.id,
          eventId: payload.id,
          url: endpoint.url,
          payload,
          attemptNumber: attempt,
          createdAt: new Date()
        }

        const success = await this.sendHttpRequest(endpoint, payload, deliveryAttempt)
        
        if (success) {
          // 更新成功計數
          await this.updateEndpointStats(endpoint.id, 'success')
          
          // 記錄成功投遞
          await this.logDeliveryAttempt(deliveryAttempt)
          return
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.error(`Webhook delivery attempt ${attempt} failed:`, error)
      }

      // 如果不是最後一次嘗試，等待重試間隔
      if (attempt < this.config.maxRetries) {
        const retryDelay = this.config.retryIntervals[attempt - 1] || 3600
        await this.sleep(retryDelay * 1000)
      }

      attempt++
    }

    // 所有重試都失敗了
    await this.updateEndpointStats(endpoint.id, 'failure')
    console.error(`Webhook delivery failed after ${this.config.maxRetries} attempts:`, lastError)
  }

  /**
   * 發送 HTTP 請求
   */
  private async sendHttpRequest(
    endpoint: WebhookEndpoint,
    payload: WebhookPayload,
    deliveryAttempt: WebhookDeliveryAttempt
  ): Promise<boolean> {
    try {
      const signature = this.generateSignature(JSON.stringify(payload), endpoint.secret)
      
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.config.userAgent,
          'X-Orderly-Signature': signature,
          'X-Orderly-Event-Type': payload.type,
          'X-Orderly-Event-Id': payload.id,
          'X-Orderly-Timestamp': payload.timestamp,
          ...(payload.idempotencyKey && {
            'X-Orderly-Idempotency-Key': payload.idempotencyKey
          })
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeout)
      })

      // 更新投遞嘗試記錄
      deliveryAttempt.httpStatus = response.status
      deliveryAttempt.responseBody = await response.text()
      deliveryAttempt.responseHeaders = Object.fromEntries(response.headers.entries())

      if (response.ok) {
        deliveryAttempt.deliveredAt = new Date()
        await this.logDeliveryAttempt(deliveryAttempt)
        return true
      } else {
        deliveryAttempt.errorMessage = `HTTP ${response.status}: ${deliveryAttempt.responseBody}`
        await this.logDeliveryAttempt(deliveryAttempt)
        return false
      }
    } catch (error) {
      deliveryAttempt.errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.logDeliveryAttempt(deliveryAttempt)
      return false
    }
  }

  /**
   * 驗證端點可達性
   */
  private async validateEndpointReachability(url: string): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok && response.status !== 405) { // 405 Method Not Allowed 是可接受的
        throw new Error(`Endpoint returned ${response.status}`)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('Webhook endpoint is not reachable (timeout)')
      }
      throw new Error(`Webhook endpoint validation failed: ${error}`)
    }
  }

  /**
   * 生成 webhook 簽名密鑰
   */
  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * 生成 webhook 簽名
   */
  private generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    return `sha256=${hmac.digest('hex')}`
  }

  /**
   * 驗證 webhook 簽名
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto.createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    
    const actualSignature = signature.startsWith('sha256=') 
      ? signature.slice(7) 
      : signature

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(actualSignature, 'hex')
    )
  }

  /**
   * 更新端點統計
   */
  private async updateEndpointStats(endpointId: string, result: 'success' | 'failure'): Promise<void> {
    try {
      const config = await prisma.systemConfig.findFirst({
        where: {
          key: `webhook:endpoint:${endpointId}`,
          category: 'webhooks'
        }
      })

      if (config) {
        const endpoint = config.value as any
        
        if (result === 'success') {
          endpoint.successCount = (endpoint.successCount || 0) + 1
        } else {
          endpoint.failureCount = (endpoint.failureCount || 0) + 1
        }
        
        endpoint.lastTriggered = new Date()
        endpoint.updatedAt = new Date()

        await prisma.systemConfig.update({
          where: { id: config.id },
          data: {
            value: endpoint,
            updatedAt: new Date()
          }
        })

        // 更新快取
        await CacheService.set(`webhook:${endpoint.organizationId}:${endpointId}`, endpoint, 3600)
      }
    } catch (error) {
      console.error('Failed to update endpoint stats:', error)
    }
  }

  /**
   * 記錄投遞嘗試
   */
  private async logDeliveryAttempt(attempt: WebhookDeliveryAttempt): Promise<void> {
    try {
      // 儲存到工作流任務表
      await prisma.workflowTask.create({
        data: {
          type: 'webhook_delivery',
          data: attempt,
          status: attempt.deliveredAt ? 'completed' : 'failed',
          scheduledAt: attempt.createdAt,
          startedAt: attempt.createdAt,
          completedAt: attempt.deliveredAt || new Date()
        }
      })
    } catch (error) {
      console.error('Failed to log delivery attempt:', error)
    }
  }

  /**
   * 獲取投遞歷史
   */
  async getDeliveryHistory(
    organizationId: string,
    endpointId?: string,
    limit: number = 50
  ): Promise<WebhookDeliveryAttempt[]> {
    try {
      const whereClause: any = {
        type: 'webhook_delivery'
      }

      if (endpointId) {
        whereClause.data = {
          path: ['webhookEndpointId'],
          equals: endpointId
        }
      }

      const tasks = await prisma.workflowTask.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      })

      return tasks
        .map(task => task.data as any)
        .filter(attempt => {
          // 過濾只屬於當前組織的記錄
          return !endpointId || attempt.webhookEndpointId === endpointId
        })
    } catch (error) {
      console.error('Failed to get delivery history:', error)
      return []
    }
  }

  /**
   * 重新發送失敗的 webhook
   */
  async retryFailedWebhook(
    organizationId: string,
    endpointId: string,
    eventId: string
  ): Promise<boolean> {
    try {
      const endpoint = await this.getEndpoint(organizationId, endpointId)
      if (!endpoint) {
        throw new Error('Webhook endpoint not found')
      }

      // 查找失敗的投遞記錄
      const tasks = await prisma.workflowTask.findMany({
        where: {
          type: 'webhook_delivery',
          status: 'failed',
          data: {
            path: ['eventId'],
            equals: eventId
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      })

      if (tasks.length === 0) {
        throw new Error('Failed delivery attempt not found')
      }

      const failedAttempt = tasks[0].data as any
      await this.deliverWebhook(endpoint, failedAttempt.payload)

      return true
    } catch (error) {
      console.error('Failed to retry webhook:', error)
      return false
    }
  }

  /**
   * 批量觸發事件（用於數據同步）
   */
  async triggerBatchEvents(
    organizationId: string,
    events: Array<{ type: WebhookEventType; data: Record<string, any> }>
  ): Promise<void> {
    // 批次處理，避免過載
    const batchSize = 10
    
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize)
      
      const promises = batch.map(event =>
        this.triggerEvent(organizationId, event.type, event.data)
      )
      
      await Promise.allSettled(promises)
      
      // 批次間稍作停頓
      if (i + batchSize < events.length) {
        await this.sleep(100)
      }
    }
  }

  /**
   * 測試 webhook 端點
   */
  async testEndpoint(organizationId: string, endpointId: string): Promise<{
    success: boolean
    response?: { status: number; body: string }
    error?: string
  }> {
    try {
      const endpoint = await this.getEndpoint(organizationId, endpointId)
      if (!endpoint) {
        return { success: false, error: 'Webhook endpoint not found' }
      }

      const testPayload: WebhookPayload = {
        id: 'test_event',
        type: 'order.created',
        timestamp: new Date().toISOString(),
        organizationId,
        data: {
          test: true,
          message: 'This is a test webhook from Orderly'
        },
        version: '2.0'
      }

      const signature = this.generateSignature(JSON.stringify(testPayload), endpoint.secret)
      
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.config.userAgent,
          'X-Orderly-Signature': signature,
          'X-Orderly-Event-Type': testPayload.type,
          'X-Orderly-Event-Id': testPayload.id,
          'X-Orderly-Timestamp': testPayload.timestamp,
          'X-Orderly-Test': 'true'
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(this.config.timeout)
      })

      const responseBody = await response.text()

      return {
        success: response.ok,
        response: {
          status: response.status,
          body: responseBody
        },
        error: response.ok ? undefined : `HTTP ${response.status}: ${responseBody}`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 輔助方法：等待指定時間
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 創建全域實例
export const webhookManager = new WebhookManager()

// 便捷函數
export async function triggerWebhookEvent(
  organizationId: string,
  eventType: WebhookEventType,
  eventData: Record<string, any>,
  idempotencyKey?: string
): Promise<void> {
  return webhookManager.triggerEvent(organizationId, eventType, eventData, idempotencyKey)
}

export default WebhookManager