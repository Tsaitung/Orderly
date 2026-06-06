/**
 * Page Header Component
 * Provides consistent page header styling across dashboard pages
 */

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  /** Page title */
  title: string
  /** Page description/subtitle */
  description?: string
  /** Optional badge or tag to display next to title */
  badge?: ReactNode
  /** Optional action buttons to display on the right */
  actions?: ReactNode
  /** Additional className for the container */
  className?: string
  /** Use smaller text sizes (for nested pages) */
  size?: 'default' | 'small'
}

/**
 * Standard page header with title, description, and optional actions.
 * Use this for all dashboard pages to maintain consistency.
 */
export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
  size = 'default',
}: PageHeaderProps) {
  const titleClasses = {
    default: 'text-2xl font-bold text-gray-900',
    small: 'text-xl font-semibold text-gray-900',
  }

  const descriptionClasses = {
    default: 'mt-1 text-gray-600',
    small: 'mt-0.5 text-sm text-gray-600',
  }

  return (
    <div className={cn('flex items-start justify-between', className)}>
      <div>
        <div className="flex items-center gap-3">
          <h1 className={titleClasses[size]}>{title}</h1>
          {badge}
        </div>
        {description && <p className={descriptionClasses[size]}>{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

interface PageSectionHeaderProps {
  /** Section title */
  title: string
  /** Section description */
  description?: string
  /** Optional action buttons */
  actions?: ReactNode
  /** Additional className */
  className?: string
}

/**
 * Section header for use within pages.
 * Smaller than PageHeader, used for subsections.
 */
export function PageSectionHeader({
  title,
  description,
  actions,
  className,
}: PageSectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
