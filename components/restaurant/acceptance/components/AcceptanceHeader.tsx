'use client'

/**
 * AcceptanceHeader Component
 * 驗收管理標題和操作按鈕
 */

import { Receipt, RefreshCw, Download, Camera } from 'lucide-react'
import { CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AcceptanceHeaderProps {
  isLoading: boolean
  onRefresh: () => void
  onNewAcceptance: () => void
}

export function AcceptanceHeader({
  isLoading,
  onRefresh,
  onNewAcceptance,
}: AcceptanceHeaderProps): React.ReactElement {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Receipt className="h-5 w-5 text-primary-600" />
          <span>驗收管理</span>
        </CardTitle>

        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            重新整理
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            匯出資料
          </Button>
          <Button onClick={onNewAcceptance} className="bg-primary-600 hover:bg-primary-700">
            <Camera className="mr-2 h-4 w-4" />
            拍照驗收
          </Button>
        </div>
      </div>
    </CardHeader>
  )
}
