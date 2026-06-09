'use client'

/**
 * AcceptanceFilters Component
 * 驗收記錄篩選控制
 */

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AccessibleSelect } from '@/components/ui/accessible-form'
import { STATUS_OPTIONS } from '../types'

interface AcceptanceFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
}

export function AcceptanceFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: AcceptanceFiltersProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="md:col-span-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="搜尋訂單編號、供應商或驗收人員..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <AccessibleSelect
        label="驗收狀態"
        name="status-filter"
        options={STATUS_OPTIONS}
        value={statusFilter}
        onChange={onStatusChange}
      />
    </div>
  )
}
