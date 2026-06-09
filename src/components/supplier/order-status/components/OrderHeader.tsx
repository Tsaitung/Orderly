'use client'

import * as React from 'react'
import { Package } from 'lucide-react'
import { CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { OrderStats } from '../types'

interface OrderHeaderProps {
  stats: OrderStats
}

export function OrderHeader({ stats }: OrderHeaderProps): React.ReactElement {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-blue-600" />
          <span>訂單狀態追蹤</span>
        </CardTitle>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Badge variant="warning" className="h-6">
              待確認 {stats.pending}
            </Badge>
            <Badge variant="destructive" className="h-6">
              緊急 {stats.urgent}
            </Badge>
            <Badge variant="info" className="h-6">
              準備中 {stats.preparing}
            </Badge>
            <Badge variant="secondary" className="h-6">
              配送中 {stats.shipping}
            </Badge>
          </div>
        </div>
      </div>
    </CardHeader>
  )
}
