/**
 * Error Boundary for Supplier Components
 * Extends the base ErrorBoundary with supplier-specific styling and messages
 */

'use client'

import React, { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorBoundary, withErrorBoundary } from '@/components/ErrorBoundary'

/**
 * Supplier-specific error boundary with preset configurations.
 * Uses the base ErrorBoundary with supplier-themed messaging.
 */
export function SupplierErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      showDetails={process.env.NODE_ENV === 'development'}
      onError={(error, errorInfo) => {
        console.error('Supplier component error:', { error, errorInfo })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Page-level error boundary for supplier pages.
 * Provides full-page error UI with navigation options.
 */
export function SupplierPageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      showDetails={process.env.NODE_ENV === 'development'}
      onError={(error, errorInfo) => {
        console.error('Supplier page error:', { error, errorInfo })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Form-specific error boundary with lighter styling.
 * Shows inline error message instead of full-page error.
 */
export function SupplierFormErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="rounded-lg border-2 border-dashed border-red-200 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-500" />
          <h3 className="mb-2 font-medium text-gray-900">
            Form loading failed
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            Form component encountered an error. Please reload or contact support.
          </p>
          <Button onClick={() => window.location.reload()} size="sm" variant="outline">
            Reload
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Higher-order component for wrapping supplier components with error boundary.
 * Re-exports from base ErrorBoundary for convenience.
 */
export { withErrorBoundary as withSupplierErrorBoundary }
