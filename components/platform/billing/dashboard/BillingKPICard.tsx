'use client'

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BillingKPICardProps {
  title: string
  value?: number
  previousValue?: number
  change?: number
  changePercentage?: number
  icon: LucideIcon
  format?: 'currency' | 'number' | 'percentage'
  trend?: 'up' | 'down' | 'stable'
  loading?: boolean
  className?: string
}

export function BillingKPICard({
  title,
  value,
  previousValue,
  change,
  changePercentage,
  icon: Icon,
  format = 'number',
  trend,
  loading = false,
  className
}: BillingKPICardProps) {
  // 計算趨勢
  const calculatedTrend = trend || (
    change !== undefined
      ? change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
      : 'stable'
  )

  // 格式化數值
  const formatValue = (val: number | undefined) => {
    if (val === undefined || loading) return '--'
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('zh-TW', {
          style: 'currency',
          currency: 'TWD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(val)
      
      case 'percentage':
        return `${val.toFixed(2)}%`
      
      default:
        return new Intl.NumberFormat('zh-TW').format(val)
    }
  }

  // 格式化變化值
  const formatChange = (changeVal: number | undefined, changePercent: number | undefined) => {
    if (changeVal === undefined && changePercent === undefined) return null
    
    if (changePercent !== undefined) {
      return `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`
    }
    
    if (changeVal !== undefined) {
      const formattedChange = formatValue(Math.abs(changeVal))
      return `${changeVal > 0 ? '+' : changeVal < 0 ? '-' : ''}${formattedChange}`
    }
    
    return null
  }

  const getTrendIcon = () => {
    switch (calculatedTrend) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />
      case 'down':
        return <TrendingDown className="h-3 w-3" />
      default:
        return <Minus className="h-3 w-3" />
    }
  }

  const getTrendColor = () => {
    switch (calculatedTrend) {
      case 'up':
        return 'text-green-600 bg-green-50'
      case 'down':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const changeDisplay = formatChange(change, changePercentage)

  return (
    <div className={cn(
      'bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-gray-900">
              {loading ? (
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
              ) : (
                formatValue(value)
              )}
            </p>
            
            {changeDisplay && !loading && (
              <div className={cn(
                'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
                getTrendColor()
              )}>
                {getTrendIcon()}
                <span>{changeDisplay}</span>
              </div>
            )}
          </div>
          
          {previousValue !== undefined && !loading && (
            <p className="text-xs text-gray-500 mt-1">
              前期：{formatValue(previousValue)}
            </p>
          )}
        </div>
        
        <div className="ml-4">
          <div className={cn(
            'flex items-center justify-center w-12 h-12 rounded-lg',
            loading ? 'bg-gray-100' : 'bg-primary-100'
          )}>
            {loading ? (
              <div className="w-6 h-6 bg-gray-300 rounded animate-pulse" />
            ) : (
              <Icon className="h-6 w-6 text-primary-600" />
            )}
          </div>
        </div>
      </div>
      
      {loading && (
        <div className="mt-3 space-y-2">
          <div className="h-2 bg-gray-200 rounded animate-pulse" />
          <div className="h-2 bg-gray-200 rounded w-3/4 animate-pulse" />
        </div>
      )}
    </div>
  )
}