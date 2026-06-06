'use client'

/**
 * AcceptanceStatsCards Component
 * 驗收統計卡片
 */

import { Clock, AlertTriangle, CheckCircle, Receipt, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { AcceptanceStats } from '../types'

interface AcceptanceStatsCardsProps {
  stats: AcceptanceStats
}

export function AcceptanceStatsCards({ stats }: AcceptanceStatsCardsProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">待驗收</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">有爭議</p>
              <p className="text-2xl font-bold text-red-600">{stats.disputed}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">已完成</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">平均評分</p>
              <div className="flex items-center space-x-1">
                <p className="text-2xl font-bold text-primary-600">{stats.avgRating.toFixed(1)}</p>
                <Star className="h-5 w-5 fill-current text-yellow-400" />
              </div>
            </div>
            <Receipt className="h-8 w-8 text-primary-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
