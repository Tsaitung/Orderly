/**
 * Orderly Theme Provider - Chakra UI v2 Design System
 * 
 * Centralized theme configuration for consistent design across the platform.
 * Implements Chakra UI v2 design principles with TailwindCSS + Radix UI.
 */

import { tokens } from './tokens'

export type ColorScheme = 'primary' | 'restaurant' | 'supplier' | 'platform' | 'gray' | 'red' | 'green' | 'blue' | 'yellow'
export type ComponentVariant = 'solid' | 'subtle' | 'outline' | 'ghost'
export type ComponentSize = 'sm' | 'md' | 'lg' | 'xl'

/**
 * Theme configuration interface
 */
export interface ThemeConfig {
  colors: typeof tokens.colors
  spacing: typeof tokens.spacing
  typography: typeof tokens.typography
  shadows: typeof tokens.shadows
  borderRadius: typeof tokens.borderRadius
  components: {
    Button: ButtonTheme
    Badge: BadgeTheme
    Card: CardTheme
  }
}

/**
 * Component-specific theme configurations
 */
export interface ButtonTheme {
  variants: Record<ComponentVariant, string>
  colorSchemes: Record<ColorScheme, Record<ComponentVariant, string>>
  sizes: Record<ComponentSize, string>
  defaultProps: {
    variant: ComponentVariant
    colorScheme: ColorScheme
    size: ComponentSize
  }
}

export interface BadgeTheme {
  variants: Record<ComponentVariant, string>
  colorSchemes: Record<ColorScheme, Record<ComponentVariant, string>>
  sizes: Record<ComponentSize, string>
  defaultProps: {
    variant: ComponentVariant
    colorScheme: ColorScheme
    size: ComponentSize
  }
}

export interface CardTheme {
  variants: Record<'filled' | 'outlined' | 'ghost' | 'elevated' | 'glass', string>
  colorSchemes: Record<ColorScheme | 'white', Record<string, string>>
  defaultProps: {
    variant: 'filled' | 'outlined' | 'ghost' | 'elevated' | 'glass'
    colorScheme: ColorScheme | 'white'
  }
}

/**
 * Complete theme configuration
 */
