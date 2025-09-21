/**
 * Supplier Management API Service
 * Comprehensive API client for supplier invitation, onboarding, and management
 */

import type {
  InvitationSendRequest,
  InvitationSendResponse,
  InvitationDetailResponse,
  SupplierOnboardingRequest,
  SupplierOnboardingResponse,
  OrganizationResponse,
  SupplierProfileUpdateRequest,
  InvitationListResponse,
  SupplierApiResponse,
  SupplierApiError,
  InvitationFilter,
  PaginationState
} from '@orderly/types';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/bff';
const USER_SERVICE_URL = `${API_BASE_URL}/users`;
const PRODUCT_SERVICE_URL = `${API_BASE_URL}/products`;

// Error handling utility
class SupplierApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string = 'UNKNOWN_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SupplierApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

// Request interceptor for authentication
function defaultHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  };
}

// Generic API request handler
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const config: RequestInit = {
    headers: defaultHeaders(),
    ...options,
    headers: {
      ...defaultHeaders(),
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new SupplierApiError(
        data.detail || data.message || 'API request failed',
        response.status,
        data.error_code || 'API_ERROR',
        data.details
      );
    }

    return data;
  } catch (error) {
    if (error instanceof SupplierApiError) {
      throw error;
    }
    throw new SupplierApiError(
      'Network error occurred',
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Supplier Invitation API
 */
export const supplierInvitationApi = {
  /**
   * Send supplier invitation
   */
  async sendInvitation(request: InvitationSendRequest): Promise<InvitationSendResponse> {
    return apiRequest<InvitationSendResponse>(
      `${USER_SERVICE_URL}/invitations/send`,
      {
        method: 'POST',
        body: JSON.stringify(request)
      }
    );
  },

  /**
   * Verify invitation code
   */
  async verifyInvitation(code: string): Promise<InvitationDetailResponse> {
    return apiRequest<InvitationDetailResponse>(
      `${USER_SERVICE_URL}/invitations/verify/${encodeURIComponent(code)}`
    );
  },

  /**
   * Get sent invitations (for restaurants)
   */
  async getSentInvitations(
    filters: InvitationFilter = {},
    pagination: Partial<PaginationState> = {}
  ): Promise<InvitationListResponse> {
    const params = new URLSearchParams();
    
    if (pagination.page) params.append('page', pagination.page.toString());
    if (pagination.pageSize) params.append('page_size', pagination.pageSize.toString());
    if (filters.status) params.append('status_filter', filters.status);
    
    const queryString = params.toString();
    const url = `${USER_SERVICE_URL}/invitations/sent${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<InvitationListResponse>(url);
  },

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string): Promise<{ message: string }> {
    return apiRequest(
      `${USER_SERVICE_URL}/invitations/${invitationId}`,
      { method: 'DELETE' }
    );
  }
};

/**
 * Supplier Onboarding API
 */
export const supplierOnboardingApi = {
  /**
   * Complete supplier onboarding
   */
  async completeOnboarding(request: SupplierOnboardingRequest): Promise<SupplierOnboardingResponse> {
    return apiRequest<SupplierOnboardingResponse>(
      `${USER_SERVICE_URL}/invitations/accept`,
      {
        method: 'POST',
        body: JSON.stringify(request)
      }
    );
  },

  /**
   * Get supplier profile
   */
  async getProfile(): Promise<OrganizationResponse> {
    return apiRequest<OrganizationResponse>(
      `${USER_SERVICE_URL}/invitations/profile`
    );
  },

  /**
   * Update supplier profile
   */
  async updateProfile(request: SupplierProfileUpdateRequest): Promise<OrganizationResponse> {
    return apiRequest<OrganizationResponse>(
      `${USER_SERVICE_URL}/invitations/profile`,
      {
        method: 'PUT',
        body: JSON.stringify(request)
      }
    );
  }
};

/**
 * Product and SKU Management API
 */
export const supplierProductApi = {
  /**
   * Get product categories
   */
  async getCategories(): Promise<any[]> {
    return apiRequest<any[]>(`${PRODUCT_SERVICE_URL}/v1/categories`);
  },

  /**
   * Get supplier SKUs
   */
  async getSKUs(filters: any = {}, pagination: Partial<PaginationState> = {}): Promise<any> {
    const params = new URLSearchParams();
    
    if (pagination.page) params.append('page', pagination.page.toString());
    if (pagination.pageSize) params.append('page_size', pagination.pageSize.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.packagingType) params.append('packaging_type', filters.packagingType);
    if (filters.qualityGrade) params.append('quality_grade', filters.qualityGrade);
    if (filters.isActive !== undefined) params.append('is_active', filters.isActive.toString());
    
    const queryString = params.toString();
    const url = `${PRODUCT_SERVICE_URL}/v1/skus${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest(url);
  },

  /**
   * Create new SKU
   */
  async createSKU(skuData: any): Promise<any> {
    return apiRequest(
      `${PRODUCT_SERVICE_URL}/v1/skus`,
      {
        method: 'POST',
        body: JSON.stringify(skuData)
      }
    );
  },

  /**
   * Update SKU
   */
  async updateSKU(skuId: string, skuData: any): Promise<any> {
    return apiRequest(
      `${PRODUCT_SERVICE_URL}/v1/skus/${skuId}`,
      {
        method: 'PUT',
        body: JSON.stringify(skuData)
      }
    );
  },

  /**
   * Delete SKU
   */
  async deleteSKU(skuId: string): Promise<{ message: string }> {
    return apiRequest(
      `${PRODUCT_SERVICE_URL}/v1/skus/${skuId}`,
      { method: 'DELETE' }
    );
  },

  /**
   * Bulk SKU operations
   */
  async bulkSKUOperation(operation: string, skuIds: string[]): Promise<any> {
    return apiRequest(
      `${PRODUCT_SERVICE_URL}/v1/skus/bulk`,
      {
        method: 'POST',
        body: JSON.stringify({ operation, sku_ids: skuIds })
      }
    );
  },

  /**
   * Import SKUs from CSV/Excel
   */
  async importSKUs(file: File, options: any = {}): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));

    return apiRequest(
      `${PRODUCT_SERVICE_URL}/v1/skus/import`,
      {
        method: 'POST',
        headers: createAuthHeaders() as any,
        body: formData
      }
    );
  },

  /**
   * Export SKUs to CSV/Excel
   */
  async exportSKUs(filters: any = {}, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams({ ...filters, format });
    const response = await fetch(
      `${PRODUCT_SERVICE_URL}/v1/skus/export?${params.toString()}`,
      {
        headers: createAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new SupplierApiError(
        'Export failed',
        response.status,
        'EXPORT_ERROR'
      );
    }

    return response.blob();
  }
};

/**
 * Pricing Management API
 */
export const supplierPricingApi = {
  /**
   * Get pricing rules for supplier
   */
  async getPricingRules(): Promise<any[]> {
    return apiRequest(`${PRODUCT_SERVICE_URL}/v1/pricing/rules`);
  },

  /**
   * Create pricing rule
   */
  async createPricingRule(ruleData: any): Promise<any> {
    return apiRequest(
      `${PRODUCT_SERVICE_URL}/v1/pricing/rules`,
      {
        method: 'POST',
        body: JSON.stringify(ruleData)
      }
    );
  },

  /**
   * Update pricing rule
   */
  async updatePricingRule(ruleId: string, ruleData: any): Promise<any> {
    return apiRequest(
      `${PRODUCT_SERVICE_URL}/v1/pricing/rules/${ruleId}`,
      {
        method: 'PUT',
        body: JSON.stringify(ruleData)
      }
    );
  },

  /**
   * Delete pricing rule
   */
  async deletePricingRule(ruleId: string): Promise<{ message: string }> {
    return apiRequest(
      `${PRODUCT_SERVICE_URL}/v1/pricing/rules/${ruleId}`,
      { method: 'DELETE' }
    );
  },

  /**
   * Calculate pricing for SKUs
   */
  async calculatePricing(skuIds: string[], customerTier?: string): Promise<any> {
    return apiRequest(
      `${PRODUCT_SERVICE_URL}/v1/pricing/calculate`,
      {
        method: 'POST',
        body: JSON.stringify({ sku_ids: skuIds, customer_tier: customerTier })
      }
    );
  }
};

/**
 * Utility functions
 */
export const supplierApiUtils = {
  /**
   * Check if error is a supplier API error
   */
  isSupplierApiError(error: unknown): error is SupplierApiError {
    return error instanceof SupplierApiError;
  },

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error: unknown): string {
    if (error instanceof SupplierApiError) {
      switch (error.errorCode) {
        case 'INVALID_INVITATION':
          return '邀請代碼無效或已過期';
        case 'DUPLICATE_TAX_ID':
          return '此統一編號已被使用';
        case 'INVALID_TAX_ID':
          return '統一編號格式不正確';
        case 'UNAUTHORIZED':
          return '請重新登入';
        case 'NETWORK_ERROR':
          return '網路連線錯誤，請稍後再試';
        default:
          return error.message || '發生未知錯誤';
      }
    }
    return '發生未知錯誤';
  },

  /**
   * Retry API request with exponential backoff
   */
  async retryRequest<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error as Error;

        if (
          error instanceof SupplierApiError && 
          error.statusCode >= 400 && 
          error.statusCode < 500
        ) {
          // Don't retry client errors
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }
};

/**
 * React hooks for API integration
 */
export const useSupplierApi = () => {
  const handleApiError = (error: unknown) => {
    const message = supplierApiUtils.getErrorMessage(error);
    console.error('Supplier API Error:', error);
    return message;
  };

  return {
    invitationApi: supplierInvitationApi,
    onboardingApi: supplierOnboardingApi,
    productApi: supplierProductApi,
    pricingApi: supplierPricingApi,
    utils: supplierApiUtils,
    handleError: handleApiError
  };
};

// Export everything
export {
  supplierInvitationApi,
  supplierOnboardingApi,
  supplierProductApi,
  supplierPricingApi,
  supplierApiUtils,
  SupplierApiError
};
