'use client'

import React from 'react'
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  Download, 
  Settings, 
  Activity,
  Shield,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UserList } from './UserList'

interface UserStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  pendingUsers: number
  restaurantUsers: number
  supplierUsers: number
  platformUsers: number
}

export function UserManagement() {
  const [stats, setStats] = React.useState<UserStats | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  
  // 搜尋和篩選狀態
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedRole, setSelectedRole] = React.useState<string>('all')
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all')
  const [selectedOrganization, setSelectedOrganization] = React.useState<string>('all')
  
  // 批量操作狀態
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([])
  const [showBatchActions, setShowBatchActions] = React.useState(false)
  
  // 模態框狀態
  const [showAddUserModal, setShowAddUserModal] = React.useState(false)

  React.useEffect(() => {
    loadUserStats()
  }, [])

  const loadUserStats = async () => {
    try {
      setLoading(true)
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setStats({
        totalUsers: 1247,
        activeUsers: 1156,
        inactiveUsers: 91,
        pendingUsers: 23,
        restaurantUsers: 856,
        supplierUsers: 321,
        platformUsers: 70
      })
    } catch (err) {
      setError('載入使用者統計資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelection = (userIds: string[]) => {
    setSelectedUsers(userIds)
    setShowBatchActions(userIds.length > 0)
  }

  const handleBatchActivate = () => {
    console.log('批量啟用使用者:', selectedUsers)
    setSelectedUsers([])
    setShowBatchActions(false)
  }

  const handleBatchDeactivate = () => {
    console.log('批量停用使用者:', selectedUsers)
    setSelectedUsers([])
    setShowBatchActions(false)
  }

  const handleBatchDelete = () => {
    console.log('批量刪除使用者:', selectedUsers)
    setSelectedUsers([])
    setShowBatchActions(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <Button onClick={loadUserStats} className="mt-4">
            重新載入
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總使用者數</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              較上月增加 +12%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活躍使用者</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              活躍率 {Math.round((stats?.activeUsers || 0) / (stats?.totalUsers || 1) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">餐廳使用者</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.restaurantUsers}</div>
            <p className="text-xs text-muted-foreground">
              佔總數 {Math.round((stats?.restaurantUsers || 0) / (stats?.totalUsers || 1) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">供應商使用者</CardTitle>
            <Settings className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats?.supplierUsers}</div>
            <p className="text-xs text-muted-foreground">
              佔總數 {Math.round((stats?.supplierUsers || 0) / (stats?.totalUsers || 1) * 100)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 搜尋和篩選區域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">搜尋與篩選</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜尋使用者姓名、Email 或組織..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="all">所有角色</option>
                <option value="platform_admin">平台管理員</option>
                <option value="restaurant_admin">餐廳管理員</option>
                <option value="restaurant_staff">餐廳員工</option>
                <option value="supplier_admin">供應商管理員</option>
                <option value="supplier_staff">供應商員工</option>
              </select>
              
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="all">所有狀態</option>
                <option value="active">活躍</option>
                <option value="inactive">已停用</option>
                <option value="pending">待啟用</option>
              </select>
              
              <select
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="all">所有組織</option>
                <option value="restaurant">餐廳</option>
                <option value="supplier">供應商</option>
                <option value="platform">平台</option>
              </select>
              
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                進階篩選
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 批量操作工具列 */}
      {showBatchActions && (
        <Card className="border-primary-200 bg-primary-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">
                  已選取 {selectedUsers.length} 個使用者
                </span>
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleBatchActivate}>
                    批量啟用
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleBatchDeactivate}>
                    批量停用
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleBatchDelete}>
                    批量刪除
                  </Button>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setSelectedUsers([])
                  setShowBatchActions(false)
                }}
              >
                取消選取
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用者列表 */}
      <UserList
        searchTerm={searchTerm}
        selectedRole={selectedRole}
        selectedStatus={selectedStatus}
        selectedOrganization={selectedOrganization}
        selectedUsers={selectedUsers}
        onUserSelection={handleUserSelection}
      />
    </div>
  )
}