export const theme: ThemeConfig = {
  colors: tokens.colors,
  spacing: tokens.spacing,
  typography: tokens.typography,
  shadows: tokens.shadows,
  borderRadius: tokens.borderRadius,
  
  components: {
    Button: {
      variants: {
        solid: 'font-medium shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        outline: 'font-medium border border-current bg-transparent shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        ghost: 'font-medium bg-transparent shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        subtle: 'font-medium shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
      },
      colorSchemes: {
        primary: {
          solid: 'bg-primary-500 text-white hover:bg-primary-600 focus-visible:outline-primary-500',
          outline: 'text-primary-600 border-primary-500 hover:bg-primary-50 focus-visible:outline-primary-500',
          ghost: 'text-primary-600 hover:bg-primary-100 focus-visible:outline-primary-500',
          subtle: 'bg-primary-100 text-primary-800 hover:bg-primary-200 focus-visible:outline-primary-500'
        },
        restaurant: {
          solid: 'bg-restaurant-500 text-white hover:bg-restaurant-600 focus-visible:outline-restaurant-500',
          outline: 'text-restaurant-600 border-restaurant-500 hover:bg-restaurant-50 focus-visible:outline-restaurant-500',
          ghost: 'text-restaurant-600 hover:bg-restaurant-100 focus-visible:outline-restaurant-500',
          subtle: 'bg-restaurant-100 text-restaurant-800 hover:bg-restaurant-200 focus-visible:outline-restaurant-500'
        },
        supplier: {
          solid: 'bg-supplier-500 text-white hover:bg-supplier-600 focus-visible:outline-supplier-500',
          outline: 'text-supplier-600 border-supplier-500 hover:bg-supplier-50 focus-visible:outline-supplier-500',
          ghost: 'text-supplier-600 hover:bg-supplier-100 focus-visible:outline-supplier-500',
          subtle: 'bg-supplier-100 text-supplier-800 hover:bg-supplier-200 focus-visible:outline-supplier-500'
        },
        platform: {
          solid: 'bg-platform-500 text-white hover:bg-platform-600 focus-visible:outline-platform-500',
          outline: 'text-platform-600 border-platform-500 hover:bg-platform-50 focus-visible:outline-platform-500',
          ghost: 'text-platform-600 hover:bg-platform-100 focus-visible:outline-platform-500',
          subtle: 'bg-platform-100 text-platform-800 hover:bg-platform-200 focus-visible:outline-platform-500'
        },
        gray: {
          solid: 'bg-gray-500 text-white hover:bg-gray-600 focus-visible:outline-gray-500',
          outline: 'text-gray-600 border-gray-500 hover:bg-gray-50 focus-visible:outline-gray-500',
          ghost: 'text-gray-600 hover:bg-gray-100 focus-visible:outline-gray-500',
          subtle: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus-visible:outline-gray-500'
        },
        red: {
          solid: 'bg-red-500 text-white hover:bg-red-600 focus-visible:outline-red-500',
          outline: 'text-red-600 border-red-500 hover:bg-red-50 focus-visible:outline-red-500',
          ghost: 'text-red-600 hover:bg-red-100 focus-visible:outline-red-500',
          subtle: 'bg-red-100 text-red-800 hover:bg-red-200 focus-visible:outline-red-500'
        },
        green: {
          solid: 'bg-green-500 text-white hover:bg-green-600 focus-visible:outline-green-500',
          outline: 'text-green-600 border-green-500 hover:bg-green-50 focus-visible:outline-green-500',
          ghost: 'text-green-600 hover:bg-green-100 focus-visible:outline-green-500',
          subtle: 'bg-green-100 text-green-800 hover:bg-green-200 focus-visible:outline-green-500'
        },
        blue: {
          solid: 'bg-blue-500 text-white hover:bg-blue-600 focus-visible:outline-blue-500',
          outline: 'text-blue-600 border-blue-500 hover:bg-blue-50 focus-visible:outline-blue-500',
          ghost: 'text-blue-600 hover:bg-blue-100 focus-visible:outline-blue-500',
          subtle: 'bg-blue-100 text-blue-800 hover:bg-blue-200 focus-visible:outline-blue-500'
        },
        yellow: {
          solid: 'bg-yellow-500 text-white hover:bg-yellow-600 focus-visible:outline-yellow-500',
          outline: 'text-yellow-600 border-yellow-500 hover:bg-yellow-50 focus-visible:outline-yellow-500',
          ghost: 'text-yellow-600 hover:bg-yellow-100 focus-visible:outline-yellow-500',
          subtle: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 focus-visible:outline-yellow-500'
        }
      },
      sizes: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        xl: 'h-12 px-8 text-base'
      },
      defaultProps: {
        variant: 'solid',
        colorScheme: 'gray',
        size: 'md'
      }
    },
    
    Badge: {
      variants: {
        solid: 'border-transparent shadow',
        subtle: 'border-transparent',
        outline: 'bg-transparent',
        ghost: 'border-transparent'
      },
      colorSchemes: {
        primary: {
          solid: 'bg-primary-500 text-white',
          subtle: 'bg-primary-100 text-primary-800',
          outline: 'border-primary-500 text-primary-600',
          ghost: 'text-primary-600'
        },
        restaurant: {
          solid: 'bg-restaurant-500 text-white',
          subtle: 'bg-restaurant-100 text-restaurant-800',
          outline: 'border-restaurant-500 text-restaurant-600',
          ghost: 'text-restaurant-600'
        },
        supplier: {
          solid: 'bg-supplier-500 text-white',
          subtle: 'bg-supplier-100 text-supplier-800',
          outline: 'border-supplier-500 text-supplier-600',
          ghost: 'text-supplier-600'
        },
        platform: {
          solid: 'bg-platform-500 text-white',
          subtle: 'bg-platform-100 text-platform-800',
          outline: 'border-platform-500 text-platform-600',
          ghost: 'text-platform-600'
        },
        gray: {
          solid: 'bg-gray-500 text-white',
          subtle: 'bg-gray-100 text-gray-800',
          outline: 'border-gray-500 text-gray-600',
          ghost: 'text-gray-600'
        },
        red: {
          solid: 'bg-red-500 text-white',
          subtle: 'bg-red-100 text-red-800',
          outline: 'border-red-500 text-red-600',
          ghost: 'text-red-600'
        },
        green: {
          solid: 'bg-green-500 text-white',
          subtle: 'bg-green-100 text-green-800',
          outline: 'border-green-500 text-green-600',
          ghost: 'text-green-600'
        },
        blue: {
          solid: 'bg-blue-500 text-white',
          subtle: 'bg-blue-100 text-blue-800',
          outline: 'border-blue-500 text-blue-600',
          ghost: 'text-blue-600'
        },
        yellow: {
          solid: 'bg-yellow-500 text-white',
          subtle: 'bg-yellow-100 text-yellow-800',
          outline: 'border-yellow-500 text-yellow-600',
          ghost: 'text-yellow-600'
        }
      },
      sizes: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
        xl: 'px-4 py-1.5 text-sm'
      },
      defaultProps: {
        variant: 'solid',
        colorScheme: 'gray',
        size: 'md'
      }
    },
    
    Card: {
      variants: {
        filled: 'border shadow-sm hover:shadow-md',
        outlined: 'border-2 bg-transparent',
        ghost: 'border-0 shadow-none bg-transparent',
        elevated: 'border shadow-md hover:shadow-lg',
        glass: 'backdrop-blur-sm bg-opacity-80 border-opacity-20'
      },
      colorSchemes: {
        white: {
          filled: 'bg-white border-gray-200',
          outlined: 'border-gray-300 hover:border-gray-400',
          elevated: 'bg-white border-gray-200',
          glass: 'bg-white/80 border-white/20'
        },
        primary: {
          filled: 'bg-primary-50 border-primary-200 text-primary-900',
          outlined: 'border-primary-300 hover:border-primary-400 hover:bg-primary-50',
          elevated: 'bg-primary-50 border-primary-200 text-primary-900',
          glass: 'bg-primary-100/80 border-primary-200/20 text-primary-900'
        },
        restaurant: {
          filled: 'bg-restaurant-50 border-restaurant-200 text-restaurant-900',
          outlined: 'border-restaurant-300 hover:border-restaurant-400 hover:bg-restaurant-50',
          elevated: 'bg-restaurant-50 border-restaurant-200 text-restaurant-900',
          glass: 'bg-restaurant-100/80 border-restaurant-200/20 text-restaurant-900'
        },
        supplier: {
          filled: 'bg-supplier-50 border-supplier-200 text-supplier-900',
          outlined: 'border-supplier-300 hover:border-supplier-400 hover:bg-supplier-50',
          elevated: 'bg-supplier-50 border-supplier-200 text-supplier-900',
          glass: 'bg-supplier-100/80 border-supplier-200/20 text-supplier-900'
        },
        platform: {
          filled: 'bg-platform-50 border-platform-200 text-platform-900',
          outlined: 'border-platform-300 hover:border-platform-400 hover:bg-platform-50',
          elevated: 'bg-platform-50 border-platform-200 text-platform-900',
          glass: 'bg-platform-100/80 border-platform-200/20 text-platform-900'
        },
        gray: {
          filled: 'bg-gray-50 border-gray-200 text-gray-900',
          outlined: 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
          elevated: 'bg-gray-50 border-gray-200 text-gray-900',
          glass: 'bg-gray-100/80 border-gray-200/20 text-gray-900'
        }
      },
      defaultProps: {
        variant: 'filled',
        colorScheme: 'white'
      }
    }
  }
}

