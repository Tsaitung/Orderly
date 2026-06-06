'use client'

import { Search, AlertTriangle, Download, RotateCcw, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { RoleType } from './types'

interface ControlPanelProps {
  searchTerm: string
  selectedRoleTypes: RoleType[]
  showSystemRoles: boolean
  showInactiveRoles: boolean
  editMode: boolean
  totalChanges: number
  hasConflicts: boolean
  saving: boolean
  onSearchChange: (term: string) => void
  onRoleTypesChange: (types: RoleType[]) => void
  onShowSystemRolesChange: (show: boolean) => void
  onShowInactiveRolesChange: (show: boolean) => void
  onEditModeChange: (edit: boolean) => void
  onCheckConflicts: () => void
  onExportMatrix: () => void
  onSaveChanges: () => void
  onCancelChanges: () => void
}

export function ControlPanel({
  searchTerm,
  selectedRoleTypes,
  showSystemRoles,
  showInactiveRoles,
  editMode,
  totalChanges,
  hasConflicts,
  saving,
  onSearchChange,
  onRoleTypesChange,
  onShowSystemRolesChange,
  onShowInactiveRolesChange,
  onEditModeChange,
  onCheckConflicts,
  onExportMatrix,
  onSaveChanges,
  onCancelChanges,
}: ControlPanelProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>權限矩陣控制台</span>
          <div className="flex items-center space-x-2">
            {hasConflicts && (
              <Badge variant="destructive" className="flex items-center">
                <AlertTriangle className="mr-1 h-3 w-3" />
                發現衝突
              </Badge>
            )}
            {totalChanges > 0 && <Badge variant="secondary">{totalChanges} 項變更</Badge>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder="搜尋角色或權限..."
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              multiple
              value={selectedRoleTypes}
              onChange={e =>
                onRoleTypesChange(
                  Array.from(e.target.selectedOptions, option => option.value as RoleType)
                )
              }
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="platform">平台角色</option>
              <option value="restaurant">餐廳角色</option>
              <option value="supplier">供應商角色</option>
            </select>

            <Button variant="outline" size="sm" onClick={onCheckConflicts}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              檢查衝突
            </Button>

            <Button variant="outline" size="sm" onClick={onExportMatrix}>
              <Download className="mr-2 h-4 w-4" />
              匯出Excel
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Switch checked={showSystemRoles} onCheckedChange={onShowSystemRolesChange} />
            <span className="text-sm">顯示系統角色</span>
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={showInactiveRoles} onCheckedChange={onShowInactiveRolesChange} />
            <span className="text-sm">顯示停用角色</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch checked={editMode} onCheckedChange={onEditModeChange} />
              <span className="text-sm font-medium">編輯模式</span>
            </div>

            {editMode && (
              <div className="text-sm text-gray-600">點擊矩陣中的核取方塊來修改權限配置</div>
            )}
          </div>

          {totalChanges > 0 && (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={onCancelChanges}>
                <RotateCcw className="mr-2 h-4 w-4" />
                取消變更
              </Button>
              <Button size="sm" onClick={onSaveChanges} disabled={saving}>
                {saving ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    儲存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    儲存變更
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
