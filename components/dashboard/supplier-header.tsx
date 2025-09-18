'use client'

import * as React from 'react'
import { 
  Bell, 
  Search, 
  User, 
  LogOut, 
  Settings, 
  HelpCircle, 
  ChevronDown,
  MessageSquare,
  Star,
  TrendingUp,
  Calendar,
  DollarSign,
  Package,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AccessibleModal, ModalTrigger } from '@/components/ui/accessible-modal'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import { cn } from '@/lib/utils'

interface SupplierNotification {
  id: string
  type: 'order' | 'payment' | 'message' | 'system' | 'urgent' | 'review'
  title: string
  message: string
  timestamp: string
  isRead: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  actionUrl?: string
}

interface SupplierQuickStats {
  label: string
  value: string | number
  change?: {
    value: number
    direction: 'up' | 'down'
    isGood: boolean
  }
  icon: React.ReactNode
  color: string
}

const mockSupplierNotifications: SupplierNotification[] = [
  {
    id: '1',
    type: 'urgent',
    title: '緊急訂單確認',
    message: '「台北美食餐廳」需要您在 2 小時內確認急單 #ORD-2024-156',
    timestamp: '5 分鐘前',
    isRead: false,
    priority: 'urgent',
    actionUrl: '/supplier/orders/ORD-2024-156'
  },
  {
    id: '2',
    type: 'order',
    title: '新訂單通知',
    message: '收到來自「精緻料理」的新訂單，金額 NT$ 25,600',
    timestamp: '20 分鐘前',
    isRead: false,
    priority: 'high'
  },
  {
    id: '3',
    type: 'payment',
    title: '款項已入帳',
    message: '「美味小館」的款項 NT$ 18,900 已入帳，發票 #INV-2024-089',
    timestamp: '1 小時前',
    isRead: false,
    priority: 'medium'
  },
  {
    id: '4',
    type: 'message',
    title: '客戶訊息',
    message: '「家常菜館」詢問明日蔬菜供應狀況',
    timestamp: '2 小時前',
    isRead: true,
    priority: 'medium'
  },
  {
    id: '5',
    type: 'review',
    title: '客戶評價',
    message: '「高級餐廳」給了您 5 星好評：「品質優良，準時送達」',
    timestamp: '3 小時前',
    isRead: true,
    priority: 'low'
  }
]

