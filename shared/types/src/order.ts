import { OrderStatus } from './common';

export interface Order {
  id: string;
  orderNumber: string;
  restaurantId: string;
  supplierId: string;
  status: OrderStatus;
  totalAmount: number;
  notes?: string;
  deliveryDate?: Date;
  deliveryAddress?: string;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  product?: {
    name: string;
    sku: string;
    unit: string;
  };
}

export interface OrderMessage {
  id: string;
  orderId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image';
  createdAt: Date;
  sender?: {
    name: string;
    avatar?: string;
  };
}

export interface CreateOrderRequest {
  supplierId: string;
  deliveryDate?: Date;
  deliveryAddress?: string;
  notes?: string;
  items: CreateOrderItemRequest[];
}

export interface CreateOrderItemRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
}

export interface SendOrderMessageRequest {
  content: string;
  type: 'text' | 'image';
}