'use client'

import React from 'react'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  ShoppingCart,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  CreditCard,
  FileCheck,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ViewSwitcher } from './ViewSwitcher'

// 暫時使用 mock data，稍後會連接到真實數據庫
const mockPlatformData = {
  business: {
    totalGMV: 15789456,
    gmvGrowth: 18.5,
    totalSuppliers: 145,
    supplierGrowth: 12.3,
    totalCustomers: 1286,
    customerGrowth: 15.7,
    monthlyOrders: 24567,
    orderGrowth: 22.1,
    avgOrderValue: 642.5,
    avgOrderGrowth: 8.3,
    reconciliationAccuracy: 98.7,
    accuracyChange: 2.1,
  },
  financial: {
    monthlyRevenue: 473684,
    revenueGrowth: 19.2,
    commissionRate: 2.8,
    activeSubscriptions: 1156,
    subscriptionGrowth: 14.5,
    pendingPayments: 8,
    paymentChange: -23.1,
  },
  operational: {
    systemUptime: 99.97,
    avgResponseTime: 156,
    activeTransactions: 342,
    pendingReconciliations: 15,
    reconciliationChange: -18.5,
    supportTickets: 7,
    ticketChange: -30.2,
  },
  topSuppliers: [
    { name: '新鮮食材有限公司', gmv: 1235680, growth: 23.5, orders: 892 },
    { name: '優質農產品供應', gmv: 987450, growth: 18.7, orders: 756 },
    { name: '海鮮直送批發', gmv: 854320, growth: 15.2, orders: 634 },
    { name: '有機蔬果農場', gmv: 743210, growth: 28.9, orders: 523 },
    { name: '肉品冷鏈專家', gmv: 692580, growth: 12.4, orders: 487 },
  ],
  recentAlerts: [
    {
      id: 1,
      type: 'warning',
      message: '供應商「新鮮食材」交貨延遲率異常',
      time: '3分鐘前',
      severity: 'medium',
    },
    { id: 2, type: 'info', message: '本月GMV已達成80%目標', time: '15分鐘前', severity: 'low' },
    {
      id: 3,
      type: 'error',
      message: '對帳差異超過閾值需人工審核',
      time: '25分鐘前',
      severity: 'high',
    },
    {
      id: 4,
      type: 'success',
      message: '系統自動修復網路連線問題',
      time: '1小時前',
      severity: 'low',
    },
  ],
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  format?: 'number' | 'currency' | 'percentage'
  className?: string
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  trend,
  format = 'number',
  className,
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val

    switch (format) {
      case 'currency':
        return `NT$ ${val.toLocaleString()}`
      case 'percentage':
        return `${val}%`
      default:
        return val.toLocaleString()
    }
  }

  const getTrendColor = () => {
    if (!change) return 'text-gray-500'
    if (trend === 'up') return change > 0 ? 'text-green-600' : 'text-red-600'
    if (trend === 'down') return change < 0 ? 'text-green-600' : 'text-red-600'
    return change > 0 ? 'text-green-600' : 'text-red-600'
  }

  const TrendIcon = change && change > 0 ? TrendingUp : TrendingDown

  return (
    <Card className={cn('transition-all hover:shadow-md', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{formatValue(value)}</p>
            {change !== undefined && (
              <div className={cn('flex items-center text-sm font-medium', getTrendColor())}>
                <TrendIcon className="mr-1 h-4 w-4" />
                <span>{Math.abs(change)}% 較上月</span>
              </div>
            )}
          </div>
          <div className="rounded-full bg-primary-100 p-3">
            <Icon className="h-6 w-6 text-primary-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PlatformDashboard() {
  const [data, setData] = React.useState(mockPlatformData)
  const [lastUpdated, setLastUpdated] = React.useState(new Date())
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const refreshData = async () => {
    setIsRefreshing(true)
    // 模擬 API 調用
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLastUpdated(new Date())
    setIsRefreshing(false)
  }

  React.useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => ({
        ...prev,
        operational: {
          ...prev.operational,
          activeTransactions:
            prev.operational.activeTransactions + Math.floor(Math.random() * 10 - 5),
          avgResponseTime: Math.max(
            100,
            prev.operational.avgResponseTime + Math.floor(Math.random() * 20 - 10)
          ),
        },
      }))
      setLastUpdated(new Date())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* 刷新按鈕和最後更新時間 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={refreshData} disabled={isRefreshing} variant="outline" size="sm">
            <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
            刷新數據
          </Button>
          <Badge variant="outline" className="text-xs">
            最後更新: {lastUpdated.toLocaleTimeString('zh-TW')}
          </Badge>
        </div>
      </div>

      {/* 組織檢視切換 */}
      <ViewSwitcher />

      {/* 核心業務指標 */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">核心業務指標</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            title="本月 GMV"
            value={data.business.totalGMV}
            change={data.business.gmvGrowth}
            icon={DollarSign}
            format="currency"
            trend="up"
          />
          <MetricCard
            title="活躍供應商"
            value={data.business.totalSuppliers}
            change={data.business.supplierGrowth}
            icon={Building2}
            trend="up"
          />
          <MetricCard
            title="餐廳客戶"
            value={data.business.totalCustomers}
            change={data.business.customerGrowth}
            icon={Users}
            trend="up"
          />
          <MetricCard
            title="本月訂單"
            value={data.business.monthlyOrders}
            change={data.business.orderGrowth}
            icon={ShoppingCart}
            trend="up"
          />
          <MetricCard
            title="平均客單價"
            value={data.business.avgOrderValue}
            change={data.business.avgOrderGrowth}
            icon={CreditCard}
            format="currency"
            trend="up"
          />
          <MetricCard
            title="對帳準確率"
            value={data.business.reconciliationAccuracy}
            change={data.business.accuracyChange}
            icon={FileCheck}
            format="percentage"
            trend="up"
          />
        </div>
      </div>

      {/* 財務與營運 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* 財務指標 */}
        <div className="xl:col-span-1">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">財務指標</h3>
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="font-medium">月收入</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    NT$ {data.financial.monthlyRevenue.toLocaleString()}
                  </div>
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="mr-1 h-3 w-3" />+{data.financial.revenueGrowth}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">佣金費率</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {data.financial.commissionRate}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">活躍訂閱</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {data.financial.activeSubscriptions.toLocaleString()}
                  </div>
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="mr-1 h-3 w-3" />+{data.financial.subscriptionGrowth}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">待處理付款</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {data.financial.pendingPayments}
                  </div>
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingDown className="mr-1 h-3 w-3" />
                    {Math.abs(data.financial.paymentChange)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 頂級供應商 */}
        <div className="xl:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">頂級供應商</h3>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {data.topSuppliers.map((supplier, index) => (
                  <div
                    key={supplier.name}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                        <span className="text-sm font-bold text-primary-600">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{supplier.name}</div>
                        <div className="text-sm text-gray-500">{supplier.orders} 筆訂單</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        NT$ {supplier.gmv.toLocaleString()}
                      </div>
                      <div className="flex items-center text-sm text-green-600">
                        <TrendingUp className="mr-1 h-3 w-3" />+{supplier.growth}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 營運狀態與警報 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* 營運狀態 */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">營運狀態</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetricCard
              title="系統可用性"
              value={data.operational.systemUptime}
              icon={Activity}
              format="percentage"
              className="col-span-1"
            />
            <MetricCard
              title="平均響應時間"
              value={`${data.operational.avgResponseTime}ms`}
              icon={Clock}
              className="col-span-1"
            />
            <MetricCard
              title="活躍交易"
              value={data.operational.activeTransactions}
              icon={CreditCard}
              className="col-span-1"
            />
            <MetricCard
              title="待對帳"
              value={data.operational.pendingReconciliations}
              change={data.operational.reconciliationChange}
              icon={FileCheck}
              trend="down"
              className="col-span-1"
            />
          </div>
        </div>

        {/* 最新警報 */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">最新警報</h3>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                {data.recentAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className="flex items-start space-x-3 rounded-lg bg-gray-50 p-3"
                  >
                    <div
                      className={cn(
                        'mt-0.5 rounded-full p-1',
                        alert.type === 'error'
                          ? 'bg-red-100 text-red-600'
                          : alert.type === 'warning'
                            ? 'bg-yellow-100 text-yellow-600'
                            : alert.type === 'success'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-blue-100 text-blue-600'
                      )}
                    >
                      {alert.type === 'error' ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : alert.type === 'warning' ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : alert.type === 'success' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Activity className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900">{alert.message}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {alert.time} •
                        <span
                          className={cn(
                            'ml-1',
                            alert.severity === 'high'
                              ? 'text-red-600'
                              : alert.severity === 'medium'
                                ? 'text-yellow-600'
                                : 'text-gray-500'
                          )}
                        >
                          {alert.severity === 'high'
                            ? '高'
                            : alert.severity === 'medium'
                              ? '中'
                              : '低'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
