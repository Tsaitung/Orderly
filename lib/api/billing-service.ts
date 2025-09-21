/**
 * Billing Service API Client
 * Handles all communication with the billing service backend
 */

const BILLING_SERVICE_URL = process.env.NEXT_PUBLIC_BILLING_SERVICE_URL || 'http://localhost:3005'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  errors?: string[]
}

// Types for API requests and responses
export interface SubscriptionPlan {
  id: string
  planCode: string
  planName: string
  planNameEn: string
  description: string
  monthlyPrice: number
  annualPrice: number
  tierLevel: number
  features: Record<string, any>
  restrictions: Record<string, any>
  isActive: boolean
  isPublic: boolean
  isPopular: boolean
  commissionRateOverride?: number
  freeTrialDays?: number
}

export interface SupplierSubscription {
  id: string
  supplierId: string
  planId: string
  planName: string
  status: 'active' | 'cancelled' | 'expired' | 'trial' | 'suspended'
  billingCycle: 'monthly' | 'annual'
  currentPeriodStart: string
  currentPeriodEnd: string
  trialStart?: string
  trialEnd?: string
  autoRenew: boolean
  monthlyFee: number
  setupFee?: number
  discountAmount?: number
  paymentMethodId?: string
  lastPaymentDate?: string
  nextPaymentDate?: string
  customFeatures: Record<string, any>
  customLimits: Record<string, any>
}

export interface BillingStatement {
  id: string
  statementNumber: string
  supplierId: string
  period: string
  totalGMV: number
  commissionRate: number
  commissionAmount: number
  subscriptionFee: number
  adjustments: number
  totalAmount: number
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'disputed'
  dueDate: string
  paidDate?: string
  generatedDate: string
  transactionCount: number
  metadata: Record<string, any>
}

export interface PaymentRecord {
  id: string
  paymentNumber: string
  statementId: string
  amount: number
  currency: string
  paymentMethod: string
  paymentProvider: string
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'
  transactionId?: string
  gatewayResponse?: Record<string, any>
  createdAt: string
  completedAt?: string
  failureReason?: string
  metadata: Record<string, any>
}

export interface SupplierRating {
  id: string
  supplierId: string
  ratingPeriod: string
  overallRating: number
  qualityRating: number
  deliveryRating: number
  serviceRating: number
  financialRating: number
  transactionCount: number
  totalGMV: number
  calculationDetails: Record<string, any>
  isPublished: boolean
}

export interface RateConfig {
  id: string
  supplierId: string
  tierName: string
  baseCommissionRate: number
  subscriptionDiscount: number
  ratingDiscount: number
  volumeDiscount: number
  effectiveRate: number
  isActive: boolean
  validFrom: string
  validTo?: string
}

// API Client Class
class BillingServiceAPI {
  private baseUrl: string
  private defaultHeaders: HeadersInit

  constructor() {
    this.baseUrl = BILLING_SERVICE_URL
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    
    try {
      const response = await fetch(url, {
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Subscription Plans
  async getSubscriptionPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
    return this.request<SubscriptionPlan[]>('/api/v1/billing/subscription-plans')
  }

  async getSubscriptionPlan(planId: string): Promise<ApiResponse<SubscriptionPlan>> {
    return this.request<SubscriptionPlan>(`/api/v1/billing/subscription-plans/${planId}`)
  }

  // Supplier Subscriptions
  async getSupplierSubscription(supplierId: string): Promise<ApiResponse<SupplierSubscription>> {
    return this.request<SupplierSubscription>(`/api/v1/billing/supplier-subscriptions/${supplierId}`)
  }

  async createSupplierSubscription(data: {
    supplierId: string
    planId: string
    billingCycle: 'monthly' | 'annual'
    startDate: string
    autoRenew?: boolean
    promoCode?: string
    paymentMethodId?: string
  }): Promise<ApiResponse<SupplierSubscription>> {
    return this.request<SupplierSubscription>('/api/v1/billing/supplier-subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateSupplierSubscription(
    subscriptionId: string,
    data: {
      autoRenew?: boolean
      paymentMethodId?: string
      customFeatures?: Record<string, any>
      customLimits?: Record<string, any>
    }
  ): Promise<ApiResponse<SupplierSubscription>> {
    return this.request<SupplierSubscription>(`/api/v1/billing/supplier-subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async upgradeSubscription(
    subscriptionId: string,
    data: {
      newPlanId: string
      billingCycle?: 'monthly' | 'annual'
      effectiveDate?: string
      prorate?: boolean
      upgradeReason?: string
    }
  ): Promise<ApiResponse<SupplierSubscription>> {
    return this.request<SupplierSubscription>(`/api/v1/billing/supplier-subscriptions/${subscriptionId}/upgrade`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async cancelSubscription(
    subscriptionId: string,
    data: {
      cancellationDate?: string
      cancellationReason: string
      refundEligible?: boolean
    }
  ): Promise<ApiResponse<SupplierSubscription>> {
    return this.request<SupplierSubscription>(`/api/v1/billing/supplier-subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Billing Statements
  async getBillingStatements(params: {
    supplierId: string
    limit?: number
    offset?: number
    status?: string
    periodFrom?: string
    periodTo?: string
  }): Promise<ApiResponse<{ statements: BillingStatement[], total: number }>> {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString())
      }
    })

    return this.request<{ statements: BillingStatement[], total: number }>(
      `/api/v1/billing/statements?${queryParams.toString()}`
    )
  }

  async getBillingStatement(statementId: string): Promise<ApiResponse<BillingStatement>> {
    return this.request<BillingStatement>(`/api/v1/billing/statements/${statementId}`)
  }

  async downloadStatementPDF(statementId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/v1/billing/statements/${statementId}/pdf`, {
      headers: this.defaultHeaders,
    })
    
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status}`)
    }
    
    return response.blob()
  }

