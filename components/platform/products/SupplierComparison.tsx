'use client'

import React from 'react'
import {
  Building2,
  Star,
  Clock,
  Package,
  TrendingDown,
  TrendingUp,
  Award,
  CheckCircle,
  AlertCircle,
  Calculator,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PricingTier {
  min_qty: number
  price: number
  type?: string
  discount_rate?: number
}

interface SupplierData {
  supplier_id: string
  supplier_sku_code: string
  supplier_name_for_product?: string
  base_price: number
  effective_price: number
  total_cost: number
  quantity: number
  applied_tier?: PricingTier
  lead_time_days: number
  minimum_order_quantity: number
  overall_score: number
  is_preferred: boolean
  availability_status: string
  savings: number
  cost_rank: number
  comparison_badges: string[]
  quality_score?: number
  delivery_score?: number
  service_score?: number
  certifications?: string[]
}

interface PricingAnalysis {
  summary: {
    total_suppliers: number
    best_price: number
    average_price: number
    price_range: number
    best_total_cost: number
    max_savings: number
    quantity_analyzed: number
  }
  suppliers: SupplierData[]
}

interface SupplierComparisonProps {
  skuId: string
  skuCode: string
  productName: string
}

export function SupplierComparison({ skuId, skuCode, productName }: SupplierComparisonProps) {
  const [analysisData, setAnalysisData] = React.useState<PricingAnalysis | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [quantity, setQuantity] = React.useState(100)
  const [sortBy, setSortBy] = React.useState('total_cost')
  const [showAdvanced, setShowAdvanced] = React.useState(false)

  // 載入定價分析資料
  const loadPricingAnalysis = React.useCallback(async () => {
    if (!skuId) return

    try {
      setLoading(true)
      setError(null)

      // TODO: 替換為實際的 API 呼叫
      // const response = await fetch(`/api/products/skus/${skuId}/suppliers/pricing-analysis?quantity=${quantity}`)
      // const data = await response.json()

      // 模擬資料
      const mockData: PricingAnalysis = {
        summary: {
          total_suppliers: 3,
          best_price: 45.0,
          average_price: 52.33,
          price_range: 15.0,
          best_total_cost: 4500.0,
          max_savings: 800.0,
          quantity_analyzed: quantity,
        },
        suppliers: [
          {
            supplier_id: 'supplier-001',
            supplier_sku_code: 'SUP001-VEG-A',
            supplier_name_for_product: '優質農產 A級蔬菜',
            base_price: 50.0,
            effective_price: 45.0,
            total_cost: 4500.0,
            quantity: quantity,
            applied_tier: { min_qty: 100, price: 45.0 },
            lead_time_days: 1,
            minimum_order_quantity: 50,
            overall_score: 4.5,
            is_preferred: true,
            availability_status: 'available',
            savings: 500.0,
            cost_rank: 1,
            comparison_badges: ['優先供應商', '當日出貨', '高品質', '有認證'],
            quality_score: 4.8,
            delivery_score: 4.5,
            service_score: 4.2,
            certifications: ['有機認證', 'HACCP', 'ISO22000'],
          },
          {
            supplier_id: 'supplier-002',
            supplier_sku_code: 'SUP002-VEG-B',
            supplier_name_for_product: '經濟農產 B級蔬菜',
            base_price: 48.0,
            effective_price: 48.0,
            total_cost: 4800.0,
            quantity: quantity,
            lead_time_days: 2,
            minimum_order_quantity: 100,
            overall_score: 4.0,
            is_preferred: false,
            availability_status: 'available',
            savings: 0,
            cost_rank: 2,
            comparison_badges: ['快速出貨'],
            quality_score: 4.0,
            delivery_score: 4.2,
            service_score: 3.8,
            certifications: ['HACCP'],
          },
          {
            supplier_id: 'supplier-003',
            supplier_sku_code: 'SUP003-VEG-C',
            supplier_name_for_product: '標準農產 標準級蔬菜',
            base_price: 60.0,
            effective_price: 55.0,
            total_cost: 5500.0,
            quantity: quantity,
            applied_tier: { min_qty: 80, price: 55.0 },
            lead_time_days: 3,
            minimum_order_quantity: 80,
            overall_score: 3.5,
            is_preferred: false,
            availability_status: 'limited',
            savings: 500.0,
            cost_rank: 3,
            comparison_badges: [],
            quality_score: 3.5,
            delivery_score: 3.8,
            service_score: 3.2,
            certifications: [],
          },
        ],
      }

      setAnalysisData(mockData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入供應商資料失敗')
    } finally {
      setLoading(false)
    }
  }, [skuId, quantity])

  React.useEffect(() => {
    loadPricingAnalysis()
  }, [loadPricingAnalysis])

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > 0) {
      setQuantity(newQuantity)
    }
  }

  const formatPrice = (price: number) => `NT$ ${price.toFixed(2)}`
  const formatSavings = (savings: number) => (savings > 0 ? `省 NT$ ${savings.toFixed(0)}` : '-')

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case '優先供應商':
        return 'bg-purple-100 text-purple-800'
      case '當日出貨':
        return 'bg-green-100 text-green-800'
      case '快速出貨':
        return 'bg-blue-100 text-blue-800'
      case '高品質':
        return 'bg-yellow-100 text-yellow-800'
      case '有認證':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const renderScoreBar = (score: number, maxScore: number = 5) => {
    const percentage = (score / maxScore) * 100
    const colorClass =
      percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'

    return (
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${percentage}%` }} />
      </div>
    )
  }

  if (!skuId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <p className="text-gray-500">請選擇 SKU 以查看供應商比較</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 標題與數量設定 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>供應商價格比較</span>
              </CardTitle>
              <p className="mt-1 text-sm text-gray-600">
                {productName} - {skuCode}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calculator className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">數量:</span>
                <Input
                  type="number"
                  value={quantity}
                  onChange={e => handleQuantityChange(parseInt(e.target.value) || 0)}
                  className="w-20 text-center"
                  min="1"
                />
                <span className="text-sm text-gray-600">kg</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-1"
              >
                <Filter className="h-4 w-4" />
                <span>進階篩選</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 載入狀態 */}
      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2" />
            <p className="text-gray-500">載入供應商資料中...</p>
          </CardContent>
        </Card>
      )}

      {/* 錯誤狀態 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">載入失敗</p>
                <p className="text-sm text-red-600">{error}</p>
                <Button variant="outline" size="sm" onClick={loadPricingAnalysis} className="mt-2">
                  重新載入
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分析摘要 */}
      {analysisData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">價格分析摘要</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {formatPrice(analysisData.summary.best_price)}
                  </p>
                  <p className="text-sm text-gray-600">最低單價</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatPrice(analysisData.summary.best_total_cost)}
                  </p>
                  <p className="text-sm text-gray-600">最低總價</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {formatPrice(analysisData.summary.max_savings)}
                  </p>
                  <p className="text-sm text-gray-600">最大節省</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-700">
                    {analysisData.summary.total_suppliers}
                  </p>
                  <p className="text-sm text-gray-600">可選供應商</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 供應商比較列表 */}
          <div className="space-y-4">
            {analysisData.suppliers.map((supplier, index) => (
              <Card
                key={supplier.supplier_id}
                className={`${index === 0 ? 'ring-2 ring-green-200' : ''}`}
              >
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* 基本資訊 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center space-x-2 font-semibold">
                          {index === 0 && <Award className="h-4 w-4 text-green-600" />}
                          <span>供應商 {supplier.supplier_id.slice(-3)}</span>
                          {supplier.is_preferred && (
                            <Star className="h-4 w-4 fill-current text-yellow-500" />
                          )}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          排名 #{supplier.cost_rank}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600">{supplier.supplier_name_for_product}</p>
                      <p className="font-mono text-xs text-gray-500">
                        {supplier.supplier_sku_code}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {supplier.comparison_badges.map(badge => (
                          <Badge key={badge} className={`text-xs ${getBadgeColor(badge)}`}>
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* 價格資訊 */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">單價</p>
                        <div className="flex items-center space-x-2">
                          {supplier.effective_price < supplier.base_price ? (
                            <>
                              <span className="text-lg font-bold text-green-600">
                                {formatPrice(supplier.effective_price)}
                              </span>
                              <span className="text-sm text-gray-400 line-through">
                                {formatPrice(supplier.base_price)}
                              </span>
                              <TrendingDown className="h-4 w-4 text-green-600" />
                            </>
                          ) : (
                            <span className="text-lg font-bold">
                              {formatPrice(supplier.effective_price)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">總價 ({quantity}kg)</p>
                        <p className="text-xl font-bold">{formatPrice(supplier.total_cost)}</p>
                      </div>

                      {supplier.savings > 0 && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <TrendingDown className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {formatSavings(supplier.savings)}
                          </span>
                        </div>
                      )}

                      {supplier.applied_tier && (
                        <div className="rounded bg-blue-50 p-2 text-xs text-blue-600">
                          批量優惠: {supplier.applied_tier.min_qty}kg以上
                        </div>
                      )}
                    </div>

                    {/* 服務指標 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">交期</span>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">{supplier.lead_time_days} 天</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">最小訂購</span>
                        <span className="text-sm font-medium">
                          {supplier.minimum_order_quantity} kg
                        </span>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm text-gray-600">綜合評分</span>
                          <span className="text-sm font-medium">
                            {supplier.overall_score.toFixed(1)}/5.0
                          </span>
                        </div>
                        {renderScoreBar(supplier.overall_score)}
                      </div>

                      {showAdvanced && (
                        <>
                          <div className="space-y-2 border-t pt-2 text-xs">
                            <div className="flex justify-between">
                              <span>品質:</span>
                              <span>{supplier.quality_score?.toFixed(1) || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>配送:</span>
                              <span>{supplier.delivery_score?.toFixed(1) || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>服務:</span>
                              <span>{supplier.service_score?.toFixed(1) || 'N/A'}</span>
                            </div>
                          </div>

                          {supplier.certifications && supplier.certifications.length > 0 && (
                            <div className="text-xs">
                              <p className="mb-1 text-gray-600">認證:</p>
                              <div className="flex flex-wrap gap-1">
                                {supplier.certifications.map(cert => (
                                  <Badge key={cert} variant="outline" className="text-xs">
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    {cert}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end space-x-2 border-t pt-4">
                    <Button variant="outline" size="sm">
                      查看詳情
                    </Button>
                    <Button
                      size="sm"
                      className={index === 0 ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      選擇供應商
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
