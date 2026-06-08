// 導出所有共享類型定義
export * from './logging'
export * from './customer-hierarchy'
export * from './supplier'
export * from './notification'
export * from './social-auth'

import type { SocialBinding } from './social-auth'

// 用戶／權限類型
export type TenantType = 'restaurant' | 'supplier' | 'platform'

export type UserRole =
  | 'restaurant_admin'
  | 'restaurant_manager'
  | 'restaurant_operator'
  | 'supplier_admin'
  | 'supplier_manager'
  | 'supplier_operator'
  | 'platform_admin'
  | 'platform_support'
  | 'super_admin'

export type UserStatus = 'active' | 'suspended' | 'pending'

export interface UserPermissions {
  features?: string[]
  scopes?: string[]
  [key: string]: unknown
}

export interface UserProfile {
  id: string
  tenantId: string
  tenantType: TenantType
  role: UserRole
  permissions: UserPermissions | string[] // string[] for簡化的權限列表
  email?: string
  phone?: string
  displayName?: string
  avatarUrl?: string
  socialBindings?: SocialBinding[]
  locale?: string
  timezone?: string
  status: UserStatus
  mfaEnabled?: boolean
  lastLoginAt?: string | Date
  createdAt: string | Date
  updatedAt: string | Date
}

// 兼容舊版的基本 User 介面
export interface User {
  id: string
  email?: string
  role: 'RESTAURANT' | 'SUPPLIER' | 'ADMIN' | UserRole
  socialBindings?: SocialBinding[]
  createdAt: Date
  updatedAt: Date
}

export interface AuthClaims {
  sub: string
  email?: string
  tenant_id: string
  org_id?: string
  role: UserRole
  permissions?: UserPermissions | string[]
  tenant_type?: TenantType
  org_type?: TenantType
  token_version?: number
}

// ============================================================================
// 產品與 SKU 共享類型
// ============================================================================

export enum ProductState {
  RAW = 'raw', // 原材料
  PROCESSED = 'processed', // 加工品
}

export enum TaxStatus {
  TAXABLE = 'taxable', // 應稅
  TAX_EXEMPT = 'tax_exempt', // 免稅
}

export enum AllergenType {
  GLUTEN = 'gluten', // 麩質
  CRUSTACEAN = 'crustacean', // 甲殼類
  EGG = 'egg', // 蛋類
  FISH = 'fish', // 魚類
  PEANUT = 'peanut', // 花生
  SOY = 'soy', // 大豆
  MILK = 'milk', // 乳製品
  NUTS = 'nuts', // 堅果類
  CELERY = 'celery', // 芹菜
  MUSTARD = 'mustard', // 芥末
  SESAME = 'sesame', // 芝麻
  SULFUR = 'sulfur', // 亞硫酸鹽
  LUPIN = 'lupin', // 羽扇豆
  MOLLUSKS = 'mollusks', // 軟體動物
}

export enum AllergenSeverity {
  LOW = 'low', // 低風險
  MEDIUM = 'medium', // 中風險
  HIGH = 'high', // 高風險
  SEVERE = 'severe', // 嚴重風險
}

// 產品分類介面
export interface ProductCategory {
  id: string
  code: string // 4字元分類碼
  name: string // 中文名稱
  nameEn: string // 英文名稱
  parentId?: string // 父分類ID
  level: number // 分類層級
  description?: string
  metadata: Record<string, unknown>
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  parent?: ProductCategory
  children?: ProductCategory[]
}

// 主產品介面
export interface Product {
  id: string
  supplierId?: string
  categoryId: string
  code: string // 產品代碼
  name: string // 產品名稱
  nameEn?: string // 英文名稱
  description?: string

  // 產品屬性
  brand?: string // 品牌
  origin?: string // 產地
  productState: ProductState // 產品狀態
  taxStatus: TaxStatus // 稅務狀態

  // 過敏原追蹤
  allergenTrackingEnabled: boolean
  allergens?: ProductAllergen[]

  // 營養資訊
  nutrition?: ProductNutrition

  // 單位與規格
  baseUnit: string // 基本單位
  pricingUnit: string // 定價單位
  specifications: Record<string, unknown>

  // 狀態
  version: number
  isActive: boolean
  isPublic: boolean // 是否公開可見

  // 認證與安全
  certifications: string[]
  safetyInfo: Record<string, unknown>

  // 時間戳
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string

  // 關聯物件
  category?: ProductCategory
  skus?: ProductSKU[]
  supplierProducts?: SupplierProduct[]
}

// SKU 介面
export interface ProductSKU {
  id: string
  productId: string
  skuCode: string // SKU 唯一代碼
  name: string // SKU 名稱
  variant: Record<string, unknown> // 規格變體

  // 物理屬性
  weight?: number // 重量
  dimensions?: {
    // 尺寸
    length: number
    width: number
    height: number
  }
  packageType?: string // 包裝類型

  // 保存期限
  shelfLifeDays?: number // 保存期限（天）
  storageConditions?: string // 儲存條件

  // 批次追蹤
  batchTrackingEnabled: boolean

  // 狀態
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// 過敏原介面
export interface ProductAllergen {
  id: string
  productId: string
  allergenType: AllergenType
  severity: AllergenSeverity
  notes?: string
  isActive: boolean
  createdAt: Date
}

// 營養資訊介面
export interface ProductNutrition {
  id: string
  productId: string
  servingSize?: string // 每份重量
  servingUnit?: string // 每份單位

  // 營養成分
  calories?: number // 卡路里
  protein?: number // 蛋白質 (g)
  fat?: number // 脂肪 (g)
  saturatedFat?: number // 飽和脂肪 (g)
  carbohydrates?: number // 碳水化合物 (g)
  sugars?: number // 糖分 (g)
  fiber?: number // 纖維 (g)
  sodium?: number // 鈉 (mg)

  // 額外營養資訊
  additionalNutrients: Record<string, unknown>
  nutritionClaims: string[] // 營養聲明

  createdAt: Date
  updatedAt: Date
}

// 供應商產品介面
export interface SupplierProduct {
  id: string
  supplierId: string
  productId: string
  supplierProductCode: string // 供應商內部產品代碼

  // 供應商特定資訊
  supplierName?: string // 供應商對此產品的命名
  leadTime?: number // 前置時間（天）
  minOrderQty: number
  maxOrderQty?: number

  // 定價與品質
  pricing: Record<string, unknown> // 彈性定價規則
  isPreferred: boolean // 是否為首選供應商
  qualityGrade?: string // 品質等級
  qualityNotes?: string

  // 狀態
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// API 響應標準格式
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta?: {
    requestId: string
    timestamp: string
    version: string
  }
}

// 分頁相關類型
export interface PaginationQuery {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationResponse<T> {
  items: T[]
  totalItems: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// 健康檢查類型
export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded'
  version: string
  uptime: number
  timestamp: string
  checks: {
    database: HealthCheckResult
    redis: HealthCheckResult
    externalServices?: HealthCheckResult[]
  }
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy'
  response_time?: number
  error?: string
}
