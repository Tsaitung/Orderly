export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: Record<string, any>;
  notes?: string;
}

export interface DeliveryAddress {
  id?: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isDefault?: boolean;
}

export interface OrderTimeline {
  status: OrderStatus;
  timestamp: Date;
  notes?: string;
  updatedBy: string;
  metadata?: Record<string, any>;
}

export enum OrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  READY_FOR_PICKUP = 'ready_for_pickup',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum OrderType {
  REGULAR = 'regular',
  URGENT = 'urgent',
  SCHEDULED = 'scheduled',
  RECURRING = 'recurring',
}

export interface Order {
  id: string;
  orderNumber: string;
  restaurantId: string;
  supplierId: string;
  
  // Order details
  type: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  
  // Pricing
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  
  // Delivery information
  deliveryAddress: DeliveryAddress;
  requestedDeliveryDate?: Date;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  deliveryInstructions?: string;
  
  // Timeline and tracking
  timeline: OrderTimeline[];
  
  // Metadata
  notes?: string;
  tags?: string[];
  priority: number; // 1-5, 5 being highest
  source: string; // 'web', 'mobile', 'api', 'phone'
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  
  // Additional fields
  externalOrderId?: string; // For integration with external systems
  parentOrderId?: string; // For split orders
  childOrderIds?: string[]; // For split orders
  correlationId?: string;
}

export interface CreateOrderRequest {
  restaurantId: string;
  supplierId: string;
  type?: OrderType;
  items: Omit<OrderItem, 'id' | 'totalPrice'>[];
  deliveryAddress: Omit<DeliveryAddress, 'id'>;
  requestedDeliveryDate?: string;
  deliveryInstructions?: string;
  notes?: string;
  tags?: string[];
  priority?: number;
  source?: string;
}

export interface UpdateOrderRequest {
  status?: OrderStatus;
  items?: Omit<OrderItem, 'id' | 'totalPrice'>[];
  deliveryAddress?: Omit<DeliveryAddress, 'id'>;
  requestedDeliveryDate?: string;
  deliveryInstructions?: string;
  notes?: string;
  tags?: string[];
  priority?: number;
}

export interface OrderFilters {
  restaurantId?: string;
  supplierId?: string;
  status?: OrderStatus[];
  type?: OrderType[];
  paymentStatus?: PaymentStatus[];
  startDate?: string;
  endDate?: string;
  priority?: number[];
  source?: string[];
  tags?: string[];
  search?: string; // Search in order number, notes, or customer info
}

export interface OrderSummary {
  totalOrders: number;
  totalAmount: number;
  averageOrderValue: number;
  statusBreakdown: Record<OrderStatus, number>;
  typeBreakdown: Record<OrderType, number>;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    totalValue: number;
  }>;
}