/**
 * TypeScript interfaces for Supplier Service API
 * These interfaces match the backend Pydantic schemas
 */

// ============================================================================
// Base Types
// ============================================================================

export type SupplierStatus = 'pending' | 'verified' | 'suspended' | 'deactivated'
export type DeliveryCapacity = 'SMALL' | 'MEDIUM' | 'LARGE'
export type BusinessType = 'company' | 'individual'
export type RelationshipType = 'active' | 'inactive' | 'blocked' | 'pending'

// ============================================================================
// Core Data Models
// ============================================================================

export interface SupplierProfile {
  id: string
  organization_id: string
  status: SupplierStatus
  verified_at?: string
  verified_by?: string
  delivery_capacity: DeliveryCapacity
  delivery_capacity_kg_per_day: number
  operating_hours: OperatingHours
  delivery_zones: string[]
  minimum_order_amount: number
  payment_terms_days: number
  quality_certifications: QualityCertification[]
  contact_preferences: ContactPreferences
  public_description?: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface OperatingHours {
  monday?: DaySchedule
  tuesday?: DaySchedule
  wednesday?: DaySchedule
  thursday?: DaySchedule
  friday?: DaySchedule
  saturday?: DaySchedule
  sunday?: DaySchedule
}

export interface DaySchedule {
  open: string // HH:MM format
  close: string // HH:MM format
  is_closed: boolean
}

export interface QualityCertification {
  name: string
  number: string
  expires_at?: string
  issuer?: string
  document_url?: string
}

export interface ContactPreferences {
  email_notifications: boolean
  sms_notifications: boolean
  whatsapp_notifications?: boolean
  preferred_contact_time?: string
  emergency_contact?: string
}

export interface SupplierCustomer {
  id: string
  supplier_id: string
  customer_id: string
  relationship_type: RelationshipType
  credit_limit_ntd: number
  payment_terms_days: number
  first_order_date?: string
  last_order_date?: string
  total_orders: number
  total_revenue_ntd: number
  custom_pricing_rules: Record<string, any>
  special_delivery_instructions?: string
  notes?: string
  created_at: string
  updated_at: string
  // Populated customer data
  customer_name?: string
  customer_email?: string
  customer_address?: string
}

export interface OnboardingProgress {
  id: string
  supplier_id: string
  step_company_info: boolean
  step_company_info_completed_at?: string
  step_business_documents: boolean
  step_business_documents_completed_at?: string
  step_delivery_setup: boolean
  step_delivery_setup_completed_at?: string
  step_product_categories: boolean
  step_product_categories_completed_at?: string
  step_verification: boolean
  step_verification_completed_at?: string
  is_completed: boolean
  completed_at?: string
  completion_percentage: number
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  created_at: string
  updated_at: string
}

// ============================================================================
// Dashboard & Analytics
// ============================================================================

export interface SupplierDashboardMetrics {
  // Today's metrics
  today_orders: number
  today_completed_orders: number
  today_revenue: number

  // Week metrics
  week_orders: number
  week_revenue: number

  // Month metrics
  month_orders: number
  month_revenue: number

  // Performance metrics
  active_customers: number
  avg_order_value: number
  on_time_delivery_rate: number
  customer_satisfaction_rate: number

