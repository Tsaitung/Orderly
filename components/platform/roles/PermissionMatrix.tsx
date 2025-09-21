'use client'

import React from 'react'
import { 
  Search, 
  Filter, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Shield, 
  Users, 
  Settings, 
  Database, 
  ShoppingCart, 
  CreditCard, 
  BarChart3,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Tooltip } from '@/components/ui/tooltip'

interface Permission {
  id: string
  name: string
  description: string
  category: string
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  module: string
  isSystemPermission: boolean
  riskLevel: 'low' | 'medium' | 'high'
}

interface Role {
  id: string
  name: string
  code: string
  type: 'platform' | 'restaurant' | 'supplier'
  isSystemRole: boolean
  isActive: boolean
  permissions: string[]
  userCount: number
}

interface PermissionCategory {
  id: string
  name: string
  icon: React.ComponentType<any>
  permissions: Permission[]
  collapsed: boolean
}

interface MatrixChange {
  roleId: string
  permissionId: string
  granted: boolean
  previousState: boolean
}

export function PermissionMatrix() {
  const [roles, setRoles] = React.useState<Role[]>([])
  const [categories, setCategories] = React.useState<PermissionCategory[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedRoleTypes, setSelectedRoleTypes] = React.useState<string[]>(['platform', 'restaurant', 'supplier'])
  const [selectedPermissionCategories, setSelectedPermissionCategories] = React.useState<string[]>([])
  const [showSystemRoles, setShowSystemRoles] = React.useState(true)
  const [showInactiveRoles, setShowInactiveRoles] = React.useState(false)
  const [editMode, setEditMode] = React.useState(false)
  const [changes, setChanges] = React.useState<MatrixChange[]>([])
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    loadMatrixData()
  }, [])

  const loadMatrixData = async () => {
    try {
      setLoading(true)
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模擬角色資料
      const mockRoles: Role[] = [
        {
          id: '1',
          name: '平台超級管理員',
          code: 'ROLE_PLATFORM_ADMIN',
          type: 'platform',
          isSystemRole: true,
          isActive: true,
          permissions: ['user:create', 'user:read', 'user:update', 'user:delete', 'role:create', 'role:read', 'role:update', 'role:delete', 'system:read', 'system:update'],
          userCount: 3
        },
        {
          id: '2',
          name: '餐廳經理',
          code: 'ROLE_RESTAURANT_MANAGER',
          type: 'restaurant',
          isSystemRole: true,
          isActive: true,
          permissions: ['order:create', 'order:read', 'order:update', 'product:read', 'user:read', 'report:read'],
          userCount: 25
        },
        {
          id: '3',
          name: '供應商管理員',
          code: 'ROLE_SUPPLIER_ADMIN',
          type: 'supplier',
          isSystemRole: true,
          isActive: true,
          permissions: ['product:create', 'product:read', 'product:update', 'order:read', 'order:update', 'finance:read'],
          userCount: 12
        },
        {
          id: '4',
          name: '採購專員',
          code: 'ROLE_PURCHASE_OFFICER',
          type: 'restaurant',
          isSystemRole: false,
          isActive: true,
          permissions: ['order:create', 'order:read', 'product:read'],
          userCount: 45
        },
        {
          id: '5',
          name: '財務檢視員',
          code: 'ROLE_FINANCE_VIEWER',
          type: 'restaurant',
          isSystemRole: false,
          isActive: false,
          permissions: ['finance:read', 'report:read'],
          userCount: 0
        }
      ]
      
      // 模擬權限資料
      const mockPermissions: Permission[] = [
        // 使用者管理
        { id: 'user:create', name: '建立使用者', description: '建立新的使用者帳號', category: 'user', action: 'create', module: 'user', isSystemPermission: false, riskLevel: 'medium' },
        { id: 'user:read', name: '檢視使用者', description: '檢視使用者資訊和列表', category: 'user', action: 'read', module: 'user', isSystemPermission: false, riskLevel: 'low' },
        { id: 'user:update', name: '編輯使用者', description: '修改使用者資訊和設定', category: 'user', action: 'update', module: 'user', isSystemPermission: false, riskLevel: 'medium' },
        { id: 'user:delete', name: '刪除使用者', description: '刪除使用者帳號', category: 'user', action: 'delete', module: 'user', isSystemPermission: false, riskLevel: 'high' },
        
        // 角色權限管理
        { id: 'role:create', name: '建立角色', description: '建立新的角色', category: 'role', action: 'create', module: 'role', isSystemPermission: true, riskLevel: 'high' },
        { id: 'role:read', name: '檢視角色', description: '檢視角色和權限資訊', category: 'role', action: 'read', module: 'role', isSystemPermission: false, riskLevel: 'low' },
        { id: 'role:update', name: '編輯角色', description: '修改角色權限配置', category: 'role', action: 'update', module: 'role', isSystemPermission: true, riskLevel: 'high' },
        { id: 'role:delete', name: '刪除角色', description: '刪除自定義角色', category: 'role', action: 'delete', module: 'role', isSystemPermission: true, riskLevel: 'high' },
        
        // 訂單管理
        { id: 'order:create', name: '建立訂單', description: '建立新訂單', category: 'order', action: 'create', module: 'order', isSystemPermission: false, riskLevel: 'low' },
        { id: 'order:read', name: '檢視訂單', description: '檢視訂單詳情和列表', category: 'order', action: 'read', module: 'order', isSystemPermission: false, riskLevel: 'low' },
        { id: 'order:update', name: '編輯訂單', description: '修改訂單資訊', category: 'order', action: 'update', module: 'order', isSystemPermission: false, riskLevel: 'medium' },
        { id: 'order:delete', name: '刪除訂單', description: '刪除訂單記錄', category: 'order', action: 'delete', module: 'order', isSystemPermission: false, riskLevel: 'high' },
        
        // 產品管理
        { id: 'product:create', name: '建立產品', description: '新增產品到目錄', category: 'product', action: 'create', module: 'product', isSystemPermission: false, riskLevel: 'low' },
        { id: 'product:read', name: '檢視產品', description: '檢視產品資訊和目錄', category: 'product', action: 'read', module: 'product', isSystemPermission: false, riskLevel: 'low' },
        { id: 'product:update', name: '編輯產品', description: '修改產品資訊和價格', category: 'product', action: 'update', module: 'product', isSystemPermission: false, riskLevel: 'medium' },
        { id: 'product:delete', name: '刪除產品', description: '從目錄中移除產品', category: 'product', action: 'delete', module: 'product', isSystemPermission: false, riskLevel: 'medium' },
        
        // 財務管理
        { id: 'finance:read', name: '檢視財務', description: '檢視財務報表和數據', category: 'finance', action: 'read', module: 'finance', isSystemPermission: false, riskLevel: 'medium' },
        { id: 'finance:update', name: '編輯財務', description: '修改財務資料', category: 'finance', action: 'update', module: 'finance', isSystemPermission: false, riskLevel: 'high' },
        
        // 報表分析
        { id: 'report:read', name: '檢視報表', description: '檢視各類業務報表', category: 'report', action: 'read', module: 'report', isSystemPermission: false, riskLevel: 'low' },
        { id: 'report:export', name: '匯出報表', description: '匯出報表資料', category: 'report', action: 'manage', module: 'report', isSystemPermission: false, riskLevel: 'medium' },
        
        // 系統設定
        { id: 'system:read', name: '檢視系統設定', description: '檢視系統配置', category: 'system', action: 'read', module: 'system', isSystemPermission: true, riskLevel: 'medium' },
        { id: 'system:update', name: '修改系統設定', description: '修改系統配置參數', category: 'system', action: 'update', module: 'system', isSystemPermission: true, riskLevel: 'high' }
      ]
      
      // 按分類分組權限
      const categoryGroups = mockPermissions.reduce((groups, permission) => {
        const category = permission.category
        if (!groups[category]) {
          groups[category] = {
            id: category,
            name: getCategoryName(category),
            icon: getCategoryIcon(category),
            permissions: [],
            collapsed: false
          }
        }
        groups[category].permissions.push(permission)
        return groups
      }, {} as Record<string, PermissionCategory>)
      
      setRoles(mockRoles)
      setCategories(Object.values(categoryGroups))
      setSelectedPermissionCategories(Object.keys(categoryGroups))
    } catch (err) {
      console.error('載入矩陣資料失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryName = (category: string): string => {
    const names = {
      user: '使用者管理',
      role: '角色權限',
      order: '訂單管理',
      product: '產品管理',
      finance: '財務管理',
      report: '報表分析',
      system: '系統設定'
    }
    return names[category as keyof typeof names] || category
  }

  const getCategoryIcon = (category: string): React.ComponentType<any> => {
    const icons = {
      user: Users,
      role: Shield,
      order: ShoppingCart,
      product: Database,
      finance: CreditCard,
      report: BarChart3,
      system: Settings
    }
    return icons[category as keyof typeof icons] || Shield
  }

  const getRiskLevelColor = (level: string): string => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600', 
      high: 'text-red-600'
    }
    return colors[level as keyof typeof colors] || 'text-gray-600'
  }

  const getRoleTypeColor = (type: string): string => {
    const colors = {
      platform: 'bg-blue-100 text-blue-800',
      restaurant: 'bg-orange-100 text-orange-800',
      supplier: 'bg-green-100 text-green-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const toggleCategory = (categoryId: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, collapsed: !cat.collapsed } : cat
    ))
  }

  const handlePermissionToggle = (roleId: string, permissionId: string, granted: boolean) => {
    if (!editMode) return
    
    const role = roles.find(r => r.id === roleId)
    if (!role) return
    
    const previousState = role.permissions.includes(permissionId)
    
    // 更新角色權限
    setRoles(prev => prev.map(r => 
      r.id === roleId 
        ? { 
            ...r, 
            permissions: granted 
              ? [...r.permissions, permissionId]
              : r.permissions.filter(p => p !== permissionId)
          }
        : r
    ))
    
    // 記錄變更
    const existingChangeIndex = changes.findIndex(c => c.roleId === roleId && c.permissionId === permissionId)
    
    if (existingChangeIndex >= 0) {
      // 如果回到原始狀態，移除變更記錄
      if (changes[existingChangeIndex].previousState === granted) {
        setChanges(prev => prev.filter((_, index) => index !== existingChangeIndex))
      } else {
        // 更新變更記錄
        setChanges(prev => prev.map((change, index) => 
          index === existingChangeIndex ? { ...change, granted } : change
        ))
      }
    } else {
      // 新增變更記錄
      setChanges(prev => [...prev, { roleId, permissionId, granted, previousState }])
    }
  }

  const saveChanges = async () => {
    try {
      setSaving(true)
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('儲存權限變更:', changes)
      setChanges([])
      setEditMode(false)
    } catch (err) {
      console.error('儲存變更失敗:', err)
    } finally {
      setSaving(false)
    }
  }

  const cancelChanges = () => {
    // 撤銷所有變更
    changes.forEach(change => {
      setRoles(prev => prev.map(r => 
        r.id === change.roleId 
          ? { 
              ...r, 
              permissions: change.previousState 
                ? [...r.permissions, change.permissionId]
                : r.permissions.filter(p => p !== change.permissionId)
            }
          : r
      ))
    })
    setChanges([])
    setEditMode(false)
  }

  const exportMatrix = () => {
    // 模擬匯出功能
    console.log('匯出權限矩陣')
  }

  const checkConflicts = () => {
    // 模擬檢查權限衝突
    console.log('檢查權限衝突')
  }

  // 篩選角色和權限
  const filteredRoles = roles.filter(role => {
    if (!selectedRoleTypes.includes(role.type)) return false
    if (!showSystemRoles && role.isSystemRole) return false
    if (!showInactiveRoles && !role.isActive) return false
    if (searchTerm && !role.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const filteredCategories = categories.filter(category => 
    selectedPermissionCategories.includes(category.id)
  ).map(category => ({
    ...category,
    permissions: category.permissions.filter(permission =>
      !searchTerm || 
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }))

  const totalChanges = changes.length
  const hasConflicts = false // 模擬衝突檢測

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-16 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>權限矩陣控制台</span>
            <div className="flex items-center space-x-2">
              {hasConflicts && (
                <Badge variant="destructive" className="flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  發現衝突
                </Badge>
              )}
              {totalChanges > 0 && (
                <Badge variant="secondary">
                  {totalChanges} 項變更
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜尋和篩選 */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜尋角色或權限..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select
                multiple
                value={selectedRoleTypes}
                onChange={(e) => setSelectedRoleTypes(Array.from(e.target.selectedOptions, option => option.value))}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="platform">平台角色</option>
                <option value="restaurant">餐廳角色</option>
                <option value="supplier">供應商角色</option>
              </select>
              
              <Button variant="outline" size="sm" onClick={checkConflicts}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                檢查衝突
              </Button>
              
              <Button variant="outline" size="sm" onClick={exportMatrix}>
                <Download className="h-4 w-4 mr-2" />
                匯出Excel
              </Button>
            </div>
          </div>

          {/* 顯示選項 */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                checked={showSystemRoles}
                onCheckedChange={setShowSystemRoles}
              />
              <span className="text-sm">顯示系統角色</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={showInactiveRoles}
                onCheckedChange={setShowInactiveRoles}
              />
              <span className="text-sm">顯示停用角色</span>
            </div>
          </div>

          {/* 編輯模式控制 */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editMode}
                  onCheckedChange={setEditMode}
                />
                <span className="text-sm font-medium">編輯模式</span>
              </div>
              
              {editMode && (
                <div className="text-sm text-gray-600">
                  點擊矩陣中的核取方塊來修改權限配置
                </div>
              )}
            </div>
            
            {totalChanges > 0 && (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={cancelChanges}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  取消變更
                </Button>
                <Button size="sm" onClick={saveChanges} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      儲存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      儲存變更
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 權限矩陣 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 min-w-[200px]">
                    角色 / 權限
                  </th>
                  {filteredCategories.map(category => {
                    const IconComponent = category.icon
                    return (
                      <th key={category.id} className="px-2 py-3 text-center border-l border-gray-200">
                        <div className="flex flex-col items-center space-y-2">
                          <button
                            onClick={() => toggleCategory(category.id)}
                            className="flex items-center space-x-2 text-xs font-medium text-gray-700 hover:text-gray-900"
                          >
                            <IconComponent className="h-4 w-4" />
                            <span>{category.name}</span>
                            {category.collapsed ? (
                              <ChevronRight className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                          {!category.collapsed && (
                            <div className="flex space-x-1">
                              {category.permissions.map(permission => (
                                <div
                                  key={permission.id}
                                  className="flex flex-col items-center space-y-1 min-w-[80px]"
                                >
                                  <Tooltip content={permission.description}>
                                    <div className={`text-xs text-center px-2 py-1 rounded ${getRiskLevelColor(permission.riskLevel)} bg-white border`}>
                                      {permission.name}
                                      {permission.isSystemPermission && (
                                        <Lock className="h-3 w-3 inline ml-1" />
                                      )}
                                    </div>
                                  </Tooltip>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRoles.map(role => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`px-2 py-1 rounded text-xs font-medium ${getRoleTypeColor(role.type)}`}>
                            {role.type}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">{role.name}</span>
                            {role.isSystemRole && (
                              <Badge variant="outline" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                系統
                              </Badge>
                            )}
                            {!role.isActive && (
                              <Badge variant="secondary" className="text-xs">停用</Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{role.userCount} 位使用者</div>
                        </div>
                      </div>
                    </td>
                    {filteredCategories.map(category => (
                      <td key={category.id} className="border-l border-gray-200">
                        {!category.collapsed && (
                          <div className="flex space-x-2 px-2 py-4">
                            {category.permissions.map(permission => {
                              const hasPermission = role.permissions.includes(permission.id)
                              const isChanged = changes.some(c => c.roleId === role.id && c.permissionId === permission.id)
                              
                              return (
                                <div key={permission.id} className="flex justify-center">
                                  <Checkbox
                                    checked={hasPermission}
                                    onCheckedChange={(checked) => handlePermissionToggle(role.id, permission.id, checked as boolean)}
                                    disabled={!editMode || (permission.isSystemPermission && !role.isSystemRole)}
                                    className={isChanged ? 'border-primary-500 bg-primary-50' : ''}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 統計摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">總角色數</p>
                <p className="text-2xl font-bold">{filteredRoles.length}</p>
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
                <p className="text-2xl font-bold">
                  {filteredCategories.reduce((sum, cat) => sum + cat.permissions.length, 0)}
                </p>
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
                <p className={`text-2xl font-bold ${hasConflicts ? 'text-red-600' : 'text-green-600'}`}>
                  {hasConflicts ? '1' : '0'}
                </p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${hasConflicts ? 'text-red-400' : 'text-green-400'}`} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}