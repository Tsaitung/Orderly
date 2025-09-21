import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-base text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      // Chakra UI v2 風格 variant (填滿程度)
      variant: {
        solid: '',
        outline: 'bg-transparent border-2',
        ghost: 'bg-transparent',
        link: 'bg-transparent underline-offset-4 hover:underline p-0 h-auto',
        // Backward-compat aliases used across codebase
        default: '', // alias of solid + primary
        brand: '', // alias for storybook/demo usage
        destructive: 'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500'
      },
      // Chakra UI v2 風格 colorScheme (色彩主題)
      colorScheme: {
        // 主色系 (Mocha Mousse)
        primary: '',
        // 餐廳模組色系
        restaurant: '',
        // 供應商模組色系
        supplier: '',
        // 平台管理色系
        platform: '',
        // 語意色彩
        gray: '',
        red: '',
        green: '',
        blue: '',
        yellow: ''
      },
      size: {
        xs: 'h-6 px-2 text-xs rounded-sm',
        sm: 'h-8 px-3 text-sm rounded-base',
        md: 'h-10 px-4 text-sm rounded-base',
        lg: 'h-12 px-6 text-base rounded-md',
        xl: 'h-14 px-8 text-lg rounded-lg'
      }
    },
    compoundVariants: [
      // Primary colorScheme variants
      {
        variant: 'solid',
        colorScheme: 'primary',
        className: 'bg-primary-500 text-white shadow-sm hover:bg-primary-600 active:bg-primary-700 focus-visible:ring-primary-500'
      },
      {
        variant: 'outline',
        colorScheme: 'primary',
        className: 'border-primary-500 text-primary-600 hover:bg-primary-50 active:bg-primary-100 focus-visible:ring-primary-500'
      },
      {
        variant: 'ghost',
        colorScheme: 'primary',
        className: 'text-primary-600 hover:bg-primary-50 active:bg-primary-100 focus-visible:ring-primary-500'
      },
      {
        variant: 'link',
        colorScheme: 'primary',
        className: 'text-primary-600 hover:text-primary-700'
      },
      // Restaurant colorScheme variants
      {
        variant: 'solid',
        colorScheme: 'restaurant',
        className: 'bg-restaurant-500 text-white shadow-sm hover:bg-restaurant-600 active:bg-restaurant-700 focus-visible:ring-restaurant-500'
      },
      {
        variant: 'outline',
        colorScheme: 'restaurant',
        className: 'border-restaurant-500 text-restaurant-600 hover:bg-restaurant-50 active:bg-restaurant-100 focus-visible:ring-restaurant-500'
      },
      {
        variant: 'ghost',
        colorScheme: 'restaurant',
        className: 'text-restaurant-600 hover:bg-restaurant-50 active:bg-restaurant-100 focus-visible:ring-restaurant-500'
      },
      // Supplier colorScheme variants
      {
        variant: 'solid',
        colorScheme: 'supplier',
        className: 'bg-supplier-500 text-white shadow-sm hover:bg-supplier-600 active:bg-supplier-700 focus-visible:ring-supplier-500'
      },
      {
        variant: 'outline',
        colorScheme: 'supplier',
        className: 'border-supplier-500 text-supplier-600 hover:bg-supplier-50 active:bg-supplier-100 focus-visible:ring-supplier-500'
      },
      {
        variant: 'ghost',
        colorScheme: 'supplier',
        className: 'text-supplier-600 hover:bg-supplier-50 active:bg-supplier-100 focus-visible:ring-supplier-500'
      },
      // Platform colorScheme variants
      {
        variant: 'solid',
        colorScheme: 'platform',
        className: 'bg-platform-500 text-white shadow-sm hover:bg-platform-600 active:bg-platform-700 focus-visible:ring-platform-500'
      },
      {
        variant: 'outline',
        colorScheme: 'platform',
        className: 'border-platform-500 text-platform-600 hover:bg-platform-50 active:bg-platform-100 focus-visible:ring-platform-500'
      },
      {
        variant: 'ghost',
        colorScheme: 'platform',
        className: 'text-platform-600 hover:bg-platform-50 active:bg-platform-100 focus-visible:ring-platform-500'
      },
      // Gray colorScheme variants
      {
        variant: 'solid',
        colorScheme: 'gray',
        className: 'bg-gray-500 text-white shadow-sm hover:bg-gray-600 active:bg-gray-700 focus-visible:ring-gray-500'
      },
      {
        variant: 'outline',
        colorScheme: 'gray',
        className: 'border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-500'
      },
      {
        variant: 'ghost',
        colorScheme: 'gray',
        className: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-500'
      },
      // Red colorScheme variants (destructive actions)
      {
        variant: 'solid',
        colorScheme: 'red',
        className: 'bg-red-500 text-white shadow-sm hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-500'
      },
      {
        variant: 'outline',
        colorScheme: 'red',
        className: 'border-red-500 text-red-600 hover:bg-red-50 active:bg-red-100 focus-visible:ring-red-500'
      },
      {
        variant: 'ghost',
        colorScheme: 'red',
        className: 'text-red-600 hover:bg-red-50 active:bg-red-100 focus-visible:ring-red-500'
      },
      // Green colorScheme variants (success actions)
      {
        variant: 'solid',
        colorScheme: 'green',
        className: 'bg-green-500 text-white shadow-sm hover:bg-green-600 active:bg-green-700 focus-visible:ring-green-500'
      },
      {
        variant: 'outline',
        colorScheme: 'green',
        className: 'border-green-500 text-green-600 hover:bg-green-50 active:bg-green-100 focus-visible:ring-green-500'
      },
      {
        variant: 'ghost',
        colorScheme: 'green',
        className: 'text-green-600 hover:bg-green-50 active:bg-green-100 focus-visible:ring-green-500'
      }
    ],
    defaultVariants: {
      variant: 'solid',
      colorScheme: 'primary',
      size: 'md'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  iconSpacing?: 'tight' | 'normal' | 'wide'
  isFullWidth?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    colorScheme,
    size, 
    asChild = false, 
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    iconSpacing = 'normal',
    isFullWidth = false,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : 'button'
    
    const getIconSpacingClass = () => {
      switch (iconSpacing) {
        case 'tight': return 'gap-1'
        case 'wide': return 'gap-3'
        default: return 'gap-2'
      }
    }
    
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, colorScheme, size }),
          getIconSpacingClass(),
          isFullWidth && 'w-full',
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <svg 
            className="animate-spin h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="2"
              className="opacity-25"
            />
            <path 
              fill="currentColor"
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              className="opacity-75"
            />
          </svg>
        )}
        {!loading && leftIcon && (
          <span className="inline-flex items-center" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        {loading && loadingText ? loadingText : children}
        {!loading && rightIcon && (
          <span className="inline-flex items-center" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
