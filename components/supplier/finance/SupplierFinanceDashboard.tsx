'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  FileText, 
  Star,
  AlertCircle,
  Calendar,
  Download,
  Settings,
  HelpCircle,
  Shield,
  Zap,
  Trophy
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Types for finance data
interface FinanceMetrics {
  currentMonthGMV: number
  commissionOwed: number
  ratingTier: 'platinum' | 'gold' | 'silver' | 'bronze'
  commissionRate: number
  nextPaymentDate: string
  outstandingBalance: number
  yearToDateGMV: number
}

interface SubscriptionPlan {
  name: string
  price: number
  tier: 'free' | 'professional' | 'enterprise'
  features: string[]
  isCurrentPlan: boolean
}

// Mock data - in real app, this would come from API
const mockFinanceData: FinanceMetrics = {
  currentMonthGMV: 2450000,
  commissionOwed: 36750, // 1.5% of GMV
  ratingTier: 'gold',
  commissionRate: 1.5,
  nextPaymentDate: '2024-10-15',
  outstandingBalance: 12800,
  yearToDateGMV: 24800000
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    name: '免費版',
    price: 0,
    tier: 'free',
    features: ['基本訂單管理', '客戶聯絡', '基礎報表'],
    isCurrentPlan: false
  },
  {
    name: '專業版',
    price: 2999,
    tier: 'professional', 
    features: ['進階分析', '庫存管理', '自動化流程', '客戶洞察'],
    isCurrentPlan: true
  },
  {
    name: '企業版',
    price: 8999,
    tier: 'enterprise',
    features: ['全功能存取', 'API整合', '專屬客服', '客製化報表'],
    isCurrentPlan: false
  }
]

const getRatingColor = (tier: string) => {
  switch (tier) {
    case 'platinum': return 'text-purple-600 bg-purple-50 border-purple-200'
    case 'gold': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'silver': return 'text-gray-600 bg-gray-50 border-gray-200'
    case 'bronze': return 'text-orange-600 bg-orange-50 border-orange-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

const getRatingIcon = (tier: string) => {
  switch (tier) {
    case 'platinum': return <Trophy className="h-5 w-5 text-purple-600" />
    case 'gold': return <Star className="h-5 w-5 text-yellow-600" />
    case 'silver': return <Shield className="h-5 w-5 text-gray-600" />
    default: return <Zap className="h-5 w-5 text-orange-600" />
  }
}

export default function SupplierFinanceDashboard() {
  const [financeData, setFinanceData] = useState<FinanceMetrics>(mockFinanceData)
  const [isLoading, setIsLoading] = useState(false)

  // Calculate performance metrics
  const monthlyTarget = 3000000 // NT$3M target
  const gmvProgress = (financeData.currentMonthGMV / monthlyTarget) * 100
  const nextRatingThreshold = financeData.ratingTier === 'bronze' ? 2000000 : 
                             financeData.ratingTier === 'silver' ? 3500000 : 
                             financeData.ratingTier === 'gold' ? 5000000 : null

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">財務儀表板</h1>
          <p className="text-gray-600 mt-1">管理訂閱、帳務與評級狀態</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            匯出報表
          </Button>
          <Button variant="solid" colorScheme="supplier" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            帳務設定
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Month GMV */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">本月 GMV</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financeData.currentMonthGMV)}
                </p>
                <p className="text-xs text-green-600 mt-1">+18.2% 較上月</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commission Owed */}
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">應付佣金</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financeData.commissionOwed)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {financeData.commissionRate}% 費率
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-full">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rating Tier */}
        <Card className={`border-l-4 ${getRatingColor(financeData.ratingTier)}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">評級等級</p>
                <div className="flex items-center space-x-2 mt-1">
                  {getRatingIcon(financeData.ratingTier)}
                  <p className="text-xl font-bold text-gray-900 capitalize">
                    {financeData.ratingTier}
                  </p>
                </div>
                <p className="text-xs text-gray-600 mt-1">優質合作夥伴</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Payment */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">下次付款</p>
                <p className="text-lg font-bold text-gray-900">
                  {financeData.nextPaymentDate}
                </p>
                <p className="text-xs text-blue-600 mt-1">7天後到期</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance & Rating Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GMV Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>本月業績目標</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">目標: {formatCurrency(monthlyTarget)}</span>
              <span className="font-medium text-green-600">
                {gmvProgress.toFixed(1)}% 達成
              </span>
            </div>
            <Progress value={gmvProgress} className="w-full" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                已完成: {formatCurrency(financeData.currentMonthGMV)}
              </span>
              <span className="text-gray-600">
                剩餘: {formatCurrency(monthlyTarget - financeData.currentMonthGMV)}
              </span>
            </div>
            {gmvProgress >= 100 ? (
              <Badge variant="success" className="w-full justify-center py-2">
                🎉 恭喜達成月度目標！
              </Badge>
            ) : (
              <div className="text-xs text-gray-500 text-center">
                預計在月底前達成目標
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getRatingIcon(financeData.ratingTier)}
              <span>評級優惠與權益</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">當前佣金費率</span>
                <span className="font-medium text-green-600">
                  {financeData.commissionRate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">平台專屬折扣</span>
                <span className="font-medium text-blue-600">85折</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">優先客服支援</span>
                <span className="font-medium text-green-600">✓ 已啟用</span>
              </div>
            </div>
            
            {nextRatingThreshold && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800">
                  🚀 升級至下一等級
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  再累積 {formatCurrency(nextRatingThreshold - financeData.yearToDateGMV)} GMV 
                  即可升級並享受更優惠費率
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="flex items-center justify-center space-x-2 h-16"
              onClick={() => window.location.href = '/supplier/finance/billing'}
            >
              <Settings className="h-5 w-5" />
              <span>訂閱設定</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center justify-center space-x-2 h-16"
              onClick={() => window.location.href = '/supplier/finance/statements'}
            >
              <FileText className="h-5 w-5" />
              <span>查看帳單</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center justify-center space-x-2 h-16"
              onClick={() => window.location.href = '/supplier/finance/payments'}
            >
              <CreditCard className="h-5 w-5" />
              <span>付款記錄</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Subscription Plan */}
      <Card>
        <CardHeader>
          <CardTitle>目前訂閱方案</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptionPlans.filter(plan => plan.isCurrentPlan).map((plan) => (
            <div key={plan.tier} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-600">
                  {plan.price === 0 ? '免費使用' : `NT$ ${plan.price.toLocaleString()}/月`}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {plan.features.slice(0, 3).map((feature, index) => (
                    <Badge key={index} variant="success" size="sm">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="success">使用中</Badge>
                <Button variant="outline" size="sm">
                  管理方案
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Help & Support */}
      <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg">
        <div className="text-center space-y-2">
          <HelpCircle className="h-8 w-8 text-gray-400 mx-auto" />
          <p className="text-sm text-gray-600">需要幫助？</p>
          <Button variant="link" size="sm">
            查看財務管理指南
          </Button>
        </div>
      </div>
    </div>
  )
}