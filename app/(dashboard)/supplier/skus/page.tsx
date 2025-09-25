'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Search,
  Filter,
  Upload,
  Download,
  Edit,
  Trash2,
  Package,
  Eye,
  Users,
  Star,
  UserCheck,
  Share2,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface Supplier {
  id: string
  name: string
  price: number
  minQuantity: number
  leadTime: string
  rating: number
}

interface SKU {
  id: string
  skuCode: string
  productId: string
  productName: string
  categoryName: string
  packagingType: string
  qualityGrade: string
  processingMethod: string
  basePrice: number
  pricingUnit: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  supplierCount?: number
  suppliers?: Supplier[]
  type?: 'public' | 'private' // 公開共享 或 私有獨占
  creatorType?: 'platform' | 'supplier'
  approvalStatus?: 'draft' | 'pending' | 'approved' | 'rejected'
}

interface SKUFilters {
  search: string
  category: string
  packagingType: string
  qualityGrade: string
  isActive: string
  stockStatus: string
  type: string
}

const PACKAGING_TYPES = [
  { value: 'bulk', label: '散裝' },
  { value: '500g', label: '500g 包裝' },
  { value: '1kg', label: '1kg 包裝' },
  { value: '5kg', label: '5kg 箱裝' },
  { value: 'custom', label: '客製化包裝' },
]

const QUALITY_GRADES = [
  { value: 'A', label: 'A級' },
  { value: 'B', label: 'B級' },
  { value: 'PROC', label: '加工級' },
]

const PROCESSING_METHODS = [
  { value: 'RAW', label: '生鮮' },
  { value: 'WASH', label: '清洗' },
  { value: 'CUT', label: '切割' },
  { value: 'FROZ', label: '冷凍' },
]

