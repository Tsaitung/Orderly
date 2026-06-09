'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { useSupplierProducts } from '@/lib/api/supplier-hooks'
import { useAuth } from '@/contexts/AuthContext'
import {
  Edit,
  Copy,
  Archive,
  MoreVertical,
  Image as ImageIcon,
  TrendingUp,
  AlertTriangle,
  Star,
  ShoppingCart,
  Package,
  Loader,
} from 'lucide-react'

interface ProductListProps {
  searchParams: { [key: string]: string | string[] | undefined }
  organizationId?: string
}

// 模擬產品數據
const mockProducts = [
  {
    id: 'PROD-001',
    name: '有機胡蘿蔔',
    sku: 'VEG-CAR-001',
    category: '蔬菜類',
    brand: '台灣有機農場',
    image: '/api/placeholder/80/80',
    status: 'active',
    stock: {
      current: 150,
      reserved: 25,
      available: 125,
      unit: 'kg',
      alertLevel: 20,
    },
    pricing: {
      base: 35,
      tiers: [
        { min: 1, max: 49, price: 35, label: '零售價' },
        { min: 50, max: 199, price: 32, label: '批發價' },
        { min: 200, max: 999, price: 28, label: '大宗價' },
        { min: 1000, max: null, price: 25, label: '特惠價' },
      ],
    },
    performance: {
      rating: 4.5,
      reviews: 28,
      monthlySales: 450,
      totalSold: 2150,
    },
    lastUpdated: new Date('2025-09-17'),
  },
  {
    id: 'PROD-002',
    name: '澳洲牛肉片',
    sku: 'MEAT-BEEF-002',
    category: '肉類',
    brand: '澳洲牧場',
    image: '/api/placeholder/80/80',
    status: 'active',
    stock: {
      current: 8,
      reserved: 3,
      available: 5,
      unit: 'kg',
      alertLevel: 10,
    },
    pricing: {
      base: 680,
      tiers: [
        { min: 1, max: 9, price: 680, label: '零售價' },
        { min: 10, max: 49, price: 650, label: '批發價' },
        { min: 50, max: 199, price: 620, label: '大宗價' },
        { min: 200, max: null, price: 580, label: '特惠價' },
      ],
    },
    performance: {
      rating: 4.8,
      reviews: 156,
      monthlySales: 89,
      totalSold: 567,
    },
    lastUpdated: new Date('2025-09-18'),
  },
  {
    id: 'PROD-003',
    name: '冷凍白蝦',
    sku: 'SEA-SHR-003',
    category: '海鮮類',
    brand: '漁港直送',
    image: '/api/placeholder/80/80',
    status: 'active',
    stock: {
      current: 0,
      reserved: 0,
      available: 0,
      unit: 'kg',
      alertLevel: 5,
    },
    pricing: {
      base: 850,
      tiers: [
        { min: 1, max: 9, price: 850, label: '零售價' },
        { min: 10, max: 49, price: 820, label: '批發價' },
        { min: 50, max: 199, price: 780, label: '大宗價' },
        { min: 200, max: null, price: 750, label: '特惠價' },
      ],
    },
    performance: {
      rating: 4.3,
      reviews: 94,
      monthlySales: 78,
      totalSold: 345,
    },
    lastUpdated: new Date('2025-09-16'),
  },
  {
    id: 'PROD-004',
    name: '日本和牛A5',
    sku: 'MEAT-WAG-004',
    category: '肉類',
    brand: '日本進口',
    image: '/api/placeholder/80/80',
    status: 'active',
    stock: {
      current: 45,
      reserved: 8,
      available: 37,
      unit: 'kg',
      alertLevel: 10,
    },
    pricing: {
      base: 2850,
      tiers: [
        { min: 1, max: 4, price: 2850, label: '零售價' },
        { min: 5, max: 19, price: 2750, label: '批發價' },
        { min: 20, max: 49, price: 2650, label: '大宗價' },
        { min: 50, max: null, price: 2500, label: '特惠價' },
      ],
    },
    performance: {
      rating: 4.9,
      reviews: 203,
      monthlySales: 23,
      totalSold: 156,
    },
    lastUpdated: new Date('2025-09-18'),
  },
]

