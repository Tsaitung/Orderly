'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star,
  TrendingUp,
  MessageSquare,
  Eye,
  Edit,
  MoreVertical,
  Building,
  User,
  ShoppingCart,
  Clock,
  Award,
  AlertTriangle
} from 'lucide-react'

interface CustomerListProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

// 模擬客戶數據
const mockCustomers = [
  {
    id: 'CUST-001',
    name: '大樂司餐廳',
    type: 'restaurant',
    contactPerson: '王經理',
    phone: '02-2345-6789',
    email: 'manager@dalosse.com.tw',
    address: '台北市大安區忠孝東路四段123號',
    region: 'taipei',
    segment: 'champions',
    registrationDate: new Date('2023-03-15'),
    lastOrderDate: new Date('2025-09-17'),
    daysSinceLastOrder: 1,
    rfmScore: { r: 5, f: 5, m: 5 },
    metrics: {
      totalOrders: 89,
      totalSpent: 456780,
      avgOrderValue: 5130,
      frequency: 8.2,
      lifetimeValue: 456780,
      satisfaction: 4.8,
      loyaltyPoints: 2340
    },
    status: 'active',
    tags: ['VIP客戶', '高消費', '忠誠客戶'],
    lastActivity: {
      type: 'order',
      description: '下單購買有機蔬菜包',
      date: new Date('2025-09-17')
    },
    recentCommunications: [
      {
        type: 'call',
        subject: '新品推薦電話',
        date: new Date('2025-09-15'),
        status: 'completed'
      },
      {
        type: 'email',
        subject: '月度對帳通知',
        date: new Date('2025-09-10'),
        status: 'sent'
      }
    ]
  },
  {
    id: 'CUST-002',
    name: '稻舍餐廳',
    type: 'restaurant',
    contactPerson: '林總監',
    phone: '02-8765-4321',
    email: 'director@rice-house.com.tw',
    address: '台北市信義區市府路45號',
    region: 'taipei',
    segment: 'loyal',
    registrationDate: new Date('2023-07-22'),
    lastOrderDate: new Date('2025-09-12'),
    daysSinceLastOrder: 6,
    rfmScore: { r: 4, f: 5, m: 4 },
    metrics: {
      totalOrders: 67,
      totalSpent: 234560,
      avgOrderValue: 3500,
      frequency: 5.8,
      lifetimeValue: 234560,
      satisfaction: 4.5,
      loyaltyPoints: 1680
    },
    status: 'active',
    tags: ['穩定客戶', '定期訂購'],
    lastActivity: {
      type: 'order',
      description: '週期性蔬菜配送訂單',
      date: new Date('2025-09-12')
    },
    recentCommunications: [
      {
        type: 'visit',
        subject: '實地拜訪洽談',
        date: new Date('2025-09-08'),
        status: 'completed'
      }
    ]
  },
  {
    id: 'CUST-003',
    name: '樂多多火鍋',
    type: 'restaurant',
    contactPerson: '陳店長',
    phone: '04-2234-5678',
    email: 'manager@happypot.com.tw',
    address: '台中市西屯區文心路三段789號',
    region: 'taichung',
    segment: 'potential',
    registrationDate: new Date('2024-11-05'),
    lastOrderDate: new Date('2025-09-16'),
    daysSinceLastOrder: 2,
    rfmScore: { r: 5, f: 2, m: 4 },
    metrics: {
      totalOrders: 23,
      totalSpent: 89450,
      avgOrderValue: 3890,
      frequency: 2.1,
      lifetimeValue: 89450,
      satisfaction: 4.2,
      loyaltyPoints: 450
    },
    status: 'active',
    tags: ['新客戶', '潛力客戶'],
    lastActivity: {
      type: 'order',
      description: '火鍋食材採購',
      date: new Date('2025-09-16')
    },
    recentCommunications: [
      {
        type: 'email',
        subject: '歡迎新客戶優惠方案',
        date: new Date('2025-09-01'),
        status: 'opened'
      }
    ]
  },
  {
    id: 'CUST-004',
    name: '五星大飯店',
    type: 'hotel',
    contactPerson: '張採購',
    phone: '07-1234-5678',
    email: 'purchasing@fivestar.com.tw',
    address: '高雄市前鎮區民權二路567號',
    region: 'kaohsiung',
    segment: 'at_risk',
    registrationDate: new Date('2022-12-10'),
    lastOrderDate: new Date('2025-07-15'),
    daysSinceLastOrder: 65,
    rfmScore: { r: 2, f: 4, m: 5 },
    metrics: {
      totalOrders: 156,
      totalSpent: 1234567,
      avgOrderValue: 7915,
      frequency: 1.2,
      lifetimeValue: 1234567,
      satisfaction: 3.8,
      loyaltyPoints: 5680
    },
    status: 'at_risk',
    tags: ['高價值', '流失風險', '需要關注'],
    lastActivity: {
      type: 'inquiry',
      description: '詢問特殊食材供應',
      date: new Date('2025-08-20')
    },
    recentCommunications: [
      {
        type: 'email',
        subject: '關懷回訪邀請',
        date: new Date('2025-08-25'),
        status: 'pending'
      },
      {
        type: 'call',
        subject: '流失客戶挽回電話',
        date: new Date('2025-08-20'),
        status: 'no_answer'
      }
    ]
  }
]

