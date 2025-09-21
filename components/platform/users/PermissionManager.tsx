'use client'

import React from 'react'
import { 
  Shield,
  Plus,
  Minus,
  Check,
  X,
  AlertTriangle,
  Info,
  Lock,
  Users,
  Building2,
  Settings,
  Eye,
  Edit3,
  Trash2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface PermissionManagerProps {
  userId: string
}

interface Permission {
  id: string
  name: string
  description: string
  category: 'platform' | 'restaurant' | 'supplier' | 'general'
  level: 'read' | 'write' | 'admin'
}

interface Role {
  id: string
  name: string
  description: string
  type: 'platform' | 'restaurant' | 'supplier'
  permissions: string[]
  isSystemRole: boolean
}

interface UserPermission {
  permissionId: string
  source: 'direct' | 'role' | 'organization'
  sourceId: string
  sourceName: string
  granted: boolean
}

export function PermissionManager({ userId }: PermissionManagerProps) {
  const [permissions, setPermissions] = React.useState<Permission[]>([])
  const [roles, setRoles] = React.useState<Role[]>([])
  const [userRoles, setUserRoles] = React.useState<string[]>([])
  const [userPermissions, setUserPermissions] = React.useState<UserPermission[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activeView, setActiveView] = React.useState<'matrix' | 'roles' | 'direct'>('matrix')
  const [conflicts, setConflicts] = React.useState<string[]>([])

  React.useEffect(() => {
    loadPermissionData()
  }, [userId])

  const loadPermissionData = async () => {
    try {
      setLoading(true)
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模擬權限資料
      const mockPermissions: Permission[] = [
        { id: 'order_read', name: '檢視訂單', description: '檢視訂單資訊', category: 'general', level: 'read' },
        { id: 'order_write', name: '管理訂單', description: '建立、編輯訂單', category: 'general', level: 'write' },
        { id: 'supplier_read', name: '檢視供應商', description: '檢視供應商資訊', category: 'supplier', level: 'read' },
        { id: 'supplier_write', name: '管理供應商', description: '編輯供應商資訊', category: 'supplier', level: 'write' },
        { id: 'financial_read', name: '檢視財務', description: '檢視財務報表', category: 'general', level: 'read' },
        { id: 'financial_write', name: '管理財務', description: '編輯財務資料', category: 'general', level: 'write' },
        { id: 'user_read', name: '檢視使用者', description: '檢視使用者清單', category: 'platform', level: 'read' },
        { id: 'user_write', name: '管理使用者', description: '編輯使用者資料', category: 'platform', level: 'write' },
        { id: 'user_admin', name: '使用者管理員', description: '完整使用者管理權限', category: 'platform', level: 'admin' },
        { id: 'system_admin', name: '系統管理員', description: '系統級管理權限', category: 'platform', level: 'admin' }
      ]

      const mockRoles: Role[] = [
        {
          id: 'restaurant_admin',
          name: '餐廳管理員',
          description: '餐廳的完整管理權限',
          type: 'restaurant',
          permissions: ['order_read', 'order_write', 'supplier_read', 'financial_read'],
          isSystemRole: true
        },
        {
          id: 'restaurant_staff',
          name: '餐廳員工',
          description: '餐廳的基本操作權限',
          type: 'restaurant',
          permissions: ['order_read', 'supplier_read'],
          isSystemRole: true
        },
        {
          id: 'supplier_admin',
          name: '供應商管理員',
          description: '供應商的完整管理權限',
          type: 'supplier',
          permissions: ['order_read', 'supplier_write', 'financial_read'],
          isSystemRole: true
        },
        {
          id: 'platform_admin',
          name: '平台管理員',
          description: '平台的管理權限',
          type: 'platform',
          permissions: ['user_read', 'user_write', 'system_admin'],
          isSystemRole: true
        }
      ]

      const mockUserRoles = ['restaurant_admin']
      
      const mockUserPermissions: UserPermission[] = [
        { permissionId: 'order_read', source: 'role', sourceId: 'restaurant_admin', sourceName: '餐廳管理員', granted: true },
        { permissionId: 'order_write', source: 'role', sourceId: 'restaurant_admin', sourceName: '餐廳管理員', granted: true },
        { permissionId: 'supplier_read', source: 'role', sourceId: 'restaurant_admin', sourceName: '餐廳管理員', granted: true },
        { permissionId: 'financial_read', source: 'role', sourceId: 'restaurant_admin', sourceName: '餐廳管理員', granted: true },
        { permissionId: 'financial_write', source: 'direct', sourceId: 'direct', sourceName: '直接授權', granted: true }
      ]

      setPermissions(mockPermissions)
      setRoles(mockRoles)
      setUserRoles(mockUserRoles)
      setUserPermissions(mockUserPermissions)
      
    } catch (err) {
      console.error('載入權限資料失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleToggle = (roleId: string, granted: boolean) => {
    if (granted) {
      setUserRoles([...userRoles, roleId])
    } else {
      setUserRoles(userRoles.filter(id => id !== roleId))
    }
  }

  const handleDirectPermissionToggle = (permissionId: string, granted: boolean) => {
    const existing = userPermissions.find(up => up.permissionId === permissionId && up.source === 'direct')
    
    if (granted && !existing) {
      const newPermission: UserPermission = {
        permissionId,
        source: 'direct',
        sourceId: 'direct',
        sourceName: '直接授權',
        granted: true
      }
      setUserPermissions([...userPermissions, newPermission])
    } else if (!granted && existing) {
      setUserPermissions(userPermissions.filter(up => !(up.permissionId === permissionId && up.source === 'direct')))
    }
  }

  const hasPermission = (permissionId: string): { granted: boolean; sources: UserPermission[] } => {
    const sources = userPermissions.filter(up => up.permissionId === permissionId)
    return {
      granted: sources.some(s => s.granted),
      sources
    }
  }

  const getPermissionIcon = (permission: Permission) => {
    switch (permission.category) {
      case 'platform':
        return <Settings className="h-4 w-4" />
      case 'restaurant':
        return <Building2 className="h-4 w-4" />
      case 'supplier':
        return <Users className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const getLevelBadge = (level: Permission['level']) => {
    switch (level) {
      case 'read':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800"><Eye className="h-3 w-3 mr-1" />檢視</Badge>
      case 'write':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800"><Edit3 className="h-3 w-3 mr-1" />編輯</Badge>
      case 'admin':
        return <Badge variant="outline" className="bg-red-100 text-red-800"><Lock className="h-3 w-3 mr-1" />管理員</Badge>
      default:
        return <Badge variant="secondary">未知</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 視圖切換 */}
      <div className="flex space-x-4">
        <Button
          variant={activeView === 'matrix' ? 'default' : 'outline'}
          onClick={() => setActiveView('matrix')}
        >
          權限矩陣
        </Button>
        <Button
          variant={activeView === 'roles' ? 'default' : 'outline'}
          onClick={() => setActiveView('roles')}
        >
          角色管理
        </Button>
        <Button
          variant={activeView === 'direct' ? 'default' : 'outline'}
          onClick={() => setActiveView('direct')}
        >
          直接權限
        </Button>
      </div>

      {/* 衝突警告 */}
      {conflicts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">權限衝突警告</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  檢測到 {conflicts.length} 個權限衝突，請檢查設定。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 權限矩陣視圖 */}
      {activeView === 'matrix' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              權限矩陣
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">權限</th>
                    <th className="text-left py-3 px-4">類別</th>
                    <th className="text-left py-3 px-4">等級</th>
                    <th className="text-center py-3 px-4">授權狀態</th>
                    <th className="text-left py-3 px-4">來源</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((permission) => {
                    const { granted, sources } = hasPermission(permission.id)
                    return (
                      <tr key={permission.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {getPermissionIcon(permission)}
                            <div className="ml-3">
                              <div className="font-medium">{permission.name}</div>
                              <div className="text-sm text-gray-500">{permission.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{permission.category}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          {getLevelBadge(permission.level)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {granted ? (
                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-red-600 mx-auto" />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {sources.map((source, index) => (
                              <Badge key={index} variant="outline" className="mr-1">
                                {source.sourceName}
                              </Badge>
                            ))}
                            {sources.length === 0 && (
                              <span className="text-sm text-gray-400">無</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 角色管理視圖 */}
      {activeView === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>可用角色</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {roles.map((role) => {
                const isAssigned = userRoles.includes(role.id)
                return (
                  <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h4 className="font-medium">{role.name}</h4>
                        {role.isSystemRole && (
                          <Badge variant="outline" className="ml-2">系統角色</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {role.permissions.slice(0, 3).map((permId) => {
                          const perm = permissions.find(p => p.id === permId)
                          return perm ? (
                            <Badge key={permId} variant="outline" className="text-xs">
                              {perm.name}
                            </Badge>
                          ) : null
                        })}
                        {role.permissions.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 3} 更多
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <Checkbox
                        checked={isAssigned}
                        onCheckedChange={(checked) => handleRoleToggle(role.id, checked as boolean)}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>已分配角色</CardTitle>
            </CardHeader>
            <CardContent>
              {userRoles.length > 0 ? (
                <div className="space-y-3">
                  {userRoles.map((roleId) => {
                    const role = roles.find(r => r.id === roleId)
                    if (!role) return null
                    
                    return (
                      <div key={roleId} className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-primary-900">{role.name}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRoleToggle(roleId, false)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-primary-700 mt-1">{role.description}</p>
                        <div className="text-xs text-primary-600 mt-2">
                          包含 {role.permissions.length} 個權限
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>尚未分配任何角色</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 直接權限視圖 */}
      {activeView === 'direct' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>直接權限分配</span>
              <Badge variant="outline">
                <Info className="h-3 w-3 mr-1" />
                繞過角色直接授權
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {permissions.map((permission) => {
                const directPermission = userPermissions.find(
                  up => up.permissionId === permission.id && up.source === 'direct'
                )
                const hasDirectPermission = Boolean(directPermission)
                
                return (
                  <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      {getPermissionIcon(permission)}
                      <div className="ml-3">
                        <div className="font-medium">{permission.name}</div>
                        <div className="text-sm text-gray-500">{permission.description}</div>
                      </div>
                      <div className="ml-4">
                        {getLevelBadge(permission.level)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={hasDirectPermission}
                        onCheckedChange={(checked) => 
                          handleDirectPermissionToggle(permission.id, checked as boolean)
                        }
                      />
                      {hasDirectPermission && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          已直接授權
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作按鈕 */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline">
          重置變更
        </Button>
        <Button>
          儲存權限設定
        </Button>
      </div>
    </div>
  )
}