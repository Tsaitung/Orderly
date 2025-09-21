// ============================================================================
// 平台計費相關類型定義
// ============================================================================

import { BaseEntity, DatePeriod, PaginationInfo } from './index'

// ============================================================================
// 核心計費類型
// ============================================================================

export type RatingTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'overdue'

export type BillingCycle = 'monthly' | 'quarterly' | 'annual'

export type CommissionType = 'percentage' | 'fixed' | 'tiered'

export type BillingStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'disputed' | 'cancelled'

// ============================================================================
// 儀表板指標類型
// ============================================================================

export interface DashboardMetrics {
  monthlyCommission: {
    current: number
    previous: number
    change: number
    changePercentage: number
  }
  activeSuppliers: {
    total: number
    change: number
    changePercentage: number
  }
  averageRate: {
    current: number
    previous: number
    change: number
  }
  growthRate: {
    gmv: number
    suppliers: number
    revenue: number
  }
}

export interface SystemHealth {
  billingSuccessRate: number
  paymentSuccessRate: number
  disputeRate: number
  processingLatency: number
  systemUptime: number
  lastUpdated: Date
}

export interface BillingAlert {
  id: string
  type: 'anomaly' | 'threshold' | 'system' | 'payment'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  supplierId?: string
  supplierName?: string
  amount?: number
  createdAt: Date
  acknowledged: boolean
  acknowledgedBy?: string
  resolvedAt?: Date
}

// ============================================================================
// 費率配置類型
// ============================================================================

export interface RateConfig extends BaseEntity {
  tier: number
  minGMV: number
  maxGMV: number | null
  commissionRate: number
  effectiveFrom: Date
  effectiveTo?: Date
  active: boolean
  description?: string
}

export interface RatingConfig extends BaseEntity {
  rating: RatingTier
  discountPercentage: number
  minOrderCount?: number
  minGMV?: number
  qualityThreshold?: number
  effectiveFrom: Date
  effectiveTo?: Date
  active: boolean
}

export interface RateCalculationInput {
  gmv: number
  rating: RatingTier
  orderCount?: number
  qualityScore?: number
}

export interface RateCalculationResult {
  baseRate: number
  discount: number
  discountPercentage: number
  effectiveRate: number
  estimatedCommission: number
  tier: number
  applicableRating: RatingTier
  breakdown: {
    gmvTier: string
    baseCommission: number
    ratingDiscount: number
    finalCommission: number
  }
}

export interface RateHistoryItem extends BaseEntity {
  changeType: 'rate_update' | 'rating_update' | 'tier_adjustment'
  previousValue: number
  newValue: number
  reason: string
  changedBy: string
  effectiveDate: Date
  affectedSuppliers: number
}

// ============================================================================
// 供應商計費類型
// ============================================================================

export interface SupplierBillingData extends BaseEntity {
  supplierId: string
  supplierName: string
  businessNumber: string
  rating: RatingTier
  currentTier: number
  monthlyGMV: number
  quarterlyGMV: number
  annualGMV: number
  orderCount: number
  baseRate: number
  effectiveRate: number
  ratingDiscount: number
  paymentStatus: PaymentStatus
  lastPayment?: Date
  nextPaymentDue?: Date
  outstandingAmount: number
  currentMonthCommission: number
  lifetimeCommission: number
  qualityScore: number
  onTimePaymentRate: number
  averageOrderValue: number
  lastOrderDate?: Date
  joinedDate: Date
  contractStatus: 'active' | 'suspended' | 'terminated'
}

export interface SupplierBillingDetail extends SupplierBillingData {
  billingHistory: BillingStatement[]
  paymentHistory: PaymentRecord[]
  rateHistory: RateChangeRecord[]
  performanceMetrics: SupplierPerformanceMetrics
  billingSettings: SupplierBillingSettings
}

export interface BillingStatement extends BaseEntity {
  statementNumber: string
  supplierId: string
  period: DatePeriod
  status: BillingStatus
  summary: BillingStatementSummary
  lineItems: BillingLineItem[]
  adjustments?: BillingAdjustment[]
  totalAmount: number
  commissionAmount: number
  taxAmount: number
  netAmount: number
  dueDate: Date
  paidDate?: Date
  paymentMethod?: string
  currency: string
  notes?: string
  generatedBy: string
  approvedBy?: string
}