export default function CustomerList({ searchParams }: CustomerListProps) {
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null)

  const getSegmentInfo = (segment: string) => {
    const segmentMap = {
      champions: { label: '冠軍客戶', variant: 'success' as const, color: 'text-emerald-600' },
      loyal: { label: '忠誠客戶', variant: 'info' as const, color: 'text-blue-600' },
      potential: { label: '潛力客戶', variant: 'warning' as const, color: 'text-purple-600' },
      new: { label: '新客戶', variant: 'info' as const, color: 'text-orange-600' },
      at_risk: { label: '流失風險', variant: 'destructive' as const, color: 'text-red-600' }
    }
    return segmentMap[segment as keyof typeof segmentMap] || segmentMap.potential
  }

  const getStatusInfo = (status: string) => {
    const statusMap = {
      active: { label: '活躍', variant: 'success' as const },
      inactive: { label: '不活躍', variant: 'warning' as const },
      at_risk: { label: '流失風險', variant: 'destructive' as const },
      churned: { label: '已流失', variant: 'destructive' as const }
    }
    return statusMap[status as keyof typeof statusMap] || statusMap.active
  }

  const getCustomerTypeIcon = (type: string) => {
    const typeMap = {
      restaurant: Building,
      hotel: Building,
      catering: Building,
      retail: Building
    }
    return typeMap[type as keyof typeof typeMap] || Building
  }

  const getCommunicationIcon = (type: string) => {
    const iconMap = {
      call: Phone,
      email: Mail,
      visit: User,
      message: MessageSquare
    }
    return iconMap[type as keyof typeof iconMap] || MessageSquare
  }

  const toggleCustomerExpansion = (customerId: string) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId)
  }

  const toggleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const selectAllCustomers = () => {
    setSelectedCustomers(mockCustomers.map(c => c.id))
  }

  const clearSelection = () => {
    setSelectedCustomers([])
  }

  return (
    <Card className="p-6">
      {/* 列表標題與批量操作 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">客戶列表</h2>
          <Badge variant="outline">共 {mockCustomers.length} 位客戶</Badge>
        </div>

        {selectedCustomers.length > 0 && (
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              已選取 {selectedCustomers.length} 位
            </span>
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              群發訊息
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              發送郵件
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              取消選取
            </Button>
          </div>
        )}
      </div>

      {/* 全選控制 */}
      <div className="flex items-center space-x-4 mb-4 pb-4 border-b">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedCustomers.length === mockCustomers.length}
            onChange={selectedCustomers.length === mockCustomers.length ? clearSelection : selectAllCustomers}
            className="rounded text-blue-600"
          />
          <span className="text-sm text-gray-700">全選</span>
        </label>
        <span className="text-sm text-gray-500">
          顯示 1-{mockCustomers.length} 位，共 456 位客戶
        </span>
      </div>

      {/* 客戶列表 */}
      <div className="space-y-4">
        {mockCustomers.map((customer) => {
          const segmentInfo = getSegmentInfo(customer.segment)
          const statusInfo = getStatusInfo(customer.status)
          const CustomerTypeIcon = getCustomerTypeIcon(customer.type)
          const isExpanded = expandedCustomer === customer.id
          const isSelected = selectedCustomers.includes(customer.id)

          return (
            <div 
              key={customer.id} 
              className={`border rounded-lg transition-all duration-200 ${
                isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center space-x-4">
                  {/* 選擇框 */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectCustomer(customer.id)}
                    className="rounded text-blue-600"
                  />

                  {/* 客戶頭像/圖標 */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <CustomerTypeIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>

                  {/* 客戶基本資訊 */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div className="md:col-span-2">
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <User className="h-3 w-3 mr-1" />
                        {customer.contactPerson}
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant={segmentInfo.variant} size="sm">
                          {segmentInfo.label}
                        </Badge>
                        {customer.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" size="sm">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="font-semibold text-blue-600">
                        {formatCurrency(customer.metrics.lifetimeValue)}
                      </div>
                      <div className="text-xs text-gray-500">客戶價值</div>
                      <div className="text-xs text-gray-500">
                        {customer.metrics.totalOrders} 筆訂單
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="font-semibold text-green-600">
                        {formatCurrency(customer.metrics.avgOrderValue)}
                      </div>
                      <div className="text-xs text-gray-500">平均客單價</div>
                      <div className="text-xs text-gray-500">
                        頻率: {customer.metrics.frequency}/月
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="font-medium">{customer.metrics.satisfaction}</span>
                      </div>
                      <div className="text-xs text-gray-500">滿意度評分</div>
                      <div className="text-xs text-gray-500">
                        {customer.metrics.loyaltyPoints} 積分
                      </div>
                    </div>

                    <div className="text-center">
                      <Badge variant={statusInfo.variant} size="sm">
                        {statusInfo.label}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        {customer.daysSinceLastOrder} 天前下單
                      </div>
                      {customer.daysSinceLastOrder > 30 && (
                        <div className="flex items-center justify-center mt-1">
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleCustomerExpansion(customer.id)}
                    >
                      {isExpanded ? '收起' : '詳情'}
                    </Button>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 展開的詳細資訊 */}
              {isExpanded && (
                <div className="border-t bg-gray-50 p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 聯絡資訊 */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">聯絡資訊</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{customer.phone}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{customer.email}</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <span className="text-sm">{customer.address}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            註冊: {formatDate(customer.registrationDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RFM分析與關鍵指標 */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">RFM分析</h4>
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm text-gray-600">RFM評分</div>
                          <div className="font-mono font-medium">
                            R{customer.rfmScore.r} F{customer.rfmScore.f} M{customer.rfmScore.m}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white p-2 rounded border text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {customer.metrics.totalOrders}
                            </div>
                            <div className="text-xs text-gray-600">總訂單數</div>
                          </div>
                          <div className="bg-white p-2 rounded border text-center">
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(customer.metrics.totalSpent)}
                            </div>
                            <div className="text-xs text-gray-600">總消費額</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 最近活動與溝通記錄 */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">最近活動</h4>
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm font-medium">{customer.lastActivity.description}</div>
                          <div className="text-xs text-gray-500">
                            {formatDate(customer.lastActivity.date)}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">溝通記錄</h5>
                          <div className="space-y-2">
                            {customer.recentCommunications.map((comm, index) => {
                              const CommIcon = getCommunicationIcon(comm.type)
                              return (
                                <div key={index} className="flex items-center space-x-2 text-sm">
                                  <CommIcon className="h-3 w-3 text-gray-400" />
                                  <span className="flex-1">{comm.subject}</span>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(comm.date)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 快速操作 */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      最後更新: {formatDate(customer.lastOrderDate)}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        查看訂單
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        編輯資料
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        發送訊息
                      </Button>
                      {customer.status === 'at_risk' && (
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                          <Award className="h-4 w-4 mr-2" />
                          挽回計畫
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 分頁控制 */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <div className="text-sm text-gray-500">
          顯示第 1-4 位，共 456 位客戶
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" disabled>
            上一頁
          </Button>
          <Button variant="outline" size="sm">
            下一頁
          </Button>
        </div>
      </div>
    </Card>
  )
}