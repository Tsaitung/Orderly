import React from 'react';

export interface DemandStats {
  hotItems: number;
  trendingItems: number;
  demandGrowth: number;
  forecastAccuracy: number;
  totalOrders?: number;
  completedOrders?: number;
  completionRate?: number;
  periodComparison?: {
    current: number;
    previous: number;
    growth: number;
  };
  itemFrequency?: DemandItem[];
}

export interface DemandItem {
  product: {
    id: string;
    name: string;
    code: string;
  };
  count: number;
  totalQuantity: number;
}

export interface DemandSearchParams {
  startDate?: string;
  endDate?: string;
  restaurantId?: string;
  supplierId?: string;
  search?: string;
  limit?: number;
}

export interface DemandSearchResponse {
  success: boolean;
  data: {
    items: DemandItem[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
    };
  };
}

// 需求品項統計 API 服務
export class DemandService {
  private static baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  /**
   * 獲取需求品項統計資訊
   */
  static async getDemandStats(params: DemandSearchParams = {}): Promise<DemandStats> {
    const url = new URL(`${this.baseUrl}/api/orders/demand-stats`);
    
    // 添加查詢參數
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch demand stats: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch demand stats');
    }

    return result.data;
  }

  /**
   * 搜尋需求品項
   */
  static async searchDemandItems(params: DemandSearchParams = {}): Promise<DemandItem[]> {
    try {
      const stats = await this.getDemandStats(params);
      
      // 從統計數據中獲取品項頻率資料
      const items = stats.itemFrequency || [];
      
      // 如果有搜尋條件，進行過濾
      if (params.search) {
        const searchTerm = params.search.toLowerCase();
        return items.filter(item => 
          item.product.name.toLowerCase().includes(searchTerm) ||
          item.product.code.toLowerCase().includes(searchTerm)
        );
      }
      
      return items.slice(0, params.limit || 20);
      
    } catch (error) {
      throw new Error(`Failed to search demand items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 獲取熱門品項詳情
   */
  static async getHotItems(limit = 10): Promise<DemandItem[]> {
    try {
      const stats = await this.getDemandStats();
      return (stats.itemFrequency || [])
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to fetch hot items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 獲取趨勢品項詳情 (最近7天)
   */
  static async getTrendingItems(limit = 10): Promise<DemandItem[]> {
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const stats = await this.getDemandStats({ startDate, endDate });
      return (stats.itemFrequency || [])
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to fetch trending items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// 實用工具函數
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Hook for React components
export const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// 日期格式化工具
export const formatPeriod = (days: number): { startDate: string; endDate: string } => {
  const endDate = new Date();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
};

// 成長率格式化
export const formatGrowthRate = (growth: number): string => {
  const sign = growth >= 0 ? '+' : '';
  return `${sign}${growth.toFixed(1)}%`;
};

// 準確率格式化
export const formatAccuracy = (accuracy: number): string => {
  return `${accuracy.toFixed(1)}%`;
};