export interface BillingStatementSummary {
  totalOrders: number
  totalGMV: number
  commissionRate: number
  baseCommission: number
  discounts: number
  adjustments: number
  taxes: number
  netPayable: number
}

export interface BillingLineItem {
  id: string
  orderId: string
  orderNumber: string
  orderDate: Date
  orderAmount: number
  commissionRate: number
  commissionAmount: number
  description: string
}

export interface BillingAdjustment {
  id: string
  type: 'credit' | 'debit' | 'discount' | 'penalty'
  amount: number
  reason: string
  reference?: string
  approvedBy: string
  createdAt: Date
}

export interface PaymentRecord extends BaseEntity {
  paymentId: string
  statementId: string
  supplierId: string
  amount: number
  method: 'bank_transfer' | 'check' | 'wire' | 'digital_wallet'
  status: PaymentStatus
  reference?: string
  processedAt?: Date
  failureReason?: string
  currency: string
  fees?: number
  netAmount: number
}

export interface RateChangeRecord extends BaseEntity {
  supplierId: string
  changeType: 'tier_promotion' | 'tier_demotion' | 'rating_upgrade' | 'rating_downgrade' | 'manual_adjustment'
  previousRate: number
  newRate: number
  previousTier?: number
  newTier?: number
  previousRating?: RatingTier
  newRating?: RatingTier
  reason: string
  effectiveDate: Date
  changedBy: string
  approved: boolean
  approvedBy?: string
}

// ============================================================================
// 績效和分析類型
// ============================================================================

export interface SupplierPerformanceMetrics {
  gmvTrend: TrendDataPoint[]
  commissionTrend: TrendDataPoint[]
  orderCountTrend: TrendDataPoint[]
  paymentPerformance: {
    onTimeRate: number
    averagePaymentDelay: number
    totalOutstanding: number
  }
  qualityMetrics: {
    averageRating: number
    disputeRate: number
    refundRate: number
  }
  growthMetrics: {
    gmvGrowth: number
    orderGrowth: number
    monthOverMonth: number
    yearOverYear: number
  }
}

export interface TrendDataPoint {
  date: Date
  value: number
  category?: string
}

export interface BillingAnalytics {
  revenue: RevenueAnalytics
  suppliers: SupplierAnalytics
  commissions: CommissionAnalytics
  trends: BillingTrends
}

export interface RevenueAnalytics {
  totalRevenue: number
  monthlyRecurring: number
  growth: {
    monthly: number
    quarterly: number
    annual: number
  }
  forecastedRevenue: number
  revenueByTier: TierRevenueBreakdown[]
}

export interface SupplierAnalytics {
  totalActiveSuppliers: number
  newSuppliers: number
  churnedSuppliers: number
  tierDistribution: TierDistribution[]
  ratingDistribution: RatingDistribution[]
  retentionRate: number
}

export interface CommissionAnalytics {
  totalCommissions: number
  averageCommissionRate: number
  commissionTrends: TrendDataPoint[]
  topEarningSuppliers: TopSupplier[]
  commissionByCategory: CategoryCommission[]
}

export interface BillingTrends {
  gmvTrend: TrendDataPoint[]
  commissionTrend: TrendDataPoint[]
  supplierCountTrend: TrendDataPoint[]
  averageOrderValueTrend: TrendDataPoint[]
}

export interface TierRevenueBreakdown {
  tier: number
  tierName: string
  supplierCount: number
  totalRevenue: number
  averageRevenue: number
  percentageOfTotal: number
}

export interface TierDistribution {
  tier: number
  tierName: string
  count: number
  percentage: number
}

export interface RatingDistribution {
  rating: RatingTier
  count: number
  percentage: number
  averageGMV: number
}

export interface TopSupplier {
  supplierId: string
  supplierName: string
  totalCommission: number
  gmv: number
  rating: RatingTier
  tier: number
}

export interface CategoryCommission {
  category: string
  totalCommission: number
  supplierCount: number
  averageRate: number
  percentage: number
}

// ============================================================================
// 供應商計費設定類型
// ============================================================================

export interface SupplierBillingSettings extends BaseEntity {
  supplierId: string
  billingCycle: BillingCycle
  paymentTerms: number // days
  preferredPaymentMethod: string
  invoiceDelivery: 'email' | 'portal' | 'both'
  currency: string
  taxSettings: TaxSettings
  automaticPayments: boolean
  paymentAccount?: PaymentAccount
  billingContact: BillingContact
  notifications: BillingNotificationSettings
}

