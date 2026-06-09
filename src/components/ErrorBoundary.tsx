'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId: string
}

// Type-safe error logging
interface ErrorReport {
  timestamp: string
  userAgent: string
  url: string
  userId?: string
  errorMessage: string
  errorStack?: string
  componentStack: string
  errorId: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      hasError: true,
      error,
      errorId,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId

    // Log error securely
    this.logError(error, errorInfo, errorId)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    this.setState({
      error,
      errorInfo,
    })
  }

  private logError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    try {
      const errorReport: ErrorReport = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getUserId(),
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId,
      }

      // Log to console in development (safe process.env check)
      const nodeEnv =
        typeof process !== 'undefined' && process.env ? process.env.NODE_ENV : 'development'

      if (nodeEnv === 'development') {
        console.group(`🚨 Error Boundary Caught Error (${errorId})`)
        console.error('Error:', error)
        console.error('Error Info:', errorInfo)
        console.error('Full Report:', errorReport)
        console.groupEnd()
      }

      // Send to error reporting service in production
      if (nodeEnv === 'production') {
        this.sendErrorReport(errorReport)
      }
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError)
    }
  }

  private getUserId = (): string | undefined => {
    try {
      // Safely get user ID from secure storage
      const userInfo = localStorage.getItem('user_info')
      if (userInfo) {
        const parsed = JSON.parse(userInfo)
        return parsed?.id
      }
    } catch {
      // Silently fail if user info not available
    }
    return undefined
  }

  private sendErrorReport = async (errorReport: ErrorReport) => {
    try {
      await fetch('/api/bff/v2/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      })
    } catch (reportingError) {
      // Don't throw errors from error reporting
      console.warn('Failed to send error report:', reportingError)
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: '',
    })
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // 如果有自定義 fallback，使用它；否則使用默認
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            {/* Error Icon */}
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="mb-2 text-center text-xl font-semibold text-gray-900">系統發生錯誤</h1>

            {/* Error Description */}
            <p className="mb-6 text-center text-gray-600">
              很抱歉，系統遇到了一個意外的錯誤。我們已經記錄了這個問題並會盡快修復。
            </p>

            {/* Error ID */}
            <div className="mb-6 rounded-md bg-gray-50 p-3">
              <p className="text-center text-sm text-gray-500">
                錯誤 ID: <code className="font-mono text-gray-700">{this.state.errorId}</code>
              </p>
            </div>

            {/* Error Details (Development Only) */}
            {this.props.showDetails &&
              (typeof process === 'undefined' ||
                !process.env ||
                process.env.NODE_ENV === 'development') &&
              this.state.error && (
                <details className="mb-6 rounded-md bg-red-50 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-red-700">
                    技術詳情 (開發模式)
                  </summary>
                  <div className="mt-2 font-mono text-xs text-red-600">
                    <p>
                      <strong>錯誤訊息:</strong> {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <pre className="mt-2 whitespace-pre-wrap">{this.state.error.stack}</pre>
                    )}
                  </div>
                </details>
              )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={this.handleRetry}
                className="w-full"
                variant="solid"
                colorScheme="primary"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                重試
              </Button>

              <div className="flex space-x-3">
                <Button
                  onClick={this.handleGoHome}
                  className="flex-1"
                  variant="outline"
                  colorScheme="gray"
                >
                  <Home className="mr-2 h-4 w-4" />
                  返回首頁
                </Button>

                <Button
                  onClick={this.handleReload}
                  className="flex-1"
                  variant="outline"
                  colorScheme="gray"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重新載入
                </Button>
              </div>
            </div>

            {/* Support Info */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                如果問題持續發生，請聯繫{' '}
                <a
                  href="mailto:support@orderly.com"
                  className="text-primary-600 hover:text-primary-700"
                >
                  技術支援
                </a>{' '}
                並提供上述錯誤 ID
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`

  return ComponentWithErrorBoundary
}

// Hook for triggering errors in functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: { [key: string]: any }) => {
    // Trigger error boundary by throwing
    throw error
  }
}
