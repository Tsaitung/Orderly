'use client'

import { Checkbox } from '@/components/ui/checkbox'
import type { Permission, MatrixChange } from './types'

interface PermissionCellProps {
  permission: Permission
  roleId: string
  hasPermission: boolean
  editMode: boolean
  isSystemRole: boolean
  changes: MatrixChange[]
  onToggle: (roleId: string, permissionId: string, granted: boolean) => void
}

export function PermissionCell({
  permission,
  roleId,
  hasPermission,
  editMode,
  isSystemRole,
  changes,
  onToggle,
}: PermissionCellProps): JSX.Element {
  const isChanged = changes.some(c => c.roleId === roleId && c.permissionId === permission.id)
  const isDisabled = !editMode || (permission.isSystemPermission && !isSystemRole)

  return (
    <div className="flex justify-center">
      <Checkbox
        checked={hasPermission}
        onCheckedChange={checked => onToggle(roleId, permission.id, checked as boolean)}
        disabled={isDisabled}
        className={isChanged ? 'border-primary-500 bg-primary-50' : ''}
      />
    </div>
  )
}
