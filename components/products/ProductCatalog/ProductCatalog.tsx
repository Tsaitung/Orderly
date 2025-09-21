'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  ShoppingCart, 
  Star,
  AlertTriangle,
  MapPin,
  Building2,
  Leaf,
  ShieldCheck,
  Package
} from 'lucide-react'
import { CategoryTree } from './CategoryTree'
import { ProductGrid } from './ProductGrid'
import { ProductFilters } from './ProductFilters'
import { AllergenBadges } from './AllergenBadges'
import { TaxStatusIndicator } from './TaxStatusIndicator'

// 類型定義
interface Product {
  id: string
  code: string
  name: string
  nameEn?: string
  description?: string
  brand?: string
  origin?: string
  productState: 'raw' | 'processed'
  taxStatus: 'taxable' | 'tax_exempt'
  allergenTrackingEnabled: boolean
  baseUnit: string
  pricingUnit: string
  specifications: any
  version: number
  isActive: boolean
  isPublic: boolean
  certifications: string[]
  safetyInfo: any
  createdAt: string
  updatedAt: string
  category?: {
    id: string
    code: string
    name: string
    nameEn: string
    level: number
  }
  allergens?: Array<{
    allergenType: string
    severity: string
    notes?: string
  }>
  nutrition?: {
    calories?: number
    protein?: number
    fat?: number
    carbohydrates?: number
    nutritionClaims: string[]
  }
  skus?: Array<{
    id: string
    skuCode: string
    name: string
    isActive: boolean
  }>
  _count?: {
    skus: number
  }
}

interface ProductFilters {
  search?: string
  categoryId?: string
  brand?: string[]
  origin?: string[]
  productState?: string[]
  taxStatus?: string[]
  allergenTypes?: string[]
  hasAllergenTracking?: boolean
  isActive?: boolean
  isPublic?: boolean
  hasStock?: boolean
  hasNutrition?: boolean
  hasCertifications?: boolean
}

interface ProductCatalogProps {
  // 餐廳模式 vs 供應商模式
  mode?: 'restaurant' | 'supplier'
  // 是否顯示價格 (可能需要登入)
  showPricing?: boolean
  // 是否可以添加到購物車
  allowAddToCart?: boolean
  // 預設過濾條件
  defaultFilters?: Partial<ProductFilters>
  // 事件回調
  onProductSelect?: (product: Product) => void
  onAddToCart?: (product: Product, skuId?: string) => void
}

export function ProductCatalog({
  mode = 'restaurant',
  showPricing = true,
  allowAddToCart = true,
  defaultFilters = {},
  onProductSelect,
  onAddToCart
}: ProductCatalogProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ProductFilters>({
    isActive: true,
    isPublic: true,
    ...defaultFilters
  })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  })

  // 載入產品數據
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams()
      
      // 基本參數
      queryParams.append('page', pagination.currentPage.toString())
      queryParams.append('limit', pagination.itemsPerPage.toString())
      
      // 篩選參數
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.categoryId || selectedCategory) {
        queryParams.append('categoryId', filters.categoryId || selectedCategory || '')
      }
      if (filters.brand?.length) {
        filters.brand.forEach(b => queryParams.append('brand', b))
      }
      if (filters.origin?.length) {
        filters.origin.forEach(o => queryParams.append('origin', o))
      }
      if (filters.productState?.length) {
        filters.productState.forEach(s => queryParams.append('productState', s))
      }
      if (filters.taxStatus?.length) {
        filters.taxStatus.forEach(t => queryParams.append('taxStatus', t))
      }
      if (filters.allergenTypes?.length) {
        filters.allergenTypes.forEach(a => queryParams.append('allergenTypes', a))
      }
      if (filters.hasAllergenTracking !== undefined) {
        queryParams.append('hasAllergenTracking', filters.hasAllergenTracking.toString())
      }
      if (filters.isActive !== undefined) {
        queryParams.append('isActive', filters.isActive.toString())
      }
      if (filters.isPublic !== undefined) {
        queryParams.append('isPublic', filters.isPublic.toString())
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/products?${queryParams.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setProducts(data.data.products)
        setPagination(data.data.pagination)
      } else {
        throw new Error(data.error || 'Failed to load products')
      }
    } catch (err) {
      console.error('Error loading products:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [filters, selectedCategory, pagination.currentPage, pagination.itemsPerPage])

  // 初始載入和依賴更新
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // 處理搜尋
  const handleSearch = useCallback((searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }))
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }, [])

  // 處理分類選擇
  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId)
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }, [])

  // 處理篩選器變更
  const handleFiltersChange = useCallback((newFilters: Partial<ProductFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }, [])

  // 處理分頁
  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // 處理產品選擇
  const handleProductSelect = useCallback((product: Product) => {
    onProductSelect?.(product)
  }, [onProductSelect])

  // 處理添加到購物車
  const handleAddToCart = useCallback((product: Product, skuId?: string) => {
    onAddToCart?.(product, skuId)
  }, [onAddToCart])

  return (
    <div className="w-full space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'restaurant' ? '產品目錄' : '我的產品'}
          </h1>
          <p className="text-gray-600 mt-1">
            {mode === 'restaurant' 
              ? '瀏覽供應商產品，支援過敏原篩選和產地追蹤' 
              : '管理您的產品目錄和SKU變體'}
          </p>
        </div>
        
        {/* 視圖控制 */}
        <div className="flex items-center space-x-3">
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 搜尋列 */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜尋產品名稱、代碼、品牌或產地..."
              value={filters.search || ''}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>
        </CardContent>
      </Card>

      {/* 主要內容區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左側欄：分類樹和篩選器 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 分類導航 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">產品分類</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryTree
                selectedCategoryId={selectedCategory}
                onCategorySelect={handleCategorySelect}
              />
            </CardContent>
          </Card>

          {/* 篩選器 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                進階篩選
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                mode={mode}
              />
            </CardContent>
          </Card>
        </div>

        {/* 右側：產品列表 */}
        <div className="lg:col-span-3">
          {/* 結果統計和排序 */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              {loading ? (
                '載入中...'
              ) : error ? (
                <span className="text-red-600">載入錯誤: {error}</span>
              ) : (
                `顯示 ${((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}-${Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} 項，共 ${pagination.totalItems} 項產品`
              )}
            </div>

            {/* 重新載入按鈕 */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadProducts}
              disabled={loading}
            >
              重新載入
            </Button>
          </div>

          {/* 產品網格/列表 */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-500">載入產品中...</p>
              </div>
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">載入失敗</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={loadProducts} variant="outline">
                  重試
                </Button>
              </CardContent>
            </Card>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">沒有找到產品</h3>
                <p className="text-gray-600 mb-4">
                  請嘗試調整搜尋條件或篩選器
                </p>
                <Button 
                  onClick={() => {
                    setFilters({ isActive: true, isPublic: true })
                    setSelectedCategory(null)
                  }}
                  variant="outline"
                >
                  清除篩選
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ProductGrid
              products={products}
              viewMode={viewMode}
              mode={mode}
              showPricing={showPricing}
              allowAddToCart={allowAddToCart}
              onProductSelect={handleProductSelect}
              onAddToCart={handleAddToCart}
            />
          )}

          {/* 分頁控制 */}
          {!loading && !error && products.length > 0 && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
              >
                上一頁
              </Button>
              
              {/* 頁碼 */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = pagination.currentPage <= 3 
                  ? i + 1 
                  : pagination.currentPage + i - 2
                  
                if (pageNum < 1 || pageNum > pagination.totalPages) return null
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.currentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
              >
                下一頁
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
