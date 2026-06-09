'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  UserRole,
  SpacingVariant,
  NavigationItem,
  UserInfo,
  ThemeConfig,
  DashboardContextType,
  ROLE_THEMES,
  SPACING_CONFIG,
} from './DashboardConfig'

// Dashboard Context
const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

// Provider Props
interface DashboardProviderProps {
  children: React.ReactNode
  role: UserRole
  navigationItems: NavigationItem[]
  userInfo?: UserInfo
  spacing?: SpacingVariant
}

// Dashboard Provider 組件
export function DashboardProvider({
  children,
  role: initialRole,
  navigationItems,
  userInfo,
  spacing: initialSpacing = 'normal',
}: DashboardProviderProps) {
  const [role, setRole] = useState<UserRole>(initialRole)
  const [spacing, setSpacing] = useState<SpacingVariant>(initialSpacing)
  const [theme, setTheme] = useState<ThemeConfig>(ROLE_THEMES[initialRole])

  // 當角色改變時更新主題
  useEffect(() => {
    setTheme(ROLE_THEMES[role])

    // 更新 CSS 變數
    const root = document.documentElement
    const themeConfig = ROLE_THEMES[role]

    root.style.setProperty('--dashboard-primary', themeConfig.primary)
    root.style.setProperty('--dashboard-accent', themeConfig.accent)
    root.style.setProperty('--dashboard-background', themeConfig.background)
    root.style.setProperty('--dashboard-foreground', themeConfig.foreground)

    // 更新 body 類別以支援主題切換
    document.body.className = document.body.className
      .replace(/theme-\w+/g, '')
      .concat(` theme-${role}`)
      .trim()
  }, [role])

  // 設定間距時更新 CSS 變數
  useEffect(() => {
    const root = document.documentElement
    const spacingClass = SPACING_CONFIG[spacing]
    root.style.setProperty('--dashboard-spacing', spacingClass)
  }, [spacing])

  const contextValue: DashboardContextType = {
    role,
    theme,
    spacing,
    navigationItems,
    userInfo,
    setRole,
    setSpacing,
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className={`min-h-screen transition-colors duration-200 theme-${role}`}>{children}</div>
    </DashboardContext.Provider>
  )
}

// 自定義 Hook 來使用 Dashboard Context
export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}

// 主題相關的自定義 Hook
export function useDashboardTheme() {
  const { role, theme, setRole } = useDashboard()

  // 獲取主題色彩類別
  const getThemeClasses = (variant: 'primary' | 'accent' | 'background' | 'text' = 'primary') => {
    const roleClasses = {
      restaurant: {
        primary: 'text-restaurant-600 bg-restaurant-600',
        accent: 'text-restaurant-700 bg-restaurant-700',
        background: 'bg-restaurant-50',
        text: 'text-restaurant-900',
      },
      supplier: {
        primary: 'text-blue-600 bg-blue-600',
        accent: 'text-blue-700 bg-blue-700',
        background: 'bg-gray-50', // 改为中性背景
        text: 'text-gray-900', // 改为中性文字
      },
      platform: {
        primary: 'text-indigo-600 bg-indigo-600',
        accent: 'text-indigo-700 bg-indigo-700',
        background: 'bg-indigo-50',
        text: 'text-indigo-900',
      },
      admin: {
        primary: 'text-red-600 bg-red-600',
        accent: 'text-red-700 bg-red-700',
        background: 'bg-red-50',
        text: 'text-red-900',
      },
    }

    return roleClasses[role][variant]
  }

  // 獲取主題相關的 CSS 變數
  const getThemeVariables = () => ({
    '--color-primary': theme.primary,
    '--color-accent': theme.accent,
    '--color-background': theme.background,
    '--color-foreground': theme.foreground,
  })

  return {
    role,
    theme,
    setRole,
    getThemeClasses,
    getThemeVariables,
  }
}

// 間距相關的自定義 Hook
export function useDashboardSpacing() {
  const { spacing, setSpacing } = useDashboard()

  // 獲取間距類別
  const getSpacingClasses = () => SPACING_CONFIG[spacing]

  // 獲取容器類別
  const getContainerClasses = () => {
    const baseClasses = 'container mx-auto px-4 sm:px-6 lg:px-8'
    const spacingClasses = SPACING_CONFIG[spacing]
    return `${baseClasses} ${spacingClasses}`
  }

  // 獲取頁面級別類別
  const getPageClasses = () => {
    const baseClasses = 'flex-1'
    const spacingClasses = SPACING_CONFIG[spacing]
    return `${baseClasses} ${spacingClasses}`
  }

  return {
    spacing,
    setSpacing,
    getSpacingClasses,
    getContainerClasses,
    getPageClasses,
  }
}

// 導航相關的自定義 Hook
export function useDashboardNavigation() {
  const { navigationItems, role } = useDashboard()

  // 檢查是否為活躍項目
  const isActiveItem = (href: string, currentPath: string) => {
    if (href === '/') return currentPath === href
    return currentPath.startsWith(href)
  }

  // 獲取導航項目的樣式類別
  const getNavigationItemClasses = (item: NavigationItem, currentPath: string) => {
    const baseClasses =
      'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px]'
    const isActive = item.active || isActiveItem(item.href, currentPath)

    if (isActive) {
      const activeClasses = {
        restaurant: 'bg-restaurant-50 text-restaurant-700',
        supplier: 'bg-blue-50 text-blue-700', // 保持蓝色用于活跃状态
        platform: 'bg-indigo-50 text-indigo-700',
        admin: 'bg-red-50 text-red-700',
      }
      return `${baseClasses} ${activeClasses[role]}`
    }

    return `${baseClasses} text-gray-700 hover:text-primary-600 hover:bg-gray-50`
  }

  return {
    navigationItems,
    isActiveItem,
    getNavigationItemClasses,
  }
}
