import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../middleware/logger';

export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      service: 'product-service',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed', { error: error instanceof Error ? error.message : error });
    res.status(503).json({
      status: 'unhealthy',
      service: 'product-service',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
};

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      include: {
        supplier: {
          select: { name: true, id: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    logger.error('Failed to fetch products', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
    });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        supplier: {
          select: { name: true, id: true }
        }
      },
    });

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found',
      });
      return;
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    logger.error('Failed to fetch product', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product',
    });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { supplierId, code, name, category, pricing, specifications } = req.body;
    
    // Validate required fields
    if (!supplierId || !code || !name) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: supplierId, code, and name',
      }) as any;
      return;
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        supplierId,
        code,
        name,
        category: category || 'General',
        pricing: pricing || { basePrice: 0, unit: 'piece', currency: 'TWD' },
        specifications: specifications || {},
      },
      include: {
        supplier: {
          select: { name: true, id: true }
        }
      }
    });

    logger.info('Product created successfully', { 
      productId: product.id, 
      productCode: product.code,
      productName: product.name 
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    logger.error('Failed to create product', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to create product',
    });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, category, pricing, specifications } = req.body;
    
    const product = await prisma.product.update({
      where: { id },
      data: { 
        ...(name && { name }),
        ...(category && { category }),
        ...(pricing && { pricing }),
        ...(specifications && { specifications }),
        updatedAt: new Date(),
      },
      include: {
        supplier: {
          select: { name: true, id: true }
        }
      }
    });

    logger.info('Product updated', { 
      productId: product.id, 
      productCode: product.code 
    });

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    logger.error('Failed to update product', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to update product',
    });
  }
};