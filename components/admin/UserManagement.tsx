'use client'

import React from 'react'
import { 
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Edit3,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Calendar
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Mock user data
const mockUsers = [
  {
    id: '1',
    name: '大樂司餐廳',
    email: 'admin@dales.com.tw',
    phone: '02-2345-6789',
    type: 'restaurant',
    status: 'active',
    lastLogin: '2025-09-18T08:30:00Z',
    joinedAt: '2024-12-15T10:00:00Z',
    orders: 245,
    gmv: 1245000
  },
  {
    id: '2',
    name: '新鮮蔬果供應商',
    email: 'contact@freshveg.com.tw',
    phone: '02-1111-2222',
    type: 'supplier',
    status: 'active',
    lastLogin: '2025-09-18T07:45:00Z',
    joinedAt: '2024-11-20T09:15:00Z',
    orders: 189,
    gmv: 890000
  },
  {
    id: '3',
    name: '烤食組合',
    email: 'info@grillcombo.tw',
    phone: '02-3456-7890',
    type: 'restaurant',
    status: 'pending',
    lastLogin: null,
    joinedAt: '2025-09-17T14:20:00Z',
    orders: 0,
    gmv: 0
  },
  {
    id: '4',
    name: '優質肉品供應商',
    email: 'orders@qualitymeat.tw',
    phone: '02-2222-3333',
    type: 'supplier',
    status: 'suspended',
    lastLogin: '2025-09-15T16:30:00Z',
    joinedAt: '2024-10-05T11:30:00Z',
    orders: 156,
    gmv: 650000
  },
  {
    id: '5',
    name: '海鮮直送',
    email: 'fresh@seafood.tw',
    phone: '02-3333-4444',
    type: 'supplier',
    status: 'active',
    lastLogin: '2025-09-18T09:15:00Z',
    joinedAt: '2024-09-12T08:45:00Z',
    orders: 203,
    gmv: 1100000
  },
  {
    id: '6',
    name: '樂多多餐廳',
    email: 'manager@happymeal.tw',
    phone: '02-4567-8901',
    type: 'restaurant',
    status: 'active',
    lastLogin: '2025-09-18T06:20:00Z',
    joinedAt: '2024-08-18T13:10:00Z',
    orders: 312,
    gmv: 1890000
  }
]

interface UserTableProps {
  users: typeof mockUsers
  onEdit: (userId: string) => void
  onSuspend: (userId: string) => void
  onDelete: (userId: string) => void
}

function UserTable({ users, onEdit, onSuspend, onDelete }: UserTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" size="sm">啟用</Badge>
      case 'pending':
        return <Badge variant="warning" size="sm">待審核</Badge>
      case 'suspended':
        return <Badge variant="destructive" size="sm">停用</Badge>
      default:
        return <Badge variant="secondary" size="sm">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'restaurant':
        return <Badge variant="info" size="sm">餐廳</Badge>
      case 'supplier':
        return <Badge variant="outline" size="sm">供應商</Badge>
      default:
        return <Badge variant="secondary" size="sm">{type}</Badge>
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '從未登入'
    return new Date(dateString).toLocaleDateString('zh-TW')
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                用戶資訊
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                類型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                狀態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                業務數據
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最後登入
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">操作</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Mail className="h-3 w-3 mr-1" />
                      {user.email}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Phone className="h-3 w-3 mr-1" />
                      {user.phone}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getTypeBadge(user.type)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="text-gray-900">訂單: {user.orders}</div>
                    <div className="text-gray-500">
                      GMV: NT$ {user.gmv.toLocaleString()}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(user.lastLogin)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(user.id)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSuspend(user.id)}
                      className={cn(
                        user.status === 'suspended' 
                          ? "text-green-600 hover:text-green-700"
                          : "text-yellow-600 hover:text-yellow-700"
                      )}
                    >
                      {user.status === 'suspended' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Ban className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(user.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function UserManagement() {
  const [users, setUsers] = React.useState(mockUsers)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filterType, setFilterType] = React.useState('all')
  const [filterStatus, setFilterStatus] = React.useState('all')

  const filteredUsers = React.useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === 'all' || user.type === filterType
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus
      
      return matchesSearch && matchesType && matchesStatus
    })
  }, [users, searchTerm, filterType, filterStatus])

  const handleEdit = (userId: string) => {
    // TODO: Implement edit functionality
    console.log('Edit user:', userId)
  }

  const handleSuspend = (userId: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'suspended' ? 'active' : 'suspended' }
        : user
    ))
  }

  const handleDelete = (userId: string) => {
    if (confirm('確定要刪除此用戶嗎？此操作無法復原。')) {
      setUsers(prev => prev.filter(user => user.id !== userId))
    }
  }

  const stats = React.useMemo(() => {
    const total = users.length
    const active = users.filter(u => u.status === 'active').length
    const pending = users.filter(u => u.status === 'pending').length
    const suspended = users.filter(u => u.status === 'suspended').length
    const restaurants = users.filter(u => u.type === 'restaurant').length
    const suppliers = users.filter(u => u.type === 'supplier').length

    return { total, active, pending, suspended, restaurants, suppliers }
  }, [users])

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">總用戶數</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">啟用中</p>
                <p className="text-xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">待審核</p>
                <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <XCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已停用</p>
                <p className="text-xl font-bold text-red-600">{stats.suspended}</p>
              </div>
              <Ban className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">餐廳</p>
                <p className="text-xl font-bold text-primary-600">{stats.restaurants}</p>
              </div>
              <Users className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">供應商</p>
                <p className="text-xl font-bold text-blue-600">{stats.suppliers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>用戶管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜尋用戶名稱或信箱..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">所有類型</option>
              <option value="restaurant">餐廳</option>
              <option value="supplier">供應商</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">所有狀態</option>
              <option value="active">啟用</option>
              <option value="pending">待審核</option>
              <option value="suspended">停用</option>
            </select>

            <Button className="px-6">
              新增用戶
            </Button>
          </div>

          {/* User Table */}
          <UserTable
            users={filteredUsers}
            onEdit={handleEdit}
            onSuspend={handleSuspend}
            onDelete={handleDelete}
          />

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              顯示 {filteredUsers.length} 筆用戶
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled>
                上一頁
              </Button>
              <Button variant="outline" size="sm" disabled>
                下一頁
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}