export default function SupplierSKUsPage() {
  const [skus, setSKUs] = useState<SKU[]>([])
  const [loading, setLoading] = useState(true)

  // Debug component mount
  console.log('🎯 SupplierSKUsPage component rendered!')
  const [selectedSKUs, setSelectedSKUs] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')

  const [filters, setFilters] = useState<SKUFilters>({
    search: '',
    category: '',
    packagingType: '',
    qualityGrade: '',
    isActive: '',
    stockStatus: '',
    type: '',
  })

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })

  // Define loadSKUs with useCallback to prevent infinite re-renders
  const loadSKUs = useCallback(async () => {
    console.log('🚀 Starting SKU load...', { filters, pagination })
    setLoading(true)

    try {
      // Build query parameters
      const params = new URLSearchParams()
      params.append('page', pagination.page.toString())
      params.append('page_size', pagination.pageSize.toString())

      if (filters.search) {
        params.append('search', filters.search)
      }
      if (filters.isActive) {
        params.append('is_active', filters.isActive)
      }
      if (filters.type) {
        params.append('sku_type', filters.type)
      }

      // Fetch via BFF proxy to gateway -> Product Service
      console.log('📡 Fetching SKUs from BFF:', `/api/bff/products/skus/search?${params}`)
      const response = await fetch(`/api/bff/products/skus/search?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Remove credentials temporarily to test
        // credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch SKUs: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('📦 API Response:', data)

      if (data.success && data.data) {
        // Generate mock supplier data for each SKU
        const generateMockSuppliers = (skuId: string): { count: number; suppliers: Supplier[] } => {
          const supplierCount = Math.floor(Math.random() * 4) + 1 // 1-4 suppliers
          const supplierNames = ['綠野農場', '有機生活', '新鮮農產', '健康食材', '優質供應商']
          const suppliers: Supplier[] = []

          for (let i = 0; i < supplierCount; i++) {
            suppliers.push({
              id: `supplier-${skuId}-${i}`,
              name: supplierNames[i % supplierNames.length],
              price: Math.floor(Math.random() * 200) + 50,
              minQuantity: Math.floor(Math.random() * 10) + 1,
              leadTime: `${Math.floor(Math.random() * 7) + 1}天`,
              rating: Number((Math.random() * 2 + 3).toFixed(1)), // 3.0-5.0
            })
          }

          return { count: supplierCount, suppliers }
        }

        // Transform backend data to match frontend interface
        const transformedSKUs: SKU[] = data.data.map((sku: any) => {
          const mockSupplierData = generateMockSuppliers(sku.id)

          // Mock some shared SKUs for demonstration
          const isSharedSKU = Math.random() > 0.6 // 40% 機率為共享 SKU

          return {
            id: sku.id,
            skuCode: sku.code, // Backend uses 'code' field
            productId: sku.product?.id || '',
            productName: sku.name, // Backend uses 'name' field
            categoryName: sku.product?.name || '未分類',
            packagingType: sku.packageType || 'bulk',
            qualityGrade: 'A', // Default grade since backend variant uses Chinese
            processingMethod: 'RAW', // Default processing since backend variant uses Chinese
            basePrice: 100, // Default price since backend doesn't return price
            pricingUnit: 'kg', // Default unit
            isActive: sku.isActive || false,
            createdAt: new Date(),
            updatedAt: new Date(),
            supplierCount: isSharedSKU ? mockSupplierData.count : 1,
            suppliers: mockSupplierData.suppliers,
            type: isSharedSKU ? 'public' : 'private',
            creatorType: isSharedSKU ? 'platform' : 'supplier',
            approvalStatus: 'approved',
          }
        })

        console.log('✅ Transformed SKUs:', transformedSKUs.length, 'items')
        setSKUs(transformedSKUs)
        setPagination(prev => ({
          ...prev,
          total: data.total || 0,
          totalPages: data.total_pages || 1,
        }))
      } else {
        console.log('❌ No data available in response')
        setSKUs([])
        setPagination(prev => ({
          ...prev,
          total: 0,
          totalPages: 0,
        }))
      }
    } catch (error) {
      console.error('❌ Failed to load SKUs:', error)
      console.error('Error details:', error)
      setSKUs([])
      setPagination(prev => ({
        ...prev,
        total: 0,
        totalPages: 0,
      }))
    } finally {
      console.log('🏁 SKU loading completed, setting loading to false')
      setLoading(false)
    }
  }, [filters, pagination])

  useEffect(() => {
    loadSKUs()
  }, [loadSKUs])

  const handleFilterChange = (key: keyof SKUFilters, value: string) => {
    // Convert "all" to empty string for API compatibility
    const filterValue = value === 'all' ? '' : value
    setFilters(prev => ({ ...prev, [key]: filterValue }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleSelectSKU = (skuId: string) => {
    setSelectedSKUs(prev =>
      prev.includes(skuId) ? prev.filter(id => id !== skuId) : [...prev, skuId]
    )
  }

  const handleSelectAll = () => {
    if (selectedSKUs.length === skus.length) {
      setSelectedSKUs([])
    } else {
      setSelectedSKUs(skus.map(sku => sku.id))
    }
  }

  const getStockStatus = (sku: SKU) => {
    return { status: 'good', label: '庫存充足', color: 'bg-green-100 text-green-700' }
  }

  // SKU 類型標識組件
  const SKUTypeBadge = ({ sku }: { sku: SKU }) => {
    const isShared = sku.type === 'public'

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                'cursor-pointer text-xs font-medium',
                isShared
                  ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
              )}
            >
              {isShared ? (
                <>
                  <Share2 className="mr-1 h-3 w-3" />
                  共享
                </>
              ) : (
                <>
                  <Lock className="mr-1 h-3 w-3" />
                  獨占
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm p-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">{isShared ? '共享型 SKU' : '獨占型 SKU'}</div>
              <div className="text-xs text-gray-600">
                {isShared ? (
                  <div className="space-y-1">
                    <div>• 多個供應商可以銷售此產品</div>
                    <div>• 標準化規格，便於比價</div>
                    <div>• 由平台維護基本資訊</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div>• 僅此供應商獨家銷售</div>
                    <div>• 可自由設定規格和描述</div>
                    <div>• 完全控制產品資訊</div>
                  </div>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // 多供應商Badge元件
  const MultiSupplierBadge = ({ sku }: { sku: SKU }) => {
    if (!sku.supplierCount || sku.supplierCount <= 1) {
      return null
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="cursor-pointer border-green-200 bg-green-50 text-xs text-green-700 hover:bg-green-100"
            >
              <Users className="mr-1 h-3 w-3" />
              {sku.supplierCount}家供應商
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm p-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">共 {sku.supplierCount} 家供應商</div>
              <div className="space-y-1 text-xs">
                {sku.suppliers?.slice(0, 3).map((supplier, index) => (
                  <div key={supplier.id} className="flex items-center justify-between">
                    <span className="font-medium">{supplier.name}</span>
                    <div className="flex items-center space-x-2">
                      <span>NT$ {supplier.price}</span>
                      <div className="flex items-center">
                        <Star className="h-3 w-3 fill-current text-yellow-400" />
                        <span className="ml-0.5">{supplier.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {sku.suppliers && sku.suppliers.length > 3 && (
                  <div className="text-xs text-gray-500">
                    ...還有 {sku.suppliers.length - 3} 家供應商
                  </div>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const handleBulkAction = (action: string) => {
    console.log(`Bulk action: ${action} on SKUs:`, selectedSKUs)
    // Implement bulk actions
  }

  const handleViewDetails = (skuId: string) => {
    console.log('查看詳情:', skuId)
    // TODO: 導航到 SKU 詳情頁面
    // router.push(`/supplier/skus/${skuId}`);
  }

  const handleCompareSuppliers = (skuId: string) => {
    console.log('比較供應商:', skuId)
    // TODO: 打開供應商比較模態框或頁面
    // setShowSupplierComparisonModal(true);
    // setSelectedSKUForComparison(skuId);
  }

  const renderSKUCard = (sku: SKU) => {
    const stockStatus = getStockStatus(sku)

    return (
      <Card key={sku.id} className="p-4 transition-shadow hover:shadow-md">
        {/* Header: Checkbox and Status */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedSKUs.includes(sku.id)}
              onChange={() => handleSelectSKU(sku.id)}
              className="rounded border-gray-300"
            />
            <Badge variant={sku.isActive ? 'default' : 'secondary'} className="text-xs">
              {sku.isActive ? '上架' : '下架'}
            </Badge>
          </div>
        </div>

        {/* Product Title */}
        <div className="mb-3">
          <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-tight text-gray-900">
            {sku.productName}
          </h3>

          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-1">
            <SKUTypeBadge sku={sku} />
            <MultiSupplierBadge sku={sku} />
            <Badge className={cn('text-xs', stockStatus.color)}>{stockStatus.label}</Badge>
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-medium">
              {sku.skuCode}
            </span>
            <span className="ml-2 truncate text-gray-600">{sku.categoryName}</span>
          </div>

          <div className="line-clamp-2 text-gray-500">
            <span>包裝：{sku.packagingType}</span>
            <span className="mx-1">•</span>
            <span>
              等級：{QUALITY_GRADES.find(g => g.value === sku.qualityGrade)?.label || '未設定'}
            </span>
            <span className="mx-1">•</span>
            <span>
              處理：
              {PROCESSING_METHODS.find(m => m.value === sku.processingMethod)?.label || '未設定'}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">
              NT$ {sku.basePrice} / {sku.pricingUnit}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1 text-xs"
              onClick={() => handleViewDetails(sku.id)}
            >
              <Eye className="mr-1 h-3 w-3" />
              查看詳情
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1 text-xs"
              onClick={() => handleCompareSuppliers(sku.id)}
            >
              <UserCheck className="mr-1 h-3 w-3" />
              比較供應商
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  const renderSKUTable = () => (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={selectedSKUs.length === skus.length && skus.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                產品資訊
              </th>
              <th className="w-32 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                規格
              </th>
              <th className="w-24 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                價格
              </th>
              <th className="w-20 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                狀態
              </th>
              <th className="w-24 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {skus.map(sku => {
              const stockStatus = getStockStatus(sku)

              return (
                <tr key={sku.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedSKUs.includes(sku.id)}
                      onChange={() => handleSelectSKU(sku.id)}
                      className="rounded border-gray-300"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <div className="space-y-0.5">
                      <div className="truncate text-sm font-medium text-gray-900">
                        {sku.productName}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <span className="rounded bg-gray-100 px-1 py-0.5 font-mono">
                          {sku.skuCode}
                        </span>
                        <span className="text-gray-500">{sku.categoryName}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="space-y-0.5 text-xs text-gray-600">
                      <div>{sku.packagingType}</div>
                      <div className="text-gray-500">
                        {QUALITY_GRADES.find(g => g.value === sku.qualityGrade)?.label} |
                        {PROCESSING_METHODS.find(m => m.value === sku.processingMethod)?.label}
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">NT$ {sku.basePrice}</div>
                      <div className="text-xs text-gray-500">/ {sku.pricingUnit}</div>
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center space-x-1">
                        <Badge variant={sku.isActive ? 'default' : 'secondary'} className="text-xs">
                          {sku.isActive ? '上架' : '下架'}
                        </Badge>
                        <SKUTypeBadge sku={sku} />
                      </div>
                      <div className="flex flex-wrap items-center space-x-1">
                        <MultiSupplierBadge sku={sku} />
                        <Badge className={cn('text-xs', stockStatus.color)}>
                          {stockStatus.label}
                        </Badge>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        title="查看詳情"
                        onClick={() => handleViewDetails(sku.id)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        title="比較供應商"
                        onClick={() => handleCompareSuppliers(sku.id)}
                      >
                        <UserCheck className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SKU 管理</h1>
          <p className="text-gray-600">管理您的產品庫存單位和規格</p>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="mr-2 h-4 w-4" />
            批量匯入
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            匯出
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新增 SKU
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="搜尋產品名稱或SKU代碼..."
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={filters.type} onValueChange={value => handleFilterChange('type', value)}>
            <SelectTrigger>
              <SelectValue placeholder="SKU類型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部類型</SelectItem>
              <SelectItem value="public">
                <div className="flex items-center">
                  <Share2 className="mr-2 h-3 w-3 text-blue-600" />
                  共享型
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center">
                  <Lock className="mr-2 h-3 w-3 text-orange-600" />
                  獨占型
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.category}
            onValueChange={value => handleFilterChange('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="產品類別" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部類別</SelectItem>
              <SelectItem value="vegetables">蔬菜類</SelectItem>
              <SelectItem value="meat">肉品類</SelectItem>
              <SelectItem value="seafood">海鮮類</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.packagingType}
            onValueChange={value => handleFilterChange('packagingType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="包裝類型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部包裝</SelectItem>
              {PACKAGING_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.qualityGrade}
            onValueChange={value => handleFilterChange('qualityGrade', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="品質等級" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部等級</SelectItem>
              {QUALITY_GRADES.map(grade => (
                <SelectItem key={grade.value} value={grade.value}>
                  {grade.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.isActive}
            onValueChange={value => handleFilterChange('isActive', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部狀態</SelectItem>
              <SelectItem value="true">啟用</SelectItem>
              <SelectItem value="false">停用</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Controls and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">顯示 {skus.length} 筆 SKU</span>

            {selectedSKUs.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">已選擇 {selectedSKUs.length} 項</span>
                <Select onValueChange={handleBulkAction}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="批量操作" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activate">啟用</SelectItem>
                    <SelectItem value="deactivate">停用</SelectItem>
                    <SelectItem value="delete">刪除</SelectItem>
                    <SelectItem value="export">匯出</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              表格檢視
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              卡片檢視
            </Button>
          </div>
        </div>
      </Card>

      {/* SKU List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            <p className="text-gray-600">載入 SKU 資料中...</p>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        renderSKUTable()
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {skus.map(renderSKUCard)}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            第 {pagination.page} 頁，共 {pagination.totalPages} 頁
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              上一頁
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              下一頁
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
