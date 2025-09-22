'use client'

import React from 'react'
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Clock,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit3,
  Settings,
  Activity,
  FileText,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PermissionManager } from './PermissionManager'
import { OrganizationTree } from './OrganizationTree'

interface UserDetailProps {
  userId: string
}

interface UserDetailData {
  id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  lastLoginAt: string
  organization: {
    id: string
    name: string
    type: 'restaurant' | 'supplier' | 'platform'
    department?: string
    position?: string
  }
  roles: {
    id: string
    name: string
    type: 'primary' | 'secondary'
    permissions: string[]
  }[]
  activityLog: {
    id: string
    action: string
    description: string
    timestamp: string
    ipAddress?: string
  }[]
  settings: {
    emailNotifications: boolean
    smsNotifications: boolean
    language: string
    timezone: string
  }
}

export function UserDetail({ userId }: UserDetailProps) {
  const [user, setUser] = React.useState<UserDetailData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<
    'overview' | 'permissions' | 'organizations' | 'activity' | 'settings'
  >('overview')
  const [isEditing, setIsEditing] = React.useState(false)

  React.useEffect(() => {
    loadUserDetail()
  }, [userId])

  const loadUserDetail = async () => {
    try {
      setLoading(true)
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 模擬資料
      const mockUser: UserDetailData = {
        id: userId,
        name: '張小明',
        email: 'ming.zhang@abc-restaurant.com',
        phone: '+886-912-345-678',
        avatar: undefined,
        status: 'active',
        createdAt: '2024-01-15T09:00:00Z',
        lastLoginAt: '2024-09-21T10:30:00Z',
        organization: {
          id: 'org1',
          name: 'ABC 餐廳',
          type: 'restaurant',
          department: '營運部',
          position: '採購經理',
        },
        roles: [
          {
            id: 'role1',
            name: '餐廳管理員',
            type: 'primary',
            permissions: ['order_management', 'supplier_view', 'financial_view', 'user_management'],
          },
          {
            id: 'role2',
            name: '採購專員',
            type: 'secondary',
            permissions: ['product_search', 'order_create', 'supplier_contact'],
          },
        ],
        activityLog: [
          {
            id: 'log1',
            action: 'login',
            description: '登入系統',
            timestamp: '2024-09-21T10:30:00Z',
            ipAddress: '192.168.1.100',
          },
          {
            id: 'log2',
            action: 'order_create',
            description: '建立訂單 #ORD-2024-001234',
            timestamp: '2024-09-21T09:15:00Z',
            ipAddress: '192.168.1.100',
          },
          {
            id: 'log3',
            action: 'supplier_view',
            description: '檢視供應商 "優質食材供應商" 的產品清單',
            timestamp: '2024-09-20T16:45:00Z',
            ipAddress: '192.168.1.100',
          },
          {
            id: 'log4',
            action: 'profile_update',
            description: '更新個人資料',
            timestamp: '2024-09-19T14:20:00Z',
            ipAddress: '192.168.1.100',
          },
        ],
        settings: {
          emailNotifications: true,
          smsNotifications: false,
          language: 'zh-TW',
          timezone: 'Asia/Taipei',
        },
      }

      setUser(mockUser)
    } catch (err) {
      setError('載入使用者詳情失敗')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: UserDetailData['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            活躍
          </Badge>
        )
      case 'inactive':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            已停用
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-3 w-3" />
            待啟用
          </Badge>
        )
      default:
        return <Badge variant="secondary">未知</Badge>
    }
  }

  const getOrganizationTypeBadge = (type: UserDetailData['organization']['type']) => {
    switch (type) {
      case 'restaurant':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            餐廳
          </Badge>
        )
      case 'supplier':
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800">
            供應商
          </Badge>
        )
      case 'platform':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            平台
          </Badge>
        )
      default:
        return <Badge variant="secondary">未知</Badge>
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW')
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <Activity className="h-4 w-4 text-green-600" />
      case 'order_create':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'supplier_view':
        return <Building2 className="h-4 w-4 text-purple-600" />
      case 'profile_update':
        return <Edit3 className="h-4 w-4 text-orange-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-gray-600">{error || '找不到使用者資料'}</p>
          <Button onClick={loadUserDetail} className="mt-4">
            重新載入
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 標籤頁導航 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: '總覽' },
            { id: 'permissions', label: '權限管理' },
            { id: 'organizations', label: '組織架構' },
            { id: 'activity', label: '活動紀錄' },
            { id: 'settings', label: '設定' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`border-b-2 px-1 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 總覽標籤 */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 基本資訊 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                基本資訊
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Edit3 className="mr-2 h-4 w-4" />
                {isEditing ? '取消編輯' : '編輯'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                  <span className="text-xl font-bold text-primary-700">{user.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                  <div className="mt-1 flex items-center space-x-2">
                    {getStatusBadge(user.status)}
                    <span className="text-sm text-gray-500">ID: {user.id}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="mr-3 h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center">
                    <Phone className="mr-3 h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="mr-3 h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    註冊時間：{formatDateTime(user.createdAt)}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-3 h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    最後登入：{formatDateTime(user.lastLoginAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 組織歸屬 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-5 w-5" />
                組織歸屬
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">主要組織</span>
                    {getOrganizationTypeBadge(user.organization.type)}
                  </div>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {user.organization.name}
                  </p>
                </div>

                {user.organization.department && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">部門</span>
                    <p className="text-sm text-gray-900">{user.organization.department}</p>
                  </div>
                )}

                {user.organization.position && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">職位</span>
                    <p className="text-sm text-gray-900">{user.organization.position}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 權限角色 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                權限角色
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {user.roles.map(role => (
                  <div key={role.id} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <h4 className="font-medium text-gray-900">{role.name}</h4>
                        <Badge
                          variant={role.type === 'primary' ? 'default' : 'outline'}
                          className="ml-2"
                        >
                          {role.type === 'primary' ? '主要角色' : '次要角色'}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      {role.permissions.map(permission => (
                        <Badge key={permission} variant="outline" className="justify-center">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 權限管理標籤 */}
      {activeTab === 'permissions' && <PermissionManager userId={userId} />}

      {/* 組織架構標籤 */}
      {activeTab === 'organizations' && <OrganizationTree userId={userId} />}

      {/* 活動紀錄標籤 */}
      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              活動紀錄
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {user.activityLog.map(log => (
                <div key={log.id} className="flex items-start space-x-3 rounded-lg bg-gray-50 p-3">
                  <div className="mt-1 flex-shrink-0">{getActionIcon(log.action)}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{log.description}</p>
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <span>{formatDateTime(log.timestamp)}</span>
                      {log.ipAddress && (
                        <>
                          <span className="mx-2">•</span>
                          <span>IP: {log.ipAddress}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 設定標籤 */}
      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              使用者設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="mb-3 font-medium text-gray-900">通知設定</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Email 通知</span>
                  <Badge variant={user.settings.emailNotifications ? 'default' : 'secondary'}>
                    {user.settings.emailNotifications ? '已啟用' : '已停用'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">簡訊通知</span>
                  <Badge variant={user.settings.smsNotifications ? 'default' : 'secondary'}>
                    {user.settings.smsNotifications ? '已啟用' : '已停用'}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-3 font-medium text-gray-900">地區設定</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">語言</span>
                  <span className="text-sm text-gray-900">{user.settings.language}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">時區</span>
                  <span className="text-sm text-gray-900">{user.settings.timezone}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                刪除使用者帳號
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
