'use client'

import React from 'react'
import Link from 'next/link'
import { 
  ChevronUp, 
  ChevronDown, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  UserX,
  Shield,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  organization: {
    id: string
    name: string
    type: 'restaurant' | 'supplier' | 'platform'
  }
  role: string
  status: 'active' | 'inactive' | 'pending'
  lastLoginAt: string
  createdAt: string
  permissions: string[]
}

interface UserListProps {
  searchTerm: string
  selectedRole: string
  selectedStatus: string
  selectedOrganization: string
  selectedUsers: string[]
  onUserSelection: (userIds: string[]) => void
}

export function UserList({
  searchTerm,
  selectedRole,
  selectedStatus,
  selectedOrganization,
  selectedUsers,
  onUserSelection
}: UserListProps) {
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sortBy, setSortBy] = React.useState<keyof User>('name')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [showDropdown, setShowDropdown] = React.useState<string | null>(null)

  React.useEffect(() => {
    loadUsers()
  }, [searchTerm, selectedRole, selectedStatus, selectedOrganization, sortBy, sortOrder, currentPage])

  const loadUsers = async () => {
    try {
      setLoading(true)
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // 模擬資料
      const mockUsers: User[] = [
        {
          id: '1',
          name: '張小明',
          email: 'ming.zhang@abc-restaurant.com',
          avatar: undefined,
          organization: {
            id: 'org1',
            name: 'ABC 餐廳',
            type: 'restaurant'
          },
          role: '餐廳管理員',
          status: 'active',
          lastLoginAt: '2024-09-21T10:30:00Z',
          createdAt: '2024-01-15T09:00:00Z',
          permissions: ['order_management', 'supplier_view', 'financial_view']
        },
        {
          id: '2',
          name: '李會計',
          email: 'accounting@def-restaurant.com',
          avatar: undefined,
          organization: {
            id: 'org2',
            name: 'DEF 餐廳',
            type: 'restaurant'
          },
          role: '會計人員',
          status: 'active',
          lastLoginAt: '2024-09-21T08:15:00Z',
          createdAt: '2024-02-20T14:30:00Z',
          permissions: ['financial_management', 'order_view']
        },
        {
          id: '3',
          name: '王供應商',
          email: 'contact@food-supplier.com',
          avatar: undefined,
          organization: {
            id: 'org3',
            name: '優質食材供應商',
            type: 'supplier'
          },
          role: '供應商管理員',
          status: 'pending',
          lastLoginAt: '2024-09-20T16:45:00Z',
          createdAt: '2024-09-18T11:20:00Z',
          permissions: ['product_management', 'order_processing']
        },
        {
          id: '4',
          name: '陳平台',
          email: 'admin@orderly-platform.com',
          avatar: undefined,
          organization: {
            id: 'org4',
            name: '井然 Orderly 平台',
            type: 'platform'
          },
          role: '平台超級管理員',
          status: 'active',
          lastLoginAt: '2024-09-21T11:00:00Z',
          createdAt: '2023-12-01T09:00:00Z',
          permissions: ['all_permissions']
        },
        {
          id: '5',
          name: '林員工',
          email: 'staff@ghi-restaurant.com',
          avatar: undefined,
          organization: {
            id: 'org5',
            name: 'GHI 連鎖餐廳',
            type: 'restaurant'
          },
          role: '一般員工',
          status: 'inactive',
          lastLoginAt: '2024-09-15T14:20:00Z',
          createdAt: '2024-03-10T10:00:00Z',
          permissions: ['order_view']
        }
      ]
      
      setUsers(mockUsers)
      setTotalPages(Math.ceil(mockUsers.length / 10))
    } catch (err) {
      console.error('載入使用者失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: keyof User) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onUserSelection(users.map(user => user.id))
    } else {
      onUserSelection([])
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      onUserSelection([...selectedUsers, userId])
    } else {
      onUserSelection(selectedUsers.filter(id => id !== userId))
    }
  }

  const getStatusBadge = (status: User['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />活躍</Badge>
      case 'inactive':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />已停用</Badge>
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />待啟用</Badge>
      default:
        return <Badge variant="secondary">未知</Badge>
    }
  }

  const getOrganizationTypeBadge = (type: User['organization']['type']) => {
    switch (type) {
      case 'restaurant':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">餐廳</Badge>
      case 'supplier':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">供應商</Badge>
      case 'platform':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">平台</Badge>
      default:
        return <Badge variant="secondary">未知</Badge>
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return '剛剛'
    } else if (diffInHours < 24) {
      return `${diffInHours} 小時前`
    } else if (diffInHours < 48) {
      return '昨天'
    } else {
      return date.toLocaleDateString('zh-TW')
    }
  }

  const SortableHeader = ({ field, children }: { field: keyof User; children: React.ReactNode }) => (
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
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
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
          <span>使用者清單</span>
          <span className="text-sm font-normal text-gray-500">
            共 {users.length} 位使用者
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
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <SortableHeader field="name">使用者</SortableHeader>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  組織
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
                <SortableHeader field="lastLoginAt">最後登入</SortableHeader>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 font-medium">
                            {user.name.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-900">{user.organization.name}</div>
                      {getOrganizationTypeBadge(user.organization.type)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{user.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(user.lastLoginAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDropdown(showDropdown === user.id ? null : user.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      
                      {showDropdown === user.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                          <div className="py-1">
                            <Link
                              href={`/platform/users/${user.id}`}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setShowDropdown(null)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              檢視詳情
                            </Link>
                            <button
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setShowDropdown(null)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              編輯使用者
                            </button>
                            <button
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              onClick={() => setShowDropdown(null)}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              停用帳號
                            </button>
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
              顯示第 {(currentPage - 1) * 10 + 1} - {Math.min(currentPage * 10, users.length)} 筆，共 {users.length} 筆
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