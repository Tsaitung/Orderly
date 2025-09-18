// ============================================================================
// 基礎類型定義
// ============================================================================

export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface User extends BaseEntity {
  email: string
  organizationId: string
  role: UserRole
  isActive: boolean
  lastLoginAt?: Date
  metadata?: Record<string, any>
}

export type UserRole = 
  | 'restaurant_admin'
  | 'restaurant_manager' 
  | 'restaurant_operator'
  | 'supplier_admin'
  | 'supplier_manager'
  | 'platform_admin'

export interface Organization extends BaseEntity {
  name: string
  type: OrganizationType
  settings: OrganizationSettings
  isActive: boolean
}

export type OrganizationType = 'restaurant' | 'supplier'

export interface OrganizationSettings {
  timezone?: string
  currency?: string
  language?: string
  reconciliationSettings?: ReconciliationSettings
  erpConfig?: ERPConfig
  notificationPreferences?: NotificationPreferences
}

// ============================================================================
// 產品相關類型
// ============================================================================

export interface Product extends BaseEntity {
  supplierId: string
  code: string
  name: string
  category: string
  pricing: ProductPricing
  specifications?: Record<string, any>
  version: number
  active: boolean
}

export interface ProductPricing {
  type: 'fixed' | 'market_price'
  basePrice?: number
  priceRules?: PriceRule[]
  currency: string
}

export interface PriceRule {
  condition: string
  value: number
  validFrom?: Date
  validTo?: Date
}

// ============================================================================
// 訂單相關類型
// ============================================================================

