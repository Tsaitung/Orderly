'use client'

import React from 'react'
import {
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  Eye,
  Edit,
  Trash2,
  Plus,
  Settings,
  Database,
  FileText,
  Users,
  ShoppingCart,
  CreditCard,
  Bell,
  BarChart3,
  Lock,
  CheckSquare,
  Square,
  Minus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface Permission {
  id: string
  name: string
  description: string
  category: string
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  module: string
  roleTypes: ('platform' | 'restaurant' | 'supplier')[]
  isSystemPermission: boolean
  dependsOn?: string[]
}

interface PermissionCategory {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  permissions: Permission[]
  expanded: boolean
}

interface PermissionSelectorProps {
  selectedPermissions: string[]
  roleType: 'platform' | 'restaurant' | 'supplier'
  onChange: (permissions: string[]) => void
  mode?: 'simple' | 'advanced'
  showDescription?: boolean
}

export function PermissionSelector({
  selectedPermissions,
  roleType,
  onChange,
  mode = 'advanced',
  showDescription = true,
}: PermissionSelectorProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [categories, setCategories] = React.useState<PermissionCategory[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expandAll, setExpandAll] = React.useState(false)

  const loadPermissions = React.useCallback(async () => {
    try {
      setLoading(true)
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 500))

      // 模擬權限資料
      const mockPermissions: Permission[] = [
        // 使用者管理
        {
          id: 'user:create',
          name: '建立使用者',
          description: '建立新的使用者帳號',
          category: 'user',
          action: 'create',
          module: 'user',
          roleTypes: ['platform', 'restaurant', 'supplier'],
          isSystemPermission: false,
        },
        {
          id: 'user:read',
          name: '檢視使用者',
          description: '檢視使用者資訊和列表',
          category: 'user',
          action: 'read',
          module: 'user',
          roleTypes: ['platform', 'restaurant', 'supplier'],
          isSystemPermission: false,
        },
        {
          id: 'user:update',
          name: '編輯使用者',
          description: '修改使用者資訊和設定',
          category: 'user',
          action: 'update',
          module: 'user',
          roleTypes: ['platform', 'restaurant', 'supplier'],
          isSystemPermission: false,
        },
        {
          id: 'user:delete',
          name: '刪除使用者',
          description: '刪除使用者帳號',
          category: 'user',
          action: 'delete',
          module: 'user',
          roleTypes: ['platform'],
          isSystemPermission: false,
        },
        {
          id: 'user:manage',
          name: '使用者管理',
          description: '完整的使用者管理權限',
          category: 'user',
          action: 'manage',
          module: 'user',
          roleTypes: ['platform'],
          isSystemPermission: true,
          dependsOn: ['user:create', 'user:read', 'user:update', 'user:delete'],
        },

        // 角色權限管理
        {
          id: 'role:create',
          name: '建立角色',
          description: '建立新的角色',
          category: 'role',
          action: 'create',
          module: 'role',
          roleTypes: ['platform'],
          isSystemPermission: false,
        },
        {
          id: 'role:read',
          name: '檢視角色',
          description: '檢視角色和權限資訊',
          category: 'role',
          action: 'read',
          module: 'role',
          roleTypes: ['platform', 'restaurant', 'supplier'],
          isSystemPermission: false,
        },
        {
          id: 'role:update',
          name: '編輯角色',
          description: '修改角色權限配置',
          category: 'role',
          action: 'update',
          module: 'role',
          roleTypes: ['platform'],
          isSystemPermission: false,
        },
        {
          id: 'role:delete',
          name: '刪除角色',
          description: '刪除自定義角色',
          category: 'role',
          action: 'delete',
          module: 'role',
          roleTypes: ['platform'],
          isSystemPermission: false,
        },

        // 訂單管理
        {
          id: 'order:create',
          name: '建立訂單',
          description: '建立新訂單',
          category: 'order',
          action: 'create',
          module: 'order',
          roleTypes: ['restaurant'],
          isSystemPermission: false,
        },
        {
          id: 'order:read',
          name: '檢視訂單',
          description: '檢視訂單詳情和列表',
          category: 'order',
          action: 'read',
          module: 'order',
          roleTypes: ['platform', 'restaurant', 'supplier'],
          isSystemPermission: false,
        },
        {
          id: 'order:update',
          name: '編輯訂單',
          description: '修改訂單資訊',
          category: 'order',
          action: 'update',
          module: 'order',
          roleTypes: ['restaurant', 'supplier'],
          isSystemPermission: false,
        },
        {
          id: 'order:delete',
          name: '刪除訂單',
          description: '刪除訂單記錄',
          category: 'order',
          action: 'delete',
          module: 'order',
          roleTypes: ['platform'],
          isSystemPermission: false,
        },
        {
          id: 'order:confirm',
          name: '確認訂單',
          description: '確認接收訂單',
          category: 'order',
          action: 'manage',
          module: 'order',
          roleTypes: ['supplier'],
          isSystemPermission: false,
        },
        {
          id: 'order:ship',
          name: '出貨管理',
          description: '處理訂單出貨',
          category: 'order',
          action: 'manage',
          module: 'order',
          roleTypes: ['supplier'],
          isSystemPermission: false,
        },

        // 產品管理
        {
          id: 'product:create',
          name: '建立產品',
          description: '新增產品到目錄',
          category: 'product',
          action: 'create',
          module: 'product',
          roleTypes: ['platform', 'supplier'],
          isSystemPermission: false,
        },
        {
          id: 'product:read',
          name: '檢視產品',
          description: '檢視產品資訊和目錄',
          category: 'product',
          action: 'read',
          module: 'product',
          roleTypes: ['platform', 'restaurant', 'supplier'],
          isSystemPermission: false,
        },
        {
          id: 'product:update',
          name: '編輯產品',
          description: '修改產品資訊和價格',
          category: 'product',
          action: 'update',
          module: 'product',
          roleTypes: ['platform', 'supplier'],
          isSystemPermission: false,
        },
        {
          id: 'product:delete',
          name: '刪除產品',
          description: '從目錄中移除產品',
          category: 'product',
          action: 'delete',
          module: 'product',
          roleTypes: ['platform', 'supplier'],
          isSystemPermission: false,
        },

        // 財務管理
        {
          id: 'finance:read',
          name: '檢視財務',
          description: '檢視財務報表和數據',
          category: 'finance',
          action: 'read',
          module: 'finance',
          roleTypes: ['platform', 'restaurant', 'supplier'],
          isSystemPermission: false,
        },
        {
          id: 'finance:billing',
          name: '帳單管理',
          description: '管理帳單和發票',
          category: 'finance',
          action: 'manage',
          module: 'finance',
          roleTypes: ['platform', 'supplier'],
          isSystemPermission: false,
        },
        {
          id: 'finance:payment',
          name: '付款管理',
          description: '處理付款和結算',
          category: 'finance',
          action: 'manage',
          module: 'finance',
          roleTypes: ['platform'],
          isSystemPermission: false,
        },

        // 報表分析
        {
          id: 'report:read',
          name: '檢視報表',
          description: '檢視各類業務報表',
          category: 'report',
          action: 'read',
          module: 'report',
          roleTypes: ['platform', 'restaurant', 'supplier'],
          isSystemPermission: false,
        },
        {
          id: 'report:export',
          name: '匯出報表',
          description: '匯出報表資料',
          category: 'report',
          action: 'manage',
          module: 'report',
          roleTypes: ['platform', 'restaurant', 'supplier'],
          isSystemPermission: false,
        },
        {
          id: 'report:advanced',
          name: '進階分析',
          description: '使用進階分析功能',
          category: 'report',
          action: 'manage',
          module: 'report',
          roleTypes: ['platform'],
          isSystemPermission: false,
        },

        // 系統設定
        {
          id: 'system:read',
          name: '檢視系統設定',
          description: '檢視系統配置',
          category: 'system',
          action: 'read',
          module: 'system',
          roleTypes: ['platform'],
          isSystemPermission: true,
        },
        {
          id: 'system:update',
          name: '修改系統設定',
          description: '修改系統配置參數',
          category: 'system',
          action: 'update',
          module: 'system',
          roleTypes: ['platform'],
          isSystemPermission: true,
        },
        {
          id: 'system:backup',
          name: '系統備份',
          description: '執行系統備份操作',
          category: 'system',
          action: 'manage',
          module: 'system',
          roleTypes: ['platform'],
          isSystemPermission: true,
        },
      ]

      // 按分類分組權限
      const categoryMap = new Map<string, PermissionCategory>()

      mockPermissions
        .filter(permission => permission.roleTypes.includes(roleType))
        .forEach(permission => {
          if (!categoryMap.has(permission.category)) {
            categoryMap.set(permission.category, {
              id: permission.category,
              name: getCategoryName(permission.category),
              description: getCategoryDescription(permission.category),
              icon: getCategoryIcon(permission.category),
              permissions: [],
              expanded: false,
            })
          }
          categoryMap.get(permission.category)!.permissions.push(permission)
        })

      setCategories(Array.from(categoryMap.values()))
    } catch (err) {
      console.error('載入權限失敗:', err)
    } finally {
      setLoading(false)
    }
  }, [roleType])

  React.useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  const getCategoryName = (category: string): string => {
    const names = {
      user: '使用者管理',
      role: '角色權限',
      order: '訂單管理',
      product: '產品管理',
      finance: '財務管理',
      report: '報表分析',
      system: '系統設定',
    }
    return names[category as keyof typeof names] || category
  }

  const getCategoryDescription = (category: string): string => {
    const descriptions = {
      user: '使用者帳號、資料和權限管理',
      role: '角色定義和權限配置管理',
      order: '訂單處理、狀態管理和工作流程',
      product: '產品目錄、庫存和資訊管理',
      finance: '財務數據、帳單和付款管理',
      report: '業務報表、數據分析和匯出',
      system: '系統配置、維護和管理功能',
    }
    return descriptions[category as keyof typeof descriptions] || ''
  }

  const getCategoryIcon = (category: string): React.ComponentType<any> => {
    const icons = {
      user: Users,
      role: Shield,
      order: ShoppingCart,
      product: Database,
      finance: CreditCard,
      report: BarChart3,
      system: Settings,
    }
    return icons[category as keyof typeof icons] || Shield
  }

  const getActionIcon = (action: string): React.ComponentType<any> => {
    const icons = {
      create: Plus,
      read: Eye,
      update: Edit,
      delete: Trash2,
      manage: Settings,
    }
    return icons[action as keyof typeof icons] || Shield
  }

  const getActionColor = (action: string): string => {
    const colors = {
      create: 'text-green-600',
      read: 'text-blue-600',
      update: 'text-yellow-600',
      delete: 'text-red-600',
      manage: 'text-purple-600',
    }
    return colors[action as keyof typeof colors] || 'text-gray-600'
  }

  const toggleCategory = (categoryId: string) => {
    setCategories(prev =>
      prev.map(cat => (cat.id === categoryId ? { ...cat, expanded: !cat.expanded } : cat))
    )
  }

  const toggleExpandAll = () => {
    const newExpandState = !expandAll
    setExpandAll(newExpandState)
    setCategories(prev => prev.map(cat => ({ ...cat, expanded: newExpandState })))
  }

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    const permission = categories.flatMap(cat => cat.permissions).find(p => p.id === permissionId)

    let newPermissions = [...selectedPermissions]

    if (checked) {
      // 新增權限
      if (!newPermissions.includes(permissionId)) {
        newPermissions.push(permissionId)
      }

      // 自動新增依賴權限
      if (permission?.dependsOn) {
        permission.dependsOn.forEach(depId => {
          if (!newPermissions.includes(depId)) {
            newPermissions.push(depId)
          }
        })
      }
    } else {
      // 移除權限
      newPermissions = newPermissions.filter(id => id !== permissionId)

      // 移除依賴此權限的其他權限
      const dependentPermissions = categories
        .flatMap(cat => cat.permissions)
        .filter(p => p.dependsOn?.includes(permissionId))

      dependentPermissions.forEach(dep => {
        newPermissions = newPermissions.filter(id => id !== dep.id)
      })
    }

    onChange(newPermissions)
  }

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const category = categories.find(cat => cat.id === categoryId)
    if (!category) return

    const categoryPermissionIds = category.permissions.map(p => p.id)
    let newPermissions = [...selectedPermissions]

    if (checked) {
      // 選取整個分類
      categoryPermissionIds.forEach(id => {
        if (!newPermissions.includes(id)) {
          newPermissions.push(id)
        }
      })
    } else {
      // 取消選取整個分類
      newPermissions = newPermissions.filter(id => !categoryPermissionIds.includes(id))
    }

    onChange(newPermissions)
  }

  const getCategoryCheckState = (
    category: PermissionCategory
  ): 'checked' | 'unchecked' | 'indeterminate' => {
    const categoryPermissionIds = category.permissions.map(p => p.id)
    const selectedCount = categoryPermissionIds.filter(id =>
      selectedPermissions.includes(id)
    ).length

    if (selectedCount === 0) return 'unchecked'
    if (selectedCount === categoryPermissionIds.length) return 'checked'
    return 'indeterminate'
  }

  const filteredCategories = categories
    .map(category => ({
      ...category,
      permissions: category.permissions.filter(
        permission =>
          searchTerm === '' ||
          permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          permission.description.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter(category => category.permissions.length > 0)

  const selectedCount = selectedPermissions.length
  const totalCount = categories.reduce((sum, cat) => sum + cat.permissions.length, 0)

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded bg-gray-200"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 搜尋和統計 */}
      <div className="flex items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="搜尋權限名稱或描述..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            已選取 {selectedCount} / {totalCount} 個權限
          </span>
          <Button variant="outline" size="sm" onClick={toggleExpandAll}>
            {expandAll ? '收起全部' : '展開全部'}
          </Button>
        </div>
      </div>

      {/* 權限分類列表 */}
      <div className="space-y-3">
        {filteredCategories.map(category => {
          const checkState = getCategoryCheckState(category)
          const IconComponent = category.icon

          return (
            <Card key={category.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {checkState === 'indeterminate' ? (
                        <button
                          onClick={() => handleCategoryChange(category.id, true)}
                          className="text-primary-600"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      ) : (
                        <Checkbox
                          checked={checkState === 'checked'}
                          onCheckedChange={checked =>
                            handleCategoryChange(category.id, checked as boolean)
                          }
                        />
                      )}
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="flex items-center space-x-2 text-left"
                      >
                        {category.expanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                        <IconComponent className="h-5 w-5 text-primary-600" />
                        <div>
                          <CardTitle className="text-base">{category.name}</CardTitle>
                          {showDescription && (
                            <p className="mt-1 text-sm text-gray-500">{category.description}</p>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {category.permissions.filter(p => selectedPermissions.includes(p.id)).length} /{' '}
                    {category.permissions.length}
                  </Badge>
                </div>
              </CardHeader>

              {category.expanded && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {category.permissions.map(permission => {
                      const ActionIcon = getActionIcon(permission.action)
                      const actionColor = getActionColor(permission.action)

                      return (
                        <div
                          key={permission.id}
                          className={`flex items-start space-x-3 rounded-lg border p-3 transition-colors ${
                            selectedPermissions.includes(permission.id)
                              ? 'border-primary-200 bg-primary-50'
                              : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <Checkbox
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={checked =>
                              handlePermissionChange(permission.id, checked as boolean)
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <ActionIcon className={`h-4 w-4 ${actionColor}`} />
                              <span className="text-sm font-medium">{permission.name}</span>
                              {permission.isSystemPermission && (
                                <Badge variant="outline" className="text-xs">
                                  <Lock className="mr-1 h-3 w-3" />
                                  系統
                                </Badge>
                              )}
                            </div>
                            {showDescription && (
                              <p className="mt-1 text-xs text-gray-600">{permission.description}</p>
                            )}
                            {permission.dependsOn && permission.dependsOn.length > 0 && (
                              <p className="mt-1 text-xs text-orange-600">
                                依賴: {permission.dependsOn.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* 選取摘要 */}
      {selectedCount > 0 && (
        <Card className="border-primary-200 bg-primary-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckSquare className="h-5 w-5 text-primary-600" />
                <span className="font-medium text-primary-900">已選取 {selectedCount} 個權限</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => onChange([])}>
                清除全部
              </Button>
            </div>

            {mode === 'advanced' && (
              <div className="mt-3 flex flex-wrap gap-1">
                {selectedPermissions.slice(0, 10).map(permissionId => {
                  const permission = categories
                    .flatMap(cat => cat.permissions)
                    .find(p => p.id === permissionId)

                  return permission ? (
                    <Badge key={permissionId} variant="secondary" className="text-xs">
                      {permission.name}
                    </Badge>
                  ) : null
                })}
                {selectedPermissions.length > 10 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedPermissions.length - 10} 更多...
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 空狀態 */}
      {filteredCategories.length === 0 && (
        <div className="py-8 text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-gray-600">沒有找到符合條件的權限</p>
          {searchTerm && (
            <Button variant="outline" className="mt-2" onClick={() => setSearchTerm('')}>
              清除搜尋
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
