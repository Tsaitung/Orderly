'use client'

import Link from 'next/link'
import { Shield, Bell, Settings, LogOut, User, Menu, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AdminHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 h-16 border-b border-gray-200 bg-white">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left Section - Logo and Admin Badge */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Button variant="ghost" size="sm" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <span className="text-lg font-bold text-white">井</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Orderly</span>
          </Link>

          {/* Admin Badge */}
          <div className="flex items-center space-x-2 rounded-full bg-red-100 px-3 py-1 text-red-700">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">管理員模式</span>
          </div>
        </div>

        {/* Right Section - Actions and User Menu */}
        <div className="flex items-center space-x-4">
          {/* Quick Actions */}
          <div className="hidden items-center space-x-2 md:flex">
            <Link
              href="/"
              className="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              <Home className="h-4 w-4" />
              <span>返回前台</span>
            </Link>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="sm">
            <Settings className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <div className="flex items-center space-x-3 border-l border-gray-200 pl-3">
            <div className="hidden text-right md:block">
              <div className="text-sm font-medium text-gray-900">管理員</div>
              <div className="text-xs text-gray-500">admin@orderly.com</div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                <User className="h-4 w-4 text-gray-600" />
              </div>
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
