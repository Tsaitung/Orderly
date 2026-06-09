/**
 * TypeScript interfaces for Product Management API
 * These interfaces define the product catalog management types
 */

// ============================================================================
// Base Product Types
// ============================================================================

export type ProductStatus = 'active' | 'inactive' | 'discontinued' | 'out_of_stock'
export type ProductCategory =
  | 'fresh_produce'
  | 'meat_seafood'
  | 'dairy'
  | 'pantry'
  | 'frozen'
  | 'beverages'
  | 'other'
export type PriceType = 'fixed' | 'tiered' | 'negotiable'
export type UnitType = 'kg' | 'g' | 'piece' | 'box' | 'case' | 'liter' | 'ml'

// ============================================================================
// Core Product Data Models
// ============================================================================

export interface Product {
  id: string
  organization_id: string
  sku: string
  name: string
  description?: string
  category: ProductCategory
  subcategory?: string
  status: ProductStatus
  unit_type: UnitType
  base_price: number
  currency: string
  price_type: PriceType
  min_order_quantity: number
  max_order_quantity?: number
  packaging_info: PackagingInfo
  images: ProductImage[]
  specifications: Record<string, any>
  tags: string[]
  variants: ProductVariant[]
  quality_info: QualityInfo
  supplier_notes?: string
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface PackagingInfo {
  package_type: string // box, bag, case, etc.
  units_per_package: number
  package_weight_kg?: number
  package_dimensions?: {
    length_cm: number
    width_cm: number
    height_cm: number
  }
  refrigeration_required: boolean
  shelf_life_days?: number
}

export interface ProductImage {
  id: string
  url: string
  alt_text?: string
  is_primary: boolean
  sort_order: number
  uploaded_at: string
}

export interface ProductVariant {
  id: string
  name: string
  sku_suffix: string
  attributes: Record<string, string> // size: 'large', color: 'red', etc.
  price_modifier: number // price difference from base
  is_active: boolean
}

export interface QualityInfo {
  origin?: string
  harvest_date?: string
  expiry_date?: string
  organic_certified: boolean
  quality_grade?: string
  storage_instructions?: string
  allergen_info?: string[]
}

// ============================================================================
// Product API Request/Response Types
// ============================================================================

export interface ProductFilters {
  search_query?: string
  category?: ProductCategory
  subcategory?: string
  status?: ProductStatus
  price_min?: number
  price_max?: number
  is_featured?: boolean
  tags?: string[]
  created_from?: string
  created_to?: string
  sort_by?: 'name' | 'price' | 'created_at' | 'category'
  sort_order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export interface ProductCreateRequest {
  sku: string
  name: string
  description?: string
  category: ProductCategory
  subcategory?: string
  unit_type: UnitType
  base_price: number
  price_type: PriceType
  min_order_quantity: number
  max_order_quantity?: number
  packaging_info: Omit<PackagingInfo, 'package_dimensions'> & {
    package_dimensions?: {
      length_cm: number
      width_cm: number
      height_cm: number
    }
  }
  specifications?: Record<string, any>
  tags?: string[]
  quality_info?: Partial<QualityInfo>
  supplier_notes?: string
  is_featured?: boolean
}

export interface ProductUpdateRequest extends Partial<ProductCreateRequest> {
  status?: ProductStatus
}

export interface BulkProductOperation {
  product_ids: string[]
  operation: 'update_status' | 'update_price' | 'delete'
  data: {
    status?: ProductStatus
    price_modifier?: number
    notes?: string
  }
}

export interface ProductPriceUpdate {
  product_id: string
  variant_id?: string
  new_price: number
  effective_date?: string
  reason?: string
  notes?: string
}

// ============================================================================
// Product Analytics Types
// ============================================================================

export interface ProductPerformance {
  product_id: string
  product_name: string
  total_orders: number
  total_quantity_sold: number
  total_revenue: number
  average_order_quantity: number
  conversion_rate: number
  profit_margin: number
  customer_rating?: number
  review_count: number
  last_sold_at?: string
  trend: 'increasing' | 'stable' | 'decreasing'
  period_start: string
  period_end: string
}

export interface CategoryPerformance {
  category: ProductCategory
  product_count: number
  total_revenue: number
  average_price: number
  total_orders: number
  conversion_rate: number
  growth_rate: number
}

// ============================================================================
// Product Categories and Hierarchies
// ============================================================================

export interface ProductCategoryDefinition {
  id: string
  code: ProductCategory
  name: string
  description: string
  parent_id?: string
  level: number
  icon?: string
  sort_order: number
  subcategories: ProductSubcategory[]
  is_active: boolean
}

export interface ProductSubcategory {
  id: string
  code: string
  name: string
  description?: string
  category_id: string
  sort_order: number
  is_active: boolean
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ProductListResponse {
  products: Product[]
  pagination: {
    page: number
    page_size: number
    total_count: number
    total_pages: number
    has_next: boolean
    has_previous: boolean
  }
  filters: ProductFilters
  summary: {
    total_products: number
    active_products: number
  }
}

export interface ProductStatsResponse {
  total_products: number
  active_products: number
  discontinued_products: number
  categories: CategoryPerformance[]
  recent_activity: {
    new_products_week: number
    updated_products_week: number
  }
}

// ============================================================================
// Image Upload Types
// ============================================================================

export interface ImageUploadRequest {
  file: File
  alt_text?: string
  is_primary?: boolean
}

export interface ImageUploadResponse {
  id: string
  url: string
  thumbnail_url: string
  alt_text?: string
  is_primary: boolean
  file_size_bytes: number
  mime_type: string
  uploaded_at: string
}
