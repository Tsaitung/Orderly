import { prisma } from '../lib/prisma';
import { logger } from '../middleware/logger';

export const healthCheck = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { database: 'connected' };
  } catch (error) {
    logger.error('Database health check failed', { error });
    throw error;
  }
};

export const getOrders = async () => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
        restaurant: {
          select: { name: true, id: true }
        },
        supplier: {
          select: { name: true, id: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return orders;
  } catch (error) {
    logger.error('Failed to fetch orders', { error });
    throw error;
  }
};

export const getOrderById = async (id: string) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        restaurant: {
          select: { name: true, id: true }
        },
        supplier: {
          select: { name: true, id: true }
        }
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  } catch (error) {
    logger.error('Failed to fetch order', { error, id });
    throw error;
  }
};

export const createOrder = async (orderData: any) => {
  try {
    const { restaurantId, supplierId, items, deliveryDate, deliveryAddress, notes, createdBy } = orderData;
    
    // Generate order number
    const orderNumber = `ORD-${Date.now()}`;
    
    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => 
      sum + (parseFloat(item.unitPrice) * parseFloat(item.quantity)), 0
    );
    const taxAmount = subtotal * 0.1; // 10% tax
    const totalAmount = subtotal + taxAmount;

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        restaurantId,
        supplierId,
        subtotal,
        taxAmount,
        totalAmount,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
        deliveryAddress: deliveryAddress || {},
        notes,
        createdBy: createdBy || 'system',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productCode: item.productCode || 'UNKNOWN',
            productName: item.productName,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            lineTotal: parseFloat(item.quantity) * parseFloat(item.unitPrice),
            notes: item.notes,
          }))
        }
      },
      include: {
        items: true,
        restaurant: {
          select: { name: true, id: true }
        },
        supplier: {
          select: { name: true, id: true }
        }
      }
    });

    logger.info('Order created successfully', { 
      orderId: order.id, 
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount 
    });

    return order;
  } catch (error) {
    logger.error('Failed to create order', { error, orderData });
    throw error;
  }
};

export const updateOrderStatus = async (id: string, status: string) => {
  try {
    const order = await prisma.order.update({
      where: { id },
      data: { 
        status: status as any,
        updatedAt: new Date(),
      },
      include: {
        items: true,
        restaurant: {
          select: { name: true, id: true }
        },
        supplier: {
          select: { name: true, id: true }
        }
      }
    });

    logger.info('Order status updated', { 
      orderId: order.id, 
      orderNumber: order.orderNumber,
      status: order.status 
    });

    return order;
  } catch (error) {
    logger.error('Failed to update order status', { error, id, status });
    throw error;
  }
};