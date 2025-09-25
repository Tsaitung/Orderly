'use client'

import React from 'react'
import {
  Package,
  TrendingUp,
  Star,
  Search,
  Building2,
  Loader2,
  AlertCircle,
  ShoppingCart,
  Calendar,
  MapPin,
  ArrowLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ProductService, ProductStats } from '@/lib/services/product-service'
import { SKUService, useSKUSearch } from '@/lib/services/sku-service'
import { SupplierComparison } from './SupplierComparison'
import { BatchExpiryManagement } from './BatchExpiryManagement'

export function SKUManagement() {
  const [stats, setStats] = React.useState<ProductStats | null>(null)
  const [skuStats, setSKUStats] = React.useState<any | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // 視圖狀態
  const [currentView, setCurrentView] = React.useState<
    'search' | 'supplier-comparison' | 'batch-management'
  >('search')
  const [selectedProduct, setSelectedProduct] = React.useState<any | null>(null)

  // 使用優化的 SKU 搜尋 Hook
  const {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    results: products,
    loading: searchLoading,
    error: searchError,
    refresh: refreshSearch,
  } = useSKUSearch()

  // 預設載入所有SKU
  const [allSKUs, setAllSKUs] = React.useState<any[]>([])
  const [loadingAllSKUs, setLoadingAllSKUs] = React.useState(true)

  React.useEffect(() => {
    const loadAllSKUs = async () => {
      try {
        setLoadingAllSKUs(true)
        const result = await SKUService.searchSKUs({ page_size: 50 })
        setAllSKUs(result?.data || [])
      } catch (err) {
        console.error('Failed to load all SKUs:', err)
      } finally {
        setLoadingAllSKUs(false)
      }
    }

    loadAllSKUs()
  }, [])

  // Track component mount state to prevent memory leaks
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // 獲取產品統計資料
  const fetchStats = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [productData, skuData] = await Promise.all([
        ProductService.getProductStats(),
        ProductService.getSKUStats(),
      ])
      setStats(productData)
      setSKUStats(skuData)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics')
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始載入統計資料
  React.useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // 重新載入統計資料的函數
  const handleRefresh = () => {
    fetchStats()
  }

  // 當元件載入時預載入常用資料
  React.useEffect(() => {
    if (mountedRef.current) {
      SKUService.preloadCommonData()
    }
  }, [])

  // 處理視圖切換
  const handleSupplierComparison = (product: any) => {
    setSelectedProduct(product)
    setCurrentView('supplier-comparison')
  }

  const handleBatchManagement = () => {
    setCurrentView('batch-management')
  }

  const handleBackToSearch = () => {
    setCurrentView('search')
    setSelectedProduct(null)
  }

  // 清除篩選
  const clearFilters = () => {
    setFilters({})
  }

  // 快速篩選
  const handleQuickFilter = (filterType: string, value: string) => {
    switch (filterType) {
      case 'origin':
        setFilters(prev => ({ ...prev, origin_country: value }))
        break
      case 'expiry':
        // TODO: 實作即將到期篩選邏輯
        break
      case 'suppliers':
        // TODO: 實作多供應商篩選邏輯
        break
    }
  }

  // 根據當前視圖渲染對應頁面
  if (currentView === 'supplier-comparison' && selectedProduct) {
    return (
      <div className="space-y-6">
        {/* 返回按鈕 */}
        <Card>
          <CardContent className="p-4">
            <Button
              variant="ghost"
              onClick={handleBackToSearch}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回 SKU 搜尋</span>
            </Button>
          </CardContent>
        </Card>

        {/* 供應商比較元件 */}
        <SupplierComparison
          skuId={selectedProduct.id}
          skuCode={selectedProduct.code}
          productName={selectedProduct.name}
        />
      </div>
    )
  }

  if (currentView === 'batch-management') {
    return (
      <div className="space-y-6">
        {/* 返回按鈕 */}
        <Card>
          <CardContent className="p-4">
            <Button
              variant="ghost"
              onClick={handleBackToSearch}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回 SKU 搜尋</span>
            </Button>
          </CardContent>
        </Card>

        {/* 批次管理元件 */}
        <BatchExpiryManagement />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">載入統計資料時發生錯誤</p>
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="mt-2 text-sm text-red-600 underline hover:text-red-800"
                >
                  重新載入
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">總SKU數</p>
                <p className="mt-1 text-xs text-gray-500">所有商品規格總數</p>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">載入中...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{skuStats?.totalSKUs ?? '0'}</p>
                )}
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">啟用中SKU</p>
                <p className="mt-1 text-xs text-gray-500">可供訂購的商品規格</p>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">載入中...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-green-600">{skuStats?.activeSKUs ?? '0'}</p>
                )}
              </div>
              <Star className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">合作供應商</p>
                <p className="mt-1 text-xs text-gray-500">提供商品的供應商數量</p>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">載入中...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-purple-600">
                    {skuStats?.supplierCount ?? '0'}
                  </p>
                )}
              </div>
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:bg-gray-50"
          onClick={handleBatchManagement}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">即將到期</p>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">載入中...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-orange-600">
                    {skuStats?.lowStockSKUs ?? '0'}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">點擊管理批次</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">價格範圍</p>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">載入中...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-primary-600">
                    NT$ {stats?.avgPrice ?? '0'}
                  </p>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SKU 搜尋與篩選區域 */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder="搜尋SKU代碼、產品名稱或批次號..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={filters.packaging_type || ''}
                  onChange={e => setFilters(prev => ({ ...prev, packaging_type: e.target.value }))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">所有包裝</option>
                  <option value="bulk">散裝</option>
                  <option value="500g">500g包</option>
                  <option value="1kg">1kg包</option>
                  <option value="5kg">5kg箱</option>
                </select>
                <select
                  value={filters.quality_grade || ''}
                  onChange={e => setFilters(prev => ({ ...prev, quality_grade: e.target.value }))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">所有品質</option>
                  <option value="A">A級</option>
                  <option value="B">B級</option>
                  <option value="PROC">加工級</option>
                </select>
                <select
                  value={filters.origin_country || ''}
                  onChange={e => setFilters(prev => ({ ...prev, origin_country: e.target.value }))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">所有產地</option>
                  <option value="台灣">台灣</option>
                  <option value="日本">日本</option>
                  <option value="美國">美國</option>
                  <option value="澳洲">澳洲</option>
                </select>
                <select
                  value={filters.processing_method || ''}
                  onChange={e =>
                    setFilters(prev => ({ ...prev, processing_method: e.target.value }))
                  }
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">所有處理</option>
                  <option value="RAW">未處理</option>
                  <option value="WASH">清洗</option>
                  <option value="CUT">切段</option>
                  <option value="FROZ">冷凍</option>
                </select>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">價格:</span>
                  <Input
                    type="number"
                    placeholder="最低"
                    value={filters.min_price || ''}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        min_price: parseFloat(e.target.value) || undefined,
                      }))
                    }
                    className="w-20 text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <Input
                    type="number"
                    placeholder="最高"
                    value={filters.max_price || ''}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        max_price: parseFloat(e.target.value) || undefined,
                      }))
                    }
                    className="w-20 text-sm"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={clearFilters} className="text-sm">
                  清除篩選
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="cursor-pointer transition-colors hover:bg-gray-100"
                onClick={() => handleQuickFilter('origin', '台灣')}
              >
                <MapPin className="mr-1 h-3 w-3" />
                本土產品
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer transition-colors hover:bg-gray-100"
                onClick={() => handleQuickFilter('expiry', 'soon')}
              >
                <Calendar className="mr-1 h-3 w-3" />
                即將到期
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer transition-colors hover:bg-gray-100"
                onClick={() => handleQuickFilter('suppliers', 'multiple')}
              >
                <ShoppingCart className="mr-1 h-3 w-3" />
                多供應商
              </Badge>

              {/* 顯示已啟用的篩選器 */}
              {Object.entries(filters).map(([key, value]) => {
                if (!value) return null
                return (
                  <Badge
                    key={key}
                    variant="default"
                    className="cursor-pointer bg-blue-100 text-blue-800"
                    onClick={() => setFilters(prev => ({ ...prev, [key]: undefined }))}
                  >
                    {key === 'packaging_type' && `包裝: ${value}`}
                    {key === 'quality_grade' && `品質: ${value}`}
                    {key === 'origin_country' && `產地: ${value}`}
                    {key === 'processing_method' && `處理: ${value}`}
                    {key === 'min_price' && `最低價: ${value}`}
                    {key === 'max_price' && `最高價: ${value}`}
                    <span className="ml-1">×</span>
                  </Badge>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SKU 列表 - 顯示搜尋結果或所有SKU */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{searchTerm ? '搜尋結果' : '所有SKU'}</h3>
              {(searchLoading || loadingAllSKUs) && (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-500">載入中...</span>
                </div>
              )}
            </div>

            {searchError && (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{searchError}</span>
              </div>
            )}

            {/* 顯示搜尋結果或所有SKU */}
            {(() => {
              const displayProducts = searchTerm ? products : allSKUs
              const isLoading = searchTerm ? searchLoading : loadingAllSKUs

              if (!isLoading && displayProducts.length === 0) {
                return (
                  <div className="py-8 text-center">
                    <Package className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                    <p className="text-gray-500">
                      {searchTerm ? '沒有找到符合條件的產品' : '暫無SKU資料'}
                    </p>
                  </div>
                )
              }

              if (displayProducts.length > 0) {
                return (
                  <div className="space-y-2">
                    {displayProducts.map(product => (
                      <div
                        key={product.id}
                        className="rounded-lg border p-2 transition-colors hover:bg-gray-50"
                      >
                        <div className="space-y-1.5">
                          {/* 產品基本資訊 */}
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-1 items-center space-x-3">
                                  <h4 className="text-base font-medium">
                                    {product.name?.replace(/\s*\([^)]*\)$/, '') || product.name}
                                  </h4>
                                  <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
                                    代碼: {product.code}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    包裝: {product.packageType || '散裝'}
                                  </span>
                                  {product.variant &&
                                    Object.entries(product.variant).map(([key, value]) => (
                                      <span key={key} className="text-xs text-gray-600">
                                        {key}: {value as string}
                                      </span>
                                    ))}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    variant={product.isActive ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {product.isActive ? '啟用' : '停用'}
                                  </Badge>
                                  <Badge
                                    variant={product.isPublic ? 'outline' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {product.isPublic ? '公開' : '私有'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 操作按鈕 */}
                          <div className="flex justify-end space-x-2 border-t pt-1">
                            <button className="rounded border border-gray-300 bg-white px-2 py-1 text-xs transition-colors hover:bg-gray-50">
                              查看詳情
                            </button>
                            <button
                              onClick={() => handleSupplierComparison(product)}
                              className="rounded bg-blue-600 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-700"
                            >
                              比較供應商
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }

              return null
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
