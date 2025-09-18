'use client'

import Link from 'next/link'
import { useState } from 'react'
import { 
  ChefHat, 
  Truck, 
  Home, 
  Menu, 
  X,
  LogIn,
  UserCircle,
  Settings,
  Bell,
  HelpCircle,
  Shield,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function NavigationHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'restaurant' | 'supplier' | 'admin' | null>(null)

  // 主導航 - 始終顯示的核心功能
  const primaryNavigation = [
    {
      title: '首頁',
      shortTitle: '首頁',
      href: '/',
      icon: <Home className="h-4 w-4" />
    },
    {
      title: '餐廳入口',
      shortTitle: '餐廳',
      href: '/restaurant',
      icon: <ChefHat className="h-4 w-4" />,
      role: 'restaurant' as const
    },
    {
      title: '供應商入口',
      shortTitle: '供應商',
      href: '/supplier',
      icon: <Truck className="h-4 w-4" />,
      role: 'supplier' as const
    }
  ]

  // 次導航 - 放在下拉菜單中
  const secondaryNavigation = [
    {
      title: '平台管理',
      href: '/admin',
      icon: <Shield className="h-4 w-4" />,
      role: 'admin' as const,
      special: true
    },
    {
      title: '說明文件',
      href: '/docs',
      icon: <HelpCircle className="h-4 w-4" />
    }
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-6">
        <div className="flex h-20 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">井</span>
              </div>
              <span className="font-bold text-2xl text-gray-900">Orderly</span>
            </Link>
            
            {/* Role Indicator - 響應式顯示 */}
            {selectedRole && (
              <div className={cn(
                "px-2 lg:px-3 py-1 rounded-full text-xs font-medium transition-all",
                selectedRole === 'restaurant' 
                  ? "bg-primary-100 text-primary-700"
                  : selectedRole === 'supplier'
                  ? "bg-blue-100 text-blue-700"
                  : "bg-red-100 text-red-700"
              )}>
                <span className="lg:inline hidden">
                  {selectedRole === 'restaurant' 
                    ? '餐廳模式' 
                    : selectedRole === 'supplier' 
                    ? '供應商模式'
                    : '管理員模式'}
                </span>
                <span className="lg:hidden">
                  {selectedRole === 'restaurant' 
                    ? '餐廳' 
                    : selectedRole === 'supplier' 
                    ? '供應商'
                    : '管理員'}
                </span>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {primaryNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200",
                  item.role === selectedRole 
                    ? "text-primary-600 bg-primary-50" 
                    : "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                )}
                onClick={() => item.role && setSelectedRole(item.role)}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              <UserCircle className="h-5 w-5 mr-2" />
              <span>用戶</span>
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden min-h-[44px] min-w-[44px] p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="container mx-auto px-4 py-4 space-y-2">
            {/* 主導航 */}
            {primaryNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
                  item.role === selectedRole 
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => {
                  item.role && setSelectedRole(item.role)
                  setIsMobileMenuOpen(false)
                }}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            ))}
            
            {/* 次導航 */}
            <div className="pt-2 border-t border-gray-200">
              {secondaryNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
                    item.role === selectedRole 
                      ? item.special 
                        ? "bg-red-50 text-red-700" 
                        : "bg-primary-50 text-primary-700"
                      : "text-gray-700 hover:bg-gray-50",
                    item.special && "font-semibold"
                  )}
                  onClick={() => {
                    item.role && setSelectedRole(item.role)
                    setIsMobileMenuOpen(false)
                  }}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              ))}
            </div>
            
            <div className="pt-4 border-t border-gray-200 space-y-2">
              <Button variant="outline" className="w-full justify-start min-h-[44px]" size="sm">
                <LogIn className="h-4 w-4 mr-2" />
                登入
              </Button>
              <Button variant="solid" colorScheme="primary" className="w-full justify-start min-h-[44px]" size="sm">
                <UserCircle className="h-4 w-4 mr-2" />
                註冊體驗
              </Button>
              <Button variant="ghost" className="w-full justify-start min-h-[44px]" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                設定
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}