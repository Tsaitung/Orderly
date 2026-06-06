'use client'

import { Users, Shield, Settings, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { PermissionCategory } from './types'

interface StatsSummaryProps {
  rolesCount: number
  categories: PermissionCategory[]
  totalChanges: number
  hasConflicts: boolean
}

export function StatsSummary({
  rolesCount,
  categories,
  totalChanges,
  hasConflicts,
}: StatsSummaryProps): JSX.Element {
  const permissionsCount = categories.reduce((sum, cat) => sum + cat.permissions.length, 0)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">總角色數</p>
              <p className="text-2xl font-bold">{rolesCount}</p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">總權限數</p>
              <p className="text-2xl font-bold">{permissionsCount}</p>
            </div>
            <Shield className="h-8 w-8 text-gray-400" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">變更數量</p>
              <p className="text-2xl font-bold text-primary-600">{totalChanges}</p>
            </div>
            <Settings className="h-8 w-8 text-gray-400" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">衝突警告</p>
              <p
                className={`text-2xl font-bold ${hasConflicts ? 'text-red-600' : 'text-green-600'}`}
              >
                {hasConflicts ? '1' : '0'}
              </p>
            </div>
            <AlertTriangle
              className={`h-8 w-8 ${hasConflicts ? 'text-red-400' : 'text-green-400'}`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
