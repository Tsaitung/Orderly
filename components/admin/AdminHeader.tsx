'use client'

import Link from 'next/link'
import { 
  Shield,
  Bell,
  Settings,
  LogOut,
  User,
  Menu,
  Home
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AdminHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 h-16">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left Section - Logo and Admin Badge */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Button variant="ghost" size="sm" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">井</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Orderly</span>
          </Link>
          
          {/* Admin Badge */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-700 rounded-full">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">管理員模式</span>
          </div>
        </div>

        {/* Right Section - Actions and User Menu */}
        <div className="flex items-center space-x-4">
          {/* Quick Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <Link 
              href="/"
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>返回前台</span>
            </Link>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="sm">
            <Settings className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
            <div className="hidden md:block text-right">
              <div className="text-sm font-medium text-gray-900">管理員</div>
              <div className="text-xs text-gray-500">admin@orderly.com</div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
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