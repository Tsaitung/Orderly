/**
 * Loading states and skeleton loaders for Supplier components
 * Provides consistent loading UX across supplier pages
 */

'use client'

import React from 'react'
import { Loader2, Clock, TrendingUp, Users, Package } from 'lucide-react'
import { Card } from '@/components/ui/card'

// ============================================================================
// Basic Loading Components
// ============================================================================

interface SupplierSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
}

export function SupplierSpinner({ size = 'md', message, className = '' }: SupplierSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary-600`} />
      {message && (
        <p className={`${textSizeClasses[size]} animate-pulse text-gray-600`}>{message}</p>
      )}
    </div>
  )
}

// ============================================================================
// Skeleton Components
// ============================================================================

interface SkeletonProps {
  className?: string
  animate?: boolean
}

function Skeleton({ className = '', animate = true }: SkeletonProps) {
  return (
    <div
      className={`rounded bg-gray-200 ${animate ? 'animate-pulse' : ''} ${className}`}
      role="presentation"
      aria-hidden="true"
    />
  )
}

// ============================================================================
// Profile Loading States
// ============================================================================

export function SupplierProfileSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-18" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ============================================================================
// Dashboard Loading States
// ============================================================================

export function SupplierDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center space-x-4">
              <div className="rounded-lg bg-gray-100 p-3">
                <Skeleton className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </Card>

        {/* Recent Orders */}
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-28" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 rounded border p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// Customer List Loading States
// ============================================================================

export function SupplierCustomerListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <Skeleton className="h-10 w-full md:w-64" />
          <Skeleton className="h-10 w-full md:w-48" />
          <Skeleton className="h-10 w-full md:w-32" />
          <div className="ml-auto flex space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </Card>

      {/* Customer Cards */}
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="space-y-1 text-right">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="space-y-1 text-right">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  )
}

// ============================================================================
// Onboarding Loading States
// ============================================================================

export function SupplierOnboardingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
          <div className="flex justify-between">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center space-y-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Current Step */}
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-full" />

          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </Card>
    </div>
  )
}

// ============================================================================
// Form Loading States
// ============================================================================

export function SupplierFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 border-t pt-6">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

// ============================================================================
// Page-Level Loading States
// ============================================================================

interface SupplierPageLoadingProps {
  title?: string
  subtitle?: string
  type?: 'dashboard' | 'profile' | 'customers' | 'onboarding' | 'form'
}

export function SupplierPageLoading({
  title = '載入中...',
  subtitle = '正在取得供應商資料',
  type = 'dashboard',
}: SupplierPageLoadingProps) {
  const renderContent = () => {
    switch (type) {
      case 'profile':
        return <SupplierProfileSkeleton />
      case 'customers':
        return <SupplierCustomerListSkeleton />
      case 'onboarding':
        return <SupplierOnboardingSkeleton />
      case 'form':
        return <SupplierFormSkeleton />
      default:
        return <SupplierDashboardSkeleton />
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-8 w-48" />
            <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
          </div>
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  )
}

// ============================================================================
// Inline Loading States
// ============================================================================

export function SupplierInlineLoading({ message = '處理中...' }: { message?: string }) {
  return (
    <div className="flex items-center space-x-2 text-gray-600">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  )
}

export function SupplierButtonLoading({
  children,
  loading = false,
  loadingText = '處理中...',
  ...props
}: {
  children: React.ReactNode
  loading?: boolean
  loadingText?: string
  [key: string]: any
}) {
  return (
    <button {...props} disabled={loading || props.disabled}>
      {loading ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
}

// ============================================================================
// Metric Loading States
// ============================================================================

export function SupplierMetricSkeleton({ icon: Icon }: { icon?: React.ComponentType<any> }) {
  return (
    <Card className="p-6">
      <div className="flex items-center space-x-4">
        <div className="rounded-lg bg-gray-100 p-3">
          {Icon ? <Icon className="h-6 w-6 text-gray-400" /> : <Skeleton className="h-6 w-6" />}
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </Card>
  )
}

export function SupplierMetricsGridSkeleton() {
  const metricIcons = [Clock, TrendingUp, Users, Package]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metricIcons.map((Icon, i) => (
        <SupplierMetricSkeleton key={i} icon={Icon} />
      ))}
    </div>
  )
}
