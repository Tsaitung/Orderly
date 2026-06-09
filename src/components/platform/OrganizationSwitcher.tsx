'use client'

import React, { useState } from 'react'
import { ChevronDown, ChefHat, Truck, Building2, Check, Search, Eye, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth, Organization } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface OrganizationSwitcherProps {
  className?: string
  showLabel?: boolean
  variant?: 'dropdown' | 'compact' | 'full'
}

export function OrganizationSwitcher({
  className,
  showLabel = true,
  variant = 'dropdown',
}: OrganizationSwitcherProps) {
  const {
    user,
    organizations,
    currentOrganization,
    viewMode,
    canViewAsOrganization,
    switchToOrganizationView,
    exitViewMode,
  } = useAuth()

  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Only show for platform admin
  if (!canViewAsOrganization()) {
    return null
  }

  // Filter organizations based on search
  const filteredOrganizations = organizations.filter(
    org => org.name.toLowerCase().includes(searchQuery.toLowerCase()) && org.isActive
  )

  const handleOrganizationSelect = async (organizationId: string) => {
    const success = await switchToOrganizationView(organizationId)
    if (success) {
      setIsOpen(false)
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
    setIsOpen(false)
  }

  const getCurrentDisplayName = () => {
    if (viewMode.isViewingAs && currentOrganization) {
      return currentOrganization.name
    }
    return '檢視組織'
  }

  const getCurrentIcon = () => {
    if (viewMode.isViewingAs && currentOrganization) {
      return currentOrganization.type === 'restaurant' ? ChefHat : Truck
    }
    return Building2
  }

  // Compact variant for mobile/small spaces
  if (variant === 'compact') {
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
            <span className="hidden sm:inline">退出</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">檢視</span>
          </Button>
        )}

        {isOpen && !viewMode.isViewingAs && (
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="border-b border-gray-200 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  placeholder="搜尋組織..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-gray-200 py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredOrganizations.map(org => (
                <OrganizationItem
                  key={org.id}
                  organization={org}
                  onSelect={() => handleOrganizationSelect(org.id)}
                  isSelected={currentOrganization?.id === org.id}
                />
              ))}
              {filteredOrganizations.length === 0 && (
                <div className="p-4 text-center text-sm text-gray-500">沒有找到符合條件的組織</div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full dropdown variant
  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex min-w-48 items-center justify-between',
          viewMode.isViewingAs &&
            'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
        )}
      >
        <div className="flex items-center space-x-2">
          {React.createElement(getCurrentIcon(), {
            className: cn(
              'h-4 w-4',
              viewMode.isViewingAs &&
                currentOrganization?.type === 'restaurant' &&
                'text-amber-600',
              viewMode.isViewingAs && currentOrganization?.type === 'supplier' && 'text-blue-600'
            ),
          })}
          <div className="text-left">
            {showLabel && (
              <div className="text-xs text-gray-500">
                {viewMode.isViewingAs ? '正在檢視' : '組織切換'}
              </div>
            )}
            <div className="font-medium">{getCurrentDisplayName()}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {viewMode.isViewingAs && (
            <Badge variant="secondary" className="bg-orange-100 text-xs text-orange-800">
              檢視模式
            </Badge>
          )}
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180 transform')}
          />
        </div>
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Header */}
          <div className="border-b border-gray-200 p-4">
            <h3 className="mb-3 font-medium text-gray-900">
              {viewMode.isViewingAs ? '檢視模式管理' : '選擇要檢視的組織'}
            </h3>

            {viewMode.isViewingAs ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <div className="flex items-center space-x-3">
                    {React.createElement(getCurrentIcon(), {
                      className: cn(
                        'h-5 w-5',
                        currentOrganization?.type === 'restaurant' && 'text-amber-600',
                        currentOrganization?.type === 'supplier' && 'text-blue-600'
                      ),
                    })}
                    <div>
                      <p className="font-medium text-orange-800">{getCurrentDisplayName()}</p>
                      <p className="text-sm text-orange-600">
                        {currentOrganization?.type === 'restaurant' ? '餐廳介面' : '供應商介面'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExitView}
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    退出
                  </Button>
                </div>
                <div className="text-sm text-gray-600">切換到其他組織或退出檢視模式</div>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  placeholder="搜尋組織名稱..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-gray-200 py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Organization List */}
          <div className="max-h-72 overflow-y-auto">
            {!viewMode.isViewingAs && (
              <>
                {filteredOrganizations.map(org => (
                  <OrganizationItem
                    key={org.id}
                    organization={org}
                    onSelect={() => handleOrganizationSelect(org.id)}
                    isSelected={currentOrganization?.id === org.id}
                    showDetails
                  />
                ))}
                {filteredOrganizations.length === 0 && (
                  <div className="p-6 text-center text-gray-500">
                    <Building2 className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p>沒有找到符合條件的組織</p>
                    <p className="text-sm">請嘗試調整搜尋條件</p>
                  </div>
                )}
              </>
            )}

            {viewMode.isViewingAs && (
              <div className="p-4">
                <h4 className="mb-3 font-medium text-gray-900">切換到其他組織</h4>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {organizations
                    .filter(org => org.id !== currentOrganization?.id)
                    .map(org => (
                      <OrganizationItem
                        key={org.id}
                        organization={org}
                        onSelect={() => handleOrganizationSelect(org.id)}
                        isSelected={false}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface OrganizationItemProps {
  organization: Organization
  onSelect: () => void
  isSelected?: boolean
  showDetails?: boolean
}

function OrganizationItem({
  organization,
  onSelect,
  isSelected = false,
  showDetails = false,
}: OrganizationItemProps) {
  const Icon = organization.type === 'restaurant' ? ChefHat : Truck

  return (
    <div
      onClick={onSelect}
      className={cn(
        'flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-gray-50',
        isSelected && 'bg-blue-50'
      )}
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
              'h-4 w-4',
              organization.type === 'restaurant' ? 'text-amber-600' : 'text-blue-600'
            )}
          />
        </div>
        <div>
          <p className="font-medium text-gray-900">{organization.name}</p>
          {showDetails && (
            <p className="text-sm text-gray-500">
              {organization.type === 'restaurant' ? '餐廳' : '供應商'} • ID: {organization.id}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {isSelected && <Check className="h-4 w-4 text-blue-600" />}
        <Badge variant={organization.type === 'restaurant' ? 'default' : 'secondary'}>
          {organization.type === 'restaurant' ? '餐廳' : '供應商'}
        </Badge>
      </div>
    </div>
  )
}