  async createStatementDispute(
    statementId: string,
    data: {
      disputeType: 'commission_rate' | 'transaction_error' | 'fee_discrepancy' | 'other'
      amount: number
      description: string
      evidenceUrls?: string[]
    }
  ): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/billing/statements/${statementId}/disputes`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Payment Records
  async getPaymentRecords(params: {
    supplierId: string
    limit?: number
    offset?: number
    status?: string
    fromDate?: string
    toDate?: string
  }): Promise<ApiResponse<{ payments: PaymentRecord[], total: number }>> {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString())
      }
    })

    return this.request<{ payments: PaymentRecord[], total: number }>(
      `/api/v1/billing/payments?${queryParams.toString()}`
    )
  }

  async getPaymentRecord(paymentId: string): Promise<ApiResponse<PaymentRecord>> {
    return this.request<PaymentRecord>(`/api/v1/billing/payments/${paymentId}`)
  }

  async retryPayment(paymentId: string): Promise<ApiResponse<PaymentRecord>> {
    return this.request<PaymentRecord>(`/api/v1/billing/payments/${paymentId}/retry`, {
      method: 'POST',
    })
  }

  async downloadPaymentReceipt(paymentId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/v1/billing/payments/${paymentId}/receipt`, {
      headers: this.defaultHeaders,
    })
    
    if (!response.ok) {
      throw new Error(`Failed to download receipt: ${response.status}`)
    }
    
    return response.blob()
  }

  // Supplier Ratings
  async getSupplierRating(supplierId: string, period?: string): Promise<ApiResponse<SupplierRating>> {
    const endpoint = period 
      ? `/api/v1/billing/ratings/${supplierId}?period=${period}`
      : `/api/v1/billing/ratings/${supplierId}`
    
    return this.request<SupplierRating>(endpoint)
  }

  async getSupplierRatingHistory(
    supplierId: string, 
    params: { months?: number; limit?: number }
  ): Promise<ApiResponse<SupplierRating[]>> {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString())
      }
    })

    return this.request<SupplierRating[]>(
      `/api/v1/billing/ratings/${supplierId}/history?${queryParams.toString()}`
    )
  }

  async calculateCommissionSavings(
    supplierId: string,
    params: { targetTier: string; gmvAmount: number }
  ): Promise<ApiResponse<{ monthlySavings: number; annualSavings: number; effectiveRate: number }>> {
    return this.request(`/api/v1/billing/ratings/${supplierId}/commission-calculator`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  // Rate Configuration
  async getSupplierRateConfig(supplierId: string): Promise<ApiResponse<RateConfig>> {
    return this.request<RateConfig>(`/api/v1/billing/rate-configs/${supplierId}`)
  }

  // Analytics and Reports
  async getFinanceSummary(
    supplierId: string,
    params: { period?: string; months?: number }
  ): Promise<ApiResponse<{
    totalGMV: number
    totalCommission: number
    averageCommissionRate: number
    totalStatements: number
    paidStatements: number
    pendingAmount: number
    monthlyTrends: Array<{
      month: string
      gmv: number
      commission: number
      rate: number
    }>
  }>> {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString())
      }
    })

    return this.request(
      `/api/v1/billing/analytics/${supplierId}/summary?${queryParams.toString()}`
    )
  }

  async getUsageMetrics(
    supplierId: string,
    subscriptionId: string
  ): Promise<ApiResponse<{
    subscriptionId: string
    currentPeriodStart: string
    currentPeriodEnd: string
    usage: Record<string, number>
    limits: Record<string, number | null>
    usagePercentage: Record<string, number>
    warnings: string[]
  }>> {
    return this.request(
      `/api/v1/billing/subscriptions/${subscriptionId}/usage?supplierId=${supplierId}`
    )
  }
}

// Export singleton instance
export const billingAPI = new BillingServiceAPI()

// Export types for use in components
export type {
  ApiResponse,
  SubscriptionPlan,
  SupplierSubscription,
  BillingStatement,
  PaymentRecord,
  SupplierRating,
  RateConfig,
}