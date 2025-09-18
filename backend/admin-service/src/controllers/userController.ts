import { Request, Response } from 'express';
import logger from '../middleware/logger';

// Mock user data - in production this would come from database
const mockUsers = [
  {
    id: '1',
    name: '大樂司餐廳',
    email: 'admin@dales.com.tw',
    phone: '02-2345-6789',
    type: 'restaurant',
    status: 'active',
    lastLogin: '2025-09-18T08:30:00Z',
    joinedAt: '2024-12-15T10:00:00Z',
    orders: 245,
    gmv: 1245000
  },
  {
    id: '2',
    name: '新鮮蔬果供應商',
    email: 'contact@freshveg.com.tw',
    phone: '02-1111-2222',
    type: 'supplier',
    status: 'active',
    lastLogin: '2025-09-18T07:45:00Z',
    joinedAt: '2024-11-20T09:15:00Z',
    orders: 189,
    gmv: 890000
  },
  {
    id: '3',
    name: '烤食組合',
    email: 'info@grillcombo.tw',
    phone: '02-3456-7890',
    type: 'restaurant',
    status: 'pending',
    lastLogin: null,
    joinedAt: '2025-09-17T14:20:00Z',
    orders: 0,
    gmv: 0
  },
  {
    id: '4',
    name: '優質肉品供應商',
    email: 'orders@qualitymeat.tw',
    phone: '02-2222-3333',
    type: 'supplier',
    status: 'suspended',
    lastLogin: '2025-09-15T16:30:00Z',
    joinedAt: '2024-10-05T11:30:00Z',
    orders: 156,
    gmv: 650000
  },
  {
    id: '5',
    name: '海鮮直送',
    email: 'fresh@seafood.tw',
    phone: '02-3333-4444',
    type: 'supplier',
    status: 'active',
    lastLogin: '2025-09-18T09:15:00Z',
    joinedAt: '2024-09-12T08:45:00Z',
    orders: 203,
    gmv: 1100000
  },
  {
    id: '6',
    name: '樂多多餐廳',
    email: 'manager@happymeal.tw',
    phone: '02-4567-8901',
    type: 'restaurant',
    status: 'active',
    lastLogin: '2025-09-18T06:20:00Z',
    joinedAt: '2024-08-18T13:10:00Z',
    orders: 312,
    gmv: 1890000
  }
];

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      type = 'all', 
      status = 'all',
      sortBy = 'joinedAt',
      sortOrder = 'desc'
    } = req.query;

    logger.info('Users list requested', { 
      page, limit, search, type, status, sortBy, sortOrder 
    });

    // Filter users based on query parameters
    let filteredUsers = [...mockUsers];

    // Search filter
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    }

    // Type filter
    if (type !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.type === type);
    }

    // Status filter
    if (status !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.status === status);
    }

    // Sort users
    filteredUsers.sort((a, b) => {
      const aValue = a[sortBy as keyof typeof a];
      const bValue = b[sortBy as keyof typeof b];
      
      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortOrder === 'desc' ? 1 : -1;
      if (bValue === null) return sortOrder === 'desc' ? -1 : 1;
      
      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : 1;
      } else {
        return aValue < bValue ? -1 : 1;
      }
    });

    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Generate stats
    const stats = {
      total: filteredUsers.length,
      active: filteredUsers.filter(u => u.status === 'active').length,
      pending: filteredUsers.filter(u => u.status === 'pending').length,
      suspended: filteredUsers.filter(u => u.status === 'suspended').length,
      restaurants: filteredUsers.filter(u => u.type === 'restaurant').length,
      suppliers: filteredUsers.filter(u => u.type === 'supplier').length
    };

    res.json({
      success: true,
      data: {
        users: paginatedUsers,
        stats,
        pagination: {
          current: Number(page),
          total: Math.ceil(filteredUsers.length / Number(limit)),
          hasNext: endIndex < filteredUsers.length,
          hasPrev: Number(page) > 1
        }
      },
      service: 'admin-service'
    });
  } catch (error) {
    logger.error('Error fetching users', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      service: 'admin-service'
    });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    logger.info('User details requested', { userId: id });

    const user = mockUsers.find(u => u.id === id);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        service: 'admin-service'
      });
      return;
    }

    // Add detailed user information
    const detailedUser = {
      ...user,
      profile: {
        address: '台北市信義區信義路五段7號',
        taxId: '12345678',
        contactPerson: '張經理',
        businessHours: '09:00-21:00'
      },
      metrics: {
        totalOrders: user.orders,
        totalGMV: user.gmv,
        avgOrderValue: user.orders > 0 ? Math.round(user.gmv / user.orders) : 0,
        cancelRate: Math.random() * 5,
        rating: 4.2 + Math.random() * 0.8
      },
      recentActivity: [
        { action: '登入系統', timestamp: user.lastLogin },
        { action: '更新商品資訊', timestamp: '2025-09-17T15:30:00Z' },
        { action: '處理訂單', timestamp: '2025-09-17T14:20:00Z' }
      ]
    };

    res.json({
      success: true,
      data: detailedUser,
      service: 'admin-service'
    });
  } catch (error) {
    logger.error('Error fetching user details', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user details',
      service: 'admin-service'
    });
  }
};

export const updateUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    logger.info('User status update requested', { userId: id, status, reason });

    const userIndex = mockUsers.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        service: 'admin-service'
      });
      return;
    }

    // Validate status
    const validStatuses = ['active', 'pending', 'suspended'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status value',
        service: 'admin-service'
      });
      return;
    }

    const user = mockUsers[userIndex];
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        service: 'admin-service'
      });
      return;
    }

    const oldStatus = user.status;
    user.status = status;

    logger.info('User status updated', { 
      userId: id, 
      oldStatus, 
      newStatus: status, 
      reason 
    });

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: {
        userId: id,
        oldStatus,
        newStatus: status,
        reason,
        updatedAt: new Date().toISOString()
      },
      service: 'admin-service'
    });
  } catch (error) {
    logger.error('Error updating user status', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to update user status',
      service: 'admin-service'
    });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    logger.info('User deletion requested', { userId: id, reason });

    const userIndex = mockUsers.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        service: 'admin-service'
      });
      return;
    }

    const deletedUser = mockUsers.splice(userIndex, 1)[0];

    logger.info('User deleted', { 
      userId: id, 
      userName: deletedUser?.name || 'Unknown',
      reason 
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        userId: id,
        userName: deletedUser?.name || 'Unknown',
        reason,
        deletedAt: new Date().toISOString()
      },
      service: 'admin-service'
    });
  } catch (error) {
    logger.error('Error deleting user', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      service: 'admin-service'
    });
  }
};