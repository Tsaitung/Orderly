/**
 * Supplier Service API Client
 * Handles all HTTP requests to the supplier service through API Gateway
 */

import {
  SupplierProfile,
  SupplierProfileCreateRequest,
  SupplierProfileUpdateRequest,
  SupplierDashboard,
  SupplierDashboardMetrics,
  SupplierCustomer,
  SupplierCustomerCreateRequest,
  SupplierCustomerListResponse,
  OnboardingProgress,
  OnboardingStepUpdateRequest,
  SupplierStatusUpdateRequest,
  SupplierListResponse,
  PaginationParams,
  SupplierFilterParams,
  CustomerFilterParams,
  SupplierOrder,
  OrderStats,
  OrderFilterParams,
  OrderListResponse,
  OrderStatus,
  ApiError
} from './supplier-types';

class SupplierApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errorCode?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'SupplierApiError';
  }
}

export class SupplierService {
  private baseURL: string;
  private authToken: string | null = null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  }

  /**
   * Set authentication token for requests
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    } else {
      // Try to get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Handle API response and errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: 'Unknown error occurred' };
      }

      throw new SupplierApiError(
        errorData.message || errorData.detail || 'API request failed',
        response.status,
        errorData.error_code || 'API_ERROR',
        errorData.details
      );
    }

    try {
      return await response.json();
    } catch {
      // Return empty object for responses with no content
      return {} as T;
    }
  }

  /**
   * Make HTTP request with error handling and retries
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries: number = 3
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, config);
        return await this.handleResponse<T>(response);
      } catch (error) {
        if (error instanceof SupplierApiError) {
          // Don't retry client errors (4xx)
          if (error.status >= 400 && error.status < 500) {
            throw error;
          }
        }

        // Retry on network errors or server errors
        if (attempt === retries) {
          throw error;
        }

        // Exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Maximum retries exceeded');
  }

  // ============================================================================
  // Supplier Profile Management
  // ============================================================================

  /**
   * Get supplier profile by organization ID
   */
  async getProfile(organizationId: string): Promise<SupplierProfile> {
    return this.request<SupplierProfile>(`/api/suppliers/suppliers/${organizationId}`);
  }

  /**
   * Create new supplier profile
   */
  async createProfile(data: SupplierProfileCreateRequest): Promise<SupplierProfile> {
    return this.request<SupplierProfile>('/api/suppliers/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update supplier profile
   */
  async updateProfile(organizationId: string, data: SupplierProfileUpdateRequest): Promise<SupplierProfile> {
    return this.request<SupplierProfile>(`/api/suppliers/suppliers/${organizationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete supplier profile
   */
  async deleteProfile(organizationId: string): Promise<void> {
    return this.request<void>(`/api/suppliers/suppliers/${organizationId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Update supplier status
   */
  async updateStatus(organizationId: string, data: SupplierStatusUpdateRequest): Promise<SupplierProfile> {
    return this.request<SupplierProfile>(`/api/suppliers/suppliers/${organizationId}/status`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get suppliers list with filters and pagination
   */
  async getSuppliers(params: SupplierFilterParams = {}): Promise<SupplierListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);
    if (params.status) queryParams.append('status', params.status);
    if (params.delivery_capacity) queryParams.append('delivery_capacity', params.delivery_capacity);
    if (params.search_query) queryParams.append('search_query', params.search_query);
    if (params.verified_only) queryParams.append('verified_only', params.verified_only.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/suppliers/suppliers${queryString ? `?${queryString}` : ''}`;
    
    return this.request<SupplierListResponse>(endpoint);
  }

  // ============================================================================
  // Dashboard & Metrics
  // ============================================================================

  /**
   * Get supplier dashboard data
   */
  async getDashboard(organizationId: string): Promise<SupplierDashboard> {
    return this.request<SupplierDashboard>(`/api/suppliers/suppliers/${organizationId}/dashboard`);
  }

  /**
   * Get supplier metrics
   */
  async getMetrics(organizationId: string, period?: string): Promise<SupplierDashboardMetrics> {
    const queryParams = period ? `?period=${period}` : '';
    return this.request<SupplierDashboardMetrics>(`/api/suppliers/suppliers/${organizationId}/metrics${queryParams}`);
  }

  // ============================================================================
  // Customer Management
  // ============================================================================

  /**
   * Get supplier's customers list
   */
  async getCustomers(organizationId: string, params: CustomerFilterParams = {}): Promise<SupplierCustomerListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);
    if (params.relationship_type) queryParams.append('relationship_type', params.relationship_type);
    if (params.search_query) queryParams.append('search_query', params.search_query);
    if (params.has_recent_orders !== undefined) queryParams.append('has_recent_orders', params.has_recent_orders.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/suppliers/suppliers/${organizationId}/customers${queryString ? `?${queryString}` : ''}`;
    
    return this.request<SupplierCustomerListResponse>(endpoint);
  }

  /**
   * Add new customer relationship
   */
  async addCustomer(organizationId: string, data: SupplierCustomerCreateRequest): Promise<SupplierCustomer> {
    return this.request<SupplierCustomer>(`/api/suppliers/suppliers/${organizationId}/customers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update customer relationship
   */
  async updateCustomer(
    organizationId: string, 
    customerId: string, 
    data: Partial<SupplierCustomerCreateRequest>
  ): Promise<SupplierCustomer> {
    return this.request<SupplierCustomer>(`/api/suppliers/suppliers/${organizationId}/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Remove customer relationship
   */
  async removeCustomer(organizationId: string, customerId: string): Promise<void> {
    return this.request<void>(`/api/suppliers/suppliers/${organizationId}/customers/${customerId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get specific customer relationship
   */
  async getCustomer(organizationId: string, customerId: string): Promise<SupplierCustomer> {
    return this.request<SupplierCustomer>(`/api/suppliers/suppliers/${organizationId}/customers/${customerId}`);
  }

  // ============================================================================
  // Onboarding Management
  // ============================================================================

  /**
   * Get onboarding progress
   */
  async getOnboardingProgress(organizationId: string): Promise<OnboardingProgress> {
    return this.request<OnboardingProgress>(`/api/suppliers/suppliers/${organizationId}/onboarding`);
  }

  /**
   * Update onboarding step
   */
  async updateOnboardingStep(
    organizationId: string, 
    stepName: string, 
    data: OnboardingStepUpdateRequest
  ): Promise<OnboardingProgress> {
    return this.request<OnboardingProgress>(`/api/suppliers/suppliers/${organizationId}/onboarding/step`, {
      method: 'POST',
      body: JSON.stringify({ step_name: stepName, ...data }),
    });
  }

  /**
   * Complete onboarding step
   */
  async completeOnboardingStep(organizationId: string, stepName: string): Promise<OnboardingProgress> {
    return this.request<OnboardingProgress>(`/api/suppliers/suppliers/${organizationId}/onboarding/${stepName}/complete`, {
      method: 'POST',
    });
  }

  /**
   * Submit onboarding for review
   */
  async submitOnboardingForReview(organizationId: string): Promise<OnboardingProgress> {
    return this.request<OnboardingProgress>(`/api/suppliers/suppliers/${organizationId}/onboarding/submit`, {
      method: 'POST',
    });
  }

  // ============================================================================
  // Order Management Methods
  // ============================================================================

  /**
   * Get supplier orders with pagination and filtering
   */
  async getOrders(organizationId: string, params: OrderFilterParams = {}): Promise<OrderListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.priority) queryParams.append('priority', params.priority);
    if (params.customer_id) queryParams.append('customer_id', params.customer_id);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    if (params.search_query) queryParams.append('search_query', params.search_query);
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);

    const url = `/api/suppliers/suppliers/${organizationId}/orders${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.request<OrderListResponse>(url);
  }

  /**
   * Get order statistics for supplier dashboard
   */
  async getOrderStats(organizationId: string): Promise<OrderStats> {
    return this.request<OrderStats>(`/api/suppliers/suppliers/${organizationId}/orders/stats`);
  }

  /**
   * Get specific order details
   */
  async getOrder(organizationId: string, orderId: string): Promise<SupplierOrder> {
    return this.request<SupplierOrder>(`/api/suppliers/suppliers/${organizationId}/orders/${orderId}`);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    organizationId: string, 
    orderId: string, 
    status: OrderStatus,
    notes?: string
  ): Promise<SupplierOrder> {
    return this.request<SupplierOrder>(`/api/suppliers/suppliers/${organizationId}/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }

  /**
   * Bulk update order statuses
   */
  async bulkUpdateOrderStatus(
    organizationId: string, 
    orderIds: string[], 
    status: OrderStatus,
    notes?: string
  ): Promise<{ updated_count: number; orders: SupplierOrder[] }> {
    return this.request<{ updated_count: number; orders: SupplierOrder[] }>(`/api/suppliers/suppliers/${organizationId}/orders/bulk-status`, {
      method: 'PUT',
      body: JSON.stringify({ order_ids: orderIds, status, notes }),
    });
  }

  /**
   * Export orders to CSV/Excel
   */
  async exportOrders(organizationId: string, format: 'csv' | 'xlsx' = 'csv', params: OrderFilterParams = {}): Promise<Blob> {
    const queryParams = new URLSearchParams();
    queryParams.append('format', format);
    
    if (params.status) queryParams.append('status', params.status);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    
    const url = `/api/suppliers/suppliers/${organizationId}/orders/export?${queryParams.toString()}`;
    const response = await fetch(`${this.baseURL}${url}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Health check for supplier service
   */
  async healthCheck(): Promise<{ status: string; service: string; version: string }> {
    return this.request<{ status: string; service: string; version: string }>('/api/suppliers/health');
  }

  /**
   * Upload file (for documents, images, etc.)
   */
  async uploadFile(file: File, type: 'document' | 'image' = 'document'): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const headers = this.getAuthHeaders();
    delete (headers as any)['Content-Type']; // Let browser set content-type for FormData

    return this.request<{ url: string; filename: string }>('/api/suppliers/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  /**
   * Bulk operations
   */
  async bulkUpdateCustomers(
    organizationId: string, 
    customerIds: string[], 
    data: Partial<SupplierCustomerCreateRequest>
  ): Promise<SupplierCustomer[]> {
    return this.request<SupplierCustomer[]>(`/api/suppliers/suppliers/${organizationId}/customers/bulk`, {
      method: 'PUT',
      body: JSON.stringify({ customer_ids: customerIds, ...data }),
    });
  }

  /**
   * Export data
   */
  async exportCustomers(organizationId: string, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/api/suppliers/suppliers/${organizationId}/customers/export?format=${format}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }
}

// Singleton instance
export const supplierService = new SupplierService();

// Error types for easier error handling
export { SupplierApiError };

// Helper functions
export const isSupplierApiError = (error: any): error is SupplierApiError => {
  return error instanceof SupplierApiError;
};

export const getSupplierErrorMessage = (error: any): string => {
  if (isSupplierApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};