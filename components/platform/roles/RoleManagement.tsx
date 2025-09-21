'use client'

import React from 'react'
import { 
  Shield, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Settings, 
  Activity,
  Users,
  AlertCircle,
  TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RoleList } from './RoleList'

interface RoleStats {
  totalRoles: number
  systemRoles: number
  customRoles: number
  activeRoles: number
  inactiveRoles: number
  platformRoles: number
  restaurantRoles: number
  supplierRoles: number
}

export function RoleManagement() {
  const [stats, setStats] = React.useState<RoleStats | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  
  // 搜尋和篩選狀態
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedType, setSelectedType] = React.useState<string>('all')
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all')
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all')
  
  // 批量操作狀態
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>([])
  const [showBatchActions, setShowBatchActions] = React.useState(false)

  React.useEffect(() => {
    loadRoleStats()
  }, [])

  const loadRoleStats = async () => {
    try {
      setLoading(true)
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setStats({
        totalRoles: 25,
        systemRoles: 12,
        customRoles: 13,
        activeRoles: 22,
        inactiveRoles: 3,
        platformRoles: 8,
        restaurantRoles: 10,
        supplierRoles: 7
      })
    } catch (err) {
      setError('載入角色統計資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelection = (roleIds: string[]) => {
    setSelectedRoles(roleIds)
    setShowBatchActions(roleIds.length > 0)
  }

  const handleBatchActivate = () => {
    console.log('批量啟用角色:', selectedRoles)
    setSelectedRoles([])
    setShowBatchActions(false)
  }

  const handleBatchDeactivate = () => {
    console.log('批量停用角色:', selectedRoles)
    setSelectedRoles([])
    setShowBatchActions(false)
  }

  const handleBatchDelete = () => {
    console.log('批量刪除角色:', selectedRoles)
    setSelectedRoles([])
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
          <Button onClick={loadRoleStats} className="mt-4">
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
            <CardTitle className="text-sm font-medium">總角色數</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRoles}</div>
            <p className="text-xs text-muted-foreground">
              系統 {stats?.systemRoles} 個，自定義 {stats?.customRoles} 個
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活躍角色</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.activeRoles}</div>
            <p className="text-xs text-muted-foreground">
              啟用率 {Math.round((stats?.activeRoles || 0) / (stats?.totalRoles || 1) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平台角色</CardTitle>
            <Settings className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.platformRoles}</div>
            <p className="text-xs text-muted-foreground">
              佔總數 {Math.round((stats?.platformRoles || 0) / (stats?.totalRoles || 1) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">業務角色</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {(stats?.restaurantRoles || 0) + (stats?.supplierRoles || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              餐廳 {stats?.restaurantRoles} 個，供應商 {stats?.supplierRoles} 個
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
                placeholder="搜尋角色名稱、描述或標籤..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="all">所有類型</option>
                <option value="platform">平台角色</option>
                <option value="restaurant">餐廳角色</option>
                <option value="supplier">供應商角色</option>
              </select>
              
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="all">所有狀態</option>
                <option value="active">啟用中</option>
                <option value="inactive">已停用</option>
              </select>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="all">所有分類</option>
                <option value="system">系統角色</option>
                <option value="custom">自定義角色</option>
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
                  已選取 {selectedRoles.length} 個角色
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
                  setSelectedRoles([])
                  setShowBatchActions(false)
                }}
              >
                取消選取
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 角色列表 */}
      <RoleList
        searchTerm={searchTerm}
        selectedType={selectedType}
        selectedStatus={selectedStatus}
        selectedCategory={selectedCategory}
        selectedRoles={selectedRoles}
        onRoleSelection={handleRoleSelection}
      />
    </div>
  )
}