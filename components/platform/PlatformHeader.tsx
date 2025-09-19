'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Bell,
  Settings,
  User,
  LogOut,
  Shield,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function PlatformHeader() {
  const router = useRouter()
  const [notifications] = React.useState([
    { id: 1, message: '新供應商申請待審核', time: '5分鐘前', unread: true },
    { id: 2, message: '異常交易需要審查', time: '15分鐘前', unread: true },
    { id: 3, message: '系統備份完成', time: '1小時前', unread: false }
  ])

  const unreadCount = notifications.filter(n => n.unread).length

  const handleLogout = async () => {
    try {
      // 這裡應該調用登出 API
      // await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 h-16">
        {/* Logo and Platform Title */}
        <div className="flex items-center space-x-4">
          <Link 
            href="/platform" 
            className="flex items-center space-x-3 text-gray-900 hover:text-primary-600 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg">井然 Orderly</div>
              <div className="text-xs text-gray-500 -mt-1">平台管理中心</div>
            </div>
          </Link>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>通知中心</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="p-3">
                    <div className="flex items-start space-x-2 w-full">
                      <div className={`w-2 h-2 rounded-full mt-1 ${
                        notification.unread ? 'bg-blue-500' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {notification.message}
                        </div>
                        <div className="text-xs text-gray-500">
                          {notification.time}
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/platform/notifications" className="text-center w-full">
                  查看所有通知
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-600" />
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium">平台管理員</div>
                  <div className="text-xs text-gray-500">admin@orderly.com</div>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>我的帳號</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/platform/profile">
                  <User className="mr-2 h-4 w-4" />
                  個人資料
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/platform/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  系統設定
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                登出
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}