export interface Order extends BaseEntity {
  orderNumber: string
  restaurantId: string
  supplierId: string
  status: OrderStatus
  items: OrderItem[]
  adjustments?: OrderAdjustment[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  deliveryDate: Date
  deliveryAddress?: Address
  notes?: string
  createdBy: string
}

export type OrderStatus = 
  | 'draft'
  | 'submitted'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'accepted'
  | 'completed'
  | 'cancelled'

export interface OrderItem {
  id: string
  productCode: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  notes?: string
}

export interface OrderAdjustment {
  type: 'discount' | 'fee' | 'tax'
  description: string
  amount: number
}

export interface Address {
  street: string
  city: string
  district: string
  postalCode: string
  country: string
  coordinates?: {
    lat: number
    lng: number
  }
}

// ============================================================================
// 驗收相關類型
// ============================================================================

export interface AcceptanceRecord extends BaseEntity {
  orderId: string
  orderNumber: string
  acceptedBy: string
  acceptanceTime: Date
  acceptanceLocation: string
  items: AcceptedItem[]
  photos: AcceptancePhoto[]
  overallRating: 1 | 2 | 3 | 4 | 5
  notes?: string
  discrepancies: AcceptanceDiscrepancy[]
  status: AcceptanceStatus
  deliveryTime: Date
  requestedDeliveryTime: Date
  restaurantId: string
  supplierId: string
  temperature?: TemperatureRecord
  gpsLocation?: {
    lat: number
    lng: number
  }
}

export type AcceptanceStatus = 'in_progress' | 'completed' | 'disputed'

export interface AcceptedItem {
  id: string
  itemCode: string
  itemName: string
  orderedQuantity: number
  receivedQuantity: number
  unit: string
  qualityRating: 1 | 2 | 3 | 4 | 5
  condition: AcceptanceCondition
  expiryDate?: Date
  batchNumber?: string
  temperature?: number
  notes?: string
  photos: string[]
  specifications?: Record<string, any>
}

export type AcceptanceCondition = 'excellent' | 'good' | 'acceptable' | 'poor' | 'damaged'

export interface AcceptancePhoto {
  id: string
  url: string
  type: AcceptancePhotoType
  itemCode?: string
  caption?: string
  timestamp: Date
  gpsLocation?: {
    lat: number
    lng: number
  }
  metadata?: Record<string, any>
}

export type AcceptancePhotoType = 'overview' | 'item_detail' | 'quality_issue' | 'packaging' | 'temperature' | 'signature'

export interface AcceptanceDiscrepancy {
  id: string
  type: AcceptanceDiscrepancyType
  severity: AcceptanceDiscrepancySeverity
  itemCode: string
  description: string
  evidencePhotos: string[]
  proposedResolution: string
  financialImpact?: number
  status: 'open' | 'investigating' | 'resolved'
  resolvedBy?: string
  resolvedAt?: Date
  resolutionNotes?: string
}

export type AcceptanceDiscrepancyType = 
  | 'quantity_short'
  | 'quantity_over'
  | 'quality_issue'
  | 'packaging_damage'
  | 'expired'
  | 'wrong_item'
  | 'temperature_issue'
  | 'other'

export type AcceptanceDiscrepancySeverity = 'minor' | 'major' | 'critical'

export interface TemperatureRecord {
  recordedAt: Date
  temperature: number
  unit: 'celsius' | 'fahrenheit'
  location: string
  sensor?: string
  acceptable: boolean
  threshold?: {
    min: number
    max: number
  }
}

export interface AcceptanceWorkflow {
  id: string
  orderId: string
  currentStep: AcceptanceWorkflowStep
  steps: AcceptanceWorkflowStepStatus[]
  assignedTo: string
  dueAt: Date
  completedAt?: Date
  escalatedAt?: Date
  escalatedTo?: string
}

export type AcceptanceWorkflowStep = 
  | 'awaiting_delivery'
  | 'delivery_arrived'
  | 'quality_check'
  | 'quantity_verification'
  | 'photo_documentation'
  | 'temperature_check'
  | 'discrepancy_review'
  | 'final_approval'
  | 'completed'

export interface AcceptanceWorkflowStepStatus {
  step: AcceptanceWorkflowStep
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'
  startedAt?: Date
  completedAt?: Date
  assignedTo?: string
  notes?: string
}

export interface AcceptanceTemplate {
  id: string
  name: string
  supplierId: string
  itemCategories: string[]
  requiredPhotos: AcceptancePhotoType[]
  qualityChecks: QualityCheck[]
  temperatureRequired: boolean
  gpsRequired: boolean
  customFields?: AcceptanceCustomField[]
}

export interface QualityCheck {
  id: string
  name: string
  description: string
  required: boolean
  type: 'visual' | 'measurement' | 'temperature' | 'weight' | 'other'
  acceptanceCriteria: string
  failureAction: 'accept' | 'reject' | 'conditional'
}

export interface AcceptanceCustomField {
  id: string
  name: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'photo'
  required: boolean
  options?: string[]
  validation?: ValidationRule[]
}

export interface AcceptanceReport {
  id: string
  period: DatePeriod
  restaurantId: string
  supplierId?: string
  summary: AcceptanceReportSummary
  details: AcceptanceReportDetail[]
  trends: AcceptanceReportTrend[]
  recommendations: string[]
  generatedAt: Date
  generatedBy: string
}

export interface AcceptanceReportSummary {
  totalAcceptances: number
  averageRating: number
  onTimeDeliveries: number
  discrepancyRate: number
  completionRate: number
  averageProcessingTime: number
  costImpact: number
}

export interface AcceptanceReportDetail {
  supplierId: string
  supplierName: string
  totalOrders: number
  averageRating: number
  discrepancies: number
  onTimeRate: number
  qualityScore: number
}

export interface AcceptanceReportTrend {
  date: Date
  metric: string
  value: number
  previousValue?: number
  change?: number
}

// ============================================================================
// 對帳相關類型
// ============================================================================

export interface Reconciliation extends BaseEntity {
  reconciliationNumber: string
  periodStart: Date
  periodEnd: Date
  restaurantId: string
  supplierId: string
  status: ReconciliationStatus
  summary: ReconciliationSummary
  discrepancies: Discrepancy[]
  resolution?: ReconciliationResolution
  confidenceScore: number
  autoApproved: boolean
  createdBy: string
  approvedBy?: string
  approvedAt?: Date
}

export type ReconciliationStatus = 
  | 'pending'
  | 'processing'
  | 'review_required'
  | 'approved'
  | 'disputed'
  | 'resolved'

export interface ReconciliationSummary {
  totalOrders: number
  totalAmount: number
  matchedItems: number
  discrepancyItems: number
  autoMatchRate: number
  manualReviewRequired: number
}

export interface Discrepancy {
  id: string
  type: DiscrepancyType
  description: string
  expectedValue: any
  actualValue: any
  impact: 'low' | 'medium' | 'high'
  status: 'open' | 'investigating' | 'resolved'
  assignedTo?: string
  notes?: string
}

export type DiscrepancyType = 
  | 'quantity_mismatch'
  | 'price_difference'
  | 'missing_item'
  | 'extra_item'
  | 'quality_issue'
  | 'delivery_date'

export interface ReconciliationResolution {
  action: 'accept' | 'adjust' | 'credit' | 'dispute'
  amount?: number
  reason: string
  approvedBy: string
  approvedAt: Date
}

export interface ReconciliationSettings {
  autoApprovalThreshold: number
  confidenceThreshold: number
  reviewPeriod: number
  escalationRules: EscalationRule[]
}

export interface EscalationRule {
  condition: string
  action: string
  assignTo: string
  timeLimit: number
}

// ============================================================================
// ERP 整合相關類型
// ============================================================================

export interface ERPConfig {
  type: ERPType
  endpoint: string
  credentials: Record<string, string>
  syncSettings: ERPSyncSettings
  lastSyncAt?: Date
  status: ERPSyncStatus
}

export type ERPType = 'tiptop' | 'ding_xin' | 'zheng_da' | 'workflow' | 'custom'

export type ERPSyncStatus = 'connected' | 'syncing' | 'error' | 'offline'

export interface ERPSyncSettings {
  enabled: boolean
  interval: number // minutes
  autoSync: boolean
  syncItems: ERPSyncItem[]
}

export interface ERPSyncItem {
  type: 'orders' | 'products' | 'customers' | 'reconciliation'
  enabled: boolean
  mapping: Record<string, string>
  lastSync?: Date
}

export interface ERPSyncLog extends BaseEntity {
  organizationId: string
  type: string
  status: 'success' | 'error' | 'partial'
  message: string
  recordsProcessed: number
  errors?: ERPSyncError[]
}

export interface ERPSyncError {
  record: string
  error: string
  code?: string
}

// ============================================================================
// 通知相關類型
// ============================================================================

export interface Notification extends BaseEntity {
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  readAt?: Date
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

export type NotificationType = 
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'reconciliation_ready'
  | 'discrepancy_found'
  | 'payment_due'
  | 'erp_sync_error'
  | 'system_maintenance'

export interface NotificationPreferences {
  email: boolean
  sms: boolean
  push: boolean
  inApp: boolean
  frequency: 'immediate' | 'hourly' | 'daily'
  types: NotificationType[]
}

// ============================================================================
// API 相關類型
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
  pagination?: PaginationInfo
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: Date
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  params?: Record<string, any>
  timeout?: number
}

// ============================================================================
// 分析和報表相關類型
// ============================================================================

export interface AnalyticsData {
  period: DatePeriod
  metrics: AnalyticsMetric[]
  trends: TrendData[]
  comparisons?: ComparisonData[]
}

export interface DatePeriod {
  start: Date
  end: Date
  granularity: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
}

export interface AnalyticsMetric {
  name: string
  value: number
  unit: string
  change?: number
  changePercentage?: number
  trend: 'up' | 'down' | 'stable'
}

export interface TrendData {
  date: Date
  value: number
  category?: string
}

export interface ComparisonData {
  label: string
  current: number
  previous: number
  change: number
  changePercentage: number
}

// ============================================================================
// 系統健康和監控相關類型
// ============================================================================

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: ServiceHealth[]
  lastChecked: Date
  uptime: number
}

