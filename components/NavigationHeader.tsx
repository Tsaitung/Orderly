'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChefHat, Truck, Home, Menu, X, UserCircle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function NavigationHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = [
    { title: '首頁', href: '/', icon: <Home className="h-4 w-4" /> },
    { title: '餐廳', href: '/restaurant', icon: <ChefHat className="h-4 w-4" /> },
    { title: '供應商', href: '/supplier', icon: <Truck className="h-4 w-4" /> },
    { title: '平台管理', href: '/admin', icon: <Shield className="h-4 w-4" /> }
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">井</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Orderly</span>
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
            <Button variant="ghost" size="sm" className="text-gray-700">
              <UserCircle className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">登入</span>
            </Button>

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
              <Button variant="outline" className="w-full justify-start" size="sm">
                <UserCircle className="h-4 w-4 mr-2" />
                登入
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}