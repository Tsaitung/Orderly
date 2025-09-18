'use client'

import * as React from 'react'
import Link from 'next/link'
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Calendar,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  MoreVertical,
  Star
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SupplierSummary } from '@/lib/services/supplier-service'

interface SupplierCardProps {
  supplier: SupplierSummary
  className?: string
  variant?: 'default' | 'compact'
  showQuickActions?: boolean
  onQuickOrder?: (supplierId: string) => void
  onViewDetails?: (supplierId: string) => void
  onViewCatalog?: (supplierId: string) => void
}

const SupplierCard = React.forwardRef<HTMLDivElement, SupplierCardProps>(({
  supplier,
  className,
  variant = 'default',
  showQuickActions = true,
  onQuickOrder,
  onViewDetails,
  onViewCatalog,
  ...props
}, ref) => {
  const {
    id,
    name,
    isActive,
    productCount,
    recentOrderCount,
    fulfillmentRate,
    averageDeliveryTime,
    totalGMV,
    lastOrderDate,
    settings
  } = supplier

  // Extract business settings
  const businessSettings = settings || {}
  const paymentTerms = businessSettings.paymentTerms || 30
  const minimumOrder = businessSettings.minimumOrderAmount || 0
  const deliveryZones = businessSettings.deliveryZones || []

  // Calculate status and metrics
  const statusColor = isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  const statusText = isActive ? '正常合作' : '暫停中'
  
  const performanceColor = fulfillmentRate >= 90 ? 'text-green-600' : 
                          fulfillmentRate >= 70 ? 'text-yellow-600' : 'text-red-600'

  const formatGMV = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}萬`
    }
    return amount.toLocaleString()
  }

  const formatLastOrder = (date: Date | null) => {
    if (!date) return '無近期訂單'
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays <= 7) return `${diffDays}天前`
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)}週前`
    return `${Math.floor(diffDays / 30)}個月前`
  }

  const handleQuickOrder = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onQuickOrder?.(id)
  }

  const handleViewCatalog = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onViewCatalog?.(id)
  }

  const handleViewDetails = () => {
    onViewDetails?.(id)
  }

  if (variant === 'compact') {
    return (
      <Card 
        ref={ref}
        variant="supplier"
        padding="sm"
        className={cn(
          'hover:shadow-md transition-shadow cursor-pointer',
          'border-l-4 border-supplier-500',
          className
        )}
        onClick={handleViewDetails}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-supplier-500 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{name}</h3>
              <p className="text-sm text-gray-500">
                {productCount} 項商品 · {recentOrderCount} 筆訂單
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge className={statusColor}>{statusText}</Badge>
            <p className="text-sm text-gray-500 mt-1">
              履約率 <span className={performanceColor}>{fulfillmentRate}%</span>
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card 
      ref={ref}
      variant={fulfillmentRate >= 95 ? 'neu' : 'supplier'}
      padding="md"
      className={cn(
        'group hover:shadow-lg transition-all duration-200 cursor-pointer',
        fulfillmentRate >= 95 ? 'border-supplier-200' : 'hover:border-supplier-400',
        className
      )}
      onClick={handleViewDetails}
      {...props}
    >
      {/* Card Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {/* Supplier Logo/Icon */}
            <div className="w-12 h-12 bg-[#A47864] rounded-xl flex items-center justify-center">
              <Package className="h-6 w-6 text-white" />
            </div>
            
            {/* Supplier Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#A47864] transition-colors">
                {name}
              </h3>
              <div className="flex items-center space-x-3 mt-1">
                <Badge className={statusColor}>{statusText}</Badge>
                {deliveryZones.length > 0 && (
                  <span className="text-sm text-gray-500 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {deliveryZones.slice(0, 2).join(', ')}
                    {deliveryZones.length > 2 && ' 等'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Menu */}
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Product Count */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{productCount}</div>
            <div className="text-sm text-gray-500">項商品</div>
          </div>

          {/* Recent Orders */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{recentOrderCount}</div>
            <div className="text-sm text-gray-500">筆訂單</div>
          </div>

          {/* Fulfillment Rate */}
          <div className="text-center">
            <div className={cn("text-2xl font-bold", performanceColor)}>
              {fulfillmentRate}%
            </div>
            <div className="text-sm text-gray-500">履約率</div>
          </div>

          {/* Average Delivery */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{averageDeliveryTime}</div>
            <div className="text-sm text-gray-500">天送達</div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>月交易額 NT${formatGMV(totalGMV)}</span>
            <span>最後訂單 {formatLastOrder(lastOrderDate)}</span>
          </div>
          {minimumOrder > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              最低訂購金額 NT${minimumOrder.toLocaleString()} · 付款條件 {paymentTerms}天
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Footer */}
      {showQuickActions && (
        <div className="px-6 pb-6">
          <div className="flex space-x-2">
            <Button
              size="sm"
              className="flex-1 bg-[#A47864] hover:bg-[#8B6B4F]"
              onClick={handleQuickOrder}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              快速下單
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleViewCatalog}
            >
              <Package className="h-4 w-4 mr-2" />
              查看商品
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewDetails}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
})

SupplierCard.displayName = 'SupplierCard'

export default SupplierCard