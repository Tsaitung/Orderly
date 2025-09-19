'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useDashboardTheme, useDashboardNavigation } from './DashboardProvider'
import { NavigationItem, UserInfo, LAYOUT_CLASSES } from './DashboardConfig'

interface DashboardSidebarProps {
  navigationItems: NavigationItem[]
  userInfo?: UserInfo
  className?: string
}

export function DashboardSidebar({ 
  navigationItems, 
  userInfo, 
  className 
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const { role, getThemeClasses } = useDashboardTheme()
  const { getNavigationItemClasses } = useDashboardNavigation()

  // 渲染導航項目
  const renderNavigationItem = (item: NavigationItem) => {
    const Icon = item.icon
    const itemClasses = getNavigationItemClasses(item, pathname)
    
    return (
      <Link
        key={item.href}
        href={item.href}
        className={itemClasses}
        title={item.description}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 truncate">{item.title}</span>
        {item.badge && (
          <Badge variant="outline" size="sm" className="ml-auto">
            {item.badge}
          </Badge>
        )}
      </Link>
    )
  }

  // 渲染品牌標題區域
  const renderBrandSection = () => {
    const brandTitles = {
      restaurant: '餐廳管理',
      supplier: '供應商入口',
      platform: '平台管理',
      admin: '系統管理'
    }

    return (
      <div className="flex h-16 items-center px-4">
        <Link href="/" className="flex items-center space-x-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg font-bold",
            getThemeClasses('primary').split(' ')[1] // 只取 bg- 類別
          )}>
            井
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-gray-900">Orderly</span>
            <span className="text-xs text-gray-500">
              {brandTitles[role]}
            </span>
          </div>
        </Link>
      </div>
    )
  }

  // 渲染用戶資訊區域
  const renderUserSection = () => {
    if (!userInfo) return null

    return (
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
            getThemeClasses('primary').split(' ')[1] // 只取 bg- 類別
          )}>
            {userInfo.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {userInfo.name}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {userInfo.email}
            </div>
          </div>
        </div>
        
        <hr className="my-3 border-gray-200" />
        
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs h-8"
          >
            個人設定
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs h-8"
          >
            登出
          </Button>
        </div>
      </div>
    )
  }

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col",
      LAYOUT_CLASSES.sidebar.width,
      LAYOUT_CLASSES.sidebar.background,
      LAYOUT_CLASSES.sidebar.border,
      "hidden lg:flex", // 大螢幕顯示，小螢幕隱藏
      className
    )}>
      {/* 品牌標題區域 */}
      {renderBrandSection()}
      
      {/* 導航區域 */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map(renderNavigationItem)}
      </nav>
      
      {/* 用戶資訊區域 */}
      {renderUserSection()}
    </aside>
  )
}

// 移動端側邊欄組件
interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
  navigationItems: NavigationItem[]
  userInfo?: UserInfo
}

export function MobileSidebar({ 
  isOpen, 
  onClose, 
  navigationItems, 
  userInfo 
}: MobileSidebarProps) {
  const pathname = usePathname()
  const { getNavigationItemClasses } = useDashboardNavigation()

  if (!isOpen) return null

  // 渲染移動端導航項目
  const renderMobileNavigationItem = (item: NavigationItem) => {
    const Icon = item.icon
    const itemClasses = getNavigationItemClasses(item, pathname)
    
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(itemClasses, "px-4 py-3")}
        onClick={onClose}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="flex-1">{item.title}</span>
        {item.badge && (
          <Badge variant="outline" size="sm">
            {item.badge}
          </Badge>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
        onClick={onClose}
      />
      
      {/* 移動端側邊欄 */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col",
        LAYOUT_CLASSES.sidebar.width,
        LAYOUT_CLASSES.sidebar.background,
        "lg:hidden"
      )}>
        {/* 頂部關閉按鈕 */}
        <div className="flex h-16 items-center justify-between px-4">
          <span className="font-bold text-lg text-gray-900">選單</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        
        {/* 導航區域 */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map(renderMobileNavigationItem)}
        </nav>
        
        {/* 移動端用戶資訊 */}
        {userInfo && (
          <div className="border-t border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-900">
              {userInfo.name}
            </div>
            <div className="text-xs text-gray-500">
              {userInfo.email}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-3"
              onClick={onClose}
            >
              登出
            </Button>
          </div>
        )}
      </aside>
    </>
  )
}