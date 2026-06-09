'use client'

/**
 * AcceptanceList Component
 * 驗收記錄列表
 */

import { RefreshCw, Receipt } from 'lucide-react'
import type { AcceptanceRecord } from '../types'
import { AcceptanceCard } from './AcceptanceCard'

interface AcceptanceListProps {
  records: AcceptanceRecord[]
  isLoading: boolean
  onViewDetail: (record: AcceptanceRecord) => void
}

export function AcceptanceList({
  records,
  isLoading,
  onViewDetail,
}: AcceptanceListProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="py-8 text-center text-gray-500">
        <RefreshCw className="mx-auto mb-4 h-12 w-12 animate-spin opacity-50" />
        <p>載入驗收記錄中...</p>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <Receipt className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <p>沒有找到符合條件的驗收記錄</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {records.map(record => (
        <AcceptanceCard key={record.id} record={record} onViewDetail={onViewDetail} />
      ))}
    </div>
  )
}