/**
 * Utility functions for theme access
 */
export const getComponentStyle = (component: keyof ThemeConfig['components'], variant: string, colorScheme: string) => {
  const componentTheme = theme.components[component] as any
  return componentTheme.colorSchemes?.[colorScheme]?.[variant] || ''
}

export const getComponentSize = (component: keyof ThemeConfig['components'], size: string) => {
  const componentTheme = theme.components[component] as any
  return componentTheme.sizes?.[size] || ''
}

export const getColor = (colorScheme: ColorScheme, shade: number = 500) => {
  return theme.colors[colorScheme]?.[shade] || theme.colors.gray[shade]
}

/**
 * Design system status and information
 */
export const designSystemInfo = {
  version: '2.0.0',
  chakraUIVersion: 'v2',
  framework: 'TailwindCSS + Radix UI',
  lastUpdated: '2025-09-18',
  components: {
    migrated: ['Button', 'Badge', 'Card'],
    total: 3,
    coverage: '100%'
  },
  colors: {
    brand: ['primary', 'restaurant', 'supplier', 'platform'],
    semantic: ['gray', 'red', 'green', 'blue', 'yellow'],
    total: 9
  },
  principles: [
    'Consistent variant + colorScheme pattern',
    'Backward compatibility maintained',
    'Type-safe theme access',
    'Performance optimized with TailwindCSS',
    'Accessible by default'
  ]
}

// Export theme as default for easy importing
export default theme