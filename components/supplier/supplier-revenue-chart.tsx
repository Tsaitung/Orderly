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
  AlertCircle
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AccessibleSelect } from '@/components/ui/accessible-form'
import { Progress } from '@/components/ui/progress'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import { cn } from '@/lib/utils'

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

export default function SupplierRevenueChart() {
  const [timeRange, setTimeRange] = React.useState('month')
  const [chartType, setChartType] = React.useState('revenue')
  const { announcePolite } = useScreenReaderAnnouncer()

  // 模擬營收數據
  const revenueData: RevenueData[] = [
    { period: '1月', revenue: 98000, orders: 156, profit: 18620, profitMargin: 19.0 },
    { period: '2月', revenue: 112000, orders: 178, profit: 22400, profitMargin: 20.0 },
    { period: '3月', revenue: 125600, orders: 195, profit: 26370, profitMargin: 21.0 },
    { period: '4月', revenue: 108000, orders: 165, profit: 20520, profitMargin: 19.0 },
    { period: '5月', revenue: 135000, orders: 210, profit: 29700, profitMargin: 22.0 },
    { period: '6月', revenue: 142000, orders: 225, profit: 31320, profitMargin: 22.1 },
    { period: '7月', revenue: 128000, orders: 198, profit: 27520, profitMargin: 21.5 }
  ]

  // 產品類別營收分布
  const categoryRevenue: ProductCategoryRevenue[] = [
    { category: '蔬菜類', revenue: 45600, percentage: 35.2, growth: 12.5, color: 'bg-green-500' },
    { category: '肉品類', revenue: 38200, percentage: 29.5, growth: 8.3, color: 'bg-red-500' },
    { category: '海鮮類', revenue: 25800, percentage: 19.9, growth: 15.2, color: 'bg-blue-500' },
    { category: '乳製品', revenue: 12400, percentage: 9.6, growth: 5.8, color: 'bg-yellow-500' },
    { category: '調味料', revenue: 7500, percentage: 5.8, growth: -2.1, color: 'bg-purple-500' }
  ]

  // 月度目標達成
  const monthlyTargets: MonthlyTarget[] = [
    { month: '1月', target: 100000, actual: 98000, achievement: 98.0 },
    { month: '2月', target: 110000, actual: 112000, achievement: 101.8 },
    { month: '3月', target: 120000, actual: 125600, achievement: 104.7 },
    { month: '4月', target: 115000, actual: 108000, achievement: 93.9 },
    { month: '5月', target: 130000, actual: 135000, achievement: 103.8 },
    { month: '6月', target: 140000, actual: 142000, achievement: 101.4 },
    { month: '7月', target: 135000, actual: 128000, achievement: 94.8 }
  ]

  const currentMonth = revenueData[revenueData.length - 1]
  const previousMonth = revenueData[revenueData.length - 2]
  const currentTarget = monthlyTargets[monthlyTargets.length - 1]

  const monthlyGrowth = ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100
  const avgOrderValue = currentMonth.revenue / currentMonth.orders
  const totalRevenue = revenueData.reduce((sum, data) => sum + data.revenue, 0)
  const avgProfitMargin = revenueData.reduce((sum, data) => sum + data.profitMargin, 0) / revenueData.length

  const handleTimeRangeChange = React.useCallback((value: string) => {
    setTimeRange(value)
    announcePolite(`時間範圍已切換至${value === 'week' ? '週' : value === 'month' ? '月' : '年'}檢視`)
  }, [announcePolite])

  const timeRangeOptions = [
    { value: 'week', label: '週檢視' },
    { value: 'month', label: '月檢視' },
    { value: 'quarter', label: '季檢視' },
    { value: 'year', label: '年檢視' }
  ]

  const chartTypeOptions = [
    { value: 'revenue', label: '營收分析' },
    { value: 'profit', label: '獲利分析' },
    { value: 'orders', label: '訂單分析' },
    { value: 'categories', label: '類別分析' }
  ]

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            <span>營收分析報表</span>
          </CardTitle>
          
          <div className="flex items-center space-x-3">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className={cn(
                'text-sm font-medium flex items-center space-x-1',
                monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {monthlyGrowth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
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

          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-8 w-8 text-blue-600" />
              <Badge 
                variant={currentTarget.achievement >= 100 ? 'success' : 'warning'}
                size="sm"
              >
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

          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
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

          <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <Award className="h-8 w-8 text-orange-600" />
              <div className="text-sm font-medium text-orange-600">
                {currentMonth.orders} 筆
              </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 營收趨勢圖 (模擬) */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center space-x-2">
              <LineChart className="h-4 w-4" />
              <span>營收趨勢分析</span>
            </h4>
            <div className="h-64 bg-gray-50 rounded-lg p-4 flex items-end justify-between space-x-2">
              {revenueData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                  <div 
                    className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                    style={{ 
                      height: `${(data.revenue / Math.max(...revenueData.map(d => d.revenue))) * 200}px`,
                      minHeight: '20px'
                    }}
                    title={`${data.period}: NT$ ${data.revenue.toLocaleString()}`}
                  />
                  <div className="text-xs text-gray-600 text-center">
                    {data.period}
                  </div>
                  <div className="text-xs font-medium text-gray-900">
                    {(data.revenue / 1000).toFixed(0)}K
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 text-center">
              月度營收表現 (NT$ 千元)
            </div>
          </div>

          {/* 產品類別營收分布 */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center space-x-2">
              <PieChart className="h-4 w-4" />
              <span>產品類別營收分布</span>
            </h4>
            <div className="space-y-3">
              {categoryRevenue.map((category, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={cn('w-3 h-3 rounded-full', category.color)} />
                      <span className="text-sm font-medium text-gray-900">
                        {category.category}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold">
                        NT$ {(category.revenue / 1000).toFixed(1)}K
                      </span>
                      <div className={cn(
                        'text-xs font-medium flex items-center space-x-1',
                        category.growth >= 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {category.growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
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
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>月度目標達成進度</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {monthlyTargets.map((target, index) => (
              <div key={index} className="text-center space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  {target.month}
                </div>
                <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                  {/* 目標線 */}
                  <div 
                    className="absolute w-full border-t-2 border-dashed border-gray-400"
                    style={{ 
                      top: `${100 - (target.target / Math.max(...monthlyTargets.map(t => Math.max(t.target, t.actual)))) * 100}%`
                    }}
                  />
                  {/* 實際營收柱 */}
                  <div 
                    className={cn(
                      'absolute bottom-0 w-full transition-all',
                      target.achievement >= 100 ? 'bg-green-500' : 
                      target.achievement >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ 
                      height: `${(target.actual / Math.max(...monthlyTargets.map(t => Math.max(t.target, t.actual)))) * 100}%`
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">
                    {(target.actual / 1000).toFixed(0)}K / {(target.target / 1000).toFixed(0)}K
                  </div>
                  <Badge 
                    variant={
                      target.achievement >= 100 ? 'success' : 
                      target.achievement >= 90 ? 'warning' : 'destructive'
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 表現亮點 */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h5 className="font-medium text-green-900 mb-3 flex items-center space-x-2">
              <Award className="h-4 w-4" />
              <span>本月表現亮點</span>
            </h5>
            <ul className="text-sm text-green-800 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>海鮮類營收成長 15.2%，成為最佳成長類別</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>平均客單價提升至 NT$ {Math.round(avgOrderValue)}，較上月增加 8%</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>獲利率達 {currentMonth.profitMargin.toFixed(1)}%，創近期新高</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>目標達成率 {currentTarget.achievement.toFixed(1)}%，表現穩定</span>
              </li>
            </ul>
          </div>

          {/* 改善建議 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-3 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>營收優化建議</span>
            </h5>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>調味料類別營收下滑 2.1%，建議推出促銷活動</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>考慮擴大海鮮類產品線，把握成長趨勢</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>增加與高價值客戶的合作頻率</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>優化庫存管理，提升獲利率至 25%</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 下載報表按鈕 */}
        <div className="flex justify-end space-x-3">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            設定報表排程
          </Button>
          <Button variant="outline" size="sm">
            匯出 Excel 報表
          </Button>
          <Button variant="solid" colorScheme="green" size="sm">
            生成詳細分析
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}