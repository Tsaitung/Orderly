'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChefHat, Truck, Home, Menu, X, UserCircle, Shield, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuth, useViewMode, useCanViewAsOrganization } from '@/contexts/AuthContext'
import { OrganizationSwitcher } from '@/components/platform/OrganizationSwitcher'

export function NavigationHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, currentOrganization, isAuthenticated } = useAuth()
  const viewMode = useViewMode()
  const canViewAsOrganization = useCanViewAsOrganization()

  const navigation = [
    { title: '首頁', href: '/', icon: <Home className="h-4 w-4" /> },
    { title: '餐廳', href: '/restaurant', icon: <ChefHat className="h-4 w-4" /> },
    { title: '供應商', href: '/supplier', icon: <Truck className="h-4 w-4" /> },
    { title: '平台管理', href: '/platform', icon: <Shield className="h-4 w-4" /> }
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
      {/* View Mode Banner */}
      {viewMode.isViewingAs && currentOrganization && (
        <div className="bg-orange-600 text-white py-1.5 px-4">
          <div className="container mx-auto flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>
                平台管理員檢視模式 - 正在檢視 <strong>{currentOrganization.name}</strong>
                （{currentOrganization.type === 'restaurant' ? '餐廳' : '供應商'}）
              </span>
            </div>
            <Link
              href="/platform"
              className="text-orange-100 hover:text-white underline text-sm"
            >
              返回平台管理
            </Link>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">井</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Orderly</span>
            {viewMode.isViewingAs && (
              <Badge variant="secondary" className="ml-2 text-xs bg-orange-100 text-orange-800">
                檢視模式
              </Badge>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-colors"
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-2">
            {/* Organization Switcher for platform admin */}
            {canViewAsOrganization && (
              <OrganizationSwitcher variant="compact" showLabel={false} className="hidden lg:block" />
            )}

            {/* User Info */}
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="text-gray-700">
                  <UserCircle className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">{user.name}</span>
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-gray-700">
                <UserCircle className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">登入</span>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <nav className="container mx-auto px-4 py-3 space-y-1">
            {/* View Mode Indicator for Mobile */}
            {viewMode.isViewingAs && currentOrganization && (
              <div className="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center space-x-2 text-sm text-orange-800">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium">檢視模式</span>
                </div>
                <p className="text-xs text-orange-700 mt-1">
                  正在檢視 {currentOrganization.name}
                </p>
              </div>
            )}

            {/* Organization Switcher for Mobile */}
            {canViewAsOrganization && (
              <div className="mb-3">
                <OrganizationSwitcher variant="compact" showLabel={true} className="w-full" />
              </div>
            )}

            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            ))}
            
            <div className="pt-2 border-t">
              {isAuthenticated && user ? (
                <div className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700">
                  <UserCircle className="h-4 w-4" />
                  <span>{user.name}</span>
                  {viewMode.isViewingAs && (
                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                      檢視
                    </Badge>
                  )}
                </div>
              ) : (
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <UserCircle className="h-4 w-4 mr-2" />
                  登入
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}