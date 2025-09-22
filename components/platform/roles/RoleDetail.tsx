'use client'

import React from 'react'
import Link from 'next/link'
import {
  Shield,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings,
  Edit,
  Copy,
  History,
  Eye,
  Building2,
  Database,
  Activity,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  ExternalLink,
  Globe,
  Lock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface RoleData {
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
  createdBy: string
  tags: string[]
  validFrom?: string
  validTo?: string
  ipRestrictions: string[]
  dataScope: string
  maxUserCount?: number
  permissions: Permission[]
  users: RoleUser[]
  auditLogs: AuditLog[]
  statistics: RoleStatistics
}

interface Permission {
  id: string
  name: string
  description: string
  category: string
  action: string
  module: string
}

interface RoleUser {
  id: string
  name: string
  email: string
  organizationName: string
  assignedAt: string
  assignedBy: string
  isActive: boolean
  lastLoginAt?: string
}

interface AuditLog {
  id: string
  action: string
  description: string
  performedBy: string
  performedAt: string
  details?: Record<string, any>
}

interface RoleStatistics {
  totalUsers: number
  activeUsers: number
  newUsersThisMonth: number
  lastUsedAt?: string
  usageFrequency: 'high' | 'medium' | 'low'
  permissionUtilization: number
}

interface RoleDetailProps {
  roleId: string
}

export function RoleDetail({ roleId }: RoleDetailProps) {
  const [role, setRole] = React.useState<RoleData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState('overview')

  React.useEffect(() => {
    loadRoleData()
  }, [roleId])

  const loadRoleData = async () => {
    try {
      setLoading(true)
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 800))

      // 模擬角色詳細資料
      const mockRole: RoleData = {
        id: roleId,
        code: 'ROLE_RESTAURANT_MANAGER',
        name: '餐廳經理',
        description: '餐廳的主要管理角色，負責營運管理和團隊協調',
        type: 'restaurant',
        isSystemRole: true,
        isActive: true,
        priority: 80,
        userCount: 25,
        permissionCount: 18,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-03-20T15:30:00Z',
        createdBy: 'system',
        tags: ['餐廳', '管理員', '營運'],
        validFrom: '2024-01-01',
        validTo: '2025-12-31',
        ipRestrictions: ['192.168.1.0/24', '10.0.0.0/8'],
        dataScope: 'own_organization',
        maxUserCount: 50,
        permissions: [
          {
            id: 'order:read',
            name: '檢視訂單',
            description: '檢視訂單詳情和列表',
            category: 'order',
            action: 'read',
            module: 'order',
          },
          {
            id: 'order:create',
            name: '建立訂單',
            description: '建立新訂單',
            category: 'order',
            action: 'create',
            module: 'order',
          },
          {
            id: 'order:update',
            name: '編輯訂單',
            description: '修改訂單資訊',
            category: 'order',
            action: 'update',
            module: 'order',
          },
          {
            id: 'product:read',
            name: '檢視產品',
            description: '檢視產品資訊和目錄',
            category: 'product',
            action: 'read',
            module: 'product',
          },
          {
            id: 'user:read',
            name: '檢視使用者',
            description: '檢視使用者資訊和列表',
            category: 'user',
            action: 'read',
            module: 'user',
          },
          {
            id: 'user:create',
            name: '建立使用者',
            description: '建立新的使用者帳號',
            category: 'user',
            action: 'create',
            module: 'user',
          },
          {
            id: 'report:read',
            name: '檢視報表',
            description: '檢視各類業務報表',
            category: 'report',
            action: 'read',
            module: 'report',
          },
          {
            id: 'finance:read',
            name: '檢視財務',
            description: '檢視財務報表和數據',
            category: 'finance',
            action: 'read',
            module: 'finance',
          },
        ],
        users: [
          {
            id: '1',
            name: '張經理',
            email: 'zhang@restaurant.com',
            organizationName: '美味餐廳',
            assignedAt: '2024-01-20T09:00:00Z',
            assignedBy: 'admin',
            isActive: true,
            lastLoginAt: '2024-03-20T08:30:00Z',
          },
          {
            id: '2',
            name: '李主管',
            email: 'li@restaurant.com',
            organizationName: '美味餐廳',
            assignedAt: '2024-02-01T14:00:00Z',
            assignedBy: 'admin',
            isActive: true,
            lastLoginAt: '2024-03-19T16:45:00Z',
          },
          {
            id: '3',
            name: '王店長',
            email: 'wang@restaurant.com',
            organizationName: '快樂餐廳',
            assignedAt: '2024-02-15T11:00:00Z',
            assignedBy: 'admin',
            isActive: false,
          },
        ],
        auditLogs: [
          {
            id: '1',
            action: 'ROLE_UPDATED',
            description: '修改角色權限配置',
            performedBy: 'admin',
            performedAt: '2024-03-20T15:30:00Z',
            details: { permissions: ['新增: report:read'] },
          },
          {
            id: '2',
            action: 'USER_ASSIGNED',
            description: '指派使用者到角色',
            performedBy: 'admin',
            performedAt: '2024-03-15T10:15:00Z',
            details: { userId: '3', userName: '王店長' },
          },
          {
            id: '3',
            action: 'ROLE_CREATED',
            description: '建立角色',
            performedBy: 'system',
            performedAt: '2024-01-15T10:00:00Z',
          },
        ],
        statistics: {
          totalUsers: 25,
          activeUsers: 23,
          newUsersThisMonth: 3,
          lastUsedAt: '2024-03-20T16:45:00Z',
          usageFrequency: 'high',
          permissionUtilization: 75,
        },
      }

      setRole(mockRole)
    } catch (err) {
      setError('載入角色資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const getTypeDisplay = (type: string) => {
    const types = {
      platform: { name: '平台角色', color: 'bg-blue-100 text-blue-800', icon: Settings },
      restaurant: { name: '餐廳角色', color: 'bg-orange-100 text-orange-800', icon: Building2 },
      supplier: { name: '供應商角色', color: 'bg-green-100 text-green-800', icon: Users },
    }
    return (
      types[type as keyof typeof types] || {
        name: type,
        color: 'bg-gray-100 text-gray-800',
        icon: Shield,
      }
    )
  }

  const getUsageFrequencyDisplay = (frequency: string) => {
    const displays = {
      high: { text: '高頻使用', color: 'text-green-600', icon: TrendingUp },
      medium: { text: '中頻使用', color: 'text-yellow-600', icon: Activity },
      low: { text: '低頻使用', color: 'text-red-600', icon: TrendingDown },
    }
    return displays[frequency as keyof typeof displays] || displays.medium
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW')
  }

  const groupPermissionsByCategory = (permissions: Permission[]) => {
    return permissions.reduce(
      (groups, permission) => {
        const category = permission.category
        if (!groups[category]) {
          groups[category] = []
        }
        groups[category].push(permission)
        return groups
      },
      {} as Record<string, Permission[]>
    )
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 rounded-lg bg-gray-200"></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="h-24 rounded bg-gray-200"></div>
          <div className="h-24 rounded bg-gray-200"></div>
          <div className="h-24 rounded bg-gray-200"></div>
        </div>
        <div className="h-64 rounded-lg bg-gray-200"></div>
      </div>
    )
  }

  if (error || !role) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-gray-600">{error || '角色不存在'}</p>
          <Button onClick={loadRoleData} className="mt-4">
            重新載入
          </Button>
        </div>
      </div>
    )
  }

  const typeDisplay = getTypeDisplay(role.type)
  const TypeIcon = typeDisplay.icon
  const usageDisplay = getUsageFrequencyDisplay(role.statistics.usageFrequency)
  const UsageIcon = usageDisplay.icon

  return (
    <div className="space-y-6">
      {/* 基本資訊卡片 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="rounded-lg bg-primary-100 p-3">
                <Shield className="h-8 w-8 text-primary-700" />
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">{role.name}</h1>
                  <Badge className={typeDisplay.color}>
                    <TypeIcon className="mr-1 h-3 w-3" />
                    {typeDisplay.name}
                  </Badge>
                  {role.isSystemRole && (
                    <Badge variant="outline" className="bg-gray-100 text-gray-800">
                      <Lock className="mr-1 h-3 w-3" />
                      系統角色
                    </Badge>
                  )}
                  <Badge
                    className={
                      role.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }
                  >
                    {role.isActive ? (
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                    ) : (
                      <XCircle className="mr-1 h-3 w-3" />
                    )}
                    {role.isActive ? '啟用' : '停用'}
                  </Badge>
                </div>
                <p className="mb-3 text-lg text-gray-600">{role.description}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>代碼: {role.code}</span>
                  <span>•</span>
                  <span>優先級: {role.priority}</span>
                  <span>•</span>
                  <span>建立於: {formatDate(role.createdAt)}</span>
                  <span>•</span>
                  <span>更新於: {formatDate(role.updatedAt)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {role.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">使用者總數</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{role.statistics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">活躍: {role.statistics.activeUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">權限數量</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{role.permissions.length}</div>
            <p className="text-xs text-muted-foreground">
              利用率: {role.statistics.permissionUtilization}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">使用頻率</CardTitle>
            <UsageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${usageDisplay.color}`}>{usageDisplay.text}</div>
            <p className="text-xs text-muted-foreground">
              最後使用:{' '}
              {role.statistics.lastUsedAt ? formatDate(role.statistics.lastUsedAt) : '未知'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本月新增</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{role.statistics.newUsersThisMonth}
            </div>
            <p className="text-xs text-muted-foreground">新使用者</p>
          </CardContent>
        </Card>
      </div>

      {/* 詳細資訊標籤頁 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概覽</TabsTrigger>
          <TabsTrigger value="permissions">權限詳情</TabsTrigger>
          <TabsTrigger value="users">使用者</TabsTrigger>
          <TabsTrigger value="audit">審計記錄</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 基本設定 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  基本設定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">角色類型</Label>
                    <p className="font-medium">{typeDisplay.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">優先級</Label>
                    <p className="font-medium">{role.priority}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">資料存取範圍</Label>
                  <p className="font-medium">{role.dataScope}</p>
                </div>

                {role.maxUserCount && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">最大使用者數量</Label>
                    <p className="font-medium">{role.maxUserCount}</p>
                  </div>
                )}

                {role.validFrom && role.validTo && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">有效期限</Label>
                    <p className="font-medium">
                      {formatDate(role.validFrom)} - {formatDate(role.validTo)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 安全設定 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="mr-2 h-5 w-5" />
                  安全設定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-500">系統角色</Label>
                  <p className="font-medium">{role.isSystemRole ? '是' : '否'}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">IP 存取限制</Label>
                  {role.ipRestrictions.length > 0 ? (
                    <div className="space-y-1">
                      {role.ipRestrictions.map(ip => (
                        <p key={ip} className="rounded bg-gray-100 px-2 py-1 font-mono text-sm">
                          {ip}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">無限制</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  權限詳情 ({role.permissions.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(groupPermissionsByCategory(role.permissions)).map(
                  ([category, permissions]) => (
                    <div key={category}>
                      <h3 className="mb-3 font-medium capitalize text-gray-900">{category}</h3>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {permissions.map(permission => (
                          <div
                            key={permission.id}
                            className="flex items-start space-x-3 rounded-lg bg-gray-50 p-3"
                          >
                            <Shield className="mt-0.5 h-4 w-4 text-primary-600" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium">{permission.name}</div>
                              <p className="mt-1 text-xs text-gray-600">{permission.description}</p>
                              <Badge variant="outline" className="mt-2 text-xs">
                                {permission.action}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  使用者列表 ({role.users.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {role.users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                        <Users className="h-5 w-5 text-primary-700" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{user.name}</span>
                          <Badge
                            className={
                              user.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {user.isActive ? '活躍' : '停用'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          {user.organizationName} • 指派於 {formatDate(user.assignedAt)}
                          {user.lastLoginAt && ` • 最後登入 ${formatDate(user.lastLoginAt)}`}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="mr-2 h-5 w-5" />
                審計記錄
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {role.auditLogs.map(log => (
                  <div
                    key={log.id}
                    className="flex items-start space-x-4 rounded-lg border border-gray-200 p-4"
                  >
                    <div className="rounded-lg bg-blue-100 p-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{log.description}</span>
                        <span className="text-sm text-gray-500">
                          {formatDateTime(log.performedAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">執行者: {log.performedBy}</p>
                      {log.details && (
                        <div className="mt-2 rounded bg-gray-50 p-2 text-xs">
                          <pre>{JSON.stringify(log.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Label({
  className,
  children,
  ...props
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`block text-sm font-medium ${className || ''}`} {...props}>
      {children}
    </label>
  )
}
