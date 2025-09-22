/**
 * Platform Supplier Management API Service
 * For platform admin supplier management functionality
 */

export interface SupplierActivityMetrics {
  total_orders: number
  monthly_orders: number
  total_gmv: number
  monthly_gmv: number
  avg_order_value: number
  fulfillment_rate: number
  on_time_delivery_rate: number
  quality_score: number
  customer_rating: number
  response_time_hours: number
  last_order_date?: string
  last_login_date?: string
  orders_growth_rate: number
  gmv_growth_rate: number
}

export interface SupplierCard {
  id: string
  name: string
  contact_person?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  status: string
  status_display: string
  delivery_capacity?: string
  capacity_display: string
  minimum_order_amount: number
  payment_terms_display: string
  product_categories: string[]
  certifications: string[]
  monthly_gmv: number
  monthly_orders: number
  fulfillment_rate: number
  quality_score: number
  gmv_growth_rate: number
  orders_growth_rate: number
  last_order_date?: string
  activity_level: string
  is_active: boolean
  join_date: string
}

export interface SupplierDetail extends SupplierCard {
  business_type?: string
  tax_id?: string
  delivery_capacity_kg_per_day: number
  operating_hours: Record<string, any>
  delivery_zones: string[]
  payment_terms_days: number
  quality_certifications: string[]
  food_safety_license?: string
  food_safety_expires_at?: string
  public_description?: string
  verified_at?: string
  verified_by?: string
  metrics: SupplierActivityMetrics
  created_at: string
  updated_at: string
  operating_status: string
}

export interface SupplierStats {
  total_suppliers: number
  active_suppliers: number
  pending_suppliers: number
  suspended_suppliers: number
  deactivated_suppliers: number
  total_gmv: number
  monthly_gmv: number
  avg_fulfillment_rate: number
  avg_quality_score: number
  total_orders: number
  monthly_orders: number
  supplier_growth_rate: number
  gmv_growth_rate: number
  orders_growth_rate: number
  capacity_distribution: Record<string, number>
  region_distribution: Record<string, number>
  category_distribution: Record<string, number>
}

export interface SupplierListResponse {
  suppliers: SupplierCard[]
  total: number
  page: number
  page_size: number
  total_pages: number
  stats: SupplierStats
}

export interface SupplierFilterParams {
  search?: string
  status?: string
  delivery_capacity?: string
  min_order_amount?: number
  max_order_amount?: number
  activity_level?: string
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface SupplierUpdateRequest {
  status: string
  internal_notes?: string
  verified_by?: string
}

class PlatformSupplierService {
  private baseUrl: string

  constructor() {
    // Use BFF proxy for consistent routing and automatic auth injection
    // All requests go through Next.js BFF → API Gateway
    this.baseUrl = '/api/bff'
  }

  private async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: defaultHeaders,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Platform Supplier API call failed for ${endpoint}:`, error)
      throw error
    }
  }

  /**
   * Get supplier statistics for platform overview
   */
  async getSupplierStats(): Promise<SupplierStats> {
    return this.apiCall<SupplierStats>('/suppliers/stats')
  }

  /**
   * Get paginated list of suppliers with filtering
   */
  async getSuppliers(params: SupplierFilterParams = {}): Promise<SupplierListResponse> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Use param names directly - backend expects the same param names
        searchParams.append(key, String(value))
      }
    })

    const queryString = searchParams.toString()
    const endpoint = `/suppliers${queryString ? `?${queryString}` : ''}`

    return this.apiCall<SupplierListResponse>(endpoint)
  }

  /**
   * Get detailed supplier information
   */
  async getSupplierDetail(supplierId: string): Promise<SupplierDetail> {
    return this.apiCall<SupplierDetail>(`/suppliers/${supplierId}`)
  }

  /**
   * Update supplier status (platform admin function)
   */
  async updateSupplierStatus(
    supplierId: string,
    updateData: SupplierUpdateRequest
  ): Promise<SupplierDetail> {
    return this.apiCall<SupplierDetail>(`/suppliers/${supplierId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    })
  }

  /**
   * Get supplier activity data
   */
  async getSupplierActivity(supplierId: string, days: number = 30): Promise<any> {
    return this.apiCall<any>(`/suppliers/${supplierId}/activity?days=${days}`)
  }

  /**
   * Get suppliers by status for quick filtering
   */
  async getSuppliersByStatus(status: string): Promise<SupplierCard[]> {
    const response = await this.getSuppliers({ status, page_size: 100 })
    return response.suppliers
  }

  /**
   * Search suppliers by name or contact
   */
  async searchSuppliers(query: string): Promise<SupplierCard[]> {
    const response = await this.getSuppliers({ search: query, page_size: 50 })
    return response.suppliers
  }

  /**
   * Get supplier activity levels distribution
   */
  async getActivityDistribution(): Promise<Record<string, number>> {
    const stats = await this.getSupplierStats()
    // This would be enhanced with actual activity level counts from backend
    return {
      high: Math.floor(stats.active_suppliers * 0.3),
      moderate: Math.floor(stats.active_suppliers * 0.5),
      low: Math.floor(stats.active_suppliers * 0.2),
    }
  }

  /**
   * Get top performing suppliers
   */
  async getTopSuppliers(limit: number = 10): Promise<SupplierCard[]> {
    const response = await this.getSuppliers({
      sort_by: 'monthly_gmv',
      sort_order: 'desc',
      page_size: limit,
      status: 'VERIFIED',
    })
    return response.suppliers
  }

  /**
   * Get suppliers needing attention (pending review, low performance, etc.)
   */
  async getSuppliersNeedingAttention(): Promise<{
    pending_verification: SupplierCard[]
    low_performance: SupplierCard[]
    inactive: SupplierCard[]
  }> {
    const [pending, lowPerf, inactive] = await Promise.all([
      this.getSuppliersByStatus('PENDING'),
      this.getSuppliers({ activity_level: 'low', page_size: 20 }),
      this.getSuppliers({ activity_level: 'low', page_size: 10 }),
    ])

    return {
      pending_verification: pending,
      low_performance: lowPerf.suppliers.filter(s => s.fulfillment_rate < 90),
      inactive: inactive.suppliers.filter(
        s =>
          !s.last_order_date ||
          new Date(s.last_order_date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ),
    }
  }
}

// Export singleton instance
export const platformSupplierService = new PlatformSupplierService()

// Export types
export type {
  SupplierCard,
  SupplierDetail,
  SupplierStats,
  SupplierListResponse,
  SupplierFilterParams,
  SupplierUpdateRequest,
  SupplierActivityMetrics,
}

export default platformSupplierService
