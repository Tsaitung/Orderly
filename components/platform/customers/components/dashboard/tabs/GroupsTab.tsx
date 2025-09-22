// ============================================================================
// Groups Tab Component
// ============================================================================
// Enhanced group cards view with activity metrics and filtering

'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Users,
  Building2,
  MapPin,
  ChevronRight,
  MoreVertical,
  Star,
  TrendingUp,
  Calendar,
  DollarSign,
} from 'lucide-react'

import { ActivityBadge, ActivityDot } from '../shared/ActivityIndicator'

import type {
  HierarchyNode,
  SearchResult,
  FilterOptions,
  SortOptions,
  ActivityMetrics,
  CustomerMetrics,
} from '../../../types'

// ============================================================================
// Types
// ============================================================================

interface GroupsTabProps {
  tree: HierarchyNode[]
  searchResults: SearchResult[]
  filters: FilterOptions
  sortOptions: SortOptions
  searchQuery: string
}

interface EnhancedGroupNode extends HierarchyNode {
  activity?: ActivityMetrics
  metrics?: CustomerMetrics
  isTopPerformer?: boolean
}

// ============================================================================
// Mock Data Generation
// ============================================================================

const generateMockActivityData = (node: HierarchyNode): ActivityMetrics => {
  // Generate realistic activity data based on node name/id
  const hash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const baseScore = 40 + (hash % 50)

  const level: ActivityMetrics['level'] =
    baseScore >= 80 ? 'active' : baseScore >= 60 ? 'medium' : baseScore >= 40 ? 'low' : 'dormant'

  const orderFrequency = Math.max(1, Math.round(baseScore / 10))
  const monthlyRevenue = baseScore * 1000 + (hash % 100000)

  return {
    score: baseScore,
    level,
    lastOrderDate: new Date(Date.now() - (hash % 30) * 24 * 60 * 60 * 1000),
    orderFrequency,
    monthlyRevenue,
    trend: hash % 3 === 0 ? 'up' : hash % 3 === 1 ? 'down' : 'stable',
    trendScore: -10 + (hash % 30),
  }
}

const generateMockMetrics = (node: HierarchyNode): CustomerMetrics => {
  const hash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

  return {
    totalOrders: 20 + (hash % 200),
    monthlyRevenue: 100000 + (hash % 500000),
    avgOrderValue: 1000 + (hash % 5000),
    lastOrderDate: new Date(Date.now() - (hash % 7) * 24 * 60 * 60 * 1000),
    orderFrequency: 5 + (hash % 20),
    deliverySuccessRate: 85 + (hash % 15),
    avgDeliveryTime: 2 + (hash % 6),
  }
}

// ============================================================================
// Group Card Component
// ============================================================================

interface GroupCardProps {
  group: EnhancedGroupNode
  onSelect: (group: HierarchyNode) => void
  isSelected?: boolean
}

