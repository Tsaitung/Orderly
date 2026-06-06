'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AccessibleSelect } from '@/components/ui/accessible-form'
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../utils'

interface OrderFiltersProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  statusFilter: string
  onStatusChange: (status: string) => void
  priorityFilter: string
  onPriorityChange: (priority: string) => void
}

export function OrderFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
}: OrderFiltersProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="md:col-span-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="搜尋訂單編號、餐廳或聯絡人..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <AccessibleSelect
        label="訂單狀態"
        name="status-filter"
        options={STATUS_OPTIONS}
        value={statusFilter}
        onChange={onStatusChange}
      />

      <AccessibleSelect
        label="優先級"
        name="priority-filter"
        options={PRIORITY_OPTIONS}
        value={priorityFilter}
        onChange={onPriorityChange}
      />
    </div>
  )
}
