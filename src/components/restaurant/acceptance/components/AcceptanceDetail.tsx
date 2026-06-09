'use client'

/**
 * AcceptanceDetail Component
 * 驗收詳情對話框內容
 */

import { AlertTriangle, ThermometerSun } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { FormDialog } from '@/components/ui/accessible-modal'
import { cn } from '@/lib/utils'
import type { AcceptanceRecord } from '../types'
import {
  getQualityStars,
  getConditionText,
  getConditionVariant,
  getDiscrepancySeverityText,
  getDiscrepancySeverityVariant,
  formatDateTime,
} from '../utils'

interface AcceptanceDetailProps {
  record: AcceptanceRecord | null
  isOpen: boolean
  onClose: () => void
}

export function AcceptanceDetail({
  record,
  isOpen,
  onClose,
}: AcceptanceDetailProps): React.ReactElement | null {
  if (!record) return null

  return (
    <FormDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`驗收詳情 - ${record.orderNumber}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* 基本資訊 */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="mb-3 font-medium text-gray-900">驗收資訊</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">訂單編號:</span>
                <span className="font-medium">{record.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">驗收人員:</span>
                <span>{record.acceptedBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">驗收地點:</span>
                <span>{record.acceptanceLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">驗收時間:</span>
                <span>{formatDateTime(record.acceptanceTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">整體評分:</span>
                <div className="flex items-center space-x-1">
                  {getQualityStars(record.overallRating)}
                  <span className="ml-1">{record.overallRating}/5</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-medium text-gray-900">供應商資訊</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">供應商名稱:</span>
                <span className="font-medium">{record.supplier.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">聯絡人:</span>
                <span>{record.supplier.contact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">電話:</span>
                <span>{record.supplier.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">送達時間:</span>
                <span>{formatDateTime(record.deliveryTime)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 驗收項目明細 */}
        <div>
          <h4 className="mb-3 font-medium text-gray-900">驗收明細</h4>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="grid grid-cols-8 gap-4 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
              <div className="col-span-2">品項名稱</div>
              <div>訂購數量</div>
              <div>實收數量</div>
              <div>品質評分</div>
              <div>狀況</div>
              <div>溫度</div>
              <div>照片</div>
            </div>
            {record.items.map(item => (
              <div
                key={item.id}
                className="grid grid-cols-8 gap-4 border-t border-gray-100 px-4 py-3 text-sm"
              >
                <div className="col-span-2">
                  <div className="font-medium">{item.itemName}</div>
                  <div className="text-xs text-gray-500">{item.itemCode}</div>
                  {item.notes && <div className="mt-1 text-xs text-gray-600">{item.notes}</div>}
                </div>
                <div>
                  {item.orderedQuantity} {item.unit}
                </div>
                <div
                  className={cn(
                    'font-medium',
                    item.receivedQuantity < item.orderedQuantity ? 'text-red-600' : 'text-green-600'
                  )}
                >
                  {item.receivedQuantity} {item.unit}
                </div>
                <div className="flex items-center space-x-1">
                  {getQualityStars(item.qualityRating)}
                </div>
                <div>
                  <Badge variant={getConditionVariant(item.condition)} size="sm">
                    {getConditionText(item.condition)}
                  </Badge>
                </div>
                <div>
                  {item.temperature !== undefined && (
                    <div className="flex items-center space-x-1">
                      <ThermometerSun className="h-3 w-3" />
                      <span>{item.temperature}°C</span>
                    </div>
                  )}
                </div>
                <div>
                  <Badge variant="outline" size="sm">
                    {item.photos.length} 張
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 異常項目 */}
        {record.discrepancies.length > 0 && (
          <div>
            <h4 className="mb-3 font-medium text-gray-900">異常項目</h4>
            <div className="space-y-3">
              {record.discrepancies.map(discrepancy => (
                <div
                  key={discrepancy.id}
                  className="rounded-lg border border-red-200 bg-red-50 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-900">{discrepancy.description}</span>
                    </div>
                    <Badge variant={getDiscrepancySeverityVariant(discrepancy.severity)} size="sm">
                      {getDiscrepancySeverityText(discrepancy.severity)}
                    </Badge>
                  </div>
                  <div className="text-sm text-red-800">
                    <p>
                      <strong>處理方案:</strong> {discrepancy.proposedResolution}
                    </p>
                    {discrepancy.financialImpact !== undefined && (
                      <p>
                        <strong>金額影響:</strong> NT$ {discrepancy.financialImpact}
                      </p>
                    )}
                    <p>
                      <strong>證據照片:</strong> {discrepancy.evidencePhotos.length} 張
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </FormDialog>
  )
}
