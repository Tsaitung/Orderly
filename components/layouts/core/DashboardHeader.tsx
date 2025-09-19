'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Search, Bell, Settings, Menu, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'
import { useDashboardTheme } from './DashboardProvider'
import { UserInfo, LAYOUT_SIZES } from './DashboardConfig'

interface DashboardHeaderProps {
  title?: string
  subtitle?: string
  userInfo?: UserInfo
  onMobileMenuToggle?: () => void
  showSearch?: boolean
  className?: string
}

export function DashboardHeader({
  title,
  subtitle,
  userInfo,
  onMobileMenuToggle,
  showSearch = true,
  className
}: DashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { role, getThemeClasses } = useDashboardTheme()

  // 渲染搜索區域
  const renderSearchSection = () => {
    if (!showSearch) return null

    const placeholders = {
      restaurant: '搜尋訂單、供應商或產品...',
      supplier: '搜尋訂單、客戶或產品...',
      platform: '搜尋用戶、訂單或數據...',
      admin: '搜尋系統設定或用戶...'
    }

    return (
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={placeholders[role]}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full"
          />
        </div>
      </div>
    )
  }

  // 渲染通知按鈕
  const renderNotificationButton = () => (
    <Button variant="ghost" size="sm" className="relative p-2">
      <Bell className="h-5 w-5" />
      <Badge 
        variant="solid" 
        size="sm" 
        className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
      >
        3
      </Badge>
    </Button>
  )

  // 渲染用戶下拉菜單
  const renderUserDropdown = () => {
    if (!userInfo) {
      return (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">
            <User className="h-4 w-4 mr-2" />
            登入
          </Link>
        </Button>
      )
    }

    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 p-2">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium",
              getThemeClasses('primary').split(' ')[1] // 只取 bg- 類別
            )}>
              {userInfo.name.charAt(0)}
            </div>
            <span className="hidden sm:inline text-sm font-medium">
              {userInfo.name}
            </span>
          </Button>
        </DropdownMenu.Trigger>
        
        <DropdownMenu.Portal>
          <DropdownMenu.Content 
            className="min-w-56 bg-white rounded-md shadow-md border border-gray-200 p-1"
            sideOffset={5}
          >
            <DropdownMenu.Item className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 rounded-sm">
              <User className="h-4 w-4 mr-2" />
              個人資料
            </DropdownMenu.Item>
            
            <DropdownMenu.Item className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 rounded-sm">
              <Settings className="h-4 w-4 mr-2" />
              帳戶設定
            </DropdownMenu.Item>
            
            <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
            
            <DropdownMenu.Item className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 rounded-sm text-red-600">
              登出
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    )
  }

  // 渲染標題區域
  const renderTitleSection = () => {
    if (!title) return null

    return (
      <div className="hidden md:block">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
    )
  }

  return (
    <header 
      className={cn(
        "bg-white border-b border-gray-200",
        className
      )}
      style={{ height: LAYOUT_SIZES.headerHeight }}
    >
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        {/* 左側：移動端菜單按鈕 + 標題 */}
        <div className="flex items-center space-x-4">
          {/* 移動端菜單按鈕 */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden p-2"
            onClick={onMobileMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* 標題區域 */}
          {renderTitleSection()}
        </div>

        {/* 中間：搜索區域 */}
        {renderSearchSection()}

        {/* 右側：通知 + 用戶菜單 */}
        <div className="flex items-center space-x-2">
          {renderNotificationButton()}
          {renderUserDropdown()}
        </div>
      </div>
    </header>
  )
}