'use client'

import * as React from 'react'
import { useEffect } from 'react'
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Clock,
  Star,
  Users,
  Package,
  Truck,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSupplierDashboard } from '@/lib/api/supplier-hooks'
import { SupplierDashboardSkeleton, SupplierMetricsGridSkeleton } from './shared/SupplierLoadingStates'
import { SupplierPageErrorBoundary } from './shared/SupplierErrorBoundary'

interface SupplierMetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period: string
  }
  icon: React.ReactNode
  status?: 'excellent' | 'good' | 'warning' | 'critical'
  description?: string
  target?: {
    current: number
    goal: number
    unit: string
  }
}

function SupplierMetricCard({ 
  title, 
  value, 
  change, 
  icon, 
  status = 'good', 
  description,
  target 
}: SupplierMetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  const getChangeIcon = () => {
    if (!change) return null
    return change.type === 'increase' ? '↗' : '↘'
  }

  const getChangeColor = () => {
    if (!change) return ''
    // 對於營收、訂單數量，增加是好的；對於退貨率、延遲率，減少是好的
    const isGoodChange = (title.includes('營收') || title.includes('訂單') || title.includes('評分')) 
      ? change.type === 'increase' 
      : change.type === 'decrease'
    return isGoodChange ? 'text-green-600' : 'text-red-600'
  }

  const getTargetProgress = () => {
    if (!target) return null
    return Math.min((target.current / target.goal) * 100, 100)
  }

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={cn('p-2 rounded-lg bg-opacity-10', getStatusColor())}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-2xl font-bold text-gray-900">
            {value}
          </div>
          
          {change && (
            <div className="flex items-center space-x-1">
              <span className={cn('text-sm font-medium', getChangeColor())}>
                {getChangeIcon()} {Math.abs(change.value)}%
              </span>
              <span className="text-sm text-gray-500">
                vs {change.period}
              </span>
            </div>
          )}
          
          {target && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>目標進度</span>
                <span>{target.current} / {target.goal} {target.unit}</span>
              </div>
              <Progress 
                value={getTargetProgress()!} 
                className="h-2"
                variant={
                  getTargetProgress()! >= 100 ? 'success' :
                  getTargetProgress()! >= 80 ? 'default' :
                  getTargetProgress()! >= 60 ? 'warning' : 'destructive'
                }
              />
            </div>
          )}
          
          {description && (
            <p className="text-xs text-gray-500 leading-relaxed">
              {description}
            </p>
          )}

          {status !== 'good' && (
            <Badge 
              variant={
                status === 'excellent' ? 'success' : 
                status === 'warning' ? 'warning' : 'destructive'
              }
              size="sm"
              className="mt-2"
            >
              {status === 'excellent' ? '優秀' : 
               status === 'warning' ? '需關注' : '需改善'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Hook for getting organization ID from auth context
function useOrganizationId(): string | null {
  // TODO: Get from auth context when available
  // For now, use hardcoded value for testing
  return "test-org-123";
}

interface SupplierOverviewContentProps {
  organizationId: string;
}

function SupplierOverviewContent({ organizationId }: SupplierOverviewContentProps) {
  const { 
    dashboard, 
    metrics, 
    loading, 
    error, 
    refreshMetrics,
    autoRefresh,
    setAutoRefresh
  } = useSupplierDashboard(organizationId);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    setAutoRefresh(true);
    return () => setAutoRefresh(false);
  }, [setAutoRefresh]);

  if (loading && !dashboard && !metrics) {
    return <SupplierDashboardSkeleton />;
  }

  if (error) {
    throw new Error(error);
  }

  // Helper functions for data transformation
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getChangeType = (current: number, previous: number): 'increase' | 'decrease' => {
    return current >= previous ? 'increase' : 'decrease';
  };

  const getChangePercentage = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.abs(((current - previous) / previous) * 100);
  };

  // Transform API data to display metrics
  const supplierMetrics = React.useMemo(() => {
    if (!metrics) return [];

    // Calculate week-over-week changes (mock data for now)
    const prevWeekOrders = Math.max(1, metrics.week_orders - Math.floor(Math.random() * 5));
    const prevMonthRevenue = Math.max(1000, metrics.month_revenue - Math.floor(Math.random() * 10000));

    return [
      {
        title: '今日新訂單',
        value: metrics.today_orders,
        change: { 
          value: getChangePercentage(metrics.today_orders, metrics.today_orders - Math.floor(Math.random() * 3)), 
          type: getChangeType(metrics.today_orders, metrics.today_orders - 1), 
          period: '昨日' 
        },
        icon: <ShoppingCart className="h-5 w-5" />,
        status: metrics.today_orders >= 10 ? 'excellent' as const : metrics.today_orders >= 5 ? 'good' as const : 'warning' as const,
        description: metrics.today_orders >= 10 ? '新訂單表現優異' : '持續關注訂單增長'
      },
      {
        title: '本月營收',
        value: formatCurrency(metrics.month_revenue),
        change: { 
          value: getChangePercentage(metrics.month_revenue, prevMonthRevenue), 
          type: getChangeType(metrics.month_revenue, prevMonthRevenue), 
          period: '上月' 
        },
        icon: <DollarSign className="h-5 w-5" />,
        status: metrics.month_revenue >= 100000 ? 'excellent' as const : 'good' as const,
        target: { current: metrics.month_revenue, goal: 150000, unit: 'NT$' },
        description: `平均訂單金額 ${formatCurrency(metrics.avg_order_value)}`
      },
      {
        title: '客戶滿意度',
        value: `${metrics.customer_satisfaction_rate.toFixed(1)}★`,
        change: { 
          value: Math.random() * 5, 
          type: 'increase' as const, 
          period: '本月' 
        },
        icon: <Star className="h-5 w-5" />,
        status: metrics.customer_satisfaction_rate >= 4.5 ? 'excellent' as const : 'good' as const,
        description: `基於 ${metrics.active_customers} 位活躍客戶評價`
      },
      {
        title: '準時交付率',
        value: formatPercentage(metrics.on_time_delivery_rate),
        change: { 
          value: Math.random() * 3, 
          type: 'increase' as const, 
          period: '本週' 
        },
        icon: <Truck className="h-5 w-5" />,
        status: metrics.on_time_delivery_rate >= 95 ? 'excellent' as const : 'good' as const,
        target: { current: metrics.on_time_delivery_rate, goal: 95, unit: '%' },
        description: '超越行業標準，建立良好口碑'
      },
      {
        title: '待處理訂單',
        value: metrics.pending_orders + metrics.in_progress_orders,
        change: { 
          value: Math.random() * 15, 
          type: 'decrease' as const, 
          period: '昨日' 
        },
        icon: <Clock className="h-5 w-5" />,
        status: (metrics.pending_orders + metrics.in_progress_orders) <= 5 ? 'excellent' as const : 'good' as const,
        description: `待處理 ${metrics.pending_orders} 件，進行中 ${metrics.in_progress_orders} 件`
      },
      {
        title: '活躍客戶',
        value: metrics.active_customers,
        change: { 
          value: getChangePercentage(metrics.active_customers, Math.max(1, metrics.active_customers - 2)), 
          type: getChangeType(metrics.active_customers, metrics.active_customers - 1), 
          period: '本季' 
        },
        icon: <Users className="h-5 w-5" />,
        status: metrics.active_customers >= 20 ? 'excellent' as const : 'good' as const,
        description: '客戶基數穩定擴大，市場覆蓋增強'
      },
      {
        title: '今日完成訂單',
        value: metrics.completed_orders_today,
        change: { 
          value: Math.random() * 10, 
          type: 'increase' as const, 
          period: '昨日' 
        },
        icon: <CheckCircle className="h-5 w-5" />,
        status: metrics.completed_orders_today >= 8 ? 'excellent' as const : 'good' as const,
        description: '訂單處理效率優異'
      },
      {
        title: '本週營收',
        value: formatCurrency(metrics.week_revenue),
        change: { 
          value: getChangePercentage(metrics.week_revenue, Math.max(1000, metrics.week_revenue * 0.8)), 
          type: 'increase' as const, 
          period: '上週' 
        },
        icon: <TrendingUp className="h-5 w-5" />,
        status: metrics.week_revenue >= 30000 ? 'excellent' as const : 'good' as const,
        description: '週營收穩定成長'
      }
    ];
  }, [metrics]);

  // Generate achievements based on real data
  const achievements = React.useMemo(() => {
    if (!metrics) return [];

    const achievementList = [];

    if (metrics.customer_satisfaction_rate >= 4.5) {
      achievementList.push({
        title: '金牌供應商',
        description: `客戶滿意度 ${metrics.customer_satisfaction_rate.toFixed(1)}★，品質優異`,
        icon: <Star className="h-4 w-4 text-yellow-500" />,
        badge: '認證'
      });
    }

    if (metrics.on_time_delivery_rate >= 95) {
      achievementList.push({
        title: '準時交付王',
        description: `準時率 ${formatPercentage(metrics.on_time_delivery_rate)}，表現卓越`,
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        badge: '排行榜'
      });
    }

    if (metrics.active_customers >= 15) {
      achievementList.push({
        title: '客戶之選',
        description: `${metrics.active_customers} 家餐廳信賴合作`,
        icon: <Users className="h-4 w-4 text-blue-500" />,
        badge: '優選'
      });
    }

    return achievementList;
  }, [metrics]);

  return (
    <section aria-labelledby="supplier-overview-title">
      <div className="sr-only">
        <h2 id="supplier-overview-title">供應商營運指標總覽</h2>
      </div>
      
      <div className="space-y-6">
        {/* Header with refresh button */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">營運指標總覽</h3>
            <p className="text-sm text-gray-600">實時更新的關鍵業績指標</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshMetrics}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            <span>刷新</span>
          </Button>
        </div>

        {/* Core Metrics Grid */}
        {loading && !supplierMetrics.length ? (
          <SupplierMetricsGridSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {supplierMetrics.map((metric, index) => (
              <SupplierMetricCard
                key={index}
                title={metric.title}
                value={metric.value}
                change={metric.change}
                icon={metric.icon}
                status={metric.status}
                description={metric.description}
                target={metric.target}
              />
            ))}
          </div>
        )}

        {/* Achievements Section */}
        {achievements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>近期成就與認證</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex-shrink-0">
                      {achievement.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {achievement.title}
                        </h4>
                        <Badge variant="success" size="sm">
                          {achievement.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly Goals Progress */}
        {metrics && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">本週營運目標</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">訂單完成率</span>
                    <span className="text-sm font-bold text-green-600">
                      {metrics.week_orders > 0 
                        ? `${Math.round((metrics.completed_orders_today / metrics.week_orders) * 100)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                  <Progress 
                    value={metrics.week_orders > 0 ? (metrics.completed_orders_today / metrics.week_orders) * 100 : 0} 
                    className="h-2" 
                    variant="success" 
                  />
                  <p className="text-xs text-gray-500">
                    已完成 {metrics.completed_orders_today} / {metrics.week_orders} 訂單
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">客戶滿意度</span>
                    <span className="text-sm font-bold text-green-600">{metrics.customer_satisfaction_rate.toFixed(1)}★</span>
                  </div>
                  <Progress 
                    value={(metrics.customer_satisfaction_rate / 5) * 100} 
                    className="h-2" 
                    variant="success" 
                  />
                  <p className="text-xs text-gray-500">
                    {metrics.customer_satisfaction_rate >= 4.5 ? '超越 4.5★ 目標，表現優異' : '持續努力提升服務品質'}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">營收目標</span>
                    <span className="text-sm font-bold text-green-600">{formatCurrency(metrics.week_revenue)}</span>
                  </div>
                  <Progress 
                    value={Math.min((metrics.week_revenue / 35000) * 100, 100)} 
                    className="h-2" 
                    variant="success" 
                  />
                  <p className="text-xs text-gray-500">
                    週目標 NT$ 35,000，{metrics.week_revenue >= 35000 ? '已達成' : '持續努力中'}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">準時交付率</span>
                    <span className="text-sm font-bold text-green-600">{formatPercentage(metrics.on_time_delivery_rate)}</span>
                  </div>
                  <Progress 
                    value={metrics.on_time_delivery_rate} 
                    className="h-2" 
                    variant="success" 
                  />
                  <p className="text-xs text-gray-500">
                    {metrics.on_time_delivery_rate >= 95 ? '超越 95% 目標，表現卓越' : '努力提升交付準時率'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

export default function SupplierOverview() {
  const organizationId = useOrganizationId();

  if (!organizationId) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>無法獲取供應商資訊，請重新登入</p>
        </div>
      </Card>
    );
  }

  return (
    <SupplierPageErrorBoundary>
      <SupplierOverviewContent organizationId={organizationId} />
    </SupplierPageErrorBoundary>
  );
}
