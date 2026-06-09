/**
 * Skeleton Loading Components
 * Provides consistent loading skeleton patterns across the application
 */

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  animate?: boolean
}

/**
 * Base skeleton component for loading states.
 * Uses pulse animation by default for better UX.
 */
export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div
      className={cn('rounded bg-gray-200', animate && 'animate-pulse', className)}
      role="presentation"
      aria-hidden="true"
    />
  )
}

/**
 * Skeleton for avatar/profile images
 */
export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }

  return <Skeleton className={cn('rounded-full', sizeClasses[size])} />
}

/**
 * Skeleton for text lines
 */
export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  )
}

/**
 * Skeleton for buttons
 */
export function SkeletonButton({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizeClasses = {
    sm: 'h-8 w-16',
    md: 'h-10 w-24',
    lg: 'h-12 w-32',
  }

  return <Skeleton className={cn(sizeClasses[size], className)} />
}

/**
 * Skeleton for input fields
 */
export function SkeletonInput({ className }: { className?: string }) {
  return <Skeleton className={cn('h-10 w-full', className)} />
}

/**
 * Skeleton for card components
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-white p-6', className)}>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <SkeletonAvatar />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <SkeletonText lines={3} />
      </div>
    </div>
  )
}

/**
 * Skeleton for table rows
 */
export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/**
 * Skeleton for a full table
 */
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Skeleton for metric/stat cards
 */
export function SkeletonMetricCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-white p-6', className)}>
      <div className="flex items-center space-x-4">
        <div className="rounded-lg bg-gray-100 p-3">
          <Skeleton className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton for metrics grid (common dashboard pattern)
 */
export function SkeletonMetricsGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonMetricCard key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton for list items
 */
export function SkeletonListItem({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center space-x-4 rounded-lg border p-4', className)}>
      <SkeletonAvatar />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
  )
}

/**
 * Skeleton for a list
 */
export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton for form fields
 */
export function SkeletonFormField({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-4 w-24" />
      <SkeletonInput />
    </div>
  )
}

/**
 * Skeleton for a complete form
 */
export function SkeletonForm({ fields = 4, columns = 2 }: { fields?: number; columns?: 1 | 2 }) {
  return (
    <div className={cn('space-y-4', columns === 2 && 'grid md:grid-cols-2 md:gap-6')}>
      {Array.from({ length: fields }).map((_, i) => (
        <SkeletonFormField key={i} />
      ))}
    </div>
  )
}
