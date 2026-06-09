'use client'

import React, { useState } from 'react'
import { Eye, EyeOff, ChefHat, Truck, Building2, ArrowLeft, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth, Organization } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface ViewSwitcherProps {
  className?: string
  compact?: boolean
}

export function ViewSwitcher({ className, compact = false }: ViewSwitcherProps) {
  const {
    user,
    organizations,
    viewMode,
    canViewAsOrganization,
    switchToOrganizationView,
    exitViewMode,
  } = useAuth()

  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'restaurant' | 'supplier'>('all')

  // Only show for platform admin
  if (!canViewAsOrganization()) {
    return null
  }

  // Filter organizations based on search and type
  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || org.type === filterType
    return matchesSearch && matchesType && org.isActive
  })

  const handleOrganizationSelect = async (organizationId: string) => {
    const success = await switchToOrganizationView(organizationId)
    if (success) {
      const org = organizations.find(o => o.id === organizationId)
      if (org) {
        // Navigate to the appropriate dashboard
        const targetPath = org.type === 'restaurant' ? '/restaurant' : '/supplier'
        window.location.href = targetPath
      }
    }
  }

  const handleExitView = () => {
    exitViewMode()
  }

  // Compact view for header/sidebar
  if (compact) {
    return (
      <div className={cn('relative', className)}>
        {viewMode.isViewingAs ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExitView}
            className="flex items-center space-x-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>退出檢視模式</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>組織檢視</span>
          </Button>
        )}

        {isExpanded && !viewMode.isViewingAs && (
          <Card className="absolute left-0 top-full z-50 mt-2 max-h-96 w-80 overflow-y-auto shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">選擇組織檢視</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-6 w-6 p-0"
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜尋組織..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-gray-200 py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as any)}
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部</option>
                  <option value="restaurant">餐廳</option>
                  <option value="supplier">供應商</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {filteredOrganizations.map(org => (
                  <OrganizationItem
                    key={org.id}
                    organization={org}
                    onSelect={() => handleOrganizationSelect(org.id)}
                  />
                ))}
                {filteredOrganizations.length === 0 && (
                  <div className="py-4 text-center text-sm text-gray-500">
                    沒有找到符合條件的組織
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Full view for platform dashboard
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Eye className="h-5 w-5" />
          <span>組織檢視切換</span>
        </CardTitle>
        <p className="text-sm text-gray-600">以平台管理員身份檢視任何餐廳或供應商的介面</p>
      </CardHeader>
      <CardContent>
        {viewMode.isViewingAs ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-orange-100 p-2">
                  <Eye className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-orange-800">
                    目前正在檢視:{' '}
                    {organizations.find(o => o.id === viewMode.targetOrganizationId)?.name}
                  </p>
                  <p className="text-sm text-orange-600">
                    檢視模式: {viewMode.targetRole === 'restaurant' ? '餐廳介面' : '供應商介面'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleExitView}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                退出檢視
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  placeholder="搜尋組織名稱..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-gray-200 py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className="rounded-md border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">所有類型</option>
                <option value="restaurant">餐廳</option>
                <option value="supplier">供應商</option>
              </select>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{organizations.length}</div>
                <div className="text-sm text-gray-500">總組織數</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {organizations.filter(o => o.type === 'restaurant').length}
                </div>
                <div className="text-sm text-gray-500">餐廳</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {organizations.filter(o => o.type === 'supplier').length}
                </div>
                <div className="text-sm text-gray-500">供應商</div>
              </div>
            </div>

            {/* Organization List */}
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {filteredOrganizations.map(org => (
                <OrganizationItem
                  key={org.id}
                  organization={org}
                  onSelect={() => handleOrganizationSelect(org.id)}
                  showDetails
                />
              ))}
              {filteredOrganizations.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <Building2 className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p>沒有找到符合條件的組織</p>
                  <p className="text-sm">請嘗試調整搜尋條件</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface OrganizationItemProps {
  organization: Organization
  onSelect: () => void
  showDetails?: boolean
}

function OrganizationItem({ organization, onSelect, showDetails = false }: OrganizationItemProps) {
  const iconClass = 'h-4 w-4'
  const Icon = organization.type === 'restaurant' ? ChefHat : Truck
  const typeColor = organization.type === 'restaurant' ? 'amber' : 'blue'

  return (
    <div
      onClick={onSelect}
      className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
    >
      <div className="flex items-center space-x-3">
        <div
          className={cn(
            'rounded-full p-2',
            organization.type === 'restaurant' ? 'bg-amber-100' : 'bg-blue-100'
          )}
        >
          <Icon
            className={cn(
              iconClass,
              organization.type === 'restaurant' ? 'text-amber-600' : 'text-blue-600'
            )}
          />
        </div>
        <div>
          <p className="font-medium text-gray-900">{organization.name}</p>
          {showDetails && <p className="text-sm text-gray-500">ID: {organization.id}</p>}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant={organization.type === 'restaurant' ? 'default' : 'secondary'}>
          {organization.type === 'restaurant' ? '餐廳' : '供應商'}
        </Badge>
        <Badge variant={organization.isActive ? 'default' : 'secondary'}>
          {organization.isActive ? '活躍' : '停用'}
        </Badge>
      </div>
    </div>
  )
}
