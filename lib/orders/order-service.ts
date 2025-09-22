/**
 * 訂單服務模組
 * 提供訂單相關的核心功能
 */

export interface Order {
  id: string
  restaurantId: string
  supplierId: string
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
  items: OrderItem[]
  totalAmount: number
  currency: string
  deliveryDate?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  unit: string
}

export interface CreateOrderRequest {
  restaurantId: string
  supplierId: string
  items: Omit<OrderItem, 'id' | 'totalPrice'>[]
  deliveryDate?: Date
  notes?: string
}

export interface UpdateOrderRequest {
  status?: Order['status']
  items?: Omit<OrderItem, 'id' | 'totalPrice'>[]
  deliveryDate?: Date
  notes?: string
}

export class OrderService {
  /**
   * 創建新訂單
   */
  static async createOrder(data: CreateOrderRequest): Promise<Order> {
    const orderId = `order_${Date.now()}`
    
    // 計算商品總價
    const items: OrderItem[] = data.items.map((item, index) => ({
      id: `item_${index + 1}`,
      ...item,
      totalPrice: item.quantity * item.unitPrice
    }))
    
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0)
    
    const order: Order = {
      id: orderId,
      restaurantId: data.restaurantId,
      supplierId: data.supplierId,
      status: 'pending',
      items,
      totalAmount,
      currency: 'TWD',
      deliveryDate: data.deliveryDate,
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    console.log('Mock OrderService: Created order', order)
    return order
  }
  
  /**
   * 獲取訂單詳情
   */
  static async getOrder(orderId: string): Promise<Order | null> {
    console.log('Mock OrderService: Getting order', orderId)
    
    // 模擬返回訂單
    return {
      id: orderId,
      restaurantId: 'restaurant_1',
      supplierId: 'supplier_1',
      status: 'confirmed',
      items: [
        {
          id: 'item_1',
          productId: 'product_1',
          productName: '新鮮蔬菜',
          quantity: 10,
          unitPrice: 50,
          totalPrice: 500,
          unit: 'kg'
        }
      ],
      totalAmount: 500,
      currency: 'TWD',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
  
  /**
   * 更新訂單
   */
  static async updateOrder(orderId: string, data: UpdateOrderRequest): Promise<Order> {
    console.log('Mock OrderService: Updating order', orderId, data)
    
    const existingOrder = await this.getOrder(orderId)
    if (!existingOrder) {
      throw new Error(`Order ${orderId} not found`)
    }
    
    // 更新邏輯
    const updatedOrder = {
      ...existingOrder,
      ...data,
      updatedAt: new Date()
    }
    
    // 如果更新了商品，重新計算總價
    if (data.items) {
      const items: OrderItem[] = data.items.map((item, index) => ({
        id: `item_${index + 1}`,
        ...item,
        totalPrice: item.quantity * item.unitPrice
      }))
      
      updatedOrder.items = items as OrderItem[]
      updatedOrder.totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0)
    }
    
    return updatedOrder as Order
  }
  
  /**
   * 確認訂單
   */
  static async confirmOrder(orderId: string): Promise<Order> {
    return this.updateOrder(orderId, { status: 'confirmed' })
  }
  
  /**
   * 發貨
   */
  static async shipOrder(orderId: string): Promise<Order> {
    return this.updateOrder(orderId, { status: 'shipped' })
  }
  
  /**
   * 配送
   */
  static async deliverOrder(orderId: string): Promise<Order> {
    return this.updateOrder(orderId, { status: 'delivered' })
  }
  
  /**
   * 完成訂單
   */
  static async completeOrder(orderId: string): Promise<Order> {
    return this.updateOrder(orderId, { status: 'completed' })
  }
  
  /**
   * 取消訂單
   */
  static async cancelOrder(orderId: string): Promise<Order> {
    return this.updateOrder(orderId, { status: 'cancelled' })
  }
  
  /**
   * 獲取訂單列表
   */
  static async getOrders(filters: {
    restaurantId?: string
    supplierId?: string
    status?: Order['status']
    limit?: number
    offset?: number
  } = {}): Promise<Order[]> {
    console.log('Mock OrderService: Getting orders with filters', filters)
    
    // 模擬返回訂單列表
    return [
      {
        id: 'order_1',
        restaurantId: 'restaurant_1',
        supplierId: 'supplier_1',
        status: 'confirmed',
        items: [],
        totalAmount: 1000,
        currency: 'TWD',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  }
}