export default function ProductList({ searchParams, organizationId }: ProductListProps) {
  const { user } = useAuth()
  const effectiveOrgId = organizationId || user?.organizationId

  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

  // Use the product hook (currently placeholder)
  const {
    products,
    loading,
    error,
    refetch,
    addProduct,
    updateProduct,
    removeProduct,
    isAdding,
    isUpdating,
    isRemoving,
  } = useSupplierProducts(effectiveOrgId)

  // For now, use mock data as fallback since product service isn't implemented
  const displayProducts = products.length > 0 ? products : mockProducts

  // Show loading state
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex h-64 items-center justify-center">
          <Loader className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">載入產品資料中...</span>
        </div>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 p-6">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">無法載入產品資料</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={refetch}
              className="mt-2 text-sm text-red-600 underline hover:text-red-800"
            >
              重新載入
            </button>
          </div>
        </div>
      </Card>
    )
  }

  const getStockStatus = (stock: any) => {
    if (stock.current === 0) {
      return { label: '缺貨', variant: 'destructive' as const, color: 'text-red-600' }
    } else if (stock.current <= stock.alertLevel) {
      return { label: '庫存不足', variant: 'warning' as const, color: 'text-orange-600' }
    } else {
      return { label: '有庫存', variant: 'success' as const, color: 'text-green-600' }
    }
  }

  const toggleProductExpansion = (productId: string) => {
    setExpandedProduct(expandedProduct === productId ? null : productId)
  }

  const toggleSelectProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    )
  }

  const selectAllProducts = () => {
    setSelectedProducts(displayProducts.map(p => p.id))
  }

  const clearSelection = () => {
    setSelectedProducts([])
  }

  return (
    <Card className="p-6">
      {/* 列表標題與批量操作 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">產品列表</h2>
          <Badge variant="outline">共 {displayProducts.length} 項產品</Badge>
          {products.length === 0 && (
            <Badge variant="warning" size="sm">
              使用測試資料
            </Badge>
          )}
        </div>

        {selectedProducts.length > 0 && (
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">已選取 {selectedProducts.length} 項</span>
            <Button variant="outline" size="sm">
              批量編輯
            </Button>
            <Button variant="outline" size="sm">
              批量下架
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              取消選取
            </Button>
          </div>
        )}
      </div>

      {/* 全選控制 */}
      <div className="mb-4 flex items-center space-x-4 border-b pb-4">
        <label className="flex cursor-pointer items-center space-x-2">
          <input
            type="checkbox"
            checked={selectedProducts.length === displayProducts.length}
            onChange={
              selectedProducts.length === displayProducts.length
                ? clearSelection
                : selectAllProducts
            }
            className="rounded text-blue-600"
          />
          <span className="text-sm text-gray-700">全選</span>
        </label>
        <span className="text-sm text-gray-500">
          顯示 1-{displayProducts.length} 項{products.length === 0 ? '（測試資料）' : ''}
        </span>
      </div>

      {/* 產品列表 */}
      <div className="space-y-4">
        {displayProducts.map(product => {
          const stockStatus = getStockStatus(product.stock)
          const isExpanded = expandedProduct === product.id
          const isSelected = selectedProducts.includes(product.id)

          return (
            <div
              key={product.id}
              className={`rounded-lg border transition-all duration-200 ${
                isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center space-x-4">
                  {/* 選擇框 */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectProduct(product.id)}
                    className="rounded text-blue-600"
                  />

                  {/* 產品圖片 */}
                  <div className="flex-shrink-0">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100">
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>

                  {/* 產品基本資訊 */}
                  <div className="grid flex-1 grid-cols-1 items-center gap-4 md:grid-cols-6">
                    <div className="md:col-span-2">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">
                        SKU: {product.sku} | {product.brand}
                      </div>
                      <Badge variant="outline" size="sm" className="mt-1">
                        {product.category}
                      </Badge>
                    </div>

                    <div className="text-center">
                      <div className="font-semibold text-blue-600">
                        {formatCurrency(product.pricing.base)}
                      </div>
                      <div className="text-xs text-gray-500">基礎價格</div>
                      {product.pricing.tiers.length > 1 && (
                        <div className="text-xs text-blue-600">
                          {product.pricing.tiers.length} 階價格
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <div className={`font-semibold ${stockStatus.color}`}>
                        {product.stock.current} {product.stock.unit}
                      </div>
                      <Badge variant={stockStatus.variant} size="sm">
                        {stockStatus.label}
                      </Badge>
                      {product.stock.reserved > 0 && (
                        <div className="mt-1 text-xs text-gray-500">
                          已預留: {product.stock.reserved}
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Star className="h-4 w-4 fill-current text-yellow-400" />
                        <span className="font-medium">{product.performance.rating}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {product.performance.reviews} 評價
                      </div>
                      <div className="text-xs text-gray-500">
                        月銷: {product.performance.monthlySales}
                      </div>
                    </div>

                    <div className="text-center">
                      <Badge
                        variant={product.status === 'active' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {product.status === 'active' ? '上架中' : '已下架'}
                      </Badge>
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleProductExpansion(product.id)}
                    >
                      {isExpanded ? '收起' : '詳情'}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 展開的詳細資訊 */}
              {isExpanded && (
                <div className="border-t bg-gray-50 p-4">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* 階梯定價 */}
                    <div>
                      <h4 className="mb-3 font-medium text-gray-900">階梯定價</h4>
                      <div className="space-y-2">
                        {product.pricing.tiers.map((tier, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded border bg-white p-2"
                          >
                            <div className="text-sm">
                              <span className="font-medium">{tier.label}</span>
                              <span className="ml-2 text-gray-500">
                                ({tier.min}
                                {tier.max ? `-${tier.max}` : '+'} {product.stock.unit})
                              </span>
                            </div>
                            <div className="font-semibold text-blue-600">
                              {formatCurrency(tier.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 庫存詳情與銷售數據 */}
                    <div>
                      <h4 className="mb-3 font-medium text-gray-900">庫存與銷售</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded border bg-white p-3">
                          <div className="text-sm text-gray-600">可售庫存</div>
                          <div className="font-semibold text-green-600">
                            {product.stock.available} {product.stock.unit}
                          </div>
                        </div>
                        <div className="rounded border bg-white p-3">
                          <div className="text-sm text-gray-600">已預留</div>
                          <div className="font-semibold text-orange-600">
                            {product.stock.reserved} {product.stock.unit}
                          </div>
                        </div>
                        <div className="rounded border bg-white p-3">
                          <div className="text-sm text-gray-600">月銷量</div>
                          <div className="font-semibold text-blue-600">
                            {product.performance.monthlySales}
                          </div>
                        </div>
                        <div className="rounded border bg-white p-3">
                          <div className="text-sm text-gray-600">總銷量</div>
                          <div className="font-semibold text-purple-600">
                            {product.performance.totalSold}
                          </div>
                        </div>
                      </div>

                      {/* 庫存警告 */}
                      {product.stock.current <= product.stock.alertLevel && (
                        <div className="mt-3 rounded border border-orange-200 bg-orange-50 p-3">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium text-orange-800">庫存預警</span>
                          </div>
                          <p className="mt-1 text-sm text-orange-700">
                            當前庫存 ({product.stock.current} {product.stock.unit}) 已低於警戒線 (
                            {product.stock.alertLevel} {product.stock.unit})
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 快速操作 */}
                  <div className="mt-4 flex items-center justify-between border-t pt-4">
                    <div className="text-sm text-gray-500">
                      最後更新: {product.lastUpdated.toLocaleDateString('zh-TW')}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Copy className="mr-2 h-4 w-4" />
                        複製產品
                      </Button>
                      <Button variant="outline" size="sm">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        銷售分析
                      </Button>
                      <Button variant="outline" size="sm">
                        <Package className="mr-2 h-4 w-4" />
                        庫存調整
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 分頁控制 */}
      <div className="mt-6 flex items-center justify-between border-t pt-4">
        <div className="text-sm text-gray-500">
          顯示第 1-{displayProducts.length} 項{products.length === 0 ? '（測試資料）' : ''}
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" disabled>
            上一頁
          </Button>
          <Button variant="outline" size="sm" disabled={products.length === 0}>
            下一頁
          </Button>
        </div>
        {products.length === 0 && (
          <div className="rounded bg-orange-50 px-2 py-1 text-xs text-orange-600">
            產品服務開發中，目前顯示測試資料
          </div>
        )}
      </div>
    </Card>
  )
}
