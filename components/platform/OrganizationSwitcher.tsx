'use client'

import React, { useState } from 'react'
import { 
  ChevronDown, 
  ChefHat, 
  Truck, 
  Building2,
  Check,
  Search,
  Eye,
  ArrowLeft
} from 'lucide-react'
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
  variant = 'dropdown' 
}: OrganizationSwitcherProps) {
  const { 
    user, 
    organizations, 
    currentOrganization,
    viewMode, 
    canViewAsOrganization,
    switchToOrganizationView,
    exitViewMode 
  } = useAuth()
  
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Only show for platform admin
  if (!canViewAsOrganization()) {
    return null
  }

  // Filter organizations based on search
  const filteredOrganizations = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) && org.isActive
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
    return '選擇組織'
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
      <div className={cn("relative", className)}>
        {viewMode.isViewingAs ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExitView}
            className="flex items-center space-x-2 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
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
          <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜尋組織..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredOrganizations.map((org) => (
                <OrganizationItem
                  key={org.id}
                  organization={org}
                  onSelect={() => handleOrganizationSelect(org.id)}
                  isSelected={currentOrganization?.id === org.id}
                />
              ))}
              {filteredOrganizations.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  沒有找到符合條件的組織
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full dropdown variant
  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between min-w-48",
          viewMode.isViewingAs && "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
        )}
      >
        <div className="flex items-center space-x-2">
          {React.createElement(getCurrentIcon(), { 
            className: cn(
              "h-4 w-4",
              viewMode.isViewingAs && currentOrganization?.type === 'restaurant' && "text-amber-600",
              viewMode.isViewingAs && currentOrganization?.type === 'supplier' && "text-blue-600"
            )
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
            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
              檢視模式
            </Badge>
          )}
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "transform rotate-180"
          )} />
        </div>
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">
              {viewMode.isViewingAs ? '檢視模式管理' : '選擇要檢視的組織'}
            </h3>
            
            {viewMode.isViewingAs ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center space-x-3">
                    {React.createElement(getCurrentIcon(), { 
                      className: cn(
                        "h-5 w-5",
                        currentOrganization?.type === 'restaurant' && "text-amber-600",
                        currentOrganization?.type === 'supplier' && "text-blue-600"
                      )
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
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    退出
                  </Button>
                </div>
                <div className="text-sm text-gray-600">
                  切換到其他組織或退出檢視模式
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜尋組織名稱..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Organization List */}
          <div className="max-h-72 overflow-y-auto">
            {!viewMode.isViewingAs && (
              <>
                {filteredOrganizations.map((org) => (
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
                    <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>沒有找到符合條件的組織</p>
                    <p className="text-sm">請嘗試調整搜尋條件</p>
                  </div>
                )}
              </>
            )}

            {viewMode.isViewingAs && (
              <div className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">切換到其他組織</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {organizations
                    .filter(org => org.id !== currentOrganization?.id)
                    .map((org) => (
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
  showDetails = false 
}: OrganizationItemProps) {
  const Icon = organization.type === 'restaurant' ? ChefHat : Truck
  
  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors",
        isSelected && "bg-blue-50"
      )}
    >
      <div className="flex items-center space-x-3">
        <div className={cn(
          "p-2 rounded-full",
          organization.type === 'restaurant' ? 'bg-amber-100' : 'bg-blue-100'
        )}>
          <Icon className={cn(
            "h-4 w-4",
            organization.type === 'restaurant' ? 'text-amber-600' : 'text-blue-600'
          )} />
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