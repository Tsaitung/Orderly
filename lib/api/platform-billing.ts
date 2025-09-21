// ============================================================================
// 平台計費 API 客戶端
// ============================================================================

import {
  DashboardMetrics,
  SystemHealth,
  BillingAlert,
  RateConfig,
  RatingConfig,
  RateCalculationInput,
  RateCalculationResult,
  RateHistoryItem,
  SupplierBillingData,
  SupplierBillingDetail,
  SupplierQueryParams,
  PaginatedSuppliers,
  BillingAnalytics,
  AnalyticsFilters,
  BatchOperation,
  BatchResult,
  BillingAnomaly,
  BillingStatement,
  PaymentRecord
} from '@/types/platform-billing'
import { ApiResponse } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class PlatformBillingApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = `${API_BASE}/api/v1/platform/billing`
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAuthToken()}`
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Network error' }))
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      const data: ApiResponse<T> = await response.json()
      
      if (!data.success) {
        throw new Error(data.error?.message || 'API request failed')
      }

      return data.data!
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      throw error
    }
  }

  private getAuthToken(): string {
    // TODO: 實現從 AuthContext 或 localStorage 獲取 token
    return localStorage.getItem('auth_token') || ''
  }

  // ============================================================================
  // 儀表板 API
  // ============================================================================

  async getDashboardMetrics(timeframe: string = '30d'): Promise<DashboardMetrics> {
    return this.request<DashboardMetrics>(`/dashboard/metrics?timeframe=${timeframe}`)
  }

  async getSystemHealth(): Promise<SystemHealth> {
    return this.request<SystemHealth>('/dashboard/health')
  }

  async getBillingAlerts(limit?: number): Promise<BillingAlert[]> {
    const query = limit ? `?limit=${limit}` : ''
    return this.request<BillingAlert[]>(`/dashboard/alerts${query}`)
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    await this.request(`/dashboard/alerts/${alertId}/acknowledge`, {
      method: 'POST'
    })
  }

  // ============================================================================
  // 費率管理 API
  // ============================================================================

  async getRateConfigs(): Promise<RateConfig[]> {
    return this.request<RateConfig[]>('/rates/configs')
  }

  async updateRateConfig(config: Partial<RateConfig>): Promise<RateConfig> {
    return this.request<RateConfig>('/rates/configs', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  async getRatingConfigs(): Promise<RatingConfig[]> {
    return this.request<RatingConfig[]>('/rates/ratings')
  }

  async updateRatingConfig(config: Partial<RatingConfig>): Promise<RatingConfig> {
    return this.request<RatingConfig>('/rates/ratings', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  async calculateRate(input: RateCalculationInput): Promise<RateCalculationResult> {
    return this.request<RateCalculationResult>('/rates/calculate', {
      method: 'POST',
      body: JSON.stringify(input)
    })
  }

  async getRateHistory(limit?: number): Promise<RateHistoryItem[]> {
    const query = limit ? `?limit=${limit}` : ''
    return this.request<RateHistoryItem[]>(`/rates/history${query}`)
  }

  async previewRateChange(config: Partial<RateConfig>): Promise<{
    affectedSuppliers: number
    estimatedImpact: number
    breakdown: Array<{
      supplierId: string
      supplierName: string
      currentRate: number
      newRate: number
      gmv: number
      impactAmount: number
    }>
  }> {
    return this.request('/rates/preview-change', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  // ============================================================================
  // 供應商管理 API
  // ============================================================================

  async getSuppliers(params: SupplierQueryParams = {}): Promise<PaginatedSuppliers> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v.toString()))
        } else {
          searchParams.append(key, value.toString())
        }
      }
    })

    const query = searchParams.toString()
    return this.request<PaginatedSuppliers>(`/suppliers${query ? `?${query}` : ''}`)
  }

  async getSupplierDetail(supplierId: string): Promise<SupplierBillingDetail> {
    return this.request<SupplierBillingDetail>(`/suppliers/${supplierId}`)
  }

  async updateSupplierRating(
    supplierId: string, 
    newRating: string,
    reason: string
  ): Promise<void> {
    await this.request(`/suppliers/${supplierId}/rating`, {
      method: 'PUT',
      body: JSON.stringify({ rating: newRating, reason })
    })
  }

  async getSupplierStatements(
    supplierId: string,
    limit?: number
  ): Promise<BillingStatement[]> {
    const query = limit ? `?limit=${limit}` : ''
    return this.request<BillingStatement[]>(`/suppliers/${supplierId}/statements${query}`)
  }

  async getSupplierPayments(
    supplierId: string,
    limit?: number
  ): Promise<PaymentRecord[]> {
    const query = limit ? `?limit=${limit}` : ''
    return this.request<PaymentRecord[]>(`/suppliers/${supplierId}/payments${query}`)
  }

  // ============================================================================
  // 分析和報表 API
  // ============================================================================

  async getBillingAnalytics(filters: AnalyticsFilters): Promise<BillingAnalytics> {
    return this.request<BillingAnalytics>('/analytics', {
      method: 'POST',
      body: JSON.stringify(filters)
    })
  }

  async exportSupplierReport(
    format: 'csv' | 'excel' | 'pdf',
    params: SupplierQueryParams = {}
  ): Promise<Blob> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v.toString()))
        } else {
          searchParams.append(key, value.toString())
        }
      }
    })

    const query = searchParams.toString()
    const response = await fetch(`${this.baseUrl}/export/suppliers?format=${format}&${query}`, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    })

    if (!response.ok) {
      throw new Error('Export failed')
    }

    return response.blob()
  }

  // ============================================================================
  // 批次操作 API
  // ============================================================================

  async executeBatchOperation(operation: BatchOperation): Promise<BatchResult> {
    return this.request<BatchResult>('/batch/execute', {
      method: 'POST',
      body: JSON.stringify(operation)
    })
  }

  async getBatchStatus(taskId: string): Promise<BatchResult> {
    return this.request<BatchResult>(`/batch/status/${taskId}`)
  }

  async cancelBatchOperation(taskId: string): Promise<void> {
    await this.request(`/batch/cancel/${taskId}`, {
      method: 'POST'
    })
  }

  async getBatchHistory(limit?: number): Promise<BatchResult[]> {
    const query = limit ? `?limit=${limit}` : ''
    return this.request<BatchResult[]>(`/batch/history${query}`)
  }

  // ============================================================================
  // 異常監控 API
  // ============================================================================

  async getAnomalies(
    status?: string,
    severity?: string,
    limit?: number
  ): Promise<BillingAnomaly[]> {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (severity) params.append('severity', severity)
    if (limit) params.append('limit', limit.toString())
    
    const query = params.toString()
    return this.request<BillingAnomaly[]>(`/anomalies${query ? `?${query}` : ''}`)
  }

  async updateAnomalyStatus(
    anomalyId: string,
    status: string,
    notes?: string
  ): Promise<void> {
    await this.request(`/anomalies/${anomalyId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes })
    })
  }

  async getAnomalyTrends(days: number = 30): Promise<Array<{
    date: string
    count: number
    severity: string
  }>> {
    return this.request(`/anomalies/trends?days=${days}`)
  }

  // ============================================================================
  // 報表生成 API
  // ============================================================================

  async generateBillingReport(
    type: 'commission' | 'payment' | 'performance',
    filters: AnalyticsFilters,
    format: 'pdf' | 'excel' = 'pdf'
  ): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ type, filters, format })
    })

    if (!response.ok) {
      throw new Error('Report generation failed')
    }

    return response.blob()
  }

  // ============================================================================
  // 設定管理 API
  // ============================================================================

  async getBillingSettings(): Promise<{
    defaultCommissionRate: number
    paymentTerms: number
    automaticTierUpgrade: boolean
    ratingUpdateFrequency: string
    alertThresholds: Record<string, number>
  }> {
    return this.request('/settings')
  }

  async updateBillingSettings(settings: Record<string, any>): Promise<void> {
    await this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
  }

  // ============================================================================
  // 通知 API
  // ============================================================================

  async sendBillingNotification(
    supplierIds: string[],
    type: 'statement_ready' | 'payment_due' | 'rate_change' | 'custom',
    message?: string
  ): Promise<void> {
    await this.request('/notifications/send', {
      method: 'POST',
      body: JSON.stringify({
        supplierIds,
        type,
        message
      })
    })
  }

  async getNotificationHistory(limit?: number): Promise<Array<{
    id: string
    type: string
    supplierCount: number
    sentAt: Date
    status: string
  }>> {
    const query = limit ? `?limit=${limit}` : ''
    return this.request(`/notifications/history${query}`)
  }
}

// 創建單例實例
export const platformBillingApi = new PlatformBillingApiClient()

// 導出類別以便測試
export { PlatformBillingApiClient }