export default function SupplierHeader() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [notifications, setNotifications] = React.useState(mockSupplierNotifications)
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false)
  const [isProfileOpen, setIsProfileOpen] = React.useState(false)
  const [isQuickStatsOpen, setIsQuickStatsOpen] = React.useState(false)
  const { announcePolite } = useScreenReaderAnnouncer()

  const unreadCount = notifications.filter(n => !n.isRead).length
  const urgentCount = notifications.filter(n => n.priority === 'urgent' && !n.isRead).length

  // 供應商快速統計
  const quickStats: SupplierQuickStats[] = [
    {
      label: '今日訂單',
      value: 12,
      change: { value: 25, direction: 'up', isGood: true },
      icon: <Package className="h-4 w-4" />,
      color: 'text-blue-600'
    },
    {
      label: '本月營收',
      value: 'NT$ 125K',
      change: { value: 18, direction: 'up', isGood: true },
      icon: <DollarSign className="h-4 w-4" />,
      color: 'text-green-600'
    },
    {
      label: '待處理訂單',
      value: 8,
      change: { value: 12, direction: 'down', isGood: true },
      icon: <Clock className="h-4 w-4" />,
      color: 'text-yellow-600'
    },
    {
      label: '客戶評分',
      value: '4.8★',
      change: { value: 0.2, direction: 'up', isGood: true },
      icon: <Star className="h-4 w-4" />,
      color: 'text-purple-600'
    }
  ]

  const handleSearch = React.useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      announcePolite(`搜尋「${searchQuery}」`)
      // TODO: 實現供應商搜尋功能
      console.log('供應商搜尋:', searchQuery)
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

  const getNotificationIcon = (type: SupplierNotification['type']) => {
    switch (type) {
      case 'urgent': return '🚨'
      case 'order': return '📋'
      case 'payment': return '💰'
      case 'message': return '💬'
      case 'system': return '⚙️'
      case 'review': return '⭐'
      default: return '📢'
    }
  }

  const getNotificationBadgeVariant = (type: SupplierNotification['type'], priority: SupplierNotification['priority']) => {
    if (priority === 'urgent') return 'destructive'
    switch (type) {
      case 'payment': return 'success'
      case 'order': return 'info'
      case 'message': return 'warning'
      case 'review': return 'success'
      default: return 'secondary'
    }
  }

  const getPriorityText = (priority: SupplierNotification['priority']) => {
    switch (priority) {
      case 'urgent': return '緊急'
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
    }
  }

  return (
    <header className="bg-white border-b border-blue-200 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* 搜尋區域 */}
        <div className="flex-1 max-w-xl">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="search"
                placeholder="搜尋訂單、客戶或產品..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                aria-label="搜尋訂單、客戶或產品"
              />
            </div>
          </form>
        </div>

        {/* 功能按鈕區域 */}
        <div className="flex items-center space-x-4">
          {/* 快速統計 */}
          <ModalTrigger
            modal={
              <AccessibleModal
                isOpen={isQuickStatsOpen}
                onClose={() => setIsQuickStatsOpen(false)}
                title="營運快報"
                description="您的供應商業務重要指標"
                size="lg"
              >
                <div className="grid grid-cols-2 gap-4">
                  {quickStats.map((stat, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className={cn('p-2 rounded-lg', `${stat.color} bg-opacity-10`)}>
                          {stat.icon}
                        </div>
                        {stat.change && (
                          <div className={cn(
                            'text-sm font-medium',
                            stat.change.isGood ? 'text-green-600' : 'text-red-600'
                          )}>
                            {stat.change.direction === 'up' ? '↗' : '↘'} {stat.change.value}%
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className={cn('text-2xl font-bold', stat.color)}>
                          {stat.value}
                        </div>
                        <div className="text-sm text-gray-600">
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">本週表現亮點</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 訂單準時完成率達 98.5%，超越同行平均</li>
                    <li>• 客戶滿意度提升 0.2 分，獲得 15 則五星好評</li>
                    <li>• 新增 3 家優質餐廳客戶，擴大市場覆蓋</li>
                  </ul>
                </div>
              </AccessibleModal>
            }
          >
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex items-center space-x-2 text-blue-700 hover:bg-blue-50"
            >
              <TrendingUp className="h-4 w-4" />
              <span>營運快報</span>
            </Button>
          </ModalTrigger>

          {/* 即時訊息 */}
          <Button
            variant="ghost"
            size="sm"
            className="relative text-blue-700 hover:bg-blue-50"
            aria-label="即時訊息"
          >
            <MessageSquare className="h-5 w-5" />
            <Badge 
              variant="success"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              3
            </Badge>
          </Button>

          {/* 通知中心 */}
          <ModalTrigger
            modal={
              <AccessibleModal
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
                title="通知中心"
                description={`您有 ${unreadCount} 則未讀通知${urgentCount > 0 ? `，其中 ${urgentCount} 則緊急` : ''}`}
                size="lg"
              >
                <div className="space-y-4">
                  {/* 通知統計 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{urgentCount}</div>
                      <div className="text-sm text-red-700">緊急</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
                      <div className="text-sm text-blue-700">未讀</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">{notifications.length}</div>
                      <div className="text-sm text-gray-700">總計</div>
                    </div>
                  </div>

                  {/* 通知操作 */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      最近 24 小時通知
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
                            : notification.priority === 'urgent'
                            ? 'bg-red-50 border-red-200 hover:bg-red-100'
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
                                variant={getNotificationBadgeVariant(notification.type, notification.priority)}
                                size="sm"
                              >
                                {getPriorityText(notification.priority)}
                              </Badge>
                              {!notification.isRead && (
                                <div 
                                  className={cn(
                                    'w-2 h-2 rounded-full',
                                    notification.priority === 'urgent' ? 'bg-red-500' : 'bg-blue-500'
                                  )}
                                  aria-label="未讀通知"
                                />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-400">
                                {notification.timestamp}
                              </p>
                              {notification.actionUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-6"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    announcePolite('導航到相關頁面')
                                  }}
                                >
                                  查看詳情
                                </Button>
                              )}
                            </div>
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
              className="relative text-blue-700 hover:bg-blue-50"
              aria-label={`通知中心，${unreadCount} 則未讀通知${urgentCount > 0 ? `，${urgentCount} 則緊急` : ''}`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant={urgentCount > 0 ? "destructive" : "info"}
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  aria-hidden="true"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </ModalTrigger>

          {/* 供應商使用者選單 */}
          <ModalTrigger
            modal={
              <AccessibleModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                title="供應商帳戶"
                size="sm"
              >
                <div className="space-y-4">
                  {/* 供應商資訊 */}
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xl">優</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">優質食材供應商</p>
                      <p className="text-sm text-blue-600">SUP-2024-001</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="success" size="sm">金牌供應商</Badge>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-xs text-gray-600">4.8/5.0</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 快速資訊 */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900">合作時間</div>
                      <div className="text-blue-600">2年3個月</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900">本月訂單</div>
                      <div className="text-green-600">156 筆</div>
                    </div>
                  </div>

                  {/* 選單項目 */}
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setIsProfileOpen(false)
                        announcePolite('導航到供應商設定')
                      }}
                    >
                      <User className="h-4 w-4 mr-2" />
                      供應商資料
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setIsProfileOpen(false)
                        announcePolite('導航到帳戶設定')
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      帳戶設定
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setIsProfileOpen(false)
                        announcePolite('導航到訂閱方案')
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      訂閱方案
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
                        announcePolite('正在登出供應商帳戶')
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
              className="flex items-center space-x-2 px-3 text-blue-700 hover:bg-blue-50"
              aria-label="供應商帳戶選單"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">優</span>
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium">優質食材</div>
                <div className="text-xs text-gray-600">金牌供應商</div>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </ModalTrigger>
        </div>
      </div>
    </header>
  )
}