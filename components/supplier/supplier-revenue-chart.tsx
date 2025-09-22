'use client'

import * as React from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  Award,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AccessibleSelect } from '@/components/ui/accessible-form'
import { Progress } from '@/components/ui/progress'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import { cn } from '@/lib/utils'
import { useSupplierDashboard } from '@/lib/api/supplier-hooks'
import { SupplierDashboardSkeleton } from './shared/SupplierLoadingStates'
import { SupplierPageErrorBoundary } from './shared/SupplierErrorBoundary'

interface RevenueData {
  period: string
  revenue: number
  orders: number
  profit: number
  profitMargin: number
}

interface ProductCategoryRevenue {
  category: string
  revenue: number
  percentage: number
  growth: number
  color: string
}

interface MonthlyTarget {
  month: string
  target: number
  actual: number
  achievement: number
}

// Hook for getting organization ID from auth context
function useOrganizationId(): string | null {
  // TODO: Get from auth context when available
  // For now, use hardcoded value for testing
  return 'test-org-123'
}

interface SupplierRevenueChartContentProps {
  organizationId: string
}

function SupplierRevenueChartContent({ organizationId }: SupplierRevenueChartContentProps) {
  const [timeRange, setTimeRange] = React.useState('month')
  const [chartType, setChartType] = React.useState('revenue')
  const { announcePolite } = useScreenReaderAnnouncer()

  const { dashboard, metrics, loading, error, refreshMetrics } =
    useSupplierDashboard(organizationId)

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Generate mock historical data based on current metrics
  const revenueData: RevenueData[] = React.useMemo(() => {
    if (!metrics) return []

    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月']
    const currentMonthRevenue = metrics.month_revenue

    return months.map((month, index) => {
      // Generate realistic historical data with some variation
      const variation = 0.8 + Math.random() * 0.4 // 0.8 to 1.2
      const baseRevenue = currentMonthRevenue * variation
      const orders = Math.floor(baseRevenue / metrics.avg_order_value || 50 + Math.random() * 100)
      const profitMargin = 18 + Math.random() * 6 // 18-24%
      const profit = baseRevenue * (profitMargin / 100)

      return {
        period: month,
        revenue: Math.round(baseRevenue),
        orders,
        profit: Math.round(profit),
        profitMargin: Number(profitMargin.toFixed(1)),
      }
    })
  }, [metrics])

  // Generate category revenue distribution (mock data based on current metrics)
  const categoryRevenue: ProductCategoryRevenue[] = React.useMemo(() => {
    if (!metrics) return []

    const categories = [
      { name: '蔬菜類', basePercent: 35, color: 'bg-green-500' },
      { name: '肉品類', basePercent: 29, color: 'bg-red-500' },
      { name: '海鮮類', basePercent: 20, color: 'bg-blue-500' },
      { name: '乳製品', basePercent: 10, color: 'bg-yellow-500' },
      { name: '調味料', basePercent: 6, color: 'bg-purple-500' },
    ]

    return categories.map(cat => {
      const percentage = cat.basePercent + (Math.random() - 0.5) * 4 // ±2% variation
      const revenue = (metrics.month_revenue * percentage) / 100
      const growth = (Math.random() - 0.3) * 20 // -6% to +14%

      return {
        category: cat.name,
        revenue: Math.round(revenue),
        percentage: Number(percentage.toFixed(1)),
        growth: Number(growth.toFixed(1)),
        color: cat.color,
      }
    })
  }, [metrics])

  // Generate monthly targets (mock data)
  const monthlyTargets: MonthlyTarget[] = React.useMemo(() => {
    if (!metrics) return []

    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月']

    return months.map((month, index) => {
      const isCurrentMonth = index === months.length - 1
      const target = 100000 + index * 5000 + Math.random() * 10000
      const actual = isCurrentMonth ? metrics.month_revenue : target * (0.85 + Math.random() * 0.3)
      const achievement = (actual / target) * 100

      return {
        month,
        target: Math.round(target),
        actual: Math.round(actual),
        achievement: Number(achievement.toFixed(1)),
      }
    })
  }, [metrics])

  // Prepare all React hooks before any conditional returns
  const handleTimeRangeChange = React.useCallback(
    (value: string) => {
      setTimeRange(value)
      announcePolite(
        `時間範圍已切換至${value === 'week' ? '週' : value === 'month' ? '月' : '年'}檢視`
      )
    },
    [announcePolite]
  )

  if (loading && !metrics) {
    return <SupplierDashboardSkeleton />
  }

  if (error) {
    throw new Error(error)
  }

  if (!metrics) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <AlertCircle className="mx-auto mb-2 h-8 w-8" />
          <p>暫無營收數據</p>
        </div>
      </Card>
    )
  }

  // Check data availability after all hooks are declared
  if (revenueData.length < 2 || monthlyTargets.length < 1) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <AlertCircle className="mx-auto mb-2 h-8 w-8" />
          <p>數據不足，無法生成圖表</p>
        </div>
      </Card>
    )
  }

  const currentMonth = revenueData[revenueData.length - 1]!
  const previousMonth = revenueData[revenueData.length - 2]!
  const currentTarget = monthlyTargets[monthlyTargets.length - 1]!

  const monthlyGrowth =
    ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100
  const avgOrderValue = currentMonth.revenue / currentMonth.orders
  const totalRevenue = revenueData.reduce((sum, data) => sum + data.revenue, 0)
  const avgProfitMargin =
    revenueData.reduce((sum, data) => sum + data.profitMargin, 0) / revenueData.length

  const timeRangeOptions = [
    { value: 'week', label: '週檢視' },
    { value: 'month', label: '月檢視' },
    { value: 'quarter', label: '季檢視' },
    { value: 'year', label: '年檢視' },
  ]

  const chartTypeOptions = [
    { value: 'revenue', label: '營收分析' },
    { value: 'profit', label: '獲利分析' },
    { value: 'orders', label: '訂單分析' },
    { value: 'categories', label: '類別分析' },
  ]

  // Generate insights based on real data
  const insights = React.useMemo(() => {
    if (!metrics || !categoryRevenue.length) {
      return { highlights: [], suggestions: ['持續優化產品組合，提升整體獲利率'] }
    }

    const highlights = []
    const suggestions = []

    // Generate highlights based on metrics
    const bestCategory = categoryRevenue.reduce((best, cat) =>
      cat.growth > best.growth ? cat : best
    )

    if (bestCategory.growth > 10) {
      highlights.push(
        `${bestCategory.category}營收成長 ${bestCategory.growth.toFixed(1)}%，成為最佳成長類別`
      )
    }

    if (monthlyGrowth > 5) {
      highlights.push(`月營收成長 ${monthlyGrowth.toFixed(1)}%，表現優異`)
    }

    if (metrics.customer_satisfaction_rate >= 4.5) {
      highlights.push(
        `客戶滿意度達 ${metrics.customer_satisfaction_rate.toFixed(1)}★，服務品質優異`
      )
    }

    if (metrics.on_time_delivery_rate >= 95) {
      highlights.push(`準時交付率 ${metrics.on_time_delivery_rate.toFixed(1)}%，超越行業標準`)
    }

    // Generate suggestions
    const worstCategory = categoryRevenue.reduce((worst, cat) =>
      cat.growth < worst.growth ? cat : worst
    )

    if (worstCategory.growth < 0) {
      suggestions.push(
        `${worstCategory.category}營收下滑 ${Math.abs(worstCategory.growth).toFixed(1)}%，建議推出促銷活動`
      )
    }

    if (metrics.avg_order_value < 1000) {
      suggestions.push('平均客單價偏低，考慮推出套餐或高價值產品')
    }

    if (metrics.active_customers < 20) {
      suggestions.push('活躍客戶數量有限，建議加強客戶開發')
    }

    suggestions.push('持續優化產品組合，提升整體獲利率')

    return { highlights, suggestions }
  }, [categoryRevenue, monthlyGrowth, metrics])

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            <span>營收分析報表</span>
          </CardTitle>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshMetrics}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              <span>刷新</span>
            </Button>
            <AccessibleSelect
              label="圖表類型"
              name="chart-type"
              options={chartTypeOptions}
              value={chartType}
              onChange={setChartType}
              className="w-32"
            />
            <AccessibleSelect
              label="時間範圍"
              name="time-range"
              options={timeRangeOptions}
              value={timeRange}
              onChange={handleTimeRangeChange}
              className="w-28"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 核心指標摘要 */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-green-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div
                className={cn(
                  'flex items-center space-x-1 text-sm font-medium',
                  monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {monthlyGrowth >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(monthlyGrowth).toFixed(1)}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-700">
                NT$ {(currentMonth.revenue / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-green-600">本月營收</div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <Target className="h-8 w-8 text-blue-600" />
              <Badge variant={currentTarget.achievement >= 100 ? 'success' : 'warning'} size="sm">
                {currentTarget.achievement >= 100 ? '達標' : '未達標'}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-700">
                {currentTarget.achievement.toFixed(1)}%
              </div>
              <div className="text-sm text-blue-600">目標達成率</div>
            </div>
          </div>

          <div className="rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <LineChart className="h-8 w-8 text-purple-600" />
              <div className="text-sm font-medium text-purple-600">
                {avgProfitMargin.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-purple-700">
                NT$ {(currentMonth.profit / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-purple-600">本月獲利</div>
            </div>
          </div>

          <div className="rounded-lg border border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <Award className="h-8 w-8 text-orange-600" />
              <div className="text-sm font-medium text-orange-600">{currentMonth.orders} 筆</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-orange-700">
                NT$ {Math.round(avgOrderValue)}
              </div>
              <div className="text-sm text-orange-600">平均客單價</div>
            </div>
          </div>
        </div>

        {/* 視覺化圖表區域 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 營收趨勢圖 */}
          <div className="space-y-4">
            <h4 className="flex items-center space-x-2 font-medium text-gray-900">
              <LineChart className="h-4 w-4" />
              <span>營收趨勢分析</span>
            </h4>
            <div className="flex h-64 items-end justify-between space-x-2 rounded-lg bg-gray-50 p-4">
              {revenueData.map((data, index) => (
                <div key={index} className="flex flex-1 flex-col items-center space-y-2">
                  <div
                    className="w-full rounded-t bg-green-500 transition-all hover:bg-green-600"
                    style={{
                      height: `${(data.revenue / Math.max(...revenueData.map(d => d.revenue))) * 200}px`,
                      minHeight: '20px',
                    }}
                    title={`${data.period}: NT$ ${data.revenue.toLocaleString()}`}
                  />
                  <div className="text-center text-xs text-gray-600">{data.period}</div>
                  <div className="text-xs font-medium text-gray-900">
                    {(data.revenue / 1000).toFixed(0)}K
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center text-xs text-gray-500">月度營收表現 (NT$ 千元)</div>
          </div>

          {/* 產品類別營收分布 */}
          <div className="space-y-4">
            <h4 className="flex items-center space-x-2 font-medium text-gray-900">
              <PieChart className="h-4 w-4" />
              <span>產品類別營收分布</span>
            </h4>
            <div className="space-y-3">
              {categoryRevenue.map((category, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={cn('h-3 w-3 rounded-full', category.color)} />
                      <span className="text-sm font-medium text-gray-900">{category.category}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold">
                        NT$ {(category.revenue / 1000).toFixed(1)}K
                      </span>
                      <div
                        className={cn(
                          'flex items-center space-x-1 text-xs font-medium',
                          category.growth >= 0 ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {category.growth >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{Math.abs(category.growth).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={category.percentage}
                    className="h-2"
                    variant={category.growth >= 0 ? 'success' : 'warning'}
                  />
                  <div className="text-xs text-gray-500">
                    佔總營收 {category.percentage.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 目標達成進度 */}
        <div className="space-y-4">
          <h4 className="flex items-center space-x-2 font-medium text-gray-900">
            <Target className="h-4 w-4" />
            <span>月度目標達成進度</span>
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
            {monthlyTargets.map((target, index) => (
              <div key={index} className="space-y-2 text-center">
                <div className="text-sm font-medium text-gray-700">{target.month}</div>
                <div className="relative h-32 w-full overflow-hidden rounded-lg bg-gray-100">
                  {/* 目標線 */}
                  <div
                    className="absolute w-full border-t-2 border-dashed border-gray-400"
                    style={{
                      top: `${100 - (target.target / Math.max(...monthlyTargets.map(t => Math.max(t.target, t.actual)))) * 100}%`,
                    }}
                  />
                  {/* 實際營收柱 */}
                  <div
                    className={cn(
                      'absolute bottom-0 w-full transition-all',
                      target.achievement >= 100
                        ? 'bg-green-500'
                        : target.achievement >= 90
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    )}
                    style={{
                      height: `${(target.actual / Math.max(...monthlyTargets.map(t => Math.max(t.target, t.actual)))) * 100}%`,
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">
                    {(target.actual / 1000).toFixed(0)}K / {(target.target / 1000).toFixed(0)}K
                  </div>
                  <Badge
                    variant={
                      target.achievement >= 100
                        ? 'success'
                        : target.achievement >= 90
                          ? 'warning'
                          : 'destructive'
                    }
                    size="sm"
                  >
                    {target.achievement.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 營收洞察與建議 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 表現亮點 */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <h5 className="mb-3 flex items-center space-x-2 font-medium text-green-900">
              <Award className="h-4 w-4" />
              <span>本月表現亮點</span>
            </h5>
            <ul className="space-y-2 text-sm text-green-800">
              {insights.highlights.length > 0 ? (
                insights.highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="mt-0.5 text-green-600">•</span>
                    <span>{highlight}</span>
                  </li>
                ))
              ) : (
                <li className="flex items-start space-x-2">
                  <span className="mt-0.5 text-green-600">•</span>
                  <span>持續穩定營運，保持良好表現</span>
                </li>
              )}
            </ul>
          </div>

          {/* 改善建議 */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h5 className="mb-3 flex items-center space-x-2 font-medium text-blue-900">
              <AlertCircle className="h-4 w-4" />
              <span>營收優化建議</span>
            </h5>
            <ul className="space-y-2 text-sm text-blue-800">
              {insights.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="mt-0.5 text-blue-600">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 下載報表按鈕 */}
        <div className="flex justify-end space-x-3">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            設定報表排程
          </Button>
          <Button variant="outline" size="sm">
            匯出 Excel 報表
          </Button>
          <Button size="sm" className="bg-green-600 text-white hover:bg-green-700">
            生成詳細分析
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SupplierRevenueChart() {
  const organizationId = useOrganizationId()

  if (!organizationId) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <AlertCircle className="mx-auto mb-2 h-8 w-8" />
          <p>無法獲取供應商資訊，請重新登入</p>
        </div>
      </Card>
    )
  }

  return (
    <SupplierPageErrorBoundary>
      <SupplierRevenueChartContent organizationId={organizationId} />
    </SupplierPageErrorBoundary>
  )
}
