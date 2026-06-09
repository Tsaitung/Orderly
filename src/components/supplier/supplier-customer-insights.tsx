'use client'

import * as React from 'react'
import {
  Users,
  TrendingUp,
  TrendingDown,
  Star,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  AlertCircle,
  Eye,
  BarChart3,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import { cn } from '@/lib/utils'

interface CustomerData {
  id: string
  name: string
  type: 'premium' | 'standard' | 'new'
  monthlyVolume: number
  totalSpent: number
  growthRate: number
  rating: number
  lastOrderDate: string
  paymentDays: number
  communicationFrequency: 'high' | 'medium' | 'low'
  preferredCategories: string[]
  riskLevel: 'low' | 'medium' | 'high'
  contact: {
    person: string
    phone: string
    email: string
    address: string
  }
}

const mockCustomerData: CustomerData[] = [
  {
    id: '1',
    name: '台北美食餐廳',
    type: 'premium',
    monthlyVolume: 45600,
    totalSpent: 156000,
    growthRate: 15.2,
    rating: 4.8,
    lastOrderDate: '2024-01-15',
    paymentDays: 12,
    communicationFrequency: 'high',
    preferredCategories: ['蔬菜類', '肉品類'],
    riskLevel: 'low',
    contact: {
      person: '張經理',
      phone: '02-1234-5678',
      email: 'manager@taipei-food.com',
      address: '台北市信義區忠孝東路四段 123 號',
    },
  },
  {
    id: '2',
    name: '精緻料理',
    type: 'premium',
    monthlyVolume: 38200,
    totalSpent: 128000,
    growthRate: 8.5,
    rating: 4.9,
    lastOrderDate: '2024-01-14',
    paymentDays: 15,
    communicationFrequency: 'medium',
    preferredCategories: ['海鮮類', '高級食材'],
    riskLevel: 'low',
    contact: {
      person: '李主廚',
      phone: '02-2345-6789',
      email: 'chef@deluxe-cuisine.com',
      address: '台北市大安區敦化南路二段 456 號',
    },
  },
  {
    id: '3',
    name: '美味小館',
    type: 'standard',
    monthlyVolume: 18500,
    totalSpent: 62000,
    growthRate: -2.1,
    rating: 4.2,
    lastOrderDate: '2024-01-13',
    paymentDays: 35,
    communicationFrequency: 'low',
    preferredCategories: ['海鮮類', '調味料'],
    riskLevel: 'medium',
    contact: {
      person: '王老闆',
      phone: '02-3456-7890',
      email: 'owner@tasty-diner.com',
      address: '台北市中山區南京東路三段 789 號',
    },
  },
  {
    id: '4',
    name: '家常菜館',
    type: 'standard',
    monthlyVolume: 12800,
    totalSpent: 45000,
    growthRate: 5.3,
    rating: 4.0,
    lastOrderDate: '2024-01-12',
    paymentDays: 25,
    communicationFrequency: 'medium',
    preferredCategories: ['蔬菜類', '基本食材'],
    riskLevel: 'low',
    contact: {
      person: '陳大姐',
      phone: '02-4567-8901',
      email: 'chen@family-kitchen.com',
      address: '台北市萬華區西門街 101 號',
    },
  },
  {
    id: '5',
    name: '新開創意餐廳',
    type: 'new',
    monthlyVolume: 8200,
    totalSpent: 15000,
    growthRate: 0,
    rating: 0,
    lastOrderDate: '2024-01-15',
    paymentDays: 20,
    communicationFrequency: 'high',
    preferredCategories: ['創意食材', '有機蔬菜'],
    riskLevel: 'medium',
    contact: {
      person: '林主廚',
      phone: '02-5678-9012',
      email: 'lin@creative-restaurant.com',
      address: '台北市松山區民生東路五段 202 號',
    },
  },
]

export default function SupplierCustomerInsights() {
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerData | null>(null)
  const [viewMode, setViewMode] = React.useState<'overview' | 'detailed'>('overview')
  const { announcePolite, announceSuccess } = useScreenReaderAnnouncer()

  const totalCustomers = mockCustomerData.length
  const premiumCustomers = mockCustomerData.filter(c => c.type === 'premium').length
  const avgRating =
    mockCustomerData.filter(c => c.rating > 0).reduce((sum, c) => sum + c.rating, 0) /
    mockCustomerData.filter(c => c.rating > 0).length
  const avgPaymentDays =
    mockCustomerData.reduce((sum, c) => sum + c.paymentDays, 0) / totalCustomers

  const getTypeColor = (type: CustomerData['type']) => {
    switch (type) {
      case 'premium':
        return 'bg-purple-100 text-purple-800'
      case 'standard':
        return 'bg-blue-100 text-blue-800'
      case 'new':
        return 'bg-green-100 text-green-800'
    }
  }

  const getTypeText = (type: CustomerData['type']) => {
    switch (type) {
      case 'premium':
        return '頂級客戶'
      case 'standard':
        return '標準客戶'
      case 'new':
        return '新客戶'
    }
  }

  const getRiskColor = (risk: CustomerData['riskLevel']) => {
    switch (risk) {
      case 'low':
        return 'text-green-600'
      case 'medium':
        return 'text-yellow-600'
      case 'high':
        return 'text-red-600'
    }
  }

  const getRiskText = (risk: CustomerData['riskLevel']) => {
    switch (risk) {
      case 'low':
        return '低風險'
      case 'medium':
        return '中風險'
      case 'high':
        return '高風險'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW')
  }

  const handleCustomerSelect = React.useCallback(
    (customer: CustomerData) => {
      setSelectedCustomer(customer)
      announcePolite(`已選擇客戶：${customer.name}`)
    },
    [announcePolite]
  )

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>客戶洞察分析</span>
          </CardTitle>

          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'overview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('overview')}
            >
              概覽
            </Button>
            <Button
              variant={viewMode === 'detailed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('detailed')}
            >
              詳細
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {viewMode === 'overview' ? (
          <>
            {/* 客戶概況指標 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">總客戶數</p>
                    <p className="text-2xl font-bold text-blue-700">{totalCustomers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">頂級客戶</p>
                    <p className="text-2xl font-bold text-purple-700">{premiumCustomers}</p>
                  </div>
                  <Award className="h-8 w-8 text-purple-500" />
                </div>
              </div>

              <div className="rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">平均評分</p>
                    <p className="text-2xl font-bold text-yellow-700">{avgRating.toFixed(1)}</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
              </div>

              <div className="rounded-lg bg-gradient-to-r from-green-50 to-green-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">平均付款天數</p>
                    <p className="text-2xl font-bold text-green-700">
                      {Math.round(avgPaymentDays)}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </div>

            {/* 頂級客戶列表 */}
            <div className="space-y-3">
              <h4 className="flex items-center space-x-2 font-medium text-gray-900">
                <BarChart3 className="h-4 w-4" />
                <span>客戶表現排行</span>
              </h4>

              {mockCustomerData
                .sort((a, b) => b.monthlyVolume - a.monthlyVolume)
                .slice(0, 3)
                .map((customer, index) => (
                  <div
                    key={customer.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                          index === 0
                            ? 'bg-yellow-400 text-yellow-900'
                            : index === 1
                              ? 'bg-gray-400 text-gray-900'
                              : 'bg-orange-400 text-orange-900'
                        )}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{customer.name}</span>
                          <Badge className={getTypeColor(customer.type)} size="sm">
                            {getTypeText(customer.type)}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600">
                          月交易: NT$ {(customer.monthlyVolume / 1000).toFixed(0)}K
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div
                        className={cn(
                          'flex items-center space-x-1 text-sm font-medium',
                          customer.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {customer.growthRate >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{Math.abs(customer.growthRate).toFixed(1)}%</span>
                      </div>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                ))}
            </div>
          </>
        ) : (
          <>
            {/* 詳細客戶列表 */}
            <div className="space-y-3">
              {mockCustomerData.map(customer => (
                <div
                  key={customer.id}
                  className="cursor-pointer rounded-lg border p-4 transition-shadow hover:shadow-md"
                  onClick={() => handleCustomerSelect(customer)}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="mb-1 flex items-center space-x-2">
                          <h5 className="font-medium text-gray-900">{customer.name}</h5>
                          <Badge className={getTypeColor(customer.type)} size="sm">
                            {getTypeText(customer.type)}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {customer.contact.person} • {customer.contact.phone}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={cn('text-sm font-medium', getRiskColor(customer.riskLevel))}>
                        {getRiskText(customer.riskLevel)}
                      </div>
                      {customer.rating > 0 && (
                        <div className="mt-1 flex items-center space-x-1">
                          <Star className="h-3 w-3 fill-current text-yellow-400" />
                          <span className="text-sm">{customer.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">月交易額:</span>
                      <span className="ml-1 font-medium">
                        NT$ {(customer.monthlyVolume / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">成長率:</span>
                      <span
                        className={cn(
                          'ml-1 font-medium',
                          customer.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {customer.growthRate > 0 ? '+' : ''}
                        {customer.growthRate.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">最後下單:</span>
                      <span className="ml-1 font-medium">{formatDate(customer.lastOrderDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">付款天數:</span>
                      <span className="ml-1 font-medium">{customer.paymentDays} 天</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {customer.preferredCategories.map((category, index) => (
                      <Badge key={index} variant="outline" size="sm">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 客戶關係維護建議 */}
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h4 className="mb-2 flex items-center space-x-2 font-medium text-blue-900">
            <MessageSquare className="h-4 w-4" />
            <span>客戶關係建議</span>
          </h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• 定期追蹤頂級客戶需求，提供專屬服務</li>
            <li>• 針對新客戶加強溝通，建立長期合作關係</li>
            <li>• 注意付款天數較長的客戶，適時提醒收款</li>
            <li>• 分析客戶偏好類別，推薦相關新產品</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
