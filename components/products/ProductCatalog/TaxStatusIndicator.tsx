'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Shield } from 'lucide-react'

// 稅務狀態類型
type TaxStatus = 'taxable' | 'tax_exempt'

interface TaxStatusIndicatorProps {
  taxStatus: TaxStatus
  size?: 'sm' | 'default' | 'lg'
  showIcon?: boolean
  showLabel?: boolean
  variant?: 'badge' | 'text' | 'icon'
}

// 稅務狀態配置
const TAX_STATUS_CONFIG: Record<TaxStatus, {
  label: string
  shortLabel: string
  icon: React.ReactNode
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  bgColor: string
  textColor: string
  borderColor: string
}> = {
  taxable: {
    label: '應稅商品',
    shortLabel: '應稅',
    icon: <Shield className="h-3 w-3" />,
    variant: 'outline',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  tax_exempt: {
    label: '免稅商品',
    shortLabel: '免稅',
    icon: <ShieldCheck className="h-3 w-3" />,
    variant: 'secondary',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  }
}

export function TaxStatusIndicator({
  taxStatus,
  size = 'default',
  showIcon = true,
  showLabel = true,
  variant = 'badge'
}: TaxStatusIndicatorProps) {
  const config = TAX_STATUS_CONFIG[taxStatus]

  // 取得大小相關的類名
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          badge: 'text-xs px-1.5 py-0.5',
          icon: 'h-2.5 w-2.5',
          text: 'text-xs'
        }
      case 'lg':
        return {
          badge: 'text-sm px-3 py-1.5',
          icon: 'h-4 w-4', 
          text: 'text-sm'
        }
      default:
        return {
          badge: 'text-xs px-2 py-1',
          icon: 'h-3 w-3',
          text: 'text-sm'
        }
    }
  }

  const sizeClasses = getSizeClasses()

  // Badge 變體
  if (variant === 'badge') {
    return (
      <div
        className={`
          inline-flex items-center gap-1 rounded-full border font-medium
          ${config.bgColor} ${config.textColor} ${config.borderColor}
          ${sizeClasses.badge}
          transition-all duration-200
        `}
        title={config.label}
      >
        {showIcon && (
          <span className={`flex-shrink-0 ${sizeClasses.icon}`}>
            {React.cloneElement(config.icon as React.ReactElement, {
              className: sizeClasses.icon
            })}
          </span>
        )}
        {showLabel && (
          <span className="truncate">
            {config.shortLabel}
          </span>
        )}
      </div>
    )
  }

  // 純文字變體
  if (variant === 'text') {
    return (
      <span
        className={`inline-flex items-center gap-1 ${config.textColor} ${sizeClasses.text}`}
        title={config.label}
      >
        {showIcon && (
          <span className="flex-shrink-0">
            {React.cloneElement(config.icon as React.ReactElement, {
              className: sizeClasses.icon
            })}
          </span>
        )}
        {showLabel && config.shortLabel}
      </span>
    )
  }

  // 純圖示變體
  if (variant === 'icon') {
    return (
      <span
        className={`inline-flex items-center justify-center ${config.textColor}`}
        title={config.label}
      >
        {React.cloneElement(config.icon as React.ReactElement, {
          className: sizeClasses.icon
        })}
      </span>
    )
  }

  return null
}

// 稅務狀態摘要組件
interface TaxStatusSummaryProps {
  taxableCount: number
  taxExemptCount: number
  showCounts?: boolean
  layout?: 'horizontal' | 'vertical'
}

export function TaxStatusSummary({
  taxableCount,
  taxExemptCount,
  showCounts = true,
  layout = 'horizontal'
}: TaxStatusSummaryProps) {
  const total = taxableCount + taxExemptCount
  
  if (total === 0) {
    return (
      <div className="text-sm text-gray-500">
        無稅務資訊
      </div>
    )
  }

  const containerClass = layout === 'horizontal' 
    ? 'flex items-center gap-3' 
    : 'space-y-2'

  return (
    <div className={containerClass}>
      {taxableCount > 0 && (
        <div className="flex items-center gap-1">
          <TaxStatusIndicator
            taxStatus="taxable"
            size="sm"
            variant="badge"
          />
          {showCounts && (
            <span className="text-xs text-gray-600">
              ({taxableCount})
            </span>
          )}
        </div>
      )}
      
      {taxExemptCount > 0 && (
        <div className="flex items-center gap-1">
          <TaxStatusIndicator
            taxStatus="tax_exempt"
            size="sm"
            variant="badge"
          />
          {showCounts && (
            <span className="text-xs text-gray-600">
              ({taxExemptCount})
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// 稅務狀態過濾器組件
interface TaxStatusFilterProps {
  selectedStatuses: TaxStatus[]
  onStatusChange: (statuses: TaxStatus[]) => void
  allowMultiple?: boolean
}

export function TaxStatusFilter({
  selectedStatuses,
  onStatusChange,
  allowMultiple = true
}: TaxStatusFilterProps) {
  const handleStatusToggle = (status: TaxStatus) => {
    if (allowMultiple) {
      const isSelected = selectedStatuses.includes(status)
      if (isSelected) {
        onStatusChange(selectedStatuses.filter(s => s !== status))
      } else {
        onStatusChange([...selectedStatuses, status])
      }
    } else {
      // 單選模式
      if (selectedStatuses.includes(status)) {
        onStatusChange([]) // 取消選擇
      } else {
        onStatusChange([status]) // 選擇單一狀態
      }
    }
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900">稅務狀態</h4>
      <div className="space-y-2">
        {(Object.keys(TAX_STATUS_CONFIG) as TaxStatus[]).map(status => {
          const config = TAX_STATUS_CONFIG[status]
          const isSelected = selectedStatuses.includes(status)
          
          return (
            <label
              key={status}
              className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <input
                type={allowMultiple ? 'checkbox' : 'radio'}
                name="taxStatus"
                checked={isSelected}
                onChange={() => handleStatusToggle(status)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <TaxStatusIndicator
                taxStatus={status}
                size="sm"
                variant="badge"
              />
            </label>
          )
        })}
      </div>
    </div>
  )
}

// 輔助函數
export const getTaxStatusLabel = (taxStatus: TaxStatus): string => {
  return TAX_STATUS_CONFIG[taxStatus]?.label || taxStatus
}

export const getTaxStatusConfig = (taxStatus: TaxStatus) => {
  return TAX_STATUS_CONFIG[taxStatus]
}

// 匯出類型和常數
export type { TaxStatus }
export { TAX_STATUS_CONFIG }