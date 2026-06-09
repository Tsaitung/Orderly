// ============================================================================
// Orderly 餐廳計費類型定義
// ============================================================================

export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string
}

// ============================================================================
// 餐廳計費核心類型
// ============================================================================

export type RestaurantPlanType = 'free' | 'pro' | 'enterprise'
export type RestaurantContractStatus = 'draft' | 'active' | 'paused' | 'cancelled' | 'expired'
export type FeatureFlag =
  | 'auto_reorder'
  | 'cost_report'
  | 'multi_store'
  | 'consolidated_po'
  | 'fast_recon_export'
  | 'api_access'
  | 'advanced_analytics'
  | 'priority_support'
  | 'custom_branding'
  | 'white_label'

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly'
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded'

// ============================================================================
// 餐廳訂閱方案
// ============================================================================

export interface RestaurantPlan extends BaseEntity {
  plan_type: RestaurantPlanType
  name: string
  description: string
  monthly_fee: number
  yearly_fee?: number
  included_users: number
  extra_user_fee: number
  included_stores: number
  extra_store_fee: number
  feature_flags: FeatureFlag[]
  limits: PlanLimits
  is_active: boolean
  sort_order: number
}

export interface PlanLimits {
  max_orders_per_month?: number
  max_suppliers?: number
  max_products?: number
  max_api_calls_per_month?: number
  max_storage_gb?: number
  max_export_records?: number
}

// ============================================================================
// 餐廳合約/訂閱
// ============================================================================

export interface RestaurantSubscription extends BaseEntity {
  restaurant_id: string
  restaurant_name: string
  plan_type: RestaurantPlanType
  status: RestaurantContractStatus
  current_users: number
  current_stores: number
  billing_cycle: BillingCycle
  monthly_base_fee: number
  extra_user_charges: number
  extra_store_charges: number
  total_monthly_fee: number
  started_date: Date
  next_billing_date: Date
  trial_end_date?: Date
  cancelled_date?: Date
  cancellation_reason?: string
  is_trial: boolean
  consolidated_billing: boolean
  cost_allocation_method: 'equal' | 'by_gmv' | 'by_orders' | 'manual'
}

// ============================================================================
// 餐廳計費設定
// ============================================================================

export interface RestaurantBillingConfig extends BaseEntity {
  restaurant_id: string
  plan_type: RestaurantPlanType
  custom_monthly_fee?: number
  custom_features?: FeatureFlag[]
  billing_contact: BillingContact
  payment_method: PaymentMethod
  invoice_settings: InvoiceSettings
  notification_preferences: NotificationPreferences
}

export interface BillingContact {
  name: string
  email: string
  phone?: string
  title?: string
  department?: string
}

export interface PaymentMethod {
  type: 'credit_card' | 'bank_transfer' | 'digital_wallet' | 'invoice'
  is_auto_pay: boolean
  card_last_four?: string
  bank_account?: {
    bank_name: string
    account_holder: string
    account_number_masked: string
  }
}

export interface InvoiceSettings {
  company_name: string
  tax_id?: string
  billing_address: Address
  invoice_language: 'zh-TW' | 'en' | 'zh-CN'
  invoice_format: 'pdf' | 'electronic'
  send_to_emails: string[]
}

export interface Address {
  street: string
  city: string
  state?: string
  postal_code: string
  country: string
}

export interface NotificationPreferences {
  billing_reminders: boolean
  payment_confirmations: boolean
  usage_alerts: boolean
  feature_updates: boolean
  promotional_emails: boolean
}

// ============================================================================
// 餐廳費用明細
// ============================================================================

export interface RestaurantBillingItem extends BaseEntity {
  restaurant_id: string
  subscription_id: string
  billing_period: string
  item_type: 'base_fee' | 'extra_user' | 'extra_store' | 'overage' | 'add_on'
  description: string
  quantity: number
  unit_price: number
  total_amount: number
  billing_date: Date
  period_start: Date
  period_end: Date
  status: PaymentStatus
  invoice_id?: string
}

// ============================================================================
// 餐廳使用量統計
// ============================================================================

export interface RestaurantUsageMetrics extends BaseEntity {
  restaurant_id: string
  period: string
  active_users: number
  active_stores: number
  orders_placed: number
  products_managed: number
  api_calls_made: number
  storage_used_gb: number
  export_records: number
  feature_usage: Record<FeatureFlag, number>
  last_activity_date: Date
}

// ============================================================================
// 餐廳發票
// ============================================================================