  // Status counts
  pending_orders: number
  in_progress_orders: number
  completed_orders_today: number
}

export interface SupplierDashboard {
  supplier_profile: SupplierProfile
  metrics: SupplierDashboardMetrics
  recent_orders: SupplierOrder[]
  top_customers: CustomerInsight[]
  alerts: DashboardAlert[]
}

export interface CustomerInsight {
  customer_id: string
  customer_name: string
  total_orders: number
  total_revenue: number
  last_order_date: string
  growth_rate: number
}

export interface DashboardAlert {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  action_url?: string
  action_text?: string
  created_at: string
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface SupplierProfileCreateRequest {
  organization_id: string
  delivery_capacity?: DeliveryCapacity
  delivery_capacity_kg_per_day?: number
  operating_hours?: OperatingHours
  delivery_zones?: string[]
  minimum_order_amount?: number
  payment_terms_days?: number
  quality_certifications?: QualityCertification[]
  contact_preferences?: ContactPreferences
  public_description?: string
}

export interface SupplierProfileUpdateRequest {
  delivery_capacity?: DeliveryCapacity
  delivery_capacity_kg_per_day?: number
  operating_hours?: OperatingHours
  delivery_zones?: string[]
  minimum_order_amount?: number
  payment_terms_days?: number
  quality_certifications?: QualityCertification[]
  contact_preferences?: ContactPreferences
  public_description?: string
  settings?: Record<string, any>
}

export interface SupplierCustomerCreateRequest {
  supplier_id: string
  customer_id: string
  relationship_type?: RelationshipType
  credit_limit_ntd?: number
  payment_terms_days?: number
  custom_pricing_rules?: Record<string, any>
  special_delivery_instructions?: string
  notes?: string
}

export interface SupplierStatusUpdateRequest {
  status: SupplierStatus
  notes?: string
}

export interface OnboardingStepUpdateRequest {
  step_name: string
  step_data?: Record<string, any>
}

// ============================================================================
// Paginated Responses
// ============================================================================

export interface PaginationParams {
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  total_count: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

export interface SupplierListResponse extends PaginatedResponse<SupplierProfile> {
  suppliers: SupplierProfile[]
}

export interface SupplierCustomerListResponse extends PaginatedResponse<SupplierCustomer> {
  customers: SupplierCustomer[]
}

// ============================================================================
// Filter and Search Types
// ============================================================================

export interface SupplierFilterParams extends PaginationParams {
  status?: SupplierStatus
  delivery_capacity?: DeliveryCapacity
  delivery_zone?: string
  min_capacity_kg?: number
  max_capacity_kg?: number
  verified_only?: boolean
  search_query?: string
}

export interface CustomerFilterParams extends PaginationParams {
  relationship_type?: RelationshipType
  min_revenue?: number
  max_revenue?: number
  has_recent_orders?: boolean
  search_query?: string
}

// ============================================================================
// API Response Wrapper
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
  timestamp: string
}

export interface ApiError {
  message: string
  error_code?: string
  details?: Record<string, any>
  status: number
}

// ============================================================================
// Form Types
// ============================================================================

export interface SupplierProfileFormData {
  delivery_capacity: DeliveryCapacity
  delivery_capacity_kg_per_day: number
  operating_hours: OperatingHours
  delivery_zones: string[]
  minimum_order_amount: number
  payment_terms_days: number
  quality_certifications: QualityCertification[]
  contact_preferences: ContactPreferences
  public_description?: string
}

export interface CustomerFormData {
  customer_id: string
  relationship_type: RelationshipType
  credit_limit_ntd: number
  payment_terms_days: number
  custom_pricing_rules: Record<string, any>
  special_delivery_instructions?: string
  notes?: string
}

export interface OnboardingStepData {
  step_name: string
  company_info?: {
    business_description: string
    years_in_business: number
    employee_count: number
  }
  delivery_setup?: {
    delivery_capacity: DeliveryCapacity
    delivery_zones: string[]
    operating_hours: OperatingHours
  }
  business_documents?: {
    business_license: string
    food_safety_license: string
    tax_certificate: string
  }
  product_categories?: {
    categories: string[]
    specialties: string[]
  }
  verification?: {
    terms_accepted: boolean
    data_processing_consent: boolean
  }
}

// ============================================================================
// UI State Types
// ============================================================================

export interface LoadingState {
  profile: boolean
  dashboard: boolean
  customers: boolean
  onboarding: boolean
  metrics: boolean
}

export interface ErrorState {
  profile: string | null
  dashboard: string | null
  customers: string | null
  onboarding: string | null
  metrics: string | null
}

// ============================================================================
// Constants
// ============================================================================

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  pending: '待審核',
  verified: '已驗證',
  suspended: '暫停',
  deactivated: '停用',
}

export const DELIVERY_CAPACITY_LABELS: Record<DeliveryCapacity, string> = {
  SMALL: '小型 (< 500kg/天)',
  MEDIUM: '中型 (500-2000kg/天)',
  LARGE: '大型 (> 2000kg/天)',
}

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  active: '活躍',
  inactive: '非活躍',
  blocked: '已封鎖',
  pending: '待確認',
}

export const ONBOARDING_STEPS = [
  { key: 'company_info', name: '公司資訊', description: '完善公司基本資料' },
  { key: 'business_documents', name: '商業文件', description: '上傳必要證件' },
  { key: 'delivery_setup', name: '配送設定', description: '設定配送能力和範圍' },
  { key: 'product_categories', name: '產品類別', description: '選擇經營產品類別' },
  { key: 'verification', name: '驗證審核', description: '等待平台審核' },
] as const

// ============================================================================
// Order Management Types
// ============================================================================

export type OrderStatus =
  | 'pending' // 待確認
  | 'confirmed' // 已確認
  | 'preparing' // 準備中
  | 'ready_for_pickup' // 可提貨
  | 'in_transit' // 配送中
  | 'delivered' // 已送達
  | 'cancelled' // 已取消
  | 'disputed' // 有爭議

export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  sku: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  notes?: string
}

export interface SupplierOrder {
  id: string
  order_number: string
  customer_id: string
  customer_name: string
  customer_code?: string
  status: OrderStatus
  priority: OrderPriority
  items: OrderItem[]
  subtotal: number
  tax_amount: number
  total_amount: number
  currency: string
  order_date: string
  requested_delivery_date?: string
  confirmed_delivery_date?: string
  actual_delivery_date?: string
  delivery_address: string
  delivery_instructions?: string
  internal_notes?: string
  customer_notes?: string
  created_at: string
  updated_at: string
}

export interface OrderStats {
  total_orders: number
  pending_orders: number
  confirmed_orders: number
  completed_orders: number
  cancelled_orders: number
  total_revenue: number
  avg_order_value: number
  completion_rate: number
}

export interface OrderFilterParams {
  page?: number
  page_size?: number
  status?: OrderStatus
  priority?: OrderPriority
  customer_id?: string
  date_from?: string
  date_to?: string
  search_query?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface OrderListResponse {
  orders: SupplierOrder[]
  total_count: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待確認',
  confirmed: '已確認',
  preparing: '準備中',
  ready_for_pickup: '可提貨',
  in_transit: '配送中',
  delivered: '已送達',
  cancelled: '已取消',
  disputed: '有爭議',
}

export const ORDER_PRIORITY_LABELS: Record<OrderPriority, string> = {
  low: '低',
  normal: '一般',
  high: '高',
  urgent: '緊急',
}
