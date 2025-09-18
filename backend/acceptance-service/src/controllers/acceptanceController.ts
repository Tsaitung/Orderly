import { Request, Response } from 'express';
import { logger } from '../middleware/logger';
import { v4 as uuidv4 } from 'uuid';

// Mock data store - in production, this would be a database
let acceptanceRecords: any[] = [
  {
    id: '1',
    orderId: 'order_123',
    orderNumber: 'ORD-2024-001',
    acceptedBy: '張小明',
    acceptanceTime: '2024-01-16T14:25:00Z',
    acceptanceLocation: '台北店後門',
    items: [
      {
        id: '1-1',
        itemCode: 'VEG001',
        itemName: '有機高麗菜',
        orderedQuantity: 10,
        receivedQuantity: 10,
        unit: '公斤',
        qualityRating: 5,
        condition: 'excellent',
        expiryDate: '2024-01-20',
        notes: '品質優良，新鮮度佳',
        photos: ['photo1.jpg', 'photo2.jpg']
      }
    ],
    overallRating: 4,
    notes: '整體驗收滿意',
    discrepancies: [],
    status: 'completed',
    deliveryTime: '2024-01-16T14:20:00Z',
    requestedDeliveryTime: '2024-01-16T14:00:00Z',
    restaurantId: 'restaurant_1',
    supplierId: 'supplier_1',
    createdAt: '2024-01-16T14:25:00Z',
    updatedAt: '2024-01-16T14:25:00Z'
  }
];

export const getAcceptanceRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, status, restaurantId } = req.query;
    
    let filteredRecords = acceptanceRecords;
    
    if (orderId) {
      filteredRecords = filteredRecords.filter(record => record.orderId === orderId);
    }
    
    if (status) {
      filteredRecords = filteredRecords.filter(record => record.status === status);
    }
    
    if (restaurantId) {
      filteredRecords = filteredRecords.filter(record => record.restaurantId === restaurantId);
    }
    
    logger.info(`Retrieved ${filteredRecords.length} acceptance records`);
    
    res.json({
      success: true,
      data: filteredRecords,
      total: filteredRecords.length,
      message: 'Acceptance records retrieved successfully'
    });
  } catch (error) {
    logger.error('Error retrieving acceptance records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve acceptance records'
    });
  }
};

export const getAcceptanceRecordById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const record = acceptanceRecords.find(r => r.id === id);
    
    if (!record) {
      res.status(404).json({
        success: false,
        error: 'Acceptance record not found'
      });
      return;
    }
    
    logger.info(`Retrieved acceptance record: ${id}`);
    
    res.json({
      success: true,
      data: record,
      message: 'Acceptance record retrieved successfully'
    });
  } catch (error) {
    logger.error('Error retrieving acceptance record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve acceptance record'
    });
  }
};

export const createAcceptanceRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const acceptanceData = req.body;
    
    const newRecord = {
      id: uuidv4(),
      ...acceptanceData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    acceptanceRecords.push(newRecord);
    
    logger.info(`Created new acceptance record: ${newRecord.id}`);
    
    res.status(201).json({
      success: true,
      data: newRecord,
      message: 'Acceptance record created successfully'
    });
  } catch (error) {
    logger.error('Error creating acceptance record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create acceptance record'
    });
  }
};

export const updateAcceptanceRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const recordIndex = acceptanceRecords.findIndex(r => r.id === id);
    
    if (recordIndex === -1) {
      res.status(404).json({
        success: false,
        error: 'Acceptance record not found'
      });
      return;
    }
    
    acceptanceRecords[recordIndex] = {
      ...acceptanceRecords[recordIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    logger.info(`Updated acceptance record: ${id}`);
    
    res.json({
      success: true,
      data: acceptanceRecords[recordIndex],
      message: 'Acceptance record updated successfully'
    });
  } catch (error) {
    logger.error('Error updating acceptance record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update acceptance record'
    });
  }
};

export const completeAcceptance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const recordIndex = acceptanceRecords.findIndex(r => r.id === id);
    
    if (recordIndex === -1) {
      res.status(404).json({
        success: false,
        error: 'Acceptance record not found'
      });
      return;
    }
    
    acceptanceRecords[recordIndex] = {
      ...acceptanceRecords[recordIndex],
      status: 'completed',
      acceptanceTime: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    logger.info(`Completed acceptance: ${id}`);
    
    res.json({
      success: true,
      data: acceptanceRecords[recordIndex],
      message: 'Acceptance completed successfully'
    });
  } catch (error) {
    logger.error('Error completing acceptance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete acceptance'
    });
  }
};

export const uploadPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { acceptanceId } = req.body;
    const file = req.file;
    
    if (!file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
      return;
    }
    
    // In production, save file to cloud storage (AWS S3, Google Cloud Storage, etc.)
    const photoUrl = `/uploads/${file.filename}`;
    
    const photoRecord = {
      id: uuidv4(),
      url: photoUrl,
      type: req.body.type || 'overview',
      itemCode: req.body.itemCode,
      caption: req.body.caption,
      timestamp: new Date().toISOString(),
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype
    };
    
    logger.info(`Uploaded photo: ${photoRecord.id} for acceptance: ${acceptanceId}`);
    
    res.json({
      success: true,
      data: photoRecord,
      message: 'Photo uploaded successfully'
    });
  } catch (error) {
    logger.error('Error uploading photo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload photo'
    });
  }
};

export const getAcceptanceByOrderId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    
    const record = acceptanceRecords.find(r => r.orderId === orderId);
    
    if (!record) {
      res.status(404).json({
        success: false,
        error: 'Acceptance record not found for this order'
      });
      return;
    }
    
    logger.info(`Retrieved acceptance record for order: ${orderId}`);
    
    res.json({
      success: true,
      data: record,
      message: 'Acceptance record retrieved successfully'
    });
  } catch (error) {
    logger.error('Error retrieving acceptance record by order ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve acceptance record'
    });
  }
};