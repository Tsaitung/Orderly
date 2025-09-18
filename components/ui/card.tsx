import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva(
  'rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200',
  {
    variants: {
      variant: {
        filled: 'border shadow-sm hover:shadow-md',
        outlined: 'border-2 bg-transparent',
        ghost: 'border-0 shadow-none bg-transparent',
        elevated: 'border shadow-md hover:shadow-lg',
        glass: 'backdrop-blur-sm bg-opacity-80 border-opacity-20'
      },
      colorScheme: {
        white: '',
        primary: '',
        restaurant: '',
        supplier: '',
        platform: '',
        gray: ''
      },
      padding: {
        none: '',
        tight: 'p-3',      // 12px - 緊湊
        sm: 'p-card-sm',   // 12px - 小卡片
        default: 'p-card-md', // 16px - 中卡片 (新的默認值)
        md: 'p-card-md',   // 16px
        lg: 'p-card-lg',   // 20px - 大卡片
        xl: 'p-card-xl'    // 24px - 特大卡片 (原來的默認值)
      },
      size: {
        default: '',
        compact: 'text-sm',
        large: 'text-base'
      },
      interactive: {
        true: 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
        false: ''
      }
    },
    compoundVariants: [
      // Filled variants
      { variant: 'filled', colorScheme: 'white', class: 'bg-white border-gray-200' },
      { variant: 'filled', colorScheme: 'primary', class: 'bg-primary-50 border-primary-200 text-primary-900' },
      { variant: 'filled', colorScheme: 'restaurant', class: 'bg-restaurant-50 border-restaurant-200 text-restaurant-900' },
      { variant: 'filled', colorScheme: 'supplier', class: 'bg-supplier-50 border-supplier-200 text-supplier-900' },
      { variant: 'filled', colorScheme: 'platform', class: 'bg-platform-50 border-platform-200 text-platform-900' },
      { variant: 'filled', colorScheme: 'gray', class: 'bg-gray-50 border-gray-200 text-gray-900' },
      
      // Outlined variants
      { variant: 'outlined', colorScheme: 'white', class: 'border-gray-300 hover:border-gray-400' },
      { variant: 'outlined', colorScheme: 'primary', class: 'border-primary-300 hover:border-primary-400 hover:bg-primary-50' },
      { variant: 'outlined', colorScheme: 'restaurant', class: 'border-restaurant-300 hover:border-restaurant-400 hover:bg-restaurant-50' },
      { variant: 'outlined', colorScheme: 'supplier', class: 'border-supplier-300 hover:border-supplier-400 hover:bg-supplier-50' },
      { variant: 'outlined', colorScheme: 'platform', class: 'border-platform-300 hover:border-platform-400 hover:bg-platform-50' },
      { variant: 'outlined', colorScheme: 'gray', class: 'border-gray-300 hover:border-gray-400 hover:bg-gray-50' },
      
      // Glass variants
      { variant: 'glass', colorScheme: 'white', class: 'bg-white/80 border-white/20' },
      { variant: 'glass', colorScheme: 'primary', class: 'bg-primary-100/80 border-primary-200/20 text-primary-900' },
      { variant: 'glass', colorScheme: 'restaurant', class: 'bg-restaurant-100/80 border-restaurant-200/20 text-restaurant-900' },
      { variant: 'glass', colorScheme: 'supplier', class: 'bg-supplier-100/80 border-supplier-200/20 text-supplier-900' },
      { variant: 'glass', colorScheme: 'platform', class: 'bg-platform-100/80 border-platform-200/20 text-platform-900' },
      { variant: 'glass', colorScheme: 'gray', class: 'bg-gray-100/80 border-gray-200/20 text-gray-900' },
      
      // Elevated variants (inherit from filled with enhanced shadows)
      { variant: 'elevated', colorScheme: 'white', class: 'bg-white border-gray-200' },
      { variant: 'elevated', colorScheme: 'primary', class: 'bg-primary-50 border-primary-200 text-primary-900' },
      { variant: 'elevated', colorScheme: 'restaurant', class: 'bg-restaurant-50 border-restaurant-200 text-restaurant-900' },
      { variant: 'elevated', colorScheme: 'supplier', class: 'bg-supplier-50 border-supplier-200 text-supplier-900' },
      { variant: 'elevated', colorScheme: 'platform', class: 'bg-platform-50 border-platform-200 text-platform-900' },
      { variant: 'elevated', colorScheme: 'gray', class: 'bg-gray-50 border-gray-200 text-gray-900' },
    ],
    defaultVariants: {
      variant: 'filled',
      colorScheme: 'white',
      padding: 'default',
      size: 'default',
      interactive: false
    }
  }
)

// Legacy variants mapping for backward compatibility
const legacyCardVariants = cva(
  'rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border hover:shadow-md',
        elevated: 'border shadow-md hover:shadow-lg',
        outlined: 'border-2',
        ghost: 'border-0 shadow-none bg-transparent',
        neu: 'border-0 shadow-neu-md hover:shadow-neu-lg bg-gray-50',
        glass: 'glass',
        'glass-restaurant': 'glass-restaurant',
        'glass-supplier': 'glass-supplier',
        'glass-platform': 'glass-platform',
        restaurant: 'card-restaurant interactive-card',
        supplier: 'card-supplier interactive-card',
        platform: 'card-platform interactive-card',
        interactive: 'border hover:shadow-lg interactive-card'
      },
      padding: {
        none: '',
        tight: 'p-3',
        sm: 'p-card-sm',
        default: 'p-card-md',
        md: 'p-card-md',
        lg: 'p-card-lg',
        xl: 'p-card-xl'
      },
      size: {
        default: '',
        compact: 'text-sm',
        large: 'text-base'
      }
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
      size: 'default'
    }
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'filled' | 'outlined' | 'ghost' | 'elevated' | 'glass' |
           // Legacy variants for backward compatibility
           'default' | 'neu' | 'glass-restaurant' | 'glass-supplier' | 'glass-platform' |
           'restaurant' | 'supplier' | 'platform' | 'interactive'
  colorScheme?: 'white' | 'primary' | 'restaurant' | 'supplier' | 'platform' | 'gray'
  padding?: 'none' | 'tight' | 'sm' | 'default' | 'md' | 'lg' | 'xl'
  size?: 'default' | 'compact' | 'large'
  interactive?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'filled', colorScheme = 'white', padding = 'default', size = 'default', interactive = false, ...props }, ref) => {
    // Check if using legacy variant (for backward compatibility)
    const isLegacyVariant = variant && !['filled', 'outlined', 'ghost', 'elevated', 'glass'].includes(variant)
    
    const cardClassName = isLegacyVariant
      ? legacyCardVariants({ variant: variant as any, padding, size })
      : cardVariants({ variant: variant as any, colorScheme, padding, size, interactive })
    
    return (
      <div
        ref={ref}
        className={cn(cardClassName, className)}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-card-md', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-semibold leading-none tracking-tight', className)}
    {...props}
  >
    {children}
  </h3>
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-card-md pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-card-md pt-0', className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  cardVariants,
  legacyCardVariants
}