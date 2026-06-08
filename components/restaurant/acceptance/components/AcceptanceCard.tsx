'use client'

/**
 * AcceptanceCard Component
 * 單張驗收記錄卡片
 */

import { MapPin, Package, Eye, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AcceptanceRecord } from '../types'
import {
  getStatusIcon,
  getStatusText,
  getStatusVariant,
  getQualityStars,
  getConditionText,
  getConditionVariant,
  formatDateTime,
  isOnTimeDelivery,
} from '../utils'

interface AcceptanceCardProps {
  record: AcceptanceRecord
  onViewDetail: (record: AcceptanceRecord) => void
}

export function AcceptanceCard({ record, onViewDetail }: AcceptanceCardProps): React.ReactElement {
  return (
    <div className="rounded-lg border bg-white p-4 transition-all hover:shadow-md">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* 基本資訊 */}
        <div className="space-y-2 lg:col-span-4">
          <div className="flex items-center space-x-3">
            <div className="font-bold text-primary-600">{record.orderNumber}</div>
            <Badge
              variant={getStatusVariant(record.status)}
              className="flex items-center space-x-1"
            >
              {getStatusIcon(record.status)}
              <span>{getStatusText(record.status)}</span>
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="font-medium text-gray-900">{record.supplier.name}</div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="h-3 w-3" />
              <span>{record.acceptanceLocation}</span>
            </div>
            <div className="text-sm text-gray-600">驗收人員: {record.acceptedBy}</div>
          </div>
        </div>

        {/* 驗收詳情 */}
        <div className="space-y-2 lg:col-span-4">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">品項數量:</span>
              <span className="font-medium">{record.items.length} 項</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">整體評分:</span>
              <div className="flex items-center space-x-1">
                {getQualityStars(record.overallRating)}
                <span className="ml-1 text-sm font-medium">{record.overallRating}/5</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">異常項目:</span>
              {record.discrepancies.length > 0 ? (
                <Badge variant="destructive" size="sm">
                  {record.discrepancies.length} 項
                </Badge>
              ) : (
                <Badge variant="success" size="sm">
                  無異常
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* 時間資訊 */}
        <div className="space-y-2 lg:col-span-2">
          <div className="space-y-1 text-sm">
            <div>
              <span className="block text-gray-600">送達時間:</span>
              <span className="text-xs">{formatDateTime(record.deliveryTime)}</span>
            </div>
            <div>
              <span className="block text-gray-600">驗收時間:</span>
              <span className="text-xs text-green-600">
                {formatDateTime(record.acceptanceTime)}
              </span>
            </div>
            {record.deliveryTime && record.requestedDeliveryTime && (
              <div>
                <span className="block text-gray-600">配送狀況:</span>
                <span
                  className={cn(
                    'text-xs',
                    isOnTimeDelivery(record.deliveryTime, record.requestedDeliveryTime)
                      ? 'text-green-600'
                      : 'text-red-600'
                  )}
                >
                  {isOnTimeDelivery(record.deliveryTime, record.requestedDeliveryTime)
                    ? '準時送達'
                    : '延遲送達'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex flex-col space-y-2 lg:col-span-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetail(record)}
            className="flex items-center space-x-1"
          >
            <Eye className="h-4 w-4" />
            <span>查看詳情</span>
          </Button>

          {record.status === 'in_progress' && (
            <Button
              variant="solid"
              colorScheme="green"
              size="sm"
              className="flex items-center space-x-1"
            >
              <CheckCircle className="h-4 w-4" />
              <span>完成驗收</span>
            </Button>
          )}
        </div>
      </div>

      {/* 品項預覽 */}
      <div className="mt-4 border-t pt-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {record.items.slice(0, 3).map(item => (
            <div key={item.id} className="flex items-center space-x-3 rounded bg-gray-50 p-2">
              <Package className="h-4 w-4 text-gray-500" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{item.itemName}</div>
                <div className="text-xs text-gray-600">
                  {item.receivedQuantity}/{item.orderedQuantity} {item.unit}
                </div>
              </div>
              <Badge variant={getConditionVariant(item.condition)} size="sm">
                {getConditionText(item.condition)}
              </Badge>
            </div>
          ))}
          {record.items.length > 3 && (
            <div className="flex items-center justify-center rounded bg-gray-100 p-2 text-sm text-gray-600">
              還有 {record.items.length - 3} 項...
            </div>
          )}
        </div>
      </div>

      {/* 備註 */}
      {record.notes && (
        <div className="mt-3 rounded-r border-l-4 border-blue-400 bg-blue-50 p-2">
          <p className="text-sm text-blue-800">
            <strong>備註:</strong> {record.notes}
          </p>
        </div>
      )}
    </div>
  )
}
