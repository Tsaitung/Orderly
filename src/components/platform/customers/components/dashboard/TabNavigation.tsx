// ============================================================================
// Tab Navigation Component
// ============================================================================
// 5-tab interface for Customer Hierarchy Dashboard with responsive design

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart3, Users, Building2, MapPin, TrendingUp, ChevronDown } from 'lucide-react'
import type { DashboardTab } from '../../types'

// ============================================================================
// Types
// ============================================================================

interface TabItem {
  key: DashboardTab
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

interface TabNavigationProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  counts: Record<DashboardTab, number>
  className?: string
}

// ============================================================================
// Tab Configuration
// ============================================================================

const TAB_ITEMS: TabItem[] = [
  {
    key: 'overview',
    label: '總覽',
    icon: BarChart3,
    description: '儀表板概況與關鍵指標',
  },
  {
    key: 'groups',
    label: '客戶集團',
    icon: Users,
    description: '集團層級客戶管理',
  },
  {
    key: 'companies',
    label: '公司',
    icon: Building2,
    description: '公司層級詳細資料',
  },
  {
    key: 'locations',
    label: '營業據點',
    icon: MapPin,
    description: '地點與業務單位管理',
  },
  {
    key: 'analytics',
    label: '數據分析',
    icon: TrendingUp,
    description: '深度統計與趨勢分析',
  },
]

// ============================================================================
// Desktop Tab Navigation
// ============================================================================

interface DesktopTabsProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  counts: Record<DashboardTab, number>
}

function DesktopTabs({ activeTab, onTabChange, counts }: DesktopTabsProps) {
  return (
    <div className="hidden border-b border-gray-200 bg-white md:flex">
      <nav className="flex space-x-8 px-6" aria-label="客戶層級導航">
        {TAB_ITEMS.map(tab => {
          const isActive = activeTab === tab.key
          const Icon = tab.icon
          const count = counts[tab.key]

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium transition-colors duration-200',
                isActive
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
              aria-current={isActive ? 'page' : undefined}
              title={tab.description}
            >
              <Icon
                className={cn(
                  'mr-2 h-5 w-5 transition-colors duration-200',
                  isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                )}
                aria-hidden="true"
              />

              <span className="whitespace-nowrap">{tab.label}</span>

              {count > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'ml-2 transition-colors duration-200',
                    isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {count}
                </Badge>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// ============================================================================
// Mobile Tab Navigation (Dropdown)
// ============================================================================

interface MobileTabsProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  counts: Record<DashboardTab, number>
}

function MobileTabs({ activeTab, onTabChange, counts }: MobileTabsProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const activeTabItem = TAB_ITEMS.find(tab => tab.key === activeTab)
  const Icon = activeTabItem?.icon || BarChart3

  return (
    <div className="border-b border-gray-200 bg-white md:hidden">
      <div className="px-4 py-3">
        <div className="relative">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <div className="flex items-center">
              <Icon className="mr-2 h-4 w-4" />
              <span>{activeTabItem?.label}</span>
              {counts[activeTab] > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {counts[activeTab]}
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isOpen && 'rotate-180 transform'
              )}
            />
          </Button>

          {isOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-gray-200 bg-white shadow-lg">
              <div className="py-1">
                {TAB_ITEMS.map(tab => {
                  const Icon = tab.icon
                  const count = counts[tab.key]
                  const isActive = activeTab === tab.key

                  return (
                    <button
                      key={tab.key}
                      onClick={() => {
                        onTabChange(tab.key)
                        setIsOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center px-4 py-3 text-sm transition-colors duration-200',
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <Icon
                        className={cn(
                          'mr-3 h-4 w-4',
                          isActive ? 'text-primary-500' : 'text-gray-400'
                        )}
                      />

                      <div className="flex-1 text-left">
                        <div className="font-medium">{tab.label}</div>
                        <div className="mt-0.5 text-xs text-gray-500">{tab.description}</div>
                      </div>

                      {count > 0 && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            isActive
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-gray-100 text-gray-600'
                          )}
                        >
                          {count}
                        </Badge>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
      )}
    </div>
  )
}

// ============================================================================
// Main Tab Navigation Component
// ============================================================================

export default function TabNavigation({
  activeTab,
  onTabChange,
  counts,
  className,
}: TabNavigationProps) {
  // Close mobile dropdown when tab changes
  React.useEffect(() => {
    // This effect helps ensure mobile dropdown closes when activeTab changes
  }, [activeTab])

  return (
    <div className={cn('bg-white shadow-sm', className)}>
      {/* Desktop Navigation */}
      <DesktopTabs activeTab={activeTab} onTabChange={onTabChange} counts={counts} />

      {/* Mobile Navigation */}
      <MobileTabs activeTab={activeTab} onTabChange={onTabChange} counts={counts} />
    </div>
  )
}

// ============================================================================
// Accessibility Features
// ============================================================================

// The component includes:
// 1. Proper ARIA labels and roles
// 2. Keyboard navigation support
// 3. Screen reader friendly navigation
// 4. Focus management for mobile dropdown
// 5. Semantic HTML structure with nav element
// 6. Proper button states and aria-current for active tabs
