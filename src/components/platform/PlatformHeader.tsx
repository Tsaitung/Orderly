'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Settings, User, LogOut, Shield, ChevronDown } from 'lucide-react'
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
    { id: 3, message: '系統備份完成', time: '1小時前', unread: false },
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
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Logo and Platform Title */}
        <div className="flex items-center space-x-4">
          <Link
            href="/platform"
            className="flex items-center space-x-3 text-gray-900 transition-colors hover:text-primary-600"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold">井然 Orderly</div>
              <div className="-mt-1 text-xs text-gray-500">平台管理中心</div>
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
                  <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>通知中心</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-64 overflow-y-auto">
                {notifications.map(notification => (
                  <DropdownMenuItem key={notification.id} className="p-3">
                    <div className="flex w-full items-start space-x-2">
                      <div
                        className={`mt-1 h-2 w-2 rounded-full ${
                          notification.unread ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {notification.message}
                        </div>
                        <div className="text-xs text-gray-500">{notification.time}</div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/platform/notifications" className="w-full text-center">
                  查看所有通知
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                  <User className="h-4 w-4 text-primary-600" />
                </div>
                <div className="hidden text-left md:block">
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
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
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
