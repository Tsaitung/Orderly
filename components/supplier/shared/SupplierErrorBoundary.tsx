/**
 * Error Boundary for Supplier Components
 * Handles errors gracefully with user-friendly messaging and recovery options
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class SupplierErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substr(2, 9)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Supplier Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call onError prop if provided
    this.props.onError?.(error, errorInfo);

    // Log to monitoring service (e.g., Sentry)
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      // In production, log to monitoring service
      console.error('Error ID:', this.state.errorId, error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-lg w-full p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Oops! 出了點問題
              </h2>
              <p className="text-gray-600 mb-4">
                供應商頁面遇到了意外錯誤，我們正在努力修復。請稍後再試或聯繫客服。
              </p>
              {this.state.errorId && (
                <p className="text-sm text-gray-500 mb-4">
                  錯誤代碼: <code className="bg-gray-100 px-2 py-1 rounded">{this.state.errorId}</code>
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleRetry}
                className="flex items-center gap-2"
                variant="default"
              >
                <RefreshCw className="w-4 h-4" />
                重新載入
              </Button>
              <Button
                onClick={this.handleGoBack}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                返回上頁
              </Button>
            </div>

            {this.props.showDetails && this.state.error && process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  顯示技術詳情 (開發模式)
                </summary>
                <div className="mt-3 p-4 bg-gray-50 rounded-lg text-xs">
                  <div className="mb-2">
                    <strong>錯誤信息:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-red-600">
                      {this.state.error.message}
                    </pre>
                  </div>
                  <div className="mb-2">
                    <strong>錯誤堆疊:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-gray-600 max-h-32 overflow-y-auto">
                      {this.state.error.stack}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>組件堆疊:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-gray-600 max-h-32 overflow-y-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="mt-6 pt-6 border-t text-sm text-gray-500">
              如果問題持續發生，請聯繫技術支援：
              <br />
              <a href="mailto:support@orderly.com" className="text-primary-600 hover:underline">
                support@orderly.com
              </a> 或撥打 02-1234-5678
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withSupplierErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <SupplierErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </SupplierErrorBoundary>
  );

  WrappedComponent.displayName = `withSupplierErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Supplier-specific error boundary with preset configurations
export function SupplierPageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <SupplierErrorBoundary 
      showDetails={process.env.NODE_ENV === 'development'}
      onError={(error, errorInfo) => {
        // Log to monitoring service
        console.error('Supplier page error:', { error, errorInfo });
      }}
    >
      {children}
    </SupplierErrorBoundary>
  );
}

// Form-specific error boundary with lighter styling
export function SupplierFormErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <SupplierErrorBoundary
      fallback={
        <div className="p-6 text-center border-2 border-dashed border-red-200 rounded-lg">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900 mb-2">表單載入失敗</h3>
          <p className="text-sm text-gray-600 mb-4">
            表單組件遇到錯誤，請重新載入頁面或聯繫客服。
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            size="sm"
            variant="outline"
          >
            重新載入
          </Button>
        </div>
      }
    >
      {children}
    </SupplierErrorBoundary>
  );
}