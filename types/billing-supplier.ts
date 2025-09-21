// ============================================================================
// Orderly 供應商計費類型定義
// ============================================================================

export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string
}

// ============================================================================
// 供應商計費核心類型
// ============================================================================

export type SupplierFeeType = 'transaction_fee' | 'fast_payout' | 'promo' | 'exposure_package' | 'saas_package'
export type PricingModel = 'percentage' | 'fixed' | 'tiered' | 'formula'
export type SupplierContractStatus = 'draft' | 'pending_approval' | 'active' | 'paused' | 'terminated'
export type SupplierScope = 'global' | 'supplier_group' | 'supplier' | 'sku'
export type RatingTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

// ============================================================================
// 供應商合約
// ============================================================================

export interface SupplierContract extends BaseEntity {
  contract_code: string
  name: string
  supplier_id?: string
  supplier_group_id?: string
  scope: SupplierScope
  status: SupplierContractStatus
  version: number
  effective_from: Date
  effective_to?: Date
  fee_lines: SupplierFeeLine[]
  notes?: string
}

// ============================================================================
// 供應商費用行項
// ============================================================================

export interface SupplierFeeLine {
  fee_line_id: string
  fee_type: SupplierFeeType
  label: string
  pricing_model: PricingModel
  value: number | GMVTierConfig | string
  applies_to: 'all' | 'categories' | 'sku_list'
  billing_cycle: 'per_order' | 'daily' | 'monthly' | 'one_time'
  fee_cap?: number
  fee_floor?: number
  enabled: boolean
}

// ============================================================================
// GMV 分層配置
// ============================================================================

export interface GMVTierConfig {
  tiers: GMVTier[]
}

export interface GMVTier {
  tier_id: string
  name: string
  min_gmv: number
  max_gmv?: number
  rate: number
  description?: string
}

// ============================================================================
// 供應商評級系統
// ============================================================================

export interface SupplierRating extends BaseEntity {
  supplier_id: string
  rating_tier: RatingTier
  score: number
  monthly_gmv: number
  quality_score: number
  delivery_score: number
  service_score: number
  discount_percentage: number
  effective_from: Date
  next_review_date: Date
}

export interface RatingConfig {
  tier: RatingTier
  min_score: number
  max_score: number
  discount_percentage: number
  color: string
  icon: string
  benefits: string[]
  requirements: RatingRequirement[]
}

export interface RatingRequirement {
  metric: string
  threshold: number
  description: string
}

// ============================================================================
// 供應商費率計算
// ============================================================================

export interface SupplierRateCalculationInput {
  supplier_id?: string
  monthly_gmv: number
  rating_tier: RatingTier
  fee_type: SupplierFeeType
  pricing_model: PricingModel
  category_id?: string
  sku_list?: string[]
}

export interface SupplierRateCalculationResult {
  base_rate: number
  rating_discount: number
  effective_rate: number
  estimated_fee: number
  tier_info: {
    tier_name: string
    gmv_range: string
    tier_rate: number
  }
  rating_info: {
    current_tier: RatingTier
    discount_percentage: number
    next_tier?: RatingTier
    upgrade_requirements?: string[]
  }
  breakdown: {
    base_fee: number
    rating_discount_amount: number
    final_fee: number
    processing_frequency: string
  }
}

// ============================================================================
// 供應商費用明細
// ============================================================================

export interface SupplierBillingItem extends BaseEntity {
  supplier_id: string
  contract_id: string
  fee_line_id: string
  order_id?: string
  billing_period: string
  fee_type: SupplierFeeType
  pricing_model: PricingModel
  calculated_amount: number
  gmv_amount?: number
  quantity?: number
  rate_applied: number
  rating_tier: RatingTier
  discount_applied: number
  status: 'pending' | 'calculated' | 'billed' | 'paid' | 'disputed'
  billing_date: Date
  due_date?: Date
  paid_date?: Date
}

// ============================================================================
// 供應商增值服務
// ============================================================================

export interface SupplierValueAddedService extends BaseEntity {
  supplier_id: string
  service_type: 'fast_payout' | 'exposure_package' | 'saas_package' | 'priority_support'
  package_name: string
  monthly_fee?: number
  transaction_fee_percentage?: number
  features: string[]
  status: 'active' | 'paused' | 'cancelled'
  started_date: Date
  next_billing_date: Date
}

// ============================================================================
// 供應商結算配置
// ============================================================================

export interface SupplierSettlementConfig extends BaseEntity {
  supplier_id: string
  settlement_terms: 'T+0' | 'T+1' | 'T+7' | 'weekly' | 'monthly'
  fast_payout_enabled: boolean
  fast_payout_fee_percentage: number
  minimum_payout_amount: number
  payment_method: 'bank_transfer' | 'digital_wallet'
  bank_account?: BankAccountInfo
  auto_settlement: boolean
}

export interface BankAccountInfo {
  bank_name: string
  account_number: string
  account_holder: string
  swift_code?: string
  branch_code?: string
}

// ============================================================================
// API 響應類型
// ============================================================================

export interface SupplierContractListResponse {
  contracts: SupplierContract[]
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
  summary: {
    total_contracts: number
    active_contracts: number
    pending_approval: number
    average_rate: number
  }
}

export interface SupplierBillingMetrics {
  period: {
    start: Date
    end: Date
  }
  total_suppliers: number
  total_gmv: number
  total_commission: number
  average_rate: number
  rating_distribution: {
    [key in RatingTier]: {
      count: number
      percentage: number
      avg_gmv: number
    }
  }
  top_performers: Array<{
    supplier_id: string
    supplier_name: string
    monthly_gmv: number
    commission_paid: number
    rating_tier: RatingTier
  }>
}

// ============================================================================
// 查詢參數
// ============================================================================

export interface SupplierContractQueryParams {
  page?: number
  limit?: number
  supplier_id?: string
  status?: SupplierContractStatus[]
  rating_tier?: RatingTier[]
  min_gmv?: number
  max_gmv?: number
  fee_type?: SupplierFeeType[]
  sortBy?: 'created_at' | 'gmv' | 'commission' | 'rating'
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface SupplierBillingQueryParams {
  page?: number
  limit?: number
  supplier_id?: string
  date_range?: [Date, Date]
  status?: string[]
  fee_type?: SupplierFeeType[]
  min_amount?: number
  max_amount?: number
}