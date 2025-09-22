import { LucideIcon } from 'lucide-react'

// 支援的角色類型
export type UserRole = 'restaurant' | 'supplier' | 'platform' | 'admin'

// 間距配置
export type SpacingVariant = 'tight' | 'normal' | 'loose'

// 導航項目配置
export interface NavigationItem {
  title: string
  href: string
  icon: LucideIcon
  description?: string
  badge?: number | string
  active?: boolean
  children?: NavigationItem[]
}

// 用戶資訊
export interface UserInfo {
  name: string
  email: string
  avatar?: string
  role: string
  id: string
}

// 主題配置
export interface ThemeConfig {
  primary: string
  accent: string
  background: string
  foreground: string
}

// 角色主題映射
export const ROLE_THEMES: Record<UserRole, ThemeConfig> = {
  restaurant: {
    primary: '#A47864', // Mocha Mousse
    accent: '#8B6F4D', // 深色變體
    background: '#FDF8F6', // 淺色背景
    foreground: '#1F2937', // 深色文字
  },
  supplier: {
    primary: '#2563EB', // Blue 600 - 保持蓝色用于强调
    accent: '#1D4ED8', // Blue 700
    background: '#F9FAFB', // 改为中性灰 Gray 50
    foreground: '#1F2937', // 深色文字
  },
  platform: {
    primary: '#6366F1', // Indigo 500
    accent: '#4F46E5', // Indigo 600
    background: '#EEF2FF', // Indigo 50
    foreground: '#1F2937', // 深色文字
  },
  admin: {
    primary: '#DC2626', // Red 600
    accent: '#B91C1C', // Red 700
    background: '#FEF2F2', // Red 50
    foreground: '#1F2937', // 深色文字
  },
}

// 間距配置映射
export const SPACING_CONFIG: Record<SpacingVariant, string> = {
  tight: 'space-y-4', // 16px
  normal: 'space-y-6', // 24px (預設)
  loose: 'space-y-8', // 32px
}

// DashboardLayout 組件的 Props
export interface DashboardLayoutProps {
  children: React.ReactNode
  role: UserRole
  navigationItems: NavigationItem[]
  userInfo?: UserInfo
  title?: string
  subtitle?: string
  spacing?: SpacingVariant
  className?: string
  showDemoMode?: boolean
}

// Dashboard 上下文類型
export interface DashboardContextType {
  role: UserRole
  theme: ThemeConfig
  spacing: SpacingVariant
  navigationItems: NavigationItem[]
  userInfo?: UserInfo
  setRole: (role: UserRole) => void
  setSpacing: (spacing: SpacingVariant) => void
}

// 響應式斷點
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const

// 佈局尺寸常量
export const LAYOUT_SIZES = {
  sidebarWidth: 240, // 側邊欄寬度 (px)
  headerHeight: 64, // 頂部導航高度 (px)
  containerPadding: 24, // 容器內邊距 (px)
  cardPadding: 16, // 卡片內邊距 (px)
  minTouchTarget: 44, // 最小觸控目標 (px)
} as const

// CSS 類別常量
export const LAYOUT_CLASSES = {
  sidebar: {
    width: 'w-60', // 240px
    background: 'bg-white',
    border: 'border-r border-gray-200',
  },
  content: {
    padding: 'p-6', // 24px
    marginLeft: 'lg:ml-60', // 大螢幕左邊距 240px
  },
  navigation: {
    item: 'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px]',
    active: 'bg-primary-50 text-primary-700',
    inactive: 'text-gray-700 hover:text-primary-600 hover:bg-gray-50',
  },
} as const
