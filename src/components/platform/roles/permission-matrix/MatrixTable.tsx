'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { Role, PermissionCategory, MatrixChange } from './types'
import { MatrixHeader } from './MatrixHeader'
import { MatrixRow } from './MatrixRow'

interface MatrixTableProps {
  roles: Role[]
  categories: PermissionCategory[]
  editMode: boolean
  changes: MatrixChange[]
  onToggleCategory: (categoryId: string) => void
  onPermissionToggle: (roleId: string, permissionId: string, granted: boolean) => void
}

export function MatrixTable({
  roles,
  categories,
  editMode,
  changes,
  onToggleCategory,
  onPermissionToggle,
}: MatrixTableProps): JSX.Element {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <MatrixHeader categories={categories} onToggleCategory={onToggleCategory} />
            <tbody className="divide-y divide-gray-200 bg-white">
              {roles.map(role => (
                <MatrixRow
                  key={role.id}
                  role={role}
                  categories={categories}
                  editMode={editMode}
                  changes={changes}
                  onPermissionToggle={onPermissionToggle}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
