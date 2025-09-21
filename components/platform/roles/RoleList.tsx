'use client'

import React from 'react'
import Link from 'next/link'
import { 
  ChevronUp, 
  ChevronDown, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Copy,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Building2,
  Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface Role {
  id: string
  code: string
  name: string
  description: string
  type: 'platform' | 'restaurant' | 'supplier'
  isSystemRole: boolean
  isActive: boolean
  priority: number
  userCount: number
  permissionCount: number
  createdAt: string
  updatedAt: string
  createdBy?: string
  tags: string[]
}

interface RoleListProps {
  searchTerm: string
  selectedType: string
  selectedStatus: string
  selectedCategory: string
  selectedRoles: string[]
  onRoleSelection: (roleIds: string[]) => void
}

export function RoleList({
  searchTerm,
  selectedType,
  selectedStatus,
  selectedCategory,
  selectedRoles,
  onRoleSelection
}: RoleListProps) {
  const [roles, setRoles] = React.useState<Role[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sortBy, setSortBy] = React.useState<keyof Role>('name')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [showDropdown, setShowDropdown] = React.useState<string | null>(null)

  React.useEffect(() => {
    loadRoles()
  }, [searchTerm, selectedType, selectedStatus, selectedCategory, sortBy, sortOrder, currentPage])

  const loadRoles = async () => {
    try {
      setLoading(true)
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // 模擬資料
      const mockRoles: Role[] = [
        {
          id: '1',
          code: 'ROLE_PLATFORM_ADMIN',
          name: '平台超級管理員',
          description: '擁有平台所有權限的最高管理員角色',
          type: 'platform',
          isSystemRole: true,
          isActive: true,
          priority: 100,
          userCount: 3,
          permissionCount: 45,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          createdBy: 'system',
          tags: ['系統', '管理員']
        },
        {
          id: '2',
          code: 'ROLE_RESTAURANT_MANAGER',
          name: '餐廳經理',
          description: '餐廳的主要管理角色，負責營運管理',
          type: 'restaurant',
          isSystemRole: true,
          isActive: true,
          priority: 80,
          userCount: 25,
          permissionCount: 18,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-02-20T15:30:00Z',
          createdBy: 'admin',
          tags: ['餐廳', '管理員']
        },
        {
          id: '3',
          code: 'ROLE_SUPPLIER_ADMIN',
          name: '供應商管理員',
          description: '供應商的管理角色，可管理產品和訂單',
          type: 'supplier',
          isSystemRole: true,
          isActive: true,
          priority: 75,
          userCount: 12,
          permissionCount: 15,
          createdAt: '2024-01-20T14:00:00Z',
          updatedAt: '2024-03-01T09:15:00Z',
          createdBy: 'admin',
          tags: ['供應商', '管理員']
        },
        {
          id: '4',
          code: 'ROLE_CUSTOM_PURCHASE',
          name: '採購專員',
          description: '自定義的採購專員角色，負責採購相關工作',
          type: 'restaurant',
          isSystemRole: false,
          isActive: true,
          priority: 60,
          userCount: 45,
          permissionCount: 8,
          createdAt: '2024-02-01T11:30:00Z',
          updatedAt: '2024-03-15T16:45:00Z',
          createdBy: 'manager',
          tags: ['採購', '自定義']
        },
        {
          id: '5',
          code: 'ROLE_FINANCE_VIEWER',
          name: '財務檢視員',
          description: '只能檢視財務相關資料的角色',
          type: 'restaurant',
          isSystemRole: false,
          isActive: false,
          priority: 30,
          userCount: 0,
          permissionCount: 3,
          createdAt: '2024-01-25T13:20:00Z',
          updatedAt: '2024-03-01T10:00:00Z',
          createdBy: 'manager',
          tags: ['財務', '檢視']
        }
      ]
      
      setRoles(mockRoles)
      setTotalPages(Math.ceil(mockRoles.length / 10))
    } catch (err) {
      console.error('載入角色失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: keyof Role) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onRoleSelection(roles.map(role => role.id))
    } else {
      onRoleSelection([])
    }
  }

  const handleSelectRole = (roleId: string, checked: boolean) => {
    if (checked) {
      onRoleSelection([...selectedRoles, roleId])
    } else {
      onRoleSelection(selectedRoles.filter(id => id !== roleId))
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />啟用</Badge>
    } else {
      return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />停用</Badge>
    }
  }

  const getRoleTypeBadge = (type: Role['type']) => {
    switch (type) {
      case 'platform':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800"><Settings className="h-3 w-3 mr-1" />平台</Badge>
      case 'restaurant':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800"><Building2 className="h-3 w-3 mr-1" />餐廳</Badge>
      case 'supplier':
        return <Badge variant="outline" className="bg-green-100 text-green-800"><Users className="h-3 w-3 mr-1" />供應商</Badge>
      default:
        return <Badge variant="secondary">未知</Badge>
    }
  }

  const getRoleCategoryBadge = (isSystemRole: boolean) => {
    if (isSystemRole) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-800"><Shield className="h-3 w-3 mr-1" />系統角色</Badge>
    } else {
      return <Badge variant="outline" className="bg-purple-100 text-purple-800">自定義</Badge>
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW')
  }

  const SortableHeader = ({ field, children }: { field: keyof Role; children: React.ReactNode }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortBy === field && (
          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </th>
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>角色清單</span>
          <span className="text-sm font-normal text-gray-500">
            共 {roles.length} 個角色
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <Checkbox
                    checked={selectedRoles.length === roles.length && roles.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <SortableHeader field="name">角色資訊</SortableHeader>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  類型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  分類
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  使用者數
                </th>
                <SortableHeader field="updatedAt">更新時間</SortableHeader>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Checkbox
                      checked={selectedRoles.includes(role.id)}
                      onCheckedChange={(checked) => handleSelectRole(role.id, checked as boolean)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-primary-700" />
                        </div>
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {role.name}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {role.description}
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          {role.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleTypeBadge(role.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleCategoryBadge(role.isSystemRole)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(role.isActive)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{role.userCount}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(role.updatedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDropdown(showDropdown === role.id ? null : role.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      
                      {showDropdown === role.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                          <div className="py-1">
                            <Link
                              href={`/platform/roles/${role.id}`}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setShowDropdown(null)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              檢視詳情
                            </Link>
                            <Link
                              href={`/platform/roles/${role.id}/edit`}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              編輯角色
                            </Link>
                            <button
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setShowDropdown(null)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              複製角色
                            </button>
                            {!role.isSystemRole && (
                              <button
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                onClick={() => setShowDropdown(null)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                {role.isActive ? '停用角色' : '啟用角色'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* 分頁 */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              顯示第 {(currentPage - 1) * 10 + 1} - {Math.min(currentPage * 10, roles.length)} 筆，共 {roles.length} 筆
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                上一頁
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                下一頁
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}