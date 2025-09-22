'use client'

import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import ProductCreateModal from './ProductCreateModal'
import ProductEditModal from './ProductEditModal'
import ProductImageUploadModal from './ProductImageUploadModal'
import BulkProductModal from './BulkProductModal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useProducts } from '@/lib/api/product-hooks'
import { useAuth } from '@/contexts/AuthContext'
import { Product, ProductFilters, ProductStatus, ProductCategory } from '@/lib/api/product-types'
import {
  Search,
  Filter,
  Plus,
  Edit,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Star,
  Eye,
  MoreVertical,
  Upload,
  Download,
  RefreshCw,
  Loader,
  Image as ImageIcon,
  Package2,
  DollarSign,
  BarChart3,
} from 'lucide-react'

interface ProductManagementProps {
  organizationId?: string
}

const STATUS_CONFIG = {
  active: {
    label: '上架中',
    variant: 'default' as const,
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  inactive: {
    label: '下架',
    variant: 'secondary' as const,
    color: 'text-gray-600 bg-gray-50 border-gray-200',
  },
  discontinued: {
    label: '停產',
    variant: 'destructive' as const,
    color: 'text-red-600 bg-red-50 border-red-200',
  },
  out_of_stock: {
    label: '缺貨',
    variant: 'warning' as const,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  },
}

const CATEGORY_CONFIG = {
  fresh_produce: { label: '新鮮蔬果', icon: '🥬' },
  meat_seafood: { label: '肉類海鮮', icon: '🥩' },
  dairy: { label: '乳製品', icon: '🧀' },
  pantry: { label: '調料雜貨', icon: '🥫' },
  frozen: { label: '冷凍食品', icon: '🧊' },
  beverages: { label: '飲品', icon: '🥤' },
  other: { label: '其他', icon: '📦' },
}

export default function ProductManagement({ organizationId }: ProductManagementProps) {
  const { user } = useAuth()
  const effectiveOrgId = organizationId || user?.organizationId

  // Filter state
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    page_size: 12,
    sort_by: 'created_at',
    sort_order: 'desc',
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // API integration
  const {
    products,
    pagination,
    summary,
    loading,
    error,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkOperation,
    uploadImage,
    deleteImage,
    updateFilters,
    isCreating,
    isUpdating,
    isBulkOperating,
  } = useProducts(effectiveOrgId, filters)

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products

    const query = searchQuery.toLowerCase()
    return products.filter(
      product =>
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }, [products, searchQuery])

  // Handle filter changes
  const handleFilterChange = (key: keyof ProductFilters, value: any) => {
    const newFilters = { ...filters, [key]: value, page: 1 }
    setFilters(newFilters)
    updateFilters(newFilters)
  }

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value)
  }

  // Handle product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    )
  }

  const selectAllProducts = () => {
    setSelectedProducts(filteredProducts.map(product => product.id))
  }

  const clearSelection = () => {
    setSelectedProducts([])
  }

  // Handle product actions
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setShowEditModal(true)
  }

  const handleUploadImage = (product: Product) => {
    setSelectedProduct(product)
    setShowImageModal(true)
  }

  // Render product card
  const renderProductCard = (product: Product) => {
    const statusConfig = STATUS_CONFIG[product.status]
    const categoryConfig = CATEGORY_CONFIG[product.category]

    const primaryImage = product.images.find(img => img.is_primary) || product.images[0]

    return (
      <Card
        key={product.id}
        className={`p-4 transition-all hover:shadow-md ${
          selectedProducts.includes(product.id) ? 'border-blue-500 bg-blue-50' : ''
        }`}
      >
        <div className="space-y-4">
          {/* Header with selection and status */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedProducts.includes(product.id)}
                onChange={() => toggleProductSelection(product.id)}
                className="rounded text-blue-600"
              />
              <div className="flex items-center space-x-1">
                <span className="text-lg">{categoryConfig.icon}</span>
                <Badge variant={statusConfig.variant} className="text-xs">
                  {statusConfig.label}
                </Badge>
                {product.is_featured && <Star className="h-4 w-4 fill-current text-yellow-500" />}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>

          {/* Product Image */}
          <div className="group relative">
            <div className="h-32 w-full overflow-hidden rounded-md bg-gray-100">
              {primaryImage ? (
                <img
                  src={primaryImage.url}
                  alt={primaryImage.alt_text || product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleUploadImage(product)}
              className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Upload className="h-3 w-3" />
            </Button>
          </div>

          {/* Product Info */}
          <div className="space-y-2">
            <div>
              <h3 className="line-clamp-2 font-medium text-gray-900">{product.name}</h3>
              <p className="line-clamp-1 text-sm text-gray-500">{product.sku}</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600">產品編號: {product.sku}</span>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">
                  {formatCurrency(product.base_price)}
                </div>
                <div className="text-xs text-gray-500">{product.unit_type}</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditProduct(product)}
                className="flex-1"
              >
                <Edit className="mr-1 h-3 w-3" />
                編輯
              </Button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // Loading state
  if (loading && products.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600">載入產品資料中...</span>
        </div>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 p-8">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">無法載入產品資料</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="mt-3 border-red-200 text-red-600 hover:bg-red-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              重新載入
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Summary Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold text-gray-900">產品管理</h1>
            <Badge variant="outline">共 {pagination?.total_count || 0} 項產品</Badge>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              重新整理
            </Button>

            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新增產品
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <Package className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">總產品數</p>
                  <p className="text-2xl font-semibold">{summary.total_products}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">上架中</p>
                  <p className="text-2xl font-semibold">{summary.active_products}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">分類數量</p>
                  <p className="text-2xl font-semibold">{Object.keys(CATEGORY_CONFIG).length}</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder="搜尋產品名稱、SKU、標籤..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={filters.category || ''}
            onChange={e => handleFilterChange('category', e.target.value || undefined)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">所有分類</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.icon} {config.label}
              </option>
            ))}
          </select>

          <select
            value={filters.status || ''}
            onChange={e => handleFilterChange('status', e.target.value || undefined)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">所有狀態</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="featured"
              checked={filters.is_featured || false}
              onChange={e => handleFilterChange('is_featured', e.target.checked || undefined)}
              className="rounded text-blue-600"
            />
            <label htmlFor="featured" className="text-sm text-gray-700">
              僅精選商品
            </label>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 p-3">
            <span className="text-sm text-blue-800">已選取 {selectedProducts.length} 項產品</span>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBulkModal(true)}
                disabled={isBulkOperating}
              >
                批量操作
              </Button>
              <Button size="sm" variant="outline" onClick={clearSelection}>
                取消選取
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map(renderProductCard)}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">沒有找到產品</h3>
          <p className="mb-4 text-gray-500">
            {searchQuery ? '嘗試調整搜尋條件' : '開始新增您的第一個產品'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新增產品
            </Button>
          )}
          {searchQuery && (
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              清除搜尋條件
            </Button>
          )}
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              顯示第 {(pagination.page - 1) * pagination.page_size + 1} -{' '}
              {Math.min(pagination.page * pagination.page_size, pagination.total_count)} 項， 共{' '}
              {pagination.total_count} 項
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('page', pagination.page - 1)}
                disabled={!pagination.has_previous}
              >
                上一頁
              </Button>

              <span className="text-sm text-gray-700">
                第 {pagination.page} 頁，共 {pagination.total_pages} 頁
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('page', pagination.page + 1)}
                disabled={!pagination.has_next}
              >
                下一頁
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Modals */}
      <ProductCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createProduct}
        isCreating={isCreating}
      />

      <ProductEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedProduct(null)
        }}
        product={selectedProduct}
        onUpdate={updateProduct}
        isUpdating={isUpdating}
      />

      <ProductImageUploadModal
        isOpen={showImageModal}
        onClose={() => {
          setShowImageModal(false)
          setSelectedProduct(null)
        }}
        product={selectedProduct}
        onUpload={uploadImage}
        onDelete={deleteImage}
      />

      <BulkProductModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        selectedProductIds={selectedProducts}
        onBulkOperation={bulkOperation}
        isOperating={isBulkOperating}
      />
    </div>
  )
}
