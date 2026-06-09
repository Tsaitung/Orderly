'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Role, Permission, PermissionCategory, MatrixChange, RoleType } from '../types'
import { getCategoryName, getCategoryIcon } from '../utils'

interface UsePermissionMatrixOptions {
  initialRoleTypes?: RoleType[]
  showSystemRolesDefault?: boolean
  showInactiveRolesDefault?: boolean
}

interface UsePermissionMatrixReturn {
  // Data
  roles: Role[]
  categories: PermissionCategory[]
  filteredRoles: Role[]
  filteredCategories: PermissionCategory[]
  changes: MatrixChange[]

  // Loading states
  loading: boolean
  saving: boolean

  // Filter states
  searchTerm: string
  selectedRoleTypes: RoleType[]
  selectedPermissionCategories: string[]
  showSystemRoles: boolean
  showInactiveRoles: boolean
  editMode: boolean

  // Computed
  totalChanges: number
  hasConflicts: boolean

  // Actions
  setSearchTerm: (term: string) => void
  setSelectedRoleTypes: (types: RoleType[]) => void
  setSelectedPermissionCategories: (categories: string[]) => void
  setShowSystemRoles: (show: boolean) => void
  setShowInactiveRoles: (show: boolean) => void
  setEditMode: (edit: boolean) => void
  toggleCategory: (categoryId: string) => void
  handlePermissionToggle: (roleId: string, permissionId: string, granted: boolean) => void
  saveChanges: () => Promise<void>
  cancelChanges: () => void
  exportMatrix: () => void
  checkConflicts: () => void
  reload: () => Promise<void>
}

