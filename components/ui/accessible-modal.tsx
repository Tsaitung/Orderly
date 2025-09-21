import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4'
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className
}: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()
  const descriptionId = React.useId()

  // 處理背景點擊
  const handleBackdropClick = React.useCallback((event: React.MouseEvent) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose()
    }
  }, [closeOnBackdropClick, onClose])

  // 處理 ESC 鍵
  React.useEffect(() => {
    if (!closeOnEscape) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, closeOnEscape, onClose])

  // 暴露設置觸發元素的方法（不通過 ref 暴露，僅由 hook 內部管理）

  if (!isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* 模態框內容 */}
      <div
        ref={modalRef as unknown as React.RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'relative bg-white rounded-lg shadow-xl w-full',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題列 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 
              id={titleId}
              className="text-xl font-semibold text-gray-900"
            >
              {title}
            </h2>
            {description && (
              <p 
                id={descriptionId}
                className="mt-1 text-sm text-gray-600"
              >
                {description}
              </p>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="關閉對話框"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 內容區域 */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )

  // 使用 Portal 渲染到 body
  return createPortal(modalContent, document.body)
}

// 模態框觸發按鈕組件
interface ModalTriggerProps {
  children: React.ReactElement
  modal: React.ReactElement<ModalProps>
}

export function ModalTrigger({ children, modal }: ModalTriggerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement>(null)

  const openModal = React.useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeModal = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  // 克隆模態框並注入狀態
  const modalWithProps = React.cloneElement(modal, {
    isOpen,
    onClose: closeModal
  })

  // 始終使用 cloneElement 方式，避免按鈕嵌套問題
  return (
    <>
      {React.cloneElement(children as React.ReactElement, {
        ref: triggerRef,
        onClick: openModal,
        className: cn(
          (children as React.ReactElement).props.className,
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A47864]"
        )
      })}
      {modalWithProps}
    </>
  )
}

// 確認對話框組件
interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '確認',
  cancelText = '取消',
  variant = 'default'
}: ConfirmDialogProps) {
  const handleConfirm = React.useCallback(() => {
    onConfirm()
    onClose()
  }, [onConfirm, onClose])

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      className="max-w-md"
    >
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
            >
              {cancelText}
            </Button>
            <Button
              variant={variant === 'destructive' ? 'destructive' : 'brand'}
              onClick={handleConfirm}
              autoFocus
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </AccessibleModal>
  )
}

// 載入對話框組件
interface LoadingDialogProps {
  isOpen: boolean
  title?: string
  message?: string
}

export function LoadingDialog({
  isOpen,
  title = '處理中',
  message = '請稍候，正在處理您的請求...'
}: LoadingDialogProps) {
  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={() => {}} // 載入中不允許關閉
      title={title}
      size="sm"
      closeOnBackdropClick={false}
      closeOnEscape={false}
    >
      <div className="flex items-center space-x-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        <p className="text-gray-600">{message}</p>
      </div>
    </AccessibleModal>
  )
}

// 表單對話框組件
interface FormDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  onSubmit?: () => void
  submitText?: string
  cancelText?: string
  isSubmitting?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function FormDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  onSubmit,
  submitText = '確認',
  cancelText = '取消',
  isSubmitting = false,
  size = 'md'
}: FormDialogProps) {
  const handleSubmit = React.useCallback((event: React.FormEvent) => {
    event.preventDefault()
    onSubmit?.()
  }, [onSubmit])

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {children}
        </div>

        {onSubmit && (
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {cancelText}
            </Button>
            <Button
              type="submit"
              variant="brand"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {submitText}
            </Button>
          </div>
        )}
      </form>
    </AccessibleModal>
  )
}

export default AccessibleModal
