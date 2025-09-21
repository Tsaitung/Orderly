// ============================================================================
// useCustomerStatistics Hook Tests
// ============================================================================

import { renderHook, act, waitFor } from '@testing-library/react';
import { useCustomerStatistics } from '../useCustomerStatistics';
import { useCustomerHierarchyStore } from '@/lib/stores/customerHierarchyStore';

// Mock the Zustand store
jest.mock('@/lib/stores/customerHierarchyStore', () => ({
  useCustomerHierarchyStore: jest.fn(),
  useStatistics: jest.fn(),
  useStatisticsLoading: jest.fn(),
  useStatisticsError: jest.fn(),
}));

// Mock the API
jest.mock('@/lib/api/customer-hierarchy', () => ({
  customerHierarchyApi: {
    analytics: {
      getOverviewStats: jest.fn(),
      getGrowthMetrics: jest.fn(),
      getEntityDistribution: jest.fn(),
      getTopPerformers: jest.fn(),
      getRecentActivity: jest.fn(),
    },
  },
}));

const mockStoreActions = {
  loadStatistics: jest.fn(),
  refreshStatistics: jest.fn(),
  setStatisticsDateRange: jest.fn(),
  setStatisticsFilters: jest.fn(),
};

const mockStatistics = {
  overview: {
    totalEntities: 150,
    activeEntities: 142,
    inactiveEntities: 8,
    totalGroups: 5,
    totalCompanies: 25,
    totalLocations: 67,
    totalBusinessUnits: 53,
    growthRate: 12.5,
    lastUpdated: new Date('2023-12-01'),
  },
  growth: {
    entityGrowth: [
      { date: new Date('2023-11-01'), count: 145, type: 'total' },
      { date: new Date('2023-12-01'), count: 150, type: 'total' },
    ],
    typeGrowth: {
      group: [
        { date: new Date('2023-11-01'), count: 5, change: 0 },
        { date: new Date('2023-12-01'), count: 5, change: 0 },
      ],
      company: [
        { date: new Date('2023-11-01'), count: 24, change: 1 },
        { date: new Date('2023-12-01'), count: 25, change: 1 },
      ],
      location: [
        { date: new Date('2023-11-01'), count: 65, change: 2 },
        { date: new Date('2023-12-01'), count: 67, change: 2 },
      ],
      business_unit: [
        { date: new Date('2023-11-01'), count: 51, change: 2 },
        { date: new Date('2023-12-01'), count: 53, change: 2 },
      ],
    },
  },
  distribution: {
    byType: {
      group: 5,
      company: 25,
      location: 67,
      business_unit: 53,
    },
    byStatus: {
      active: 142,
      inactive: 8,
    },
    byRegion: {
      '台北': 45,
      '台中': 32,
      '高雄': 28,
      '其他': 45,
    },
  },
  topPerformers: [
    {
      id: 'group-1',
      name: '頂級集團',
      type: 'group' as const,
      metric: 'revenue',
      value: 1250000,
      rank: 1,
    },
    {
      id: 'company-1',
      name: '優秀公司',
      type: 'company' as const,
      metric: 'orders',
      value: 850,
      rank: 2,
    },
  ],
  recentActivity: [
    {
      id: 'activity-1',
      entityId: 'company-1',
      entityName: '新創公司',
      action: 'created',
      timestamp: new Date('2023-12-01T10:30:00Z'),
      details: { type: 'company', parentId: 'group-1' },
    },
    {
      id: 'activity-2',
      entityId: 'location-1',
      entityName: '台北分店',
      action: 'updated',
      timestamp: new Date('2023-12-01T11:45:00Z'),
      details: { field: 'address', oldValue: '舊地址', newValue: '新地址' },
    },
  ],
};

