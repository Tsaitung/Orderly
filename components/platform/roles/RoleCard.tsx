'use client'

import React from 'react'
import Link from 'next/link'
import { 
  Shield, 
  Users, 
  Settings, 
  Building2, 
  Eye, 
  Edit, 
  Copy, 
  Trash2, 
  MoreHorizontal, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Lock,
  Unlock,
  Star,
  Calendar,
  Activity,
  ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
  lastUsedAt?: string
  usageFrequency?: 'high' | 'medium' | 'low'
  rating?: number
}

interface RoleCardProps {
  role: Role
  variant?: 'default' | 'compact' | 'detailed' | 'selectable'
  showActions?: boolean
  showStats?: boolean
  showDescription?: boolean
  isSelected?: boolean
  onSelect?: (roleId: string) => void
  onEdit?: (roleId: string) => void
  onCopy?: (roleId: string) => void
  onDelete?: (roleId: string) => void
  onToggleStatus?: (roleId: string) => void
  className?: string
}

export function RoleCard({
  role,
  variant = 'default',
  showActions = true,
  showStats = true,
  showDescription = true,
  isSelected = false,
  onSelect,
  onEdit,
  onCopy,
  onDelete,
  onToggleStatus,
  className = ''
}: RoleCardProps) {
  const [showDropdown, setShowDropdown] = React.useState(false)

  const getTypeDisplay = (type: string) => {
    const types = {
      platform: { name: '平台', color: 'bg-blue-100 text-blue-800', icon: Settings },
      restaurant: { name: '餐廳', color: 'bg-orange-100 text-orange-800', icon: Building2 },
      supplier: { name: '供應商', color: 'bg-green-100 text-green-800', icon: Users }
    }
    return types[type as keyof typeof types] || { name: type, color: 'bg-gray-100 text-gray-800', icon: Shield }
  }

  const getUsageFrequencyDisplay = (frequency?: string) => {
    const displays = {
      high: { text: '高頻', color: 'text-green-600', icon: TrendingUp },
      medium: { text: '中頻', color: 'text-yellow-600', icon: Activity },
      low: { text: '低頻', color: 'text-red-600', icon: TrendingDown }
    }
    return frequency ? displays[frequency as keyof typeof displays] || displays.medium : null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW')
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW')
  }

  const getRatingStars = (rating?: number) => {
    if (!rating) return null
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ))
  }

  const typeDisplay = getTypeDisplay(role.type)
  const TypeIcon = typeDisplay.icon
  const usageDisplay = getUsageFrequencyDisplay(role.usageFrequency)
  const UsageIcon = usageDisplay?.icon

  const handleCardClick = () => {
    if (variant === 'selectable' && onSelect) {
      onSelect(role.id)
    }
  }

  const cardClasses = `
    ${className}
    ${variant === 'selectable' ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
    ${isSelected ? 'ring-2 ring-primary-500 border-primary-300' : ''}
    ${variant === 'compact' ? 'p-3' : ''}
  `

  // Compact 變體
  if (variant === 'compact') {
    return (
      <Card className={cardClasses} onClick={handleCardClick}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Shield className="h-4 w-4 text-primary-700" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">{role.name}</span>
                  <Badge className={`${typeDisplay.color} text-xs`}>
                    {typeDisplay.name}
                  </Badge>
                  {role.isSystemRole && (
                    <Badge variant="outline" className="text-xs">
                      <Lock className="h-2 w-2 mr-1" />
                      系統
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  <span>{role.userCount} 使用者</span>
                  <span>{role.permissionCount} 權限</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={role.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {role.isActive ? <CheckCircle2 className="h-2 w-2 mr-1" /> : <XCircle className="h-2 w-2 mr-1" />}
                {role.isActive ? '啟用' : '停用'}
              </Badge>
              {showActions && (
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 詳細變體
  if (variant === 'detailed') {
    return (
      <Card className={cardClasses} onClick={handleCardClick}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-3 bg-primary-100 rounded-lg">
                <TypeIcon className="h-6 w-6 text-primary-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                  <Badge className={typeDisplay.color}>
                    <TypeIcon className="h-3 w-3 mr-1" />
                    {typeDisplay.name}
                  </Badge>
                  {role.isSystemRole && (
                    <Badge variant="outline" className="bg-gray-100 text-gray-800">
                      <Lock className="h-3 w-3 mr-1" />
                      系統角色
                    </Badge>
                  )}
                </div>
                {showDescription && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{role.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {role.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={role.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {role.isActive ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                {role.isActive ? '啟用' : '停用'}
              </Badge>
              {role.rating && (
                <div className="flex items-center space-x-1">
                  {getRatingStars(role.rating)}
                  <span className="text-xs text-gray-500">({role.rating})</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 統計資訊 */}
          {showStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-primary-600">{role.userCount}</div>
                <div className="text-xs text-gray-500">使用者</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{role.permissionCount}</div>
                <div className="text-xs text-gray-500">權限</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{role.priority}</div>
                <div className="text-xs text-gray-500">優先級</div>
              </div>
              <div className="text-center">
                {usageDisplay && UsageIcon && (
                  <>
                    <div className={`text-lg font-bold ${usageDisplay.color}`}>
                      <UsageIcon className="h-5 w-5 mx-auto" />
                    </div>
                    <div className="text-xs text-gray-500">{usageDisplay.text}</div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* 時間資訊 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <Calendar className="h-3 w-3" />
              <span>建立: {formatDate(role.createdAt)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3" />
              <span>更新: {formatDate(role.updatedAt)}</span>
            </div>
            {role.lastUsedAt && (
              <div className="flex items-center space-x-2">
                <Activity className="h-3 w-3" />
                <span>最後使用: {formatDate(role.lastUsedAt)}</span>
              </div>
            )}
            {role.createdBy && (
              <div className="flex items-center space-x-2">
                <Users className="h-3 w-3" />
                <span>建立者: {role.createdBy}</span>
              </div>
            )}
          </div>
          
          {/* 操作按鈕 */}
          {showActions && (
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex space-x-2">
                <Link href={`/platform/roles/${role.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    檢視
                  </Button>
                </Link>
                {!role.isSystemRole && (
                  <Button variant="outline" size="sm" onClick={() => onEdit?.(role.id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    編輯
                  </Button>
                )}
              </div>
              
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      <button
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          onCopy?.(role.id)
                          setShowDropdown(false)
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        複製角色
                      </button>
                      {!role.isSystemRole && (
                        <>
                          <button
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => {
                              onToggleStatus?.(role.id)
                              setShowDropdown(false)
                            }}
                          >
                            {role.isActive ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                停用角色
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                啟用角色
                              </>
                            )}
                          </button>
                          <button
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            onClick={() => {
                              onDelete?.(role.id)
                              setShowDropdown(false)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            刪除角色
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // 預設變體
  return (
    <Card className={cardClasses} onClick={handleCardClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <TypeIcon className="h-5 w-5 text-primary-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <CardTitle className="text-base">{role.name}</CardTitle>
                <Badge className={`${typeDisplay.color} text-xs`}>
                  {typeDisplay.name}
                </Badge>
                {role.isSystemRole && (
                  <Badge variant="outline" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    系統
                  </Badge>
                )}
              </div>
              {showDescription && (
                <p className="text-sm text-gray-600 line-clamp-2">{role.description}</p>
              )}
            </div>
          </div>
          <Badge className={role.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
            {role.isActive ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
            {role.isActive ? '啟用' : '停用'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* 標籤 */}
        <div className="flex flex-wrap gap-1">
          {role.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {role.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{role.tags.length - 3}
            </Badge>
          )}
        </div>
        
        {/* 統計 */}
        {showStats && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{role.userCount}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className="h-4 w-4" />
              <span>{role.permissionCount}</span>
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(role.updatedAt)}
            </div>
          </div>
        )}
        
        {/* 操作按鈕 */}
        {showActions && (
          <div className="flex items-center justify-between pt-2 border-t">
            <Link href={`/platform/roles/${role.id}`}>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                檢視
              </Button>
            </Link>
            
            <div className="flex space-x-1">
              {!role.isSystemRole && (
                <Button variant="ghost" size="sm" onClick={() => onEdit?.(role.id)}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onCopy?.(role.id)}>
                <Copy className="h-4 w-4" />
              </Button>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      {!role.isSystemRole && (
                        <>
                          <button
                            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => {
                              onToggleStatus?.(role.id)
                              setShowDropdown(false)
                            }}
                          >
                            {role.isActive ? '停用' : '啟用'}
                          </button>
                          <button
                            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            onClick={() => {
                              onDelete?.(role.id)
                              setShowDropdown(false)
                            }}
                          >
                            刪除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}