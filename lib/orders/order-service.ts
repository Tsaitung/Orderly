import { PrismaClient } from '@prisma/client'
import { webhookManager } from '@/lib/webhooks/webhook-manager'
import { reconciliationEngine } from '@/lib/reconciliation/reconciliation-engine'
import { ERPAdapterFactory } from '@/lib/erp/erp-adapter-registry'
import { z } from 'zod'

const prisma = new PrismaClient()

// 訂單相關的 Zod 驗證規則
export const CreateOrderSchema = z.object({
  organizationId: z.string().uuid(),
  supplierCode: z.string().min(1, '供應商代碼不能為空'),
  orderDate: z.string().datetime().optional().default(() => new Date().toISOString()),
  deliveryDate: z.string().datetime(),
  deliveryAddress: z.object({
    street: z.string().min(1, '街道地址不能為空'),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    contactPerson: z.string().min(1, '聯絡人不能為空'),
    phone: z.string().min(1, '電話不能為空')
  }),
  items: z.array(z.object({
    productCode: z.string().min(1, '產品代碼不能為空'),
    productName: z.string().min(1, '產品名稱不能為空'),
    quantity: z.number().positive('數量必須大於 0'),
    unitPrice: z.number().nonnegative('單價不能為負數'),
    unit: z.string().optional().default('個'),
    specifications: z.record(z.any()).optional()
  })).min(1, '訂單必須包含至少一項商品'),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

export const UpdateOrderSchema = CreateOrderSchema.partial().omit({ organizationId: true })

export const OrderQuerySchema = z.object({
  organizationId: z.string().uuid(),
  status: z.enum(['draft', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled']).optional(),
  supplierCode: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(), // 搜尋訂單號或備註
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(['orderDate', 'deliveryDate', 'totalAmount', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>
export type OrderQueryInput = z.infer<typeof OrderQuerySchema>

export interface OrderItem {
  id: string
  productCode: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  unit: string
  specifications?: Record<string, any>
}

export interface Order {
  id: string
  organizationId: string
  orderNumber: string
  supplierCode: string
  status: 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
  orderDate: Date
  deliveryDate: Date
  deliveryAddress: {
    street: string
    city?: string
    postalCode?: string
    contactPerson: string
    phone: string
  }
  items: OrderItem[]
  totalAmount: number
  currency: string
  notes?: string
  metadata?: Record<string, any>
  erpSyncStatus?: 'pending' | 'synced' | 'failed'
  erpOrderId?: string
  reconciliationStatus?: 'pending' | 'in_progress' | 'completed' | 'failed'
  reconciliationId?: string
  createdAt: Date
  updatedAt: Date
}

export interface OrderListResponse {
  orders: Order[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * 訂單服務類別
 * 
 * 提供訂單的完整 CRUD 操作，整合對帳引擎、ERP 同步和 Webhook 通知
 */
export class OrderService {
  /**
   * 創建新訂單
   */
  static async createOrder(input: CreateOrderInput): Promise<Order> {
    try {
      // 驗證輸入數據
      const validatedInput = CreateOrderSchema.parse(input)
      
      // 生成訂單編號
      const orderNumber = await this.generateOrderNumber(validatedInput.organizationId)
      
      // 計算總金額
      const totalAmount = validatedInput.items.reduce((sum, item) => 
        sum + (item.quantity * item.unitPrice), 0
      )

      // 創建訂單
      const order = await prisma.order.create({
        data: {
          organizationId: validatedInput.organizationId,
          orderNumber,
          supplierCode: validatedInput.supplierCode,
          status: 'draft',
          orderDate: new Date(validatedInput.orderDate),
          deliveryDate: new Date(validatedInput.deliveryDate),
          deliveryAddress: validatedInput.deliveryAddress,
          totalAmount,
          currency: 'TWD',
          notes: validatedInput.notes,
          metadata: validatedInput.metadata,
          erpSyncStatus: 'pending',
          reconciliationStatus: 'pending',
          items: {
            create: validatedInput.items.map(item => ({
              productCode: item.productCode,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.quantity * item.unitPrice,
              unit: item.unit || '個',
              specifications: item.specifications
            }))
          }
        },
        include: {
          items: true
        }
      })

      // 異步觸發 ERP 同步
      this.syncOrderToERP(order.id).catch(error => {
        console.error(`Failed to sync order ${order.id} to ERP:`, error)
      })

      // 觸發 Webhook 事件
      await webhookManager.triggerEvent(
        validatedInput.organizationId,
        'order.created',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          status: order.status
        }
      )

      return this.formatOrder(order)
    } catch (error) {
      console.error('Failed to create order:', error)
      throw new Error('訂單創建失敗')
    }
  }

  /**
   * 更新訂單
   */
  static async updateOrder(orderId: string, input: UpdateOrderInput): Promise<Order> {
    try {
      const validatedInput = UpdateOrderSchema.parse(input)
      
      // 檢查訂單是否存在
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      })

      if (!existingOrder) {
        throw new Error('訂單不存在')
      }

      // 檢查訂單狀態是否允許修改
      if (['shipped', 'delivered', 'completed', 'cancelled'].includes(existingOrder.status)) {
        throw new Error('訂單狀態不允許修改')
      }

      // 計算新的總金額（如果有項目更新）
      let totalAmount = existingOrder.totalAmount
      if (validatedInput.items) {
        totalAmount = validatedInput.items.reduce((sum, item) => 
          sum + (item.quantity * item.unitPrice), 0
        )
      }

      // 更新訂單
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          ...(validatedInput.supplierCode && { supplierCode: validatedInput.supplierCode }),
          ...(validatedInput.deliveryDate && { deliveryDate: new Date(validatedInput.deliveryDate) }),
          ...(validatedInput.deliveryAddress && { deliveryAddress: validatedInput.deliveryAddress }),
          ...(validatedInput.notes !== undefined && { notes: validatedInput.notes }),
          ...(validatedInput.metadata && { metadata: validatedInput.metadata }),
          ...(validatedInput.items && { totalAmount }),
          ...(validatedInput.items && {
            items: {
              deleteMany: {},
              create: validatedInput.items.map(item => ({
                productCode: item.productCode,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: item.quantity * item.unitPrice,
                unit: item.unit || '個',
                specifications: item.specifications
              }))
            }
          })
        },
        include: {
          items: true
        }
      })

      // 如果有項目變更，重新同步到 ERP
      if (validatedInput.items) {
        this.syncOrderToERP(order.id).catch(error => {
          console.error(`Failed to sync updated order ${order.id} to ERP:`, error)
        })
      }

      // 觸發 Webhook 事件
      await webhookManager.triggerEvent(
        order.organizationId,
        'order.updated',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          changes: Object.keys(validatedInput)
        }
      )

      return this.formatOrder(order)
    } catch (error) {
      console.error('Failed to update order:', error)
      throw new Error('訂單更新失敗')
    }
  }

  /**
   * 查詢訂單列表
   */
  static async getOrders(input: OrderQueryInput): Promise<OrderListResponse> {
    try {
      const validatedInput = OrderQuerySchema.parse(input)
      
      const where: any = {
        organizationId: validatedInput.organizationId
      }

      // 添加篩選條件
      if (validatedInput.status) {
        where.status = validatedInput.status
      }

      if (validatedInput.supplierCode) {
        where.supplierCode = validatedInput.supplierCode
      }

      if (validatedInput.dateFrom || validatedInput.dateTo) {
        where.orderDate = {}
        if (validatedInput.dateFrom) {
          where.orderDate.gte = new Date(validatedInput.dateFrom)
        }
        if (validatedInput.dateTo) {
          where.orderDate.lte = new Date(validatedInput.dateTo)
        }
      }

      if (validatedInput.search) {
        where.OR = [
          { orderNumber: { contains: validatedInput.search, mode: 'insensitive' } },
          { notes: { contains: validatedInput.search, mode: 'insensitive' } }
        ]
      }

      // 計算分頁
      const skip = (validatedInput.page - 1) * validatedInput.limit
      
      // 查詢訂單和總數
      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: { items: true },
          skip,
          take: validatedInput.limit,
          orderBy: {
            [validatedInput.sortBy]: validatedInput.sortOrder
          }
        }),
        prisma.order.count({ where })
      ])

      const totalPages = Math.ceil(total / validatedInput.limit)

      return {
        orders: orders.map(order => this.formatOrder(order)),
        pagination: {
          total,
          page: validatedInput.page,
          limit: validatedInput.limit,
          totalPages,
          hasNext: validatedInput.page < totalPages,
          hasPrev: validatedInput.page > 1
        }
      }
    } catch (error) {
      console.error('Failed to get orders:', error)
      throw new Error('訂單查詢失敗')
    }
  }

  /**
   * 根據 ID 查詢單一訂單
   */
  static async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      })

      return order ? this.formatOrder(order) : null
    } catch (error) {
      console.error('Failed to get order by ID:', error)
      throw new Error('訂單查詢失敗')
    }
  }

  /**
   * 確認訂單
   */
  static async confirmOrder(orderId: string): Promise<Order> {
    return this.updateOrderStatus(orderId, 'confirmed', 'order.confirmed')
  }

  /**
   * 發貨訂單
   */
  static async shipOrder(orderId: string): Promise<Order> {
    return this.updateOrderStatus(orderId, 'shipped', 'order.shipped')
  }

  /**
   * 完成交付
   */
  static async deliverOrder(orderId: string): Promise<Order> {
    return this.updateOrderStatus(orderId, 'delivered', 'order.delivered')
  }

  /**
   * 完成訂單
   */
  static async completeOrder(orderId: string): Promise<Order> {
    return this.updateOrderStatus(orderId, 'completed', 'order.completed')
  }

  /**
   * 取消訂單
   */
  static async cancelOrder(orderId: string): Promise<Order> {
    return this.updateOrderStatus(orderId, 'cancelled', 'order.cancelled')
  }

  /**
   * 刪除訂單（軟刪除）
   */
  static async deleteOrder(orderId: string): Promise<boolean> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      })

      if (!order) {
        throw new Error('訂單不存在')
      }

      // 只有草稿狀態的訂單可以刪除
      if (order.status !== 'draft') {
        throw new Error('只有草稿狀態的訂單可以刪除')
      }

      await prisma.order.update({
        where: { id: orderId },
        data: {
          deletedAt: new Date()
        }
      })

      // 觸發 Webhook 事件
      await webhookManager.triggerEvent(
        order.organizationId,
        'order.deleted',
        {
          orderId: order.id,
          orderNumber: order.orderNumber
        }
      )

      return true
    } catch (error) {
      console.error('Failed to delete order:', error)
      throw new Error('訂單刪除失敗')
    }
  }

  /**
   * 觸發訂單對帳
   */
  static async triggerReconciliation(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      })

      if (!order) {
        throw new Error('訂單不存在')
      }

      // 只有已交付的訂單才能對帳
      if (order.status !== 'delivered') {
        throw new Error('只有已交付的訂單才能對帳')
      }

      // 觸發對帳流程
      await reconciliationEngine.processOrder(order.organizationId, orderId)
      
      // 更新對帳狀態
      await prisma.order.update({
        where: { id: orderId },
        data: {
          reconciliationStatus: 'in_progress'
        }
      })

      // 觸發 Webhook 事件
      await webhookManager.triggerEvent(
        order.organizationId,
        'reconciliation.started',
        {
          orderId: order.id,
          orderNumber: order.orderNumber
        }
      )
    } catch (error) {
      console.error('Failed to trigger reconciliation:', error)
      throw new Error('對帳觸發失敗')
    }
  }

  // 私有輔助方法

  /**
   * 生成訂單編號
   */
  private static async generateOrderNumber(organizationId: string): Promise<string> {
    const today = new Date()
    const prefix = `ORD${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`
    
    // 查詢今日已有訂單數量
    const count = await prisma.order.count({
      where: {
        organizationId,
        orderNumber: {
          startsWith: prefix
        }
      }
    })

    return `${prefix}${(count + 1).toString().padStart(4, '0')}`
  }

  /**
   * 更新訂單狀態
   */
  private static async updateOrderStatus(
    orderId: string, 
    status: string, 
    eventType: string
  ): Promise<Order> {
    try {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: { status: status as any },
        include: { items: true }
      })

      // 同步狀態到 ERP
      this.syncOrderToERP(order.id).catch(error => {
        console.error(`Failed to sync order status ${order.id} to ERP:`, error)
      })

      // 觸發 Webhook 事件
      await webhookManager.triggerEvent(
        order.organizationId,
        eventType as any,
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status
        }
      )

      return this.formatOrder(order)
    } catch (error) {
      console.error('Failed to update order status:', error)
      throw new Error('訂單狀態更新失敗')
    }
  }

  /**
   * 同步訂單到 ERP
   */
  private static async syncOrderToERP(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { 
          items: true,
          organization: {
            include: {
              erpConfigurations: true
            }
          }
        }
      })

      if (!order) return

      // 查找 ERP 配置
      const erpConfig = order.organization.erpConfigurations.find(config => config.isActive)
      if (!erpConfig) {
        console.log(`No active ERP configuration found for organization ${order.organizationId}`)
        return
      }

      // 創建 ERP 適配器
      const adapter = ERPAdapterFactory.createAdapter({
        type: erpConfig.erpSystemType as any,
        baseUrl: erpConfig.baseUrl,
        authentication: erpConfig.authentication as any,
        settings: erpConfig.settings as any,
        fieldMapping: erpConfig.fieldMapping as any,
        metadata: erpConfig.metadata as any
      })

      // 同步到 ERP
      const result = await adapter.createOrder({
        externalId: order.id,
        orderNumber: order.orderNumber,
        customerCode: order.supplierCode,
        supplierCode: order.supplierCode,
        orderDate: order.orderDate.toISOString(),
        deliveryDate: order.deliveryDate.toISOString(),
        status: order.status,
        totalAmount: order.totalAmount,
        currency: order.currency,
        items: order.items.map(item => ({
          externalId: item.id,
          productCode: item.productCode,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          unit: item.unit
        })),
        deliveryAddress: order.deliveryAddress,
        notes: order.notes,
        metadata: order.metadata
      })

      if (result.success) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            erpSyncStatus: 'synced',
            erpOrderId: result.data?.externalId
          }
        })
      } else {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            erpSyncStatus: 'failed'
          }
        })
      }
    } catch (error) {
      console.error('Failed to sync order to ERP:', error)
      await prisma.order.update({
        where: { id: orderId },
        data: {
          erpSyncStatus: 'failed'
        }
      })
    }
  }

  /**
   * 格式化訂單數據
   */
  private static formatOrder(order: any): Order {
    return {
      id: order.id,
      organizationId: order.organizationId,
      orderNumber: order.orderNumber,
      supplierCode: order.supplierCode,
      status: order.status,
      orderDate: order.orderDate,
      deliveryDate: order.deliveryDate,
      deliveryAddress: order.deliveryAddress,
      items: order.items.map((item: any) => ({
        id: item.id,
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        unit: item.unit,
        specifications: item.specifications
      })),
      totalAmount: order.totalAmount,
      currency: order.currency,
      notes: order.notes,
      metadata: order.metadata,
      erpSyncStatus: order.erpSyncStatus,
      erpOrderId: order.erpOrderId,
      reconciliationStatus: order.reconciliationStatus,
      reconciliationId: order.reconciliationId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }
  }
}

export default OrderService