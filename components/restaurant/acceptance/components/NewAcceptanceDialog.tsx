'use client'

/**
 * NewAcceptanceDialog Component
 * 新增驗收對話框
 */

import { Camera } from 'lucide-react'
import { FormDialog } from '@/components/ui/accessible-modal'

interface NewAcceptanceDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function NewAcceptanceDialog({
  isOpen,
  onClose,
}: NewAcceptanceDialogProps): React.ReactElement {
  return (
    <FormDialog
      isOpen={isOpen}
      onClose={onClose}
      title="拍照驗收"
      description="開始新的送貨驗收流程"
      size="lg"
    >
      <div className="space-y-4">
        <div className="py-8 text-center text-gray-500">
          <Camera className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>拍照驗收功能開發中...</p>
          <p className="text-sm">即將上線，敬請期待</p>
        </div>
      </div>
    </FormDialog>
  )
}