export interface TaxSettings {
  taxId?: string
  vatNumber?: string
  taxExempt: boolean
  taxRate?: number
  taxCalculation: 'inclusive' | 'exclusive'
}

export interface PaymentAccount {
  accountType: 'bank' | 'digital_wallet' | 'check'
  accountDetails: Record<string, string>
  verified: boolean
  verifiedAt?: Date
}

export interface BillingContact {
  name: string
  email: string
  phone?: string
  department?: string
  isFinancialContact: boolean
}

export interface BillingNotificationSettings {
  statementGenerated: boolean
  paymentDue: boolean
  paymentOverdue: boolean
  paymentReceived: boolean
  rateChanges: boolean
  emailFrequency: 'immediate' | 'daily' | 'weekly'
}

// ============================================================================
// 批次操作類型
// ============================================================================

export type BatchOperationType = 
  | 'update_rates'
  | 'generate_statements'
  | 'send_notifications'
  | 'apply_adjustments'
  | 'bulk_payment_processing'
  | 'tier_recalculation'

export interface BatchOperation {
  type: BatchOperationType
  supplierIds: string[]
  parameters?: Record<string, any>
  scheduledAt?: Date
  options?: BatchOperationOptions
}

export interface BatchOperationOptions {
  dryRun?: boolean
  sendNotifications?: boolean
  requireApproval?: boolean
  rollbackOnError?: boolean
}

export interface BatchResult {
  taskId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  totalItems: number
  processedItems: number
  successfulItems: number
  failedItems: number
  errors: BatchError[]
  startedAt: Date
  completedAt?: Date
  estimatedCompletion?: Date
}

export interface BatchError {
  supplierId: string
  supplierName: string
  error: string
  code?: string
  retryable: boolean
}

// ============================================================================
// 異常監控類型
// ============================================================================

export interface BillingAnomaly {
  id: string
  type: 'rate_spike' | 'payment_delay' | 'gmv_drop' | 'commission_anomaly' | 'system_error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  supplierId?: string
  supplierName?: string
  detectedAt: Date
  description: string
  currentValue: number
  expectedValue: number
  threshold: number
  confidence: number
  status: 'open' | 'investigating' | 'resolved' | 'false_positive'
  assignedTo?: string
  resolvedAt?: Date
  resolutionNotes?: string
  affectedAmount?: number
  autoResolvable: boolean
}

// ============================================================================
// 查詢和篩選類型
// ============================================================================

export interface SupplierQueryParams {
  page?: number
  limit?: number
  search?: string
  rating?: RatingTier[]
  tier?: number[]
  paymentStatus?: PaymentStatus[]
  minGMV?: number
  maxGMV?: number
  joinedAfter?: Date
  joinedBefore?: Date
  sortBy?: 'name' | 'gmv' | 'commission' | 'rating' | 'joinedDate' | 'lastPayment'
  sortOrder?: 'asc' | 'desc'
}

export interface SupplierFilters {
  rating: RatingTier[]
  tier: number[]
  paymentStatus: PaymentStatus[]
  gmvRange: [number, number]
  dateRange: [Date, Date]
  search: string
}

export interface AnalyticsFilters {
  period: DatePeriod
  supplierIds?: string[]
  tiers?: number[]
  ratings?: RatingTier[]
  includeInactive?: boolean
}

// ============================================================================
// 響應類型
// ============================================================================

export interface PaginatedSuppliers {
  data: SupplierBillingData[]
  pagination: PaginationInfo
  summary: {
    totalSuppliers: number
    totalGMV: number
    totalCommission: number
    averageRating: number
  }
}

export interface PaginationState {
  page: number
  limit: number
  total: number
  hasNext: boolean
  hasPrev: boolean
}

// ============================================================================
// UI 狀態類型
// ============================================================================

export interface LoadingState {
  dashboard: boolean
  rates: boolean
  suppliers: boolean
  analytics: boolean
  batch: boolean
}

export interface ErrorState {
  dashboard?: string
  rates?: string
  suppliers?: string
  analytics?: string
  batch?: string
}

export interface UIState {
  selectedSupplierIds: string[]
  filters: SupplierFilters
  view: 'table' | 'cards' | 'analytics'
  expandedRows: string[]
  sortConfig: {
    key: string
    direction: 'asc' | 'desc'
  }
}