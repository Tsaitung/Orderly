import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../middleware/logger';

export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      service: 'order-service',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed', { error: error instanceof Error ? error.message : error });
    res.status(503).json({
      status: 'unhealthy',
      service: 'order-service',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
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

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    logger.error('Failed to fetch orders', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
    });
  }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
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
      res.status(404).json({
        success: false,
        error: 'Order not found',
      });
      return;
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error('Failed to fetch order', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order',
    });
  }
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { restaurantId, supplierId, items, deliveryDate, deliveryAddress, notes } = req.body;
    
    // Validate required fields
    if (!restaurantId || !supplierId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: restaurantId, supplierId, and items',
      }) as any;
      return;
    }

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
        createdBy: 'system',
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

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error('Failed to create order', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to create order',
    });
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      res.status(400).json({
        success: false,
        error: 'Status is required',
      }) as any;
      return;
    }

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

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error('Failed to update order status', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to update order status',
    });
  }
};