export interface ServiceHealth {
  name: string
  status: 'healthy' | 'unhealthy'
  responseTime?: number
  lastChecked: Date
  error?: string
  url?: string
}

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  threshold: number
  status: 'good' | 'warning' | 'critical'
  timestamp: Date
}

// ============================================================================
// 檔案上傳相關類型
// ============================================================================

export interface FileUpload {
  id: string
  filename: string
  originalName: string
  mimetype: string
  size: number
  url: string
  uploadedBy: string
  uploadedAt: Date
  metadata?: Record<string, any>
}

export interface FileUploadOptions {
  maxSize?: number
  allowedTypes?: string[]
  path?: string
  public?: boolean
}

// ============================================================================
// 工作流程相關類型
// ============================================================================

export interface WorkflowTask {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  data: Record<string, any>
  result?: any
  error?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  attempts: number
  maxAttempts: number
}

export interface QueueConfig {
  name: string
  concurrency: number
  retries: number
  backoff: {
    type: 'exponential' | 'fixed'
    delay: number
  }
}

// ============================================================================
// 搜尋和篩選相關類型
// ============================================================================

export interface SearchParams {
  query?: string
  filters?: FilterOption[]
  sort?: SortOption
  pagination?: {
    page: number
    limit: number
  }
}

export interface FilterOption {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'like'
  value: any
}

export interface SortOption {
  field: string
  direction: 'asc' | 'desc'
}

// ============================================================================
// UI 組件相關類型
// ============================================================================

export interface TableColumn<T = any> {
  key: keyof T
  title: string
  render?: (value: any, record: T) => React.ReactNode
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date'
  required?: boolean
  placeholder?: string
  options?: { label: string; value: any }[]
  validation?: ValidationRule[]
}

export interface ValidationRule {
  type: 'required' | 'email' | 'min' | 'max' | 'pattern'
  value?: any
  message: string
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// ============================================================================
// 環境和配置相關類型
// ============================================================================

export interface AppConfig {
  name: string
  version: string
  environment: 'development' | 'staging' | 'production'
  api: {
    baseUrl: string
    timeout: number
  }
  features: Record<string, boolean>
  integrations: {
    sentry?: {
      dsn: string
    }
    analytics?: {
      trackingId: string
    }
  }
}

// ============================================================================
// 實用類型
// ============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type NonEmptyArray<T> = [T, ...T[]]

export type ValueOf<T> = T[keyof T]

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]