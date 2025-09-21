'use client'

import React from 'react'
import { 
  Building2,
  Users,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit3,
  Trash2,
  UserCheck,
  UserX,
  MapPin,
  Crown,
  Shield,
  Link as LinkIcon,
  ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface OrganizationTreeProps {
  userId: string
}

interface Organization {
  id: string
  name: string
  type: 'platform' | 'restaurant' | 'supplier'
  parentId?: string
  level: number
  children?: Organization[]
  userCount: number
  isUserMember: boolean
  userRole?: string
  description?: string
}

interface UserOrganizationRelation {
  organizationId: string
  organizationName: string
  role: string
  permissions: string[]
  isActive: boolean
  joinedAt: string
  isPrimary: boolean
}

export function OrganizationTree({ userId }: OrganizationTreeProps) {
  const [organizations, setOrganizations] = React.useState<Organization[]>([])
  const [userRelations, setUserRelations] = React.useState<UserOrganizationRelation[]>([])
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set())
  const [selectedOrg, setSelectedOrg] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [editMode, setEditMode] = React.useState(false)

  React.useEffect(() => {
    loadOrganizationData()
  }, [userId])

  const loadOrganizationData = async () => {
    try {
      setLoading(true)
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模擬組織資料
      const mockOrganizations: Organization[] = [
        {
          id: 'platform',
          name: '井然 Orderly 平台',
          type: 'platform',
          level: 0,
          userCount: 25,
          isUserMember: false,
          description: '井然 Orderly 數位供應鏈平台',
          children: [
            {
              id: 'platform_admin',
              name: '平台管理部',
              type: 'platform',
              parentId: 'platform',
              level: 1,
              userCount: 8,
              isUserMember: false,
              description: '負責平台整體營運管理'
            },
            {
              id: 'platform_tech',
              name: '技術部',
              type: 'platform',
              parentId: 'platform',
              level: 1,
              userCount: 12,
              isUserMember: false,
              description: '負責技術開發與維護'
            },
            {
              id: 'platform_business',
              name: '業務部',
              type: 'platform',
              parentId: 'platform',
              level: 1,
              userCount: 5,
              isUserMember: false,
              description: '負責客戶關係與業務拓展'
            }
          ]
        },
        {
          id: 'abc_restaurant',
          name: 'ABC 餐廳集團',
          type: 'restaurant',
          level: 0,
          userCount: 156,
          isUserMember: true,
          userRole: '餐廳管理員',
          description: '台北知名連鎖餐廳',
          children: [
            {
              id: 'abc_ops',
              name: '營運部',
              type: 'restaurant',
              parentId: 'abc_restaurant',
              level: 1,
              userCount: 45,
              isUserMember: true,
              userRole: '採購經理',
              description: '負責餐廳日常營運管理',
              children: [
                {
                  id: 'abc_purchasing',
                  name: '採購組',
                  type: 'restaurant',
                  parentId: 'abc_ops',
                  level: 2,
                  userCount: 12,
                  isUserMember: true,
                  userRole: '採購經理',
                  description: '負責食材採購與供應商管理'
                },
                {
                  id: 'abc_logistics',
                  name: '物流組',
                  type: 'restaurant',
                  parentId: 'abc_ops',
                  level: 2,
                  userCount: 18,
                  isUserMember: false,
                  description: '負責貨品配送與倉儲管理'
                }
              ]
            },
            {
              id: 'abc_finance',
              name: '財務部',
              type: 'restaurant',
              parentId: 'abc_restaurant',
              level: 1,
              userCount: 25,
              isUserMember: false,
              description: '負責財務管理與會計作業'
            }
          ]
        },
        {
          id: 'food_supplier',
          name: '優質食材供應商',
          type: 'supplier',
          level: 0,
          userCount: 89,
          isUserMember: false,
          description: '專業食材供應商',
          children: [
            {
              id: 'supplier_sales',
              name: '業務部',
              type: 'supplier',
              parentId: 'food_supplier',
              level: 1,
              userCount: 35,
              isUserMember: false,
              description: '負責客戶開發與維護'
            },
            {
              id: 'supplier_warehouse',
              name: '倉儲部',
              type: 'supplier',
              parentId: 'food_supplier',
              level: 1,
              userCount: 54,
              isUserMember: false,
              description: '負責庫存管理與出貨'
            }
          ]
        }
      ]

      const mockUserRelations: UserOrganizationRelation[] = [
        {
          organizationId: 'abc_restaurant',
          organizationName: 'ABC 餐廳集團',
          role: '餐廳管理員',
          permissions: ['order_management', 'supplier_view', 'financial_view'],
          isActive: true,
          joinedAt: '2024-01-15T09:00:00Z',
          isPrimary: true
        },
        {
          organizationId: 'abc_purchasing',
          organizationName: 'ABC 餐廳集團 > 營運部 > 採購組',
          role: '採購經理',
          permissions: ['purchasing', 'supplier_management', 'inventory_view'],
          isActive: true,
          joinedAt: '2024-01-15T09:00:00Z',
          isPrimary: false
        }
      ]

      setOrganizations(mockOrganizations)
      setUserRelations(mockUserRelations)
      
      // 展開有使用者的節點
      const expandedIds = new Set<string>()
      const expandNodesWithUser = (orgs: Organization[]) => {
        orgs.forEach(org => {
          if (org.isUserMember) {
            expandedIds.add(org.id)
            // 展開父節點
            let current = org
            while (current.parentId) {
              expandedIds.add(current.parentId)
              current = mockOrganizations.find(o => o.id === current.parentId) || current
            }
          }
          if (org.children) {
            expandNodesWithUser(org.children)
          }
        })
      }
      expandNodesWithUser(mockOrganizations)
      setExpandedNodes(expandedIds)
      
    } catch (err) {
      console.error('載入組織架構資料失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const getOrgTypeBadge = (type: Organization['type']) => {
    switch (type) {
      case 'platform':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">平台</Badge>
      case 'restaurant':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">餐廳</Badge>
      case 'supplier':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">供應商</Badge>
      default:
        return <Badge variant="secondary">未知</Badge>
    }
  }

  const renderOrganizationNode = (org: Organization, depth: number = 0): React.ReactNode => {
    const hasChildren = org.children && org.children.length > 0
    const isExpanded = expandedNodes.has(org.id)
    const isSelected = selectedOrg === org.id
    const userRelation = userRelations.find(ur => ur.organizationId === org.id)

    return (
      <div key={org.id} className="select-none">
        <div 
          className={`flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors ${
            isSelected 
              ? 'bg-primary-100 border border-primary-200' 
              : 'hover:bg-gray-50'
          } ${org.isUserMember ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''}`}
          style={{ marginLeft: `${depth * 24}px` }}
          onClick={() => setSelectedOrg(isSelected ? null : org.id)}
        >
          {/* 展開/收合按鈕 */}
          <div className="w-5 h-5 mr-2 flex items-center justify-center">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleNode(org.id)
                }}
                className="p-0.5 rounded hover:bg-gray-200"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            )}
          </div>

          {/* 組織圖示 */}
          <div className="mr-3">
            <Building2 className="h-4 w-4 text-gray-500" />
          </div>

          {/* 組織資訊 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900 truncate">{org.name}</span>
              {getOrgTypeBadge(org.type)}
              {org.isUserMember && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <UserCheck className="h-3 w-3 mr-1" />
                  成員
                </Badge>
              )}
              {userRelation?.isPrimary && (
                <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                  <Crown className="h-3 w-3 mr-1" />
                  主要組織
                </Badge>
              )}
            </div>
            {org.description && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{org.description}</p>
            )}
          </div>

          {/* 使用者數量 */}
          <div className="flex items-center text-xs text-gray-500 mr-2">
            <Users className="h-3 w-3 mr-1" />
            {org.userCount}
          </div>

          {/* 使用者角色 */}
          {org.userRole && (
            <Badge variant="outline" className="mr-2">
              {org.userRole}
            </Badge>
          )}

          {/* 操作按鈕 */}
          {editMode && (
            <div className="flex space-x-1">
              <Button variant="ghost" size="sm">
                <Edit3 className="h-3 w-3" />
              </Button>
              {!org.isUserMember && (
                <Button variant="ghost" size="sm">
                  <Plus className="h-3 w-3" />
                </Button>
              )}
              {org.isUserMember && !userRelation?.isPrimary && (
                <Button variant="ghost" size="sm">
                  <UserX className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* 子組織 */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {org.children!.map(child => renderOrganizationNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 組織架構樹 */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              組織架構
            </CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(!editMode)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {editMode ? '完成編輯' : '編輯'}
              </Button>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                加入組織
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {organizations.map(org => renderOrganizationNode(org))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 組織詳情與關聯管理 */}
      <div className="space-y-6">
        {/* 使用者組織關聯 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LinkIcon className="h-5 w-5 mr-2" />
              組織關聯
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userRelations.map((relation) => (
                <div key={relation.organizationId} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{relation.organizationName}</span>
                    {relation.isPrimary && (
                      <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                        <Crown className="h-3 w-3 mr-1" />
                        主要
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">角色</span>
                      <Badge variant="outline">{relation.role}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">狀態</span>
                      <Badge variant={relation.isActive ? 'default' : 'secondary'}>
                        {relation.isActive ? '活躍' : '停用'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">加入時間</span>
                      <span className="text-gray-500">
                        {new Date(relation.joinedAt).toLocaleDateString('zh-TW')}
                      </span>
                    </div>
                  </div>
                  
                  {editMode && !relation.isPrimary && (
                    <div className="mt-2 pt-2 border-t">
                      <Button variant="outline" size="sm" className="w-full">
                        <Trash2 className="h-3 w-3 mr-2" />
                        移除關聯
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              
              {editMode && (
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  新增組織關聯
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 選中組織詳情 */}
        {selectedOrg && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                組織詳情
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const findOrg = (orgs: Organization[], id: string): Organization | null => {
                  for (const org of orgs) {
                    if (org.id === id) return org
                    if (org.children) {
                      const found = findOrg(org.children, id)
                      if (found) return found
                    }
                  }
                  return null
                }
                
                const org = findOrg(organizations, selectedOrg)
                if (!org) return <p className="text-gray-500">找不到組織資訊</p>
                
                return (
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">組織名稱</span>
                      <p className="text-sm text-gray-900">{org.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">類型</span>
                      <div className="mt-1">{getOrgTypeBadge(org.type)}</div>
                    </div>
                    {org.description && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">描述</span>
                        <p className="text-sm text-gray-900">{org.description}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-700">成員數量</span>
                      <p className="text-sm text-gray-900">{org.userCount} 位</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">層級</span>
                      <p className="text-sm text-gray-900">第 {org.level + 1} 層</p>
                    </div>
                    {org.isUserMember && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">我的角色</span>
                        <div className="mt-1">
                          <Badge variant="outline">{org.userRole}</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}