function GroupCard({ group, onSelect, isSelected }: GroupCardProps) {
  const activity = group.activity!
  const metrics = group.metrics!

  return (
    <Card
      variant="filled"
      colorScheme="white"
      interactive
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-lg',
        isSelected && 'shadow-md ring-2 ring-primary-500'
      )}
      onClick={() => onSelect(group)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-500" />
              <Badge variant="secondary" className="text-xs">
                客戶集團
              </Badge>
              {group.isTopPerformer && (
                <Badge className="bg-yellow-100 text-xs text-yellow-800">
                  <Star className="mr-1 h-3 w-3" />
                  優秀表現
                </Badge>
              )}
            </div>

            <CardTitle className="mb-1 text-lg font-semibold text-gray-900">{group.name}</CardTitle>

            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center">
                <Building2 className="mr-1 h-4 w-4" />
                {group.childrenCount} 公司
              </span>
              <span className="flex items-center">
                <MapPin className="mr-1 h-4 w-4" />
                {/* Mock location count */}
                {Math.round(group.childrenCount * 2.5)} 據點
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <ActivityDot level={activity.level} size="md" />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Activity Status */}
        <div className="mb-4 flex items-center justify-between">
          <ActivityBadge level={activity.level} score={activity.score} size="sm" />

          <div className="flex items-center space-x-1 text-sm">
            {activity.trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : activity.trend === 'down' ? (
              <TrendingUp className="h-4 w-4 rotate-180 text-red-500" />
            ) : null}
            <span
              className={cn(
                'font-medium',
                activity.trend === 'up'
                  ? 'text-green-600'
                  : activity.trend === 'down'
                    ? 'text-red-600'
                    : 'text-gray-500'
              )}
            >
              {activity.trend !== 'stable' && (
                <>
                  {activity.trend === 'up' ? '+' : ''}
                  {activity.trendScore.toFixed(1)}%
                </>
              )}
            </span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 text-xs text-gray-500">月營收</div>
            <div className="text-lg font-bold text-gray-900">
              NT$ {(metrics.monthlyRevenue / 1000).toFixed(0)}K
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-gray-500">月訂單</div>
            <div className="text-lg font-bold text-gray-900">{activity.orderFrequency}</div>
          </div>

          <div>
            <div className="mb-1 text-xs text-gray-500">平均訂單</div>
            <div className="text-sm font-medium text-gray-700">
              NT$ {metrics.avgOrderValue.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-gray-500">配送成功率</div>
            <div className="text-sm font-medium text-gray-700">{metrics.deliverySuccessRate}%</div>
          </div>
        </div>

        {/* Last Activity */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm text-gray-500">
          <div className="flex items-center">
            <Calendar className="mr-1 h-4 w-4" />
            最後訂單:{' '}
            {activity.lastOrderDate
              ? new Date(activity.lastOrderDate).toLocaleDateString('zh-TW')
              : '從未訂購'}
          </div>

          <ChevronRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Groups Grid Component
// ============================================================================

interface GroupsGridProps {
  groups: EnhancedGroupNode[]
  onGroupSelect: (group: HierarchyNode) => void
  selectedGroupId?: string
}

function GroupsGrid({ groups, onGroupSelect, selectedGroupId }: GroupsGridProps) {
  if (groups.length === 0) {
    return (
      <Card className="py-12 text-center">
        <CardContent>
          <Users className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">沒有找到客戶集團</h3>
          <p className="text-gray-500">請調整篩選條件或搜尋關鍵字</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {groups.map(group => (
        <GroupCard
          key={group.id}
          group={group}
          onSelect={onGroupSelect}
          isSelected={group.id === selectedGroupId}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Main Groups Tab Component
// ============================================================================

export default function GroupsTab({
  tree,
  searchResults,
  filters,
  sortOptions,
  searchQuery,
}: GroupsTabProps) {
  // Process groups data with mock activity and metrics
  const enhancedGroups = useMemo<EnhancedGroupNode[]>(() => {
    const groups =
      searchQuery && searchResults.length > 0
        ? searchResults.map(result => result.entity).filter(node => node.type === 'group')
        : tree.filter(node => node.type === 'group')

    return groups.map((group, index) => ({
      ...group,
      activity: generateMockActivityData(group),
      metrics: generateMockMetrics(group),
      isTopPerformer: index < 3, // Mark first 3 as top performers
    }))
  }, [tree, searchResults, searchQuery])

  // Apply filters and sorting
  const filteredAndSortedGroups = useMemo(() => {
    let result = enhancedGroups

    // Apply activity level filters
    if (filters.activityLevels.length < 4) {
      result = result.filter(
        group => group.activity && filters.activityLevels.includes(group.activity.level)
      )
    }

    // Apply revenue filters
    if (filters.minRevenue !== undefined) {
      result = result.filter(
        group => group.metrics && group.metrics.monthlyRevenue >= filters.minRevenue!
      )
    }
    if (filters.maxRevenue !== undefined) {
      result = result.filter(
        group => group.metrics && group.metrics.monthlyRevenue <= filters.maxRevenue!
      )
    }

    // Apply include inactive filter
    if (!filters.includeInactive) {
      result = result.filter(group => group.isActive)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      switch (sortOptions.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'zh-TW')
          break
        case 'revenue':
          comparison = (a.metrics?.monthlyRevenue || 0) - (b.metrics?.monthlyRevenue || 0)
          break
        case 'orders':
          comparison = (a.activity?.orderFrequency || 0) - (b.activity?.orderFrequency || 0)
          break
        case 'activity':
          comparison = (a.activity?.score || 0) - (b.activity?.score || 0)
          break
        case 'lastOrder':
          const aDate = a.activity?.lastOrderDate?.getTime() || 0
          const bDate = b.activity?.lastOrderDate?.getTime() || 0
          comparison = aDate - bDate
          break
        case 'createdAt':
          const aCreated = a.createdAt?.getTime() || 0
          const bCreated = b.createdAt?.getTime() || 0
          comparison = aCreated - bCreated
          break
      }

      return sortOptions.direction === 'desc' ? -comparison : comparison
    })

    return result
  }, [enhancedGroups, filters, sortOptions])

  const handleGroupSelect = (group: HierarchyNode) => {
    console.log('Selected group:', group)
    // In real implementation, this would navigate to group details or update selection state
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card variant="filled" colorScheme="primary">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary-900">
              {filteredAndSortedGroups.length}
            </div>
            <div className="text-sm text-primary-700">顯示集團</div>
          </CardContent>
        </Card>

        <Card variant="filled" colorScheme="green">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-900">
              {filteredAndSortedGroups.filter(g => g.activity?.level === 'active').length}
            </div>
            <div className="text-sm text-green-700">活躍集團</div>
          </CardContent>
        </Card>

        <Card variant="filled" colorScheme="gray">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {filteredAndSortedGroups.reduce((sum, g) => sum + g.childrenCount, 0)}
            </div>
            <div className="text-sm text-gray-700">總公司數</div>
          </CardContent>
        </Card>

        <Card variant="filled" colorScheme="platform">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-platform-900">
              {Math.round(
                filteredAndSortedGroups.reduce((sum, g) => sum + (g.activity?.score || 0), 0) /
                  Math.max(1, filteredAndSortedGroups.length)
              )}
            </div>
            <div className="text-sm text-platform-700">平均活躍度</div>
          </CardContent>
        </Card>
      </div>

      {/* Groups Grid */}
      <GroupsGrid groups={filteredAndSortedGroups} onGroupSelect={handleGroupSelect} />
    </div>
  )
}
