import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../middleware/logger';

export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      service: 'notification-service',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed', { error: error instanceof Error ? error.message : error });
    res.status(503).json({
      status: 'unhealthy',
      service: 'notification-service',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
};

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, read, type, priority } = req.query;
    
    const where: any = {};
    if (userId) where.userId = userId as string;
    if (read !== undefined) where.read = read === 'true';
    if (type) where.type = type as string;
    if (priority) where.priority = priority as string;

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
    });
  } catch (error) {
    logger.error('Failed to fetch notifications', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
    });
  }
};

export const getNotificationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const notification = await prisma.notification.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, role: true }
        }
      },
    });

    if (!notification) {
      res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
      return;
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error('Failed to fetch notification', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification',
    });
  }
};

export const createNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      userId,
      type,
      title,
      message,
      data,
      priority 
    } = req.body;
    
    // Validate required fields
    if (!userId || !type || !title || !message) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, type, title, message',
      });
      return;
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data || {},
        priority: priority || 'medium',
      },
      include: {
        user: {
          select: { id: true, email: true, role: true }
        }
      }
    });

    logger.info('Notification created successfully', { 
      notificationId: notification.id, 
      userId: notification.userId,
      type: notification.type,
    });

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error('Failed to create notification', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
    });
  }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const notification = await prisma.notification.update({
      where: { id },
      data: { 
        read: true,
        readAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, email: true, role: true }
        }
      }
    });

    logger.info('Notification marked as read', { 
      notificationId: notification.id, 
      userId: notification.userId,
    });

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error('Failed to mark notification as read', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
    });
  }
};

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'UserId is required',
      });
      return;
    }

    const result = await prisma.notification.updateMany({
      where: { 
        userId,
        read: false,
      },
      data: { 
        read: true,
        readAt: new Date(),
      },
    });

    logger.info('All notifications marked as read', { 
      userId, 
      count: result.count,
    });

    res.json({
      success: true,
      message: `${result.count} notifications marked as read`,
      count: result.count,
    });
  } catch (error) {
    logger.error('Failed to mark all notifications as read', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
    });
  }
};