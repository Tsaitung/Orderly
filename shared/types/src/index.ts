// 導出所有共享類型定義
export * from './logging';

// 用戶相關類型
export interface User {
  id: string;
  email: string;
  role: 'RESTAURANT' | 'SUPPLIER' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
}

// API 響應標準格式
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

// 分頁相關類型
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// 健康檢查類型
export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    external_services?: HealthCheckResult[];
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  response_time?: number;
  error?: string;
}