describe('useCustomerStatistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (useCustomerHierarchyStore as jest.Mock).mockReturnValue(mockStoreActions);
    
    const { useStatistics, useStatisticsLoading, useStatisticsError } = 
      require('@/lib/stores/customerHierarchyStore');
    
    useStatistics.mockReturnValue(mockStatistics);
    useStatisticsLoading.mockReturnValue(false);
    useStatisticsError.mockReturnValue(null);
  });

  describe('initialization', () => {
    it('should initialize with default statistics', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      expect(result.current.statistics).toEqual(mockStatistics);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should auto-load statistics when autoLoad is true', () => {
      renderHook(() => useCustomerStatistics({ autoLoad: true }));

      expect(mockStoreActions.loadStatistics).toHaveBeenCalled();
    });

    it('should not auto-load statistics when autoLoad is false', () => {
      renderHook(() => useCustomerStatistics({ autoLoad: false }));

      expect(mockStoreActions.loadStatistics).not.toHaveBeenCalled();
    });

    it('should set initial date range', () => {
      const dateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
      };

      renderHook(() => useCustomerStatistics({ dateRange }));

      expect(mockStoreActions.setStatisticsDateRange).toHaveBeenCalledWith(dateRange);
    });
  });

  describe('statistics access', () => {
    it('should provide overview statistics', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      expect(result.current.overview).toEqual(mockStatistics.overview);
      expect(result.current.totalEntities).toBe(150);
      expect(result.current.activeEntities).toBe(142);
      expect(result.current.growthRate).toBe(12.5);
    });

    it('should provide growth statistics', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      expect(result.current.growth).toEqual(mockStatistics.growth);
      expect(result.current.entityGrowth).toEqual(mockStatistics.growth.entityGrowth);
      expect(result.current.typeGrowth).toEqual(mockStatistics.growth.typeGrowth);
    });

    it('should provide distribution statistics', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      expect(result.current.distribution).toEqual(mockStatistics.distribution);
      expect(result.current.typeDistribution).toEqual(mockStatistics.distribution.byType);
      expect(result.current.statusDistribution).toEqual(mockStatistics.distribution.byStatus);
    });

    it('should provide top performers', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      expect(result.current.topPerformers).toEqual(mockStatistics.topPerformers);
    });

    it('should provide recent activity', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      expect(result.current.recentActivity).toEqual(mockStatistics.recentActivity);
    });
  });

  describe('statistics operations', () => {
    it('should load statistics', async () => {
      const { result } = renderHook(() => useCustomerStatistics());

      await act(async () => {
        await result.current.loadStatistics();
      });

      expect(mockStoreActions.loadStatistics).toHaveBeenCalled();
    });

    it('should refresh statistics', async () => {
      const { result } = renderHook(() => useCustomerStatistics());

      await act(async () => {
        await result.current.refreshStatistics();
      });

      expect(mockStoreActions.refreshStatistics).toHaveBeenCalled();
    });

    it('should set date range', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      const dateRange = {
        startDate: new Date('2023-06-01'),
        endDate: new Date('2023-06-30'),
      };

      act(() => {
        result.current.setDateRange(dateRange);
      });

      expect(mockStoreActions.setStatisticsDateRange).toHaveBeenCalledWith(dateRange);
    });

    it('should set filters', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      const filters = {
        types: ['group', 'company'] as const,
        includeInactive: false,
        regions: ['台北', '台中'],
      };

      act(() => {
        result.current.setFilters(filters);
      });

      expect(mockStoreActions.setStatisticsFilters).toHaveBeenCalledWith(filters);
    });
  });

  describe('calculated metrics', () => {
    it('should calculate growth percentage', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      const growthPercentage = result.current.getGrowthPercentage('total');
      
      // Based on mock data: from 145 to 150 = (150-145)/145 * 100 ≈ 3.45%
      expect(growthPercentage).toBeCloseTo(3.45, 2);
    });

    it('should calculate type growth percentage', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      const companyGrowth = result.current.getTypeGrowthPercentage('company');
      
      // Based on mock data: from 24 to 25 = (25-24)/24 * 100 ≈ 4.17%
      expect(companyGrowth).toBeCloseTo(4.17, 2);
    });

    it('should return 0 for growth with no previous data', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      const groupGrowth = result.current.getTypeGrowthPercentage('group');
      
      // Based on mock data: from 5 to 5 = 0% growth
      expect(groupGrowth).toBe(0);
    });

    it('should calculate total entities across types', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      const totalByType = result.current.getTotalByType();
      
      expect(totalByType).toBe(150); // 5 + 25 + 67 + 53
    });

    it('should calculate active percentage', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      const activePercentage = result.current.getActivePercentage();
      
      // 142 active out of 150 total = 94.67%
      expect(activePercentage).toBeCloseTo(94.67, 2);
    });
  });

  describe('quick date range functions', () => {
    it('should set last 7 days range', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      act(() => {
        result.current.setLastDays(7);
      });

      const expectedStart = new Date();
      expectedStart.setDate(expectedStart.getDate() - 7);
      expectedStart.setHours(0, 0, 0, 0);

      const expectedEnd = new Date();
      expectedEnd.setHours(23, 59, 59, 999);

      expect(mockStoreActions.setStatisticsDateRange).toHaveBeenCalledWith({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
    });

    it('should set last month range', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      act(() => {
        result.current.setLastMonth();
      });

      expect(mockStoreActions.setStatisticsDateRange).toHaveBeenCalledWith({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
    });

    it('should set current year range', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      act(() => {
        result.current.setCurrentYear();
      });

      const currentYear = new Date().getFullYear();
      const expectedStart = new Date(currentYear, 0, 1);
      const expectedEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

      expect(mockStoreActions.setStatisticsDateRange).toHaveBeenCalledWith({
        startDate: expectedStart,
        endDate: expectedEnd,
      });
    });
  });

  describe('data filtering and sorting', () => {
    it('should get top performers by metric', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      const topByRevenue = result.current.getTopPerformersByMetric('revenue', 1);
      
      expect(topByRevenue).toHaveLength(1);
      expect(topByRevenue[0].metric).toBe('revenue');
      expect(topByRevenue[0].value).toBe(1250000);
    });

    it('should get recent activity by type', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      const createActivities = result.current.getRecentActivityByAction('created');
      
      expect(createActivities).toHaveLength(1);
      expect(createActivities[0].action).toBe('created');
      expect(createActivities[0].entityName).toBe('新創公司');
    });

    it('should get activity within date range', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      const startDate = new Date('2023-12-01T10:00:00Z');
      const endDate = new Date('2023-12-01T11:00:00Z');
      
      const activitiesInRange = result.current.getActivityInDateRange(startDate, endDate);
      
      expect(activitiesInRange).toHaveLength(1);
      expect(activitiesInRange[0].id).toBe('activity-1');
    });
  });

  describe('loading and error states', () => {
    it('should reflect loading state from store', () => {
      const { useStatisticsLoading } = require('@/lib/stores/customerHierarchyStore');
      useStatisticsLoading.mockReturnValue(true);

      const { result } = renderHook(() => useCustomerStatistics());

      expect(result.current.isLoading).toBe(true);
    });

    it('should reflect error state from store', () => {
      const { useStatisticsError } = require('@/lib/stores/customerHierarchyStore');
      useStatisticsError.mockReturnValue('Failed to load statistics');

      const { result } = renderHook(() => useCustomerStatistics());

      expect(result.current.error).toBe('Failed to load statistics');
    });
  });

  describe('export functionality', () => {
    it('should export statistics data', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      const exportData = result.current.exportStatistics();
      
      expect(exportData).toEqual({
        exportedAt: expect.any(Date),
        overview: mockStatistics.overview,
        growth: mockStatistics.growth,
        distribution: mockStatistics.distribution,
        topPerformers: mockStatistics.topPerformers,
        recentActivity: mockStatistics.recentActivity,
      });
    });

    it('should format statistics for CSV export', () => {
      const { result } = renderHook(() => useCustomerStatistics());

      const csvData = result.current.formatForCSV();
      
      expect(csvData).toEqual({
        overview: expect.any(Array),
        distribution: expect.any(Array),
        topPerformers: expect.any(Array),
        recentActivity: expect.any(Array),
      });
    });
  });
});