'use client'

import * as React from 'react'
import { 
  Users, 
  Package, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Star,
  Award,
  BarChart3,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SupplierStatistics as SupplierStatsType } from '@/lib/services/supplier-service'

interface SupplierStatisticsProps {
  statistics: SupplierStatsType & {
    computed?: {
      supplierUtilizationRate: number
      averageProductsPerSupplier: number
      averageGMVPerSupplier: number
    }
    trends?: {
      supplierGrowth: number
      gmvGrowth: number
      fulfillmentImprovement: number
    }
    period?: {
      start: string
      end: string
      days: number
    }
  }
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void
  className?: string
}

const SupplierStatistics = React.forwardRef<HTMLDivElement, SupplierStatisticsProps>(({
  statistics,
  isLoading = false,
  error = null,
  onRefresh,
  className,
  ...props
}, ref) => {
  // Helper functions
  const formatCurrency = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}萬`
    }
    return amount.toLocaleString()
  }

  const formatTrend = (value: number) => {
    const sign = value > 0 ? '+' : ''
    return `${sign}${value}%`
  }

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return TrendingUp
    if (value < 0) return TrendingDown
    return null
  }

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="p-6 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 bg-gray-200 rounded" />
            <div className="w-16 h-4 bg-gray-200 rounded" />
          </div>
          <div className="w-20 h-8 bg-gray-200 rounded mb-1" />
          <div className="w-24 h-4 bg-gray-200 rounded" />
        </Card>
      ))}
    </div>
  )

  // Error state
  const ErrorState = () => (
    <Card className="p-8 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">載入失敗</h3>
      <p className="text-gray-600 mb-4">{error || '無法載入統計資料'}</p>
      {onRefresh && (
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          重新載入
        </Button>
      )}
    </Card>
  )

  if (error) return <ErrorState />
  if (isLoading) return <LoadingSkeleton />

  const {
    totalSuppliers,
    activeSuppliers,
    totalProducts,
    monthlyGMV,
    averageFulfillmentRate,
    topSuppliers,
    computed = {
      supplierUtilizationRate: 0,
      averageProductsPerSupplier: 0,
      averageGMVPerSupplier: 0
    },
    trends = {
      supplierGrowth: 0,
      gmvGrowth: 0,
      fulfillmentImprovement: 0
    },
    period
  } = statistics

  // Main KPI cards data
  const kpiCards = [
    {
      title: '合作供應商',
      value: activeSuppliers,
      total: totalSuppliers,
      icon: Users,
      trend: trends.supplierGrowth,
      description: '正在合作中',
      color: 'bg-blue-500'
    },
    {
      title: '商品總數',
      value: totalProducts,
      icon: Package,
      description: '可訂購商品',
      color: 'bg-green-500'
    },
    {
      title: '月交易額',
      value: `NT$${formatCurrency(monthlyGMV)}`,
      icon: DollarSign,
      trend: trends.gmvGrowth,
      description: '本月總金額',
      color: 'bg-[#A47864]'
    },
    {
      title: '平均履約率',
      value: `${averageFulfillmentRate}%`,
      icon: Star,
      trend: trends.fulfillmentImprovement,
      description: '整體表現',
      color: 'bg-yellow-500'
    }
  ]

  // Computed metrics cards
  const computedCards = [
    {
      title: '供應商利用率',
      value: `${computed.supplierUtilizationRate}%`,
      description: '活躍供應商比例',
      icon: BarChart3
    },
    {
      title: '平均商品數',
      value: computed.averageProductsPerSupplier,
      description: '每家供應商',
      icon: Package
    },
    {
      title: '平均貢獻度',
      value: `NT$${formatCurrency(computed.averageGMVPerSupplier)}`,
      description: '每家供應商月GMV',
      icon: Award
    }
  ]

  return (
    <div ref={ref} className={cn('spacing-normal', className)} {...props}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">供應商統計總覽</h2>
          {period && (
            <p className="text-sm text-gray-600 mt-1">
              統計期間：{new Date(period.start).toLocaleDateString()} - {new Date(period.end).toLocaleDateString()}
            </p>
          )}
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            更新數據
          </Button>
        )}
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, index) => {
          const Icon = card.icon
          const TrendIcon = card.trend ? getTrendIcon(card.trend) : null
          
          return (
            <Card key={index} variant="supplier" padding="md" className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', card.color)}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                {card.trend !== undefined && TrendIcon && (
                  <div className={cn('flex items-center text-sm', getTrendColor(card.trend))}>
                    <TrendIcon className="h-4 w-4 mr-1" />
                    {formatTrend(card.trend)}
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline space-x-2">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {card.value}
                  </h3>
                  {card.total && (
                    <span className="text-sm text-gray-500">/ {card.total}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{card.description}</p>
                <div className="text-xs text-gray-500">{card.title}</div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Computed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {computedCards.map((card, index) => {
          const Icon = card.icon
          
          return (
            <Card key={index} variant="supplier" padding="sm" className="border-l-4 border-supplier-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {card.value}
                  </div>
                  <div className="text-sm text-gray-600">{card.description}</div>
                  <div className="text-xs text-gray-500 mt-1">{card.title}</div>
                </div>
                <Icon className="h-8 w-8 text-[#A47864]" />
              </div>
            </Card>
          )
        })}
      </div>

      {/* Top Suppliers - Glass Effect */}
      {topSuppliers.length > 0 && (
        <Card variant="glass-supplier" padding="md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            表現優異供應商 TOP 5
          </h3>
          <div className="space-y-3">
            {topSuppliers.map((supplier, index) => (
              <div key={supplier.id} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <Badge 
                    variant={index === 0 ? 'default' : 'outline'}
                    className={cn(
                      'w-6 h-6 p-0 flex items-center justify-center text-xs',
                      index === 0 && 'bg-[#A47864]'
                    )}
                  >
                    {index + 1}
                  </Badge>
                  <span className="font-medium text-gray-900">{supplier.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    NT${formatCurrency(supplier.gmv)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {supplier.orderCount} 筆訂單
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Summary Footer */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-sm text-gray-600">供應商效率</div>
            <div className={cn(
              'text-lg font-semibold',
              averageFulfillmentRate >= 90 ? 'text-green-600' : 
              averageFulfillmentRate >= 80 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {averageFulfillmentRate >= 90 ? '優秀' : 
               averageFulfillmentRate >= 80 ? '良好' : '待改善'}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">合作深度</div>
            <div className="text-lg font-semibold text-gray-900">
              {computed.averageProductsPerSupplier > 50 ? '深度合作' : 
               computed.averageProductsPerSupplier > 20 ? '一般合作' : '初期合作'}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">供應鏈健康度</div>
            <div className={cn(
              'text-lg font-semibold',
              computed.supplierUtilizationRate >= 80 ? 'text-green-600' :
              computed.supplierUtilizationRate >= 60 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {computed.supplierUtilizationRate >= 80 ? '健康' :
               computed.supplierUtilizationRate >= 60 ? '一般' : '需優化'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

SupplierStatistics.displayName = 'SupplierStatistics'

export default SupplierStatistics