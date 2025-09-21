'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Star, 
  ShoppingCart, 
  Eye,
  Package,
  MapPin,
  Building2,
  Leaf,
  ShieldCheck,
  AlertTriangle,
  Edit,
  MoreHorizontal
} from 'lucide-react'
import { AllergenBadges } from './AllergenBadges'
import { TaxStatusIndicator } from './TaxStatusIndicator'

// 產品介面類型
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
    stockQuantity: number
    minStock: number
    isActive: boolean
  }>
  _count?: {
    skus: number
  }
}

interface ProductGridProps {
  products: Product[]
  viewMode: 'grid' | 'list'
  mode: 'restaurant' | 'supplier'
  showPricing?: boolean
  allowAddToCart?: boolean
  onProductSelect?: (product: Product) => void
  onAddToCart?: (product: Product, skuId?: string) => void
}

export function ProductGrid({
  products,
  viewMode,
  mode,
  showPricing = true,
  allowAddToCart = true,
  onProductSelect,
  onAddToCart
}: ProductGridProps) {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  // 切換產品詳細資訊展開狀態
  const toggleExpanded = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  // 處理產品選擇
  const handleProductSelect = (product: Product) => {
    onProductSelect?.(product)
  }

  // 處理添加到購物車
  const handleAddToCart = (product: Product, skuId?: string) => {
    onAddToCart?.(product, skuId)
  }

  // 取得庫存狀態
  const getStockStatus = (product: Product) => {
    if (!product.skus || product.skus.length === 0) {
      return { label: '無庫存', variant: 'secondary' as const, color: 'text-gray-500' }
    }

    const totalStock = product.skus.reduce((sum, sku) => sum + sku.stockQuantity, 0)
    const totalMinStock = product.skus.reduce((sum, sku) => sum + sku.minStock, 0)

    if (totalStock === 0) {
      return { label: '缺貨', variant: 'destructive' as const, color: 'text-red-600' }
    } else if (totalStock <= totalMinStock) {
      return { label: '庫存不足', variant: 'warning' as const, color: 'text-orange-600' }
    } else {
      return { label: '有庫存', variant: 'success' as const, color: 'text-green-600' }
    }
  }

  // 取得產品狀態標籤
  const getProductStateLabel = (state: 'raw' | 'processed') => {
    return state === 'raw' ? '原材料' : '加工品'
  }

  // 網格視圖產品卡片
  const ProductCard = ({ product }: { product: Product }) => {
    const stockStatus = getStockStatus(product)
    const isExpanded = expandedProducts.has(product.id)

    return (
      <Card className="h-fit hover:shadow-md transition-all duration-200">
        <CardContent className="p-4">
          {/* 產品圖片區域 */}
          <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
            <Package className="h-12 w-12 text-gray-400" />
          </div>

          {/* 產品基本資訊 */}
          <div className="space-y-2">
            <div>
              <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
              {product.nameEn && (
                <p className="text-sm text-gray-500 line-clamp-1">{product.nameEn}</p>
              )}
            </div>

            {/* 產品代碼和分類 */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{product.code}</span>
              {product.category && (
                <Badge variant="outline" className="text-xs">
                  {product.category.name}
                </Badge>
              )}
            </div>

            {/* 品牌和產地 */}
            <div className="space-y-1">
              {product.brand && (
                <div className="flex items-center text-sm text-gray-600">
                  <Building2 className="h-3 w-3 mr-1" />
                  <span className="truncate">{product.brand}</span>
                </div>
              )}
              {product.origin && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span className="truncate">{product.origin}</span>
                </div>
              )}
            </div>

            {/* 產品狀態和稅務狀態 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Leaf className="h-3 w-3 mr-1 text-green-500" />
                <span className="text-sm text-gray-600">
                  {getProductStateLabel(product.productState)}
                </span>
              </div>
              <TaxStatusIndicator taxStatus={product.taxStatus} size="sm" />
            </div>

            {/* 過敏原信息 */}
            {product.allergenTrackingEnabled && product.allergens && product.allergens.length > 0 && (
              <AllergenBadges allergens={product.allergens} maxDisplay={3} />
            )}

            {/* 庫存狀態 */}
            <div className="flex items-center justify-between">
              <Badge variant={stockStatus.variant} className="text-xs">
                {stockStatus.label}
              </Badge>
              {product._count?.skus && (
                <span className="text-xs text-gray-500">
                  {product._count.skus} 個SKU
                </span>
              )}
            </div>

            {/* 認證標籤 */}
            {product.certifications && product.certifications.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.certifications.slice(0, 2).map(cert => (
                  <Badge key={cert} variant="outline" className="text-xs">
                    <ShieldCheck className="h-2 w-2 mr-1" />
                    {cert}
                  </Badge>
                ))}
                {product.certifications.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{product.certifications.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* 操作按鈕 */}
          <div className="mt-4 flex gap-2">
            {mode === 'restaurant' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleProductSelect(product)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  查看
                </Button>
                {allowAddToCart && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAddToCart(product)}
                    disabled={stockStatus.variant === 'destructive'}
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    加入
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleProductSelect(product)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  編輯
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleExpanded(product.id)}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>

          {/* 展開的詳細信息 (供應商模式) */}
          {isExpanded && mode === 'supplier' && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="text-sm">
                <h4 className="font-medium mb-2">SKU 詳情</h4>
                {product.skus && product.skus.length > 0 ? (
                  <div className="space-y-2">
                    {product.skus.slice(0, 3).map(sku => (
                      <div key={sku.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{sku.name}</div>
                          <div className="text-xs text-gray-500">{sku.skuCode}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{sku.stockQuantity}</div>
                          <div className="text-xs text-gray-500">庫存</div>
                        </div>
                      </div>
                    ))}
                    {product.skus.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        還有 {product.skus.length - 3} 個SKU...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">暫無SKU</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // 列表視圖產品行
  const ProductRow = ({ product }: { product: Product }) => {
    const stockStatus = getStockStatus(product)

    return (
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* 產品圖片 */}
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="h-6 w-6 text-gray-400" />
            </div>

            {/* 產品基本信息 */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
              <div className="md:col-span-2">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <div className="text-sm text-gray-500">
                  {product.code} | {product.brand}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {product.category && (
                    <Badge variant="outline" className="text-xs">
                      {product.category.name}
                    </Badge>
                  )}
                  <TaxStatusIndicator taxStatus={product.taxStatus} size="sm" />
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm font-medium">{product.origin || '未設定'}</div>
                <div className="text-xs text-gray-500">產地</div>
              </div>

              <div className="text-center">
                <div className="text-sm font-medium">
                  {getProductStateLabel(product.productState)}
                </div>
                <div className="text-xs text-gray-500">產品狀態</div>
              </div>

              <div className="text-center">
                <Badge variant={stockStatus.variant} className="text-xs">
                  {stockStatus.label}
                </Badge>
                {product._count?.skus && (
                  <div className="text-xs text-gray-500 mt-1">
                    {product._count.skus} SKU
                  </div>
                )}
              </div>

              <div className="text-center">
                {product.allergenTrackingEnabled && product.allergens && product.allergens.length > 0 ? (
                  <AllergenBadges allergens={product.allergens} maxDisplay={2} />
                ) : (
                  <span className="text-xs text-gray-500">無過敏原</span>
                )}
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-2 flex-shrink-0">
              {mode === 'restaurant' ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleProductSelect(product)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {allowAddToCart && (
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(product)}
                      disabled={stockStatus.variant === 'destructive'}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleProductSelect(product)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleExpanded(product.id)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">沒有找到產品</h3>
        <p className="text-gray-600">請嘗試調整搜尋條件或篩選器</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(product => (
            <ProductRow key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}