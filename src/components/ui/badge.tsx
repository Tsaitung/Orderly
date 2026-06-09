import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        solid: 'border-transparent shadow',
        subtle: 'border-transparent',
        outline: 'bg-transparent',
        ghost: 'border-transparent',
      },
      colorScheme: {
        primary: '',
        restaurant: '',
        supplier: '',
        platform: '',
        gray: '',
        red: '',
        green: '',
        blue: '',
        yellow: '',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
        xl: 'px-4 py-1.5 text-sm',
      },
    },
    compoundVariants: [
      // Solid variants
      {
        variant: 'solid',
        colorScheme: 'primary',
        class: 'bg-primary-500 text-white hover:bg-primary-600',
      },
      {
        variant: 'solid',
        colorScheme: 'restaurant',
        class: 'bg-restaurant-500 text-white hover:bg-restaurant-600',
      },
      {
        variant: 'solid',
        colorScheme: 'supplier',
        class: 'bg-supplier-500 text-white hover:bg-supplier-600',
      },
      {
        variant: 'solid',
        colorScheme: 'platform',
        class: 'bg-platform-500 text-white hover:bg-platform-600',
      },
      { variant: 'solid', colorScheme: 'gray', class: 'bg-gray-500 text-white hover:bg-gray-600' },
      { variant: 'solid', colorScheme: 'red', class: 'bg-red-500 text-white hover:bg-red-600' },
      {
        variant: 'solid',
        colorScheme: 'green',
        class: 'bg-green-500 text-white hover:bg-green-600',
      },
      { variant: 'solid', colorScheme: 'blue', class: 'bg-blue-500 text-white hover:bg-blue-600' },
      {
        variant: 'solid',
        colorScheme: 'yellow',
        class: 'bg-yellow-500 text-white hover:bg-yellow-600',
      },

      // Subtle variants
      {
        variant: 'subtle',
        colorScheme: 'primary',
        class: 'bg-primary-100 text-primary-800 hover:bg-primary-200',
      },
      {
        variant: 'subtle',
        colorScheme: 'restaurant',
        class: 'bg-restaurant-100 text-restaurant-800 hover:bg-restaurant-200',
      },
      {
        variant: 'subtle',
        colorScheme: 'supplier',
        class: 'bg-supplier-100 text-supplier-800 hover:bg-supplier-200',
      },
      {
        variant: 'subtle',
        colorScheme: 'platform',
        class: 'bg-platform-100 text-platform-800 hover:bg-platform-200',
      },
      {
        variant: 'subtle',
        colorScheme: 'gray',
        class: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
      },
      { variant: 'subtle', colorScheme: 'red', class: 'bg-red-100 text-red-800 hover:bg-red-200' },
      {
        variant: 'subtle',
        colorScheme: 'green',
        class: 'bg-green-100 text-green-800 hover:bg-green-200',
      },
      {
        variant: 'subtle',
        colorScheme: 'blue',
        class: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      },
      {
        variant: 'subtle',
        colorScheme: 'yellow',
        class: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      },

      // Outline variants
      {
        variant: 'outline',
        colorScheme: 'primary',
        class: 'border-primary-500 text-primary-600 hover:bg-primary-50',
      },
      {
        variant: 'outline',
        colorScheme: 'restaurant',
        class: 'border-restaurant-500 text-restaurant-600 hover:bg-restaurant-50',
      },
      {
        variant: 'outline',
        colorScheme: 'supplier',
        class: 'border-supplier-500 text-supplier-600 hover:bg-supplier-50',
      },
      {
        variant: 'outline',
        colorScheme: 'platform',
        class: 'border-platform-500 text-platform-600 hover:bg-platform-50',
      },
      {
        variant: 'outline',
        colorScheme: 'gray',
        class: 'border-gray-500 text-gray-600 hover:bg-gray-50',
      },
      {
        variant: 'outline',
        colorScheme: 'red',
        class: 'border-red-500 text-red-600 hover:bg-red-50',
      },
      {
        variant: 'outline',
        colorScheme: 'green',
        class: 'border-green-500 text-green-600 hover:bg-green-50',
      },
      {
        variant: 'outline',
        colorScheme: 'blue',
        class: 'border-blue-500 text-blue-600 hover:bg-blue-50',
      },
      {
        variant: 'outline',
        colorScheme: 'yellow',
        class: 'border-yellow-500 text-yellow-600 hover:bg-yellow-50',
      },

      // Ghost variants
      { variant: 'ghost', colorScheme: 'primary', class: 'text-primary-600 hover:bg-primary-100' },
      {
        variant: 'ghost',
        colorScheme: 'restaurant',
        class: 'text-restaurant-600 hover:bg-restaurant-100',
      },
      {
        variant: 'ghost',
        colorScheme: 'supplier',
        class: 'text-supplier-600 hover:bg-supplier-100',
      },
      {
        variant: 'ghost',
        colorScheme: 'platform',
        class: 'text-platform-600 hover:bg-platform-100',
      },
      { variant: 'ghost', colorScheme: 'gray', class: 'text-gray-600 hover:bg-gray-100' },
      { variant: 'ghost', colorScheme: 'red', class: 'text-red-600 hover:bg-red-100' },
      { variant: 'ghost', colorScheme: 'green', class: 'text-green-600 hover:bg-green-100' },
      { variant: 'ghost', colorScheme: 'blue', class: 'text-blue-600 hover:bg-blue-100' },
      { variant: 'ghost', colorScheme: 'yellow', class: 'text-yellow-600 hover:bg-yellow-100' },
    ],
    defaultVariants: {
      variant: 'solid',
      colorScheme: 'gray',
      size: 'default',
    },
  }
)

// Legacy variants mapping for backward compatibility
const legacyBadgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary-500 text-white shadow hover:bg-primary-600',
        secondary: 'border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200',
        destructive: 'border-transparent bg-red-500 text-white shadow hover:bg-red-600',
        outline: 'text-gray-600 border-gray-500 hover:bg-gray-50',
        success: 'border-transparent bg-green-100 text-green-800 shadow hover:bg-green-200',
        warning: 'border-transparent bg-yellow-100 text-yellow-800 shadow hover:bg-yellow-200',
        info: 'border-transparent bg-blue-100 text-blue-800 shadow hover:bg-blue-200',
        // Business status variants (legacy)
        draft: 'border-transparent bg-gray-100 text-gray-800',
        confirmed: 'border-transparent bg-blue-100 text-blue-800',
        shipped: 'border-transparent bg-purple-100 text-purple-800',
        delivered: 'border-transparent bg-green-100 text-green-800',
        completed: 'border-transparent bg-emerald-100 text-emerald-800',
        cancelled: 'border-transparent bg-red-100 text-red-800',
        pending: 'border-transparent bg-yellow-100 text-yellow-800',
        'in-progress': 'border-transparent bg-blue-100 text-blue-800',
        failed: 'border-transparent bg-red-100 text-red-800',
        synced: 'border-transparent bg-green-100 text-green-800',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
        xl: 'px-4 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'solid'
    | 'subtle'
    | 'outline'
    | 'ghost'
    // Legacy variants for backward compatibility
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'info'
    | 'draft'
    | 'confirmed'
    | 'shipped'
    | 'delivered'
    | 'completed'
    | 'cancelled'
    | 'pending'
    | 'in-progress'
    | 'failed'
    | 'synced'
  colorScheme?:
    | 'primary'
    | 'restaurant'
    | 'supplier'
    | 'platform'
    | 'gray'
    | 'red'
    | 'green'
    | 'blue'
    | 'yellow'
  size?: 'default' | 'sm' | 'lg' | 'xl'
  dot?: boolean
  closable?: boolean
  onClose?: () => void
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      className,
      variant = 'solid',
      colorScheme = 'gray',
      size = 'default',
      dot,
      closable,
      onClose,
      children,
      ...props
    },
    ref
  ) => {
    // Check if using legacy variant (for backward compatibility)
    const isLegacyVariant = variant && !['solid', 'subtle', 'outline', 'ghost'].includes(variant)

    const badgeClassName = isLegacyVariant
      ? legacyBadgeVariants({ variant: variant as any, size })
      : badgeVariants({ variant: variant as any, colorScheme, size })

    return (
      <div ref={ref} className={cn(badgeClassName, className)} {...props}>
        {dot && <span className="mr-1.5 h-2 w-2 rounded-full bg-current" />}
        {children}
        {closable && (
          <button
            type="button"
            onClick={onClose}
            className="ml-1.5 rounded-full p-0.5 transition-colors hover:bg-black/20"
            aria-label="關閉"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    )
  }
)
Badge.displayName = 'Badge'

// 便利的狀態徽章組件
export const OrderStatusBadge = ({ status }: { status: string }) => (
  <Badge variant={status as any}>{getOrderStatusText(status)}</Badge>
)

export const ReconciliationStatusBadge = ({ status }: { status: string }) => (
  <Badge variant={status === 'in_progress' ? 'in-progress' : (status as any)}>
    {getReconciliationStatusText(status)}
  </Badge>
)

export const ERPSyncStatusBadge = ({ status }: { status: string }) => (
  <Badge variant={status as any}>{getERPSyncStatusText(status)}</Badge>
)

// 狀態文字映射
function getOrderStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    confirmed: '已確認',
    shipped: '已發貨',
    delivered: '已交付',
    completed: '已完成',
    cancelled: '已取消',
  }
  return statusMap[status] || status
}

function getReconciliationStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待對帳',
    in_progress: '對帳中',
    completed: '已完成',
    failed: '對帳失敗',
  }
  return statusMap[status] || status
}

function getERPSyncStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待同步',
    synced: '已同步',
    failed: '同步失敗',
  }
  return statusMap[status] || status
}

export { Badge, badgeVariants, legacyBadgeVariants }
