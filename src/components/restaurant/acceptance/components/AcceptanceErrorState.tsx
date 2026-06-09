'use client'

/**
 * AcceptanceErrorState Component
 * 驗收管理錯誤狀態
 */

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AcceptanceErrorStateProps {
  error: string
  onRetry: () => void
}

export function AcceptanceErrorState({
  error,
  onRetry,
}: AcceptanceErrorStateProps): React.ReactElement {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <span className="font-medium text-red-800">載入失敗</span>
      </div>
      <p className="mt-1 text-red-700">{error}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        重試
      </Button>
    </div>
  )
}
