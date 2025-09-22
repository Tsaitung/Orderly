'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { DashboardProvider, useDashboardSpacing, useDashboard } from './DashboardProvider'
import { DashboardSidebar, MobileSidebar } from './DashboardSidebar'
import { DashboardHeader } from './DashboardHeader'
import { DashboardLayoutProps, LAYOUT_SIZES } from './DashboardConfig'

// DemoModeBanner 組件
interface DemoModeBannerProps {
  currentRole: string
  onRoleSwitch?: (role: string) => void
}

function DemoModeBanner({ currentRole }: DemoModeBannerProps) {
  const roleTitles = {
    restaurant: '餐廳模式',
    supplier: '供應商模式',
    platform: '平台管理',
    admin: '系統管理',
  }

  const roleColors = {
    restaurant: 'bg-amber-700',
    supplier: 'bg-blue-600',
    platform: 'bg-indigo-600',
    admin: 'bg-red-600',
  }

  const getToggleLink = () => {
    if (currentRole === 'restaurant') {
      return { href: '/supplier', text: '功能至供應商介面' }
    }
    if (currentRole === 'supplier') {
      return { href: '/restaurant', text: '切換至餐廳介面' }
    }
    return null
  }

  const toggleLink = getToggleLink()

  return (
    <div
      className={cn(
        'relative z-50 py-2.5 text-center text-sm text-white',
        roleColors[currentRole as keyof typeof roleColors] || 'bg-gray-600'
      )}
    >
      <span className="mr-2">✨ 體驗模式</span>
      <span className="font-medium">
        您正在體驗{roleTitles[currentRole as keyof typeof roleTitles]}介面
      </span>
      {toggleLink && (
        <Link
          href={toggleLink.href}
          className="ml-4 cursor-pointer text-xs opacity-75 transition-all hover:underline hover:opacity-100"
        >
          {toggleLink.text} →
        </Link>
      )}
    </div>
  )
}

// 內部佈局組件（在 Provider 內部使用）
function DashboardLayoutInner({
  children,
  title,
  subtitle,
  userInfo,
  navigationItems,
  showDemoMode = true,
  className,
  role,
}: Omit<DashboardLayoutProps, 'role'> & { role: string }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { getPageClasses } = useDashboardSpacing()

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* 主要布局容器 */}
      <div className="flex">
        {/* 桌面端側邊欄 */}
        <DashboardSidebar navigationItems={navigationItems} userInfo={userInfo} />

        {/* 移動端側邊欄 */}
        <MobileSidebar
          isOpen={isMobileMenuOpen}
          onClose={closeMobileMenu}
          navigationItems={navigationItems}
          userInfo={userInfo}
        />

        {/* 內容區域 */}
        <div className="flex flex-1 flex-col lg:ml-60">
          {/* Demo Mode Banner + Header 整合 */}
          <div className="sticky top-0 z-40">
            {showDemoMode && <DemoModeBanner currentRole={role} />}
            <DashboardHeader
              title={title}
              subtitle={subtitle}
              userInfo={userInfo}
              onMobileMenuToggle={handleMobileMenuToggle}
              className="border-t-0"
            />
          </div>

          {/* 主要內容 - 優化間距 */}
          <main className="flex-1 p-4 sm:p-5 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}

// 主要的 DashboardLayout 組件
export function DashboardLayout({
  children,
  role,
  navigationItems,
  userInfo,
  title,
  subtitle,
  spacing = 'normal',
  showDemoMode = true,
  className,
}: DashboardLayoutProps) {
  return (
    <DashboardProvider
      role={role}
      navigationItems={navigationItems}
      userInfo={userInfo}
      spacing={spacing}
    >
      <DashboardLayoutInner
        title={title}
        subtitle={subtitle}
        userInfo={userInfo}
        navigationItems={navigationItems}
        showDemoMode={showDemoMode}
        className={className}
        role={role}
      >
        {children}
      </DashboardLayoutInner>
    </DashboardProvider>
  )
}

// 匯出所有相關組件和類型
export type { DashboardLayoutProps } from './DashboardConfig'
export {
  useDashboard,
  useDashboardTheme,
  useDashboardSpacing,
  useDashboardNavigation,
} from './DashboardProvider'
