import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../middleware/logger';

export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      service: 'billing-service',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed', { error: error instanceof Error ? error.message : error });
    res.status(503).json({
      status: 'unhealthy',
      service: 'billing-service',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
};

export const getReconciliations = async (req: Request, res: Response): Promise<void> => {
  try {
    const reconciliations = await prisma.reconciliation.findMany({
      include: {
        restaurant: {
          select: { name: true, id: true }
        },
        supplier: {
          select: { name: true, id: true }
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: reconciliations,
      count: reconciliations.length,
    });
  } catch (error) {
    logger.error('Failed to fetch reconciliations', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reconciliations',
    });
  }
};

export const getReconciliationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const reconciliation = await prisma.reconciliation.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: { name: true, id: true }
        },
        supplier: {
          select: { name: true, id: true }
        },
        items: true,
      },
    });

    if (!reconciliation) {
      res.status(404).json({
        success: false,
        error: 'Reconciliation not found',
      });
      return;
    }

    res.json({
      success: true,
      data: reconciliation,
    });
  } catch (error) {
    logger.error('Failed to fetch reconciliation', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reconciliation',
    });
  }
};

export const createReconciliation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      reconciliationNumber,
      periodStart,
      periodEnd,
      restaurantId,
      supplierId,
      summary,
      confidenceScore,
      autoApproved,
      createdBy 
    } = req.body;
    
    // Validate required fields
    if (!reconciliationNumber || !periodStart || !periodEnd || !restaurantId || !supplierId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: reconciliationNumber, periodStart, periodEnd, restaurantId, supplierId',
      }) as any;
      return;
    }

    // Create reconciliation
    const reconciliation = await prisma.reconciliation.create({
      data: {
        reconciliationNumber,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        restaurantId,
        supplierId,
        summary: summary || {},
        confidenceScore: confidenceScore || 0,
        autoApproved: autoApproved || false,
        createdBy: createdBy || 'system',
      },
      include: {
        restaurant: {
          select: { name: true, id: true }
        },
        supplier: {
          select: { name: true, id: true }
        },
      }
    });

    logger.info('Reconciliation created successfully', { 
      reconciliationId: reconciliation.id, 
      reconciliationNumber: reconciliation.reconciliationNumber,
    });

    res.status(201).json({
      success: true,
      data: reconciliation,
    });
  } catch (error) {
    logger.error('Failed to create reconciliation', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to create reconciliation',
    });
  }
};

export const updateReconciliationStatus = async (req: Request, res: Response): Promise<void> => {
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

    const reconciliation = await prisma.reconciliation.update({
      where: { id },
      data: { 
        status: status as any,
        updatedAt: new Date(),
      },
      include: {
        restaurant: {
          select: { name: true, id: true }
        },
        supplier: {
          select: { name: true, id: true }
        },
      }
    });

    logger.info('Reconciliation status updated', { 
      reconciliationId: reconciliation.id, 
      reconciliationNumber: reconciliation.reconciliationNumber,
      status: reconciliation.status 
    });

    res.json({
      success: true,
      data: reconciliation,
    });
  } catch (error) {
    logger.error('Failed to update reconciliation status', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to update reconciliation status',
    });
  }
};