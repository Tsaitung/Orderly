'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Store,
  Users,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Percent,
  Crown,
  Star,
  CreditCard,
  Calculator,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// 模擬總覽數據
const mockOverviewData = {
  period: {
    start: new Date('2024-09-01'),
    end: new Date('2024-09-30'),
  },
  total_revenue: 5628400,
  supplier_revenue: 1068400,
  restaurant_revenue: 4560000,
  revenue_growth: 0.156,
  total_gmv: 42850000,
  gmv_growth: 0.123,
  active_suppliers: 342,
  active_restaurants: 1247,
  pending_reconciliations: 23,
  overdue_payments: 8,
  system_health: {
    billing_automation: 98.7,
    reconciliation_accuracy: 99.2,
    payment_success_rate: 97.8,
    dispute_rate: 0.8,
  },
}

const mockSupplierMetrics = {
  total_commission: 1068400,
  average_rate: 0.025,
  top_tier_suppliers: 89,
  rating_distribution: {
    Platinum: { count: 89, percentage: 26.0, avg_gmv: 250000 },
    Gold: { count: 123, percentage: 36.0, avg_gmv: 150000 },
    Silver: { count: 98, percentage: 28.7, avg_gmv: 80000 },
    Bronze: { count: 32, percentage: 9.4, avg_gmv: 30000 },
  },
}

const mockRestaurantMetrics = {
  subscription_revenue: 4560000,
  plan_distribution: {
    free: { count: 856, percentage: 68.6, revenue: 0 },
    pro: { count: 312, percentage: 25.0, revenue: 936000 },
    enterprise: { count: 79, percentage: 6.3, revenue: 3624000 },
  },
  churn_rate: 0.032,
  upgrade_rate: 0.125,
  arpu: 3657,
}

const mockRecentActivity = [
  {
    id: '1',
    type: 'supplier_payment',
    description: '陽明春天生鮮 - 月度佣金結算',
    amount: 68400,
    timestamp: new Date('2024-09-30T09:30:00'),
    status: 'completed',
  },
  {
    id: '2',
    type: 'restaurant_subscription',
    description: '金龍餐廳集團 - Enterprise 年費續約',
    amount: 144000,
    timestamp: new Date('2024-09-30T08:15:00'),
    status: 'completed',
  },
  {
    id: '3',
    type: 'reconciliation',
    description: '9月份供應商對帳異常',
    amount: 0,
    timestamp: new Date('2024-09-30T07:45:00'),
    status: 'pending',
  },
  {
    id: '4',
    type: 'dispute',
    description: '美味蒸餃 - 費用爭議處理',
    amount: 1200,
    timestamp: new Date('2024-09-29T16:20:00'),
    status: 'pending',
  },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatPercentage(rate: number) {
  return `${(rate * 100).toFixed(1)}%`
}

function getGrowthColor(growth: number) {
  return growth >= 0 ? 'text-green-600' : 'text-red-600'
}

function getGrowthIcon(growth: number) {
  return growth >= 0 ? TrendingUp : TrendingDown
}

const activityTypeLabels = {
  supplier_payment: '供應商付款',
  restaurant_subscription: '餐廳訂閱',
  reconciliation: '對帳處理',
  dispute: '爭議處理',
}

const activityTypeColors = {
  supplier_payment: 'text-blue-600 bg-blue-50',
  restaurant_subscription: 'text-green-600 bg-green-50',
  reconciliation: 'text-orange-600 bg-orange-50',
  dispute: 'text-red-600 bg-red-50',
}

const statusColors = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
}

export default function BillingOverviewPage() {
  const [timePeriod, setTimePeriod] = useState('month')

  const GrowthIcon = getGrowthIcon(mockOverviewData.revenue_growth)

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <div className="rounded-lg bg-indigo-50 p-2">
              <BarChart3 className="h-8 w-8 text-indigo-600" />
            </div>
            計費總覽
          </h1>
          <p className="mt-2 text-gray-600">收入統計與系統健康度監控</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">本週</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="quarter">本季</SelectItem>
              <SelectItem value="year">本年</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            匯出報表
          </Button>
        </div>
      </div>

      {/* 核心指標 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-indigo-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">總營收</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(mockOverviewData.total_revenue)}
                </p>
                <div
                  className={cn(
                    'mt-2 flex items-center',
                    getGrowthColor(mockOverviewData.revenue_growth)
                  )}
                >
                  <GrowthIcon className="mr-1 h-4 w-4" />
                  <span className="text-sm font-medium">
                    {formatPercentage(mockOverviewData.revenue_growth)}
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-indigo-50 p-3">
                <DollarSign className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">GMV 交易額</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(mockOverviewData.total_gmv)}
                </p>
                <div
                  className={cn(
                    'mt-2 flex items-center',
                    getGrowthColor(mockOverviewData.gmv_growth)
                  )}
                >
                  <TrendingUp className="mr-1 h-4 w-4" />
                  <span className="text-sm font-medium">
                    {formatPercentage(mockOverviewData.gmv_growth)}
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">活躍用戶</p>
                <p className="text-3xl font-bold text-gray-900">
                  {mockOverviewData.active_suppliers + mockOverviewData.active_restaurants}
                </p>
                <div className="mt-2 flex items-center text-gray-600">
                  <Building2 className="mr-1 h-3 w-3" />
                  <span className="text-xs">{mockOverviewData.active_suppliers} 供應商</span>
                  <Store className="ml-2 mr-1 h-3 w-3" />
                  <span className="text-xs">{mockOverviewData.active_restaurants} 餐廳</span>
                </div>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">待處理事項</p>
                <p className="text-3xl font-bold text-gray-900">
                  {mockOverviewData.pending_reconciliations + mockOverviewData.overdue_payments}
                </p>
                <div className="mt-2 flex items-center text-gray-600">
                  <Calculator className="mr-1 h-3 w-3" />
                  <span className="text-xs">{mockOverviewData.pending_reconciliations} 對帳</span>
                  <CreditCard className="ml-2 mr-1 h-3 w-3" />
                  <span className="text-xs">{mockOverviewData.overdue_payments} 逾期</span>
                </div>
              </div>
              <div className="rounded-lg bg-orange-50 p-3">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 系統健康度 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            系統健康度
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {mockOverviewData.system_health.billing_automation}%
              </div>
              <div className="text-sm text-gray-600">計費自動化率</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {mockOverviewData.system_health.reconciliation_accuracy}%
              </div>
              <div className="text-sm text-gray-600">對帳準確率</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {mockOverviewData.system_health.payment_success_rate}%
              </div>
              <div className="text-sm text-gray-600">付款成功率</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {mockOverviewData.system_health.dispute_rate}%
              </div>
              <div className="text-sm text-gray-600">爭議率</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 收入明細 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 供應商收入 */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Building2 className="h-5 w-5" />
              供應商收入
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">總佣金收入</span>
                <span className="text-lg font-bold text-blue-600">
                  {formatCurrency(mockSupplierMetrics.total_commission)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">平均費率</span>
                <span className="font-medium">
                  {formatPercentage(mockSupplierMetrics.average_rate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">頂級供應商</span>
                <div className="flex items-center gap-1">
                  <Crown className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">{mockSupplierMetrics.top_tier_suppliers}</span>
                </div>
              </div>

              <div className="border-t pt-2">
                <div className="mb-2 text-sm font-medium text-gray-700">評級分布</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(mockSupplierMetrics.rating_distribution).map(([tier, data]) => (
                    <div
                      key={tier}
                      className="flex items-center justify-between rounded bg-gray-50 p-2"
                    >
                      <span className="text-xs text-gray-600">{tier}</span>
                      <span className="text-xs font-medium">{data.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 餐廳收入 */}
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Store className="h-5 w-5" />
              餐廳收入
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">訂閱收入</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(mockRestaurantMetrics.subscription_revenue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">ARPU</span>
                <span className="font-medium">{formatCurrency(mockRestaurantMetrics.arpu)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">流失率</span>
                <span className="font-medium">
                  {formatPercentage(mockRestaurantMetrics.churn_rate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">升級率</span>
                <span className="font-medium">
                  {formatPercentage(mockRestaurantMetrics.upgrade_rate)}
                </span>
              </div>

              <div className="border-t pt-2">
                <div className="mb-2 text-sm font-medium text-gray-700">方案分布</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-gray-600" />
                      <span className="text-xs text-gray-600">Free</span>
                    </div>
                    <span className="text-xs font-medium">
                      {mockRestaurantMetrics.plan_distribution.free.count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-gray-600">Pro</span>
                    </div>
                    <span className="text-xs font-medium">
                      {mockRestaurantMetrics.plan_distribution.pro.count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Crown className="h-3 w-3 text-purple-600" />
                      <span className="text-xs text-gray-600">Enterprise</span>
                    </div>
                    <span className="text-xs font-medium">
                      {mockRestaurantMetrics.plan_distribution.enterprise.count}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近活動 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            最近活動
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockRecentActivity.map(activity => (
              <div
                key={activity.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Badge className={cn('', activityTypeColors[activity.type])}>
                    {activityTypeLabels[activity.type]}
                  </Badge>
                  <div>
                    <div className="font-medium text-gray-900">{activity.description}</div>
                    <div className="text-sm text-gray-500">
                      {activity.timestamp.toLocaleString('zh-TW')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {activity.amount > 0 && (
                    <span className="font-medium text-gray-900">
                      {formatCurrency(activity.amount)}
                    </span>
                  )}
                  <Badge className={cn('', statusColors[activity.status])}>
                    {activity.status === 'completed'
                      ? '已完成'
                      : activity.status === 'pending'
                        ? '處理中'
                        : '失敗'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
