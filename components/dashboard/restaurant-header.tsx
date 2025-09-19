'use client'

import * as React from 'react'
import { Bell, Search, User, LogOut, Settings, HelpCircle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AccessibleModal, ModalTrigger } from '@/components/ui/accessible-modal'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import { cn } from '@/lib/utils'

interface NotificationItem {
  id: string
  type: 'order' | 'acceptance' | 'system' | 'urgent'
  title: string
  message: string
  timestamp: string
  isRead: boolean
}

const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'urgent',
    title: '緊急訂單異常',
    message: '供應商「新鮮蔬果」的今日訂單出現價格差異，需要立即處理',
    timestamp: '2 分鐘前',
    isRead: false
  },
  {
    id: '2',
    type: 'acceptance',
    title: '驗收待處理',
    message: '有 3 筆貨物送達等待驗收確認',
    timestamp: '15 分鐘前',
    isRead: false
  },
  {
    id: '3',
    type: 'order',
    title: '訂單狀態更新',
    message: '訂單 #12345 已確認，預計明日上午送達',
    timestamp: '1 小時前',
    isRead: true
  }
]

export default function RestaurantHeader() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [notifications, setNotifications] = React.useState(mockNotifications)
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false)
  const [isProfileOpen, setIsProfileOpen] = React.useState(false)
  const { announcePolite } = useScreenReaderAnnouncer()

  const unreadCount = notifications.filter(n => !n.isRead).length

  const handleSearch = React.useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      announcePolite(`搜尋「${searchQuery}」`)
      // TODO: 實現搜尋功能
      console.log('搜尋:', searchQuery)
    }
  }, [searchQuery, announcePolite])

  const markNotificationAsRead = React.useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true }
          : notification
      )
    )
    announcePolite('通知已標記為已讀')
  }, [announcePolite])

  const markAllAsRead = React.useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    )
    announcePolite('所有通知已標記為已讀')
  }, [announcePolite])

  const getNotificationBadgeVariant = (type: NotificationItem['type']) => {
    switch (type) {
      case 'urgent': return 'destructive'
      case 'acceptance': return 'warning'
      case 'order': return 'info'
      case 'system': return 'secondary'
      default: return 'secondary'
    }
  }

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'urgent': return '🚨'
      case 'acceptance': return '📦'
      case 'order': return '📋'
      case 'system': return '⚙️'
      default: return '📢'
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 搜尋區域 */}
        <div className="flex-1 max-w-xl">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="search"
                placeholder="搜尋訂單、供應商或產品..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-9"
                aria-label="搜尋訂單、供應商或產品"
              />
            </div>
          </form>
        </div>

        {/* 功能按鈕區域 */}
        <div className="flex items-center space-x-4">
          {/* 通知按鈕 */}
          <ModalTrigger
            modal={
              <AccessibleModal
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
                title="系統通知"
                description={`您有 ${unreadCount} 則未讀通知`}
                size="lg"
              >
                <div className="space-y-4">
                  {/* 通知操作 */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      共 {notifications.length} 則通知
                    </p>
                    {unreadCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={markAllAsRead}
                      >
                        全部標為已讀
                      </Button>
                    )}
                  </div>

                  {/* 通知列表 */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          'p-4 rounded-lg border cursor-pointer transition-colors',
                          notification.isRead 
                            ? 'bg-gray-50 border-gray-200' 
                            : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                        )}
                        onClick={() => markNotificationAsRead(notification.id)}
                        role="button"
                        tabIndex={0}
                        aria-pressed={notification.isRead}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            markNotificationAsRead(notification.id)
                          }
                        }}
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-lg" role="img" aria-hidden="true">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-gray-900">
                                {notification.title}
                              </h4>
                              <Badge 
                                variant={getNotificationBadgeVariant(notification.type)}
                                size="sm"
                              >
                                {notification.type === 'urgent' ? '緊急' :
                                 notification.type === 'acceptance' ? '驗收' :
                                 notification.type === 'order' ? '訂單' : '系統'}
                              </Badge>
                              {!notification.isRead && (
                                <div 
                                  className="w-2 h-2 bg-blue-500 rounded-full"
                                  aria-label="未讀通知"
                                />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400">
                              {notification.timestamp}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </AccessibleModal>
            }
          >
            <Button
              variant="ghost"
              size="sm"
              className="relative p-2"
              aria-label={`通知中心，${unreadCount} 則未讀通知`}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs"
                  aria-hidden="true"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </ModalTrigger>

          {/* 使用者選單 */}
          <ModalTrigger
            modal={
              <AccessibleModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                title="使用者選單"
                size="sm"
              >
                <div className="space-y-4">
                  {/* 使用者資訊 */}
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">張</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">張小明</p>
                      <p className="text-sm text-gray-500">餐廳管理員</p>
                      <p className="text-xs text-gray-400">restaurant@example.com</p>
                    </div>
                  </div>

                  {/* 選單項目 */}
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setIsProfileOpen(false)
                        announcePolite('導航到個人設定')
                      }}
                    >
                      <User className="h-4 w-4 mr-2" />
                      個人設定
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setIsProfileOpen(false)
                        announcePolite('導航到系統設定')
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      系統設定
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setIsProfileOpen(false)
                        announcePolite('導航到幫助中心')
                      }}
                    >
                      <HelpCircle className="h-4 w-4 mr-2" />
                      幫助中心
                    </Button>
                    <hr className="my-2" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setIsProfileOpen(false)
                        announcePolite('正在登出')
                        // TODO: 實現登出功能
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      登出
                    </Button>
                  </div>
                </div>
              </AccessibleModal>
            }
          >
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 px-3 h-9"
              aria-label="使用者選單"
            >
              <div className="w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">張</span>
              </div>
              <span className="hidden md:block text-sm font-medium">張小明</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </ModalTrigger>
        </div>
      </div>
    </header>
  )
}