export function usePermissionMatrix(
  options: UsePermissionMatrixOptions = {}
): UsePermissionMatrixReturn {
  const {
    initialRoleTypes = ['platform', 'restaurant', 'supplier'],
    showSystemRolesDefault = true,
    showInactiveRolesDefault = false,
  } = options

  const [roles, setRoles] = useState<Role[]>([])
  const [categories, setCategories] = useState<PermissionCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoleTypes, setSelectedRoleTypes] = useState<RoleType[]>(initialRoleTypes)
  const [selectedPermissionCategories, setSelectedPermissionCategories] = useState<string[]>([])
  const [showSystemRoles, setShowSystemRoles] = useState(showSystemRolesDefault)
  const [showInactiveRoles, setShowInactiveRoles] = useState(showInactiveRolesDefault)
  const [editMode, setEditMode] = useState(false)
  const [changes, setChanges] = useState<MatrixChange[]>([])
  const [saving, setSaving] = useState(false)

  const loadMatrixData = useCallback(async () => {
    try {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 1000))

      const mockRoles: Role[] = [
        {
          id: '1',
          name: '平台超級管理員',
          code: 'ROLE_PLATFORM_ADMIN',
          type: 'platform',
          isSystemRole: true,
          isActive: true,
          permissions: [
            'user:create',
            'user:read',
            'user:update',
            'user:delete',
            'role:create',
            'role:read',
            'role:update',
            'role:delete',
            'system:read',
            'system:update',
          ],
          userCount: 3,
        },
        {
          id: '2',
          name: '餐廳經理',
          code: 'ROLE_RESTAURANT_MANAGER',
          type: 'restaurant',
          isSystemRole: true,
          isActive: true,
          permissions: [
            'order:create',
            'order:read',
            'order:update',
            'product:read',
            'user:read',
            'report:read',
          ],
          userCount: 25,
        },
        {
          id: '3',
          name: '供應商管理員',
          code: 'ROLE_SUPPLIER_ADMIN',
          type: 'supplier',
          isSystemRole: true,
          isActive: true,
          permissions: [
            'product:create',
            'product:read',
            'product:update',
            'order:read',
            'order:update',
            'finance:read',
          ],
          userCount: 12,
        },
        {
          id: '4',
          name: '採購專員',
          code: 'ROLE_PURCHASE_OFFICER',
          type: 'restaurant',
          isSystemRole: false,
          isActive: true,
          permissions: ['order:create', 'order:read', 'product:read'],
          userCount: 45,
        },
        {
          id: '5',
          name: '財務檢視員',
          code: 'ROLE_FINANCE_VIEWER',
          type: 'restaurant',
          isSystemRole: false,
          isActive: false,
          permissions: ['finance:read', 'report:read'],
          userCount: 0,
        },
      ]

      const mockPermissions: Permission[] = [
        {
          id: 'user:create',
          name: '建立使用者',
          description: '建立新的使用者帳號',
          category: 'user',
          action: 'create',
          module: 'user',
          isSystemPermission: false,
          riskLevel: 'medium',
        },
        {
          id: 'user:read',
          name: '檢視使用者',
          description: '檢視使用者資訊和列表',
          category: 'user',
          action: 'read',
          module: 'user',
          isSystemPermission: false,
          riskLevel: 'low',
        },
        {
          id: 'user:update',
          name: '編輯使用者',
          description: '修改使用者資訊和設定',
          category: 'user',
          action: 'update',
          module: 'user',
          isSystemPermission: false,
          riskLevel: 'medium',
        },
        {
          id: 'user:delete',
          name: '刪除使用者',
          description: '刪除使用者帳號',
          category: 'user',
          action: 'delete',
          module: 'user',
          isSystemPermission: false,
          riskLevel: 'high',
        },
        {
          id: 'role:create',
          name: '建立角色',
          description: '建立新的角色',
          category: 'role',
          action: 'create',
          module: 'role',
          isSystemPermission: true,
          riskLevel: 'high',
        },
        {
          id: 'role:read',
          name: '檢視角色',
          description: '檢視角色和權限資訊',
          category: 'role',
          action: 'read',
          module: 'role',
          isSystemPermission: false,
          riskLevel: 'low',
        },
        {
          id: 'role:update',
          name: '編輯角色',
          description: '修改角色權限配置',
          category: 'role',
          action: 'update',
          module: 'role',
          isSystemPermission: true,
          riskLevel: 'high',
        },
        {
          id: 'role:delete',
          name: '刪除角色',
          description: '刪除自定義角色',
          category: 'role',
          action: 'delete',
          module: 'role',
          isSystemPermission: true,
          riskLevel: 'high',
        },
        {
          id: 'order:create',
          name: '建立訂單',
          description: '建立新訂單',
          category: 'order',
          action: 'create',
          module: 'order',
          isSystemPermission: false,
          riskLevel: 'low',
        },
        {
          id: 'order:read',
          name: '檢視訂單',
          description: '檢視訂單詳情和列表',
          category: 'order',
          action: 'read',
          module: 'order',
          isSystemPermission: false,
          riskLevel: 'low',
        },
        {
          id: 'order:update',
          name: '編輯訂單',
          description: '修改訂單資訊',
          category: 'order',
          action: 'update',
          module: 'order',
          isSystemPermission: false,
          riskLevel: 'medium',
        },
        {
          id: 'order:delete',
          name: '刪除訂單',
          description: '刪除訂單記錄',
          category: 'order',
          action: 'delete',
          module: 'order',
          isSystemPermission: false,
          riskLevel: 'high',
        },
        {
          id: 'product:create',
          name: '建立產品',
          description: '新增產品到目錄',
          category: 'product',
          action: 'create',
          module: 'product',
          isSystemPermission: false,
          riskLevel: 'low',
        },
        {
          id: 'product:read',
          name: '檢視產品',
          description: '檢視產品資訊和目錄',
          category: 'product',
          action: 'read',
          module: 'product',
          isSystemPermission: false,
          riskLevel: 'low',
        },
        {
          id: 'product:update',
          name: '編輯產品',
          description: '修改產品資訊和價格',
          category: 'product',
          action: 'update',
          module: 'product',
          isSystemPermission: false,
          riskLevel: 'medium',
        },
        {
          id: 'product:delete',
          name: '刪除產品',
          description: '從目錄中移除產品',
          category: 'product',
          action: 'delete',
          module: 'product',
          isSystemPermission: false,
          riskLevel: 'medium',
        },
        {
          id: 'finance:read',
          name: '檢視財務',
          description: '檢視財務報表和數據',
          category: 'finance',
          action: 'read',
          module: 'finance',
          isSystemPermission: false,
          riskLevel: 'medium',
        },
        {
          id: 'finance:update',
          name: '編輯財務',
          description: '修改財務資料',
          category: 'finance',
          action: 'update',
          module: 'finance',
          isSystemPermission: false,
          riskLevel: 'high',
        },
        {
          id: 'report:read',
          name: '檢視報表',
          description: '檢視各類業務報表',
          category: 'report',
          action: 'read',
          module: 'report',
          isSystemPermission: false,
          riskLevel: 'low',
        },
        {
          id: 'report:export',
          name: '匯出報表',
          description: '匯出報表資料',
          category: 'report',
          action: 'manage',
          module: 'report',
          isSystemPermission: false,
          riskLevel: 'medium',
        },
        {
          id: 'system:read',
          name: '檢視系統設定',
          description: '檢視系統配置',
          category: 'system',
          action: 'read',
          module: 'system',
          isSystemPermission: true,
          riskLevel: 'medium',
        },
        {
          id: 'system:update',
          name: '修改系統設定',
          description: '修改系統配置參數',
          category: 'system',
          action: 'update',
          module: 'system',
          isSystemPermission: true,
          riskLevel: 'high',
        },
      ]

      const categoryGroups = mockPermissions.reduce(
        (groups, permission) => {
          const category = permission.category
          if (!groups[category]) {
            groups[category] = {
              id: category,
              name: getCategoryName(category),
              icon: getCategoryIcon(category),
              permissions: [],
              collapsed: false,
            }
          }
          groups[category].permissions.push(permission)
          return groups
        },
        {} as Record<string, PermissionCategory>
      )

      setRoles(mockRoles)
      setCategories(Object.values(categoryGroups))
      setSelectedPermissionCategories(Object.keys(categoryGroups))
    } catch (err) {
      console.error('載入矩陣資料失敗:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMatrixData()
  }, [loadMatrixData])

  const toggleCategory = useCallback((categoryId: string) => {
    setCategories(prev =>
      prev.map(cat => (cat.id === categoryId ? { ...cat, collapsed: !cat.collapsed } : cat))
    )
  }, [])

  const handlePermissionToggle = useCallback(
    (roleId: string, permissionId: string, granted: boolean) => {
      if (!editMode) return

      const role = roles.find(r => r.id === roleId)
      if (!role) return

      const previousState = role.permissions.includes(permissionId)

      setRoles(prev =>
        prev.map(r =>
          r.id === roleId
            ? {
                ...r,
                permissions: granted
                  ? [...r.permissions, permissionId]
                  : r.permissions.filter(p => p !== permissionId),
              }
            : r
        )
      )

      setChanges(prev => {
        const existingChange = prev.find(
          c => c.roleId === roleId && c.permissionId === permissionId
        )

        if (existingChange) {
          if (existingChange.previousState === granted) {
            return prev.filter(c => c !== existingChange)
          }
          return prev.map(change => (change === existingChange ? { ...change, granted } : change))
        }
        return [...prev, { roleId, permissionId, granted, previousState }]
      })
    },
    [editMode, roles]
  )

  const saveChanges = useCallback(async () => {
    try {
      setSaving(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('儲存權限變更:', changes)
      setChanges([])
      setEditMode(false)
    } catch (err) {
      console.error('儲存變更失敗:', err)
    } finally {
      setSaving(false)
    }
  }, [changes])

  const cancelChanges = useCallback(() => {
    changes.forEach(change => {
      setRoles(prev =>
        prev.map(r =>
          r.id === change.roleId
            ? {
                ...r,
                permissions: change.previousState
                  ? [...r.permissions, change.permissionId]
                  : r.permissions.filter(p => p !== change.permissionId),
              }
            : r
        )
      )
    })
    setChanges([])
    setEditMode(false)
  }, [changes])

  const exportMatrix = useCallback(() => {
    console.log('匯出權限矩陣')
  }, [])

  const checkConflicts = useCallback(() => {
    console.log('檢查權限衝突')
  }, [])

  const filteredRoles = roles.filter(role => {
    if (!selectedRoleTypes.includes(role.type)) return false
    if (!showSystemRoles && role.isSystemRole) return false
    if (!showInactiveRoles && !role.isActive) return false
    if (searchTerm && !role.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const filteredCategories = categories
    .filter(category => selectedPermissionCategories.includes(category.id))
    .map(category => ({
      ...category,
      permissions: category.permissions.filter(
        permission =>
          !searchTerm ||
          permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          permission.description.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))

  return {
    roles,
    categories,
    filteredRoles,
    filteredCategories,
    changes,
    loading,
    saving,
    searchTerm,
    selectedRoleTypes,
    selectedPermissionCategories,
    showSystemRoles,
    showInactiveRoles,
    editMode,
    totalChanges: changes.length,
    hasConflicts: false,
    setSearchTerm,
    setSelectedRoleTypes,
    setSelectedPermissionCategories,
    setShowSystemRoles,
    setShowInactiveRoles,
    setEditMode,
    toggleCategory,
    handlePermissionToggle,
    saveChanges,
    cancelChanges,
    exportMatrix,
    checkConflicts,
    reload: loadMatrixData,
  }
}