export interface RestaurantInvoice extends BaseEntity {
  invoice_number: string
  restaurant_id: string
  subscription_id: string
  billing_period: string
  issue_date: Date
  due_date: Date
  total_amount: number
  tax_amount: number
  status: PaymentStatus
  payment_date?: Date
  payment_method?: string
  line_items: RestaurantBillingItem[]
  notes?: string
  pdf_url?: string
}

// ============================================================================
// 餐廳方案升級/降級
// ============================================================================

export interface RestaurantPlanChange extends BaseEntity {
  restaurant_id: string
  from_plan: RestaurantPlanType
  to_plan: RestaurantPlanType
  change_type: 'upgrade' | 'downgrade' | 'modification'
  reason: string
  requested_by: string
  approved_by?: string
  effective_date: Date
  proration_amount?: number
  status: 'pending' | 'approved' | 'rejected' | 'completed'
}

// ============================================================================
// 餐廳功能使用限制
// ============================================================================

export interface RestaurantFeatureLimit {
  restaurant_id: string
  feature: FeatureFlag
  limit_type: 'count' | 'storage' | 'api_calls'
  current_usage: number
  limit_value: number
  reset_period: 'daily' | 'monthly' | 'yearly'
  last_reset_date: Date
  is_exceeded: boolean
  warning_threshold: number
}

// ============================================================================
// API 響應類型
// ============================================================================

export interface RestaurantPlanListResponse {
  plans: RestaurantPlan[]
  current_plan?: RestaurantPlanType
  recommended_plan?: RestaurantPlanType
  upgrade_benefits?: string[]
}

export interface RestaurantSubscriptionResponse {
  subscription: RestaurantSubscription
  current_usage: RestaurantUsageMetrics
  billing_history: RestaurantInvoice[]
  upcoming_charges: RestaurantBillingItem[]
  feature_limits: RestaurantFeatureLimit[]
}

export interface RestaurantBillingMetrics {
  period: {
    start: Date
    end: Date
  }
  total_restaurants: number
  total_revenue: number
  plan_distribution: {
    [key in RestaurantPlanType]: {
      count: number
      percentage: number
      revenue: number
    }
  }
  churn_rate: number
  upgrade_rate: number
  average_revenue_per_user: number
  top_customers: Array<{
    restaurant_id: string
    restaurant_name: string
    plan_type: RestaurantPlanType
    monthly_fee: number
    user_count: number
    store_count: number
  }>
}

// ============================================================================
// 查詢參數
// ============================================================================

export interface RestaurantSubscriptionQueryParams {
  page?: number
  limit?: number
  restaurant_id?: string
  plan_type?: RestaurantPlanType[]
  status?: RestaurantContractStatus[]
  billing_cycle?: BillingCycle[]
  min_fee?: number
  max_fee?: number
  is_trial?: boolean
  sortBy?: 'created_at' | 'monthly_fee' | 'user_count' | 'next_billing_date'
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface RestaurantBillingQueryParams {
  page?: number
  limit?: number
  restaurant_id?: string
  date_range?: [Date, Date]
  status?: PaymentStatus[]
  min_amount?: number
  max_amount?: number
  item_type?: string[]
}

// ============================================================================
// 餐廳計費計算
// ============================================================================

export interface RestaurantFeeCalculationInput {
  restaurant_id?: string
  plan_type: RestaurantPlanType
  billing_cycle: BillingCycle
  user_count: number
  store_count: number
  additional_features?: FeatureFlag[]
}

export interface RestaurantFeeCalculationResult {
  base_fee: number
  extra_user_fee: number
  extra_store_fee: number
  add_on_fees: number
  subtotal: number
  tax_amount: number
  total_amount: number
  billing_cycle: BillingCycle
  breakdown: {
    base_plan: {
      name: string
      monthly_fee: number
      included_users: number
      included_stores: number
    }
    overages: {
      extra_users: number
      extra_user_cost: number
      extra_stores: number
      extra_store_cost: number
    }
    add_ons: Array<{
      feature: FeatureFlag
      name: string
      monthly_cost: number
    }>
  }
  savings?: {
    yearly_discount: number
    quarterly_discount: number
  }
}

// ============================================================================
// 餐廳試用期管理
// ============================================================================

export interface RestaurantTrial extends BaseEntity {
  restaurant_id: string
  trial_plan: RestaurantPlanType
  trial_duration_days: number
  start_date: Date
  end_date: Date
  features_enabled: FeatureFlag[]
  usage_tracking: RestaurantUsageMetrics
  conversion_status: 'active' | 'converted' | 'expired' | 'cancelled'
  conversion_date?: Date
  cancellation_reason?: string
}
