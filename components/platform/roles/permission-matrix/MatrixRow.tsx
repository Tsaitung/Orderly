'use client'

import { Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Role, PermissionCategory, MatrixChange } from './types'
import { getRoleTypeColor } from './utils'
import { PermissionCell } from './PermissionCell'

interface MatrixRowProps {
  role: Role
  categories: PermissionCategory[]
  editMode: boolean
  changes: MatrixChange[]
  onPermissionToggle: (roleId: string, permissionId: string, granted: boolean) => void
}

export function MatrixRow({
  role,
  categories,
  editMode,
  changes,
  onPermissionToggle,
}: MatrixRowProps): JSX.Element {
  return (
    <tr className="hover:bg-gray-50">
      <td className="sticky left-0 z-10 whitespace-nowrap border-r border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className={`rounded px-2 py-1 text-xs font-medium ${getRoleTypeColor(role.type)}`}>
              {role.type}
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">{role.name}</span>
              {role.isSystemRole && (
                <Badge variant="outline" className="text-xs">
                  <Shield className="mr-1 h-3 w-3" />
                  系統
                </Badge>
              )}
              {!role.isActive && (
                <Badge variant="secondary" className="text-xs">
                  停用
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-500">{role.userCount} 位使用者</div>
          </div>
        </div>
      </td>
      {categories.map(category => (
        <td key={category.id} className="border-l border-gray-200">
          {!category.collapsed && (
            <div className="flex space-x-2 px-2 py-4">
              {category.permissions.map(permission => (
                <PermissionCell
                  key={permission.id}
                  permission={permission}
                  roleId={role.id}
                  hasPermission={role.permissions.includes(permission.id)}
                  editMode={editMode}
                  isSystemRole={role.isSystemRole}
                  changes={changes}
                  onToggle={onPermissionToggle}
                />
              ))}
            </div>
          )}
        </td>
      ))}
    </tr>
  )
}
