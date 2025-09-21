'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { 
  CreditCard, 
  Building, 
  CheckCircle, 
  Crown, 
  Star, 
  Zap,
  Shield,
  ArrowRight,
  Lock,
  Calendar,
  AlertTriangle,
  Plus,
  Edit3,
  Trash2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Types
interface SubscriptionPlan {
  id: string
  code: string
  name: string
  nameEn: string
  description: string
  monthlyPrice: number
  annualPrice: number
  tierLevel: number
  features: string[]
  restrictions: Record<string, number>
  isPopular: boolean
  commissionDiscount: number
}

interface PaymentMethod {
  id: string
  type: 'credit_card' | 'bank_transfer' | 'ecpay' | 'newebpay'
  provider: string
  lastFour?: string
  bankName?: string
  accountName?: string
  isDefault: boolean
  expiryDate?: string
}

interface BillingSettings {
  currentPlan: SubscriptionPlan
  autoRenewal: boolean
  paymentMethods: PaymentMethod[]
  nextBillingDate: string
  billingCycle: 'monthly' | 'annual'
}

// Mock data
const availablePlans: SubscriptionPlan[] = [
  {
    id: 'free',
    code: 'FREE',
    name: '免費版',
    nameEn: 'Free',
    description: '適合剛起步的小型供應商',
    monthlyPrice: 0,
    annualPrice: 0,
    tierLevel: 1,
    features: [
      '最多 50 個產品',
      '基本訂單管理',
      '客戶聯絡功能',
      '基礎報表',
      '電子郵件客服'
    ],
    restrictions: {
      maxProducts: 50,
      maxOrders: 100,
      maxLocations: 1
    },
    isPopular: false,
    commissionDiscount: 0
  },
  {
    id: 'professional',
    code: 'PRO',
    name: '專業版',
    nameEn: 'Professional',
    description: '適合成長中的中型供應商',
    monthlyPrice: 2999,
    annualPrice: 29990, // 17% discount
    tierLevel: 2,
    features: [
      '無限產品數量',
      '進階庫存管理',
      '自動化工作流程',
      '客戶洞察分析',
      '多地點配送',
      '優先客服支援',
      'API 整合 (基本)'
    ],
    restrictions: {
      maxProducts: -1, // unlimited
      maxOrders: 1000,
      maxLocations: 5
    },
    isPopular: true,
    commissionDiscount: 0.1 // 10% commission discount
  },
  {
    id: 'enterprise',
    code: 'ENT',
    name: '企業版',
    nameEn: 'Enterprise',
    description: '適合大型企業級供應商',
    monthlyPrice: 8999,
    annualPrice: 89990, // 17% discount
    tierLevel: 3,
    features: [
      '全功能無限制使用',
      '專屬客戶成功經理',
      '自訂報表與儀表板',
      '完整 API 整合',
      '白標客製化',
      '24/7 專線客服',
      '優先新功能體驗',
      '資料匯出與備份'
    ],
    restrictions: {
      maxProducts: -1,
      maxOrders: -1,
      maxLocations: -1
    },
    isPopular: false,
    commissionDiscount: 0.2 // 20% commission discount
  }
]

const mockBillingSettings: BillingSettings = {
  currentPlan: availablePlans[1], // Professional plan
  autoRenewal: true,
  paymentMethods: [
    {
      id: '1',
      type: 'credit_card',
      provider: 'Visa',
      lastFour: '4242',
      isDefault: true,
      expiryDate: '12/25'
    },
    {
      id: '2',
      type: 'bank_transfer',
      provider: '台灣銀行',
      bankName: '台灣銀行',
      accountName: '永豐食品有限公司',
      isDefault: false
    }
  ],
  nextBillingDate: '2024-11-15',
  billingCycle: 'monthly'
}

const getPlanIcon = (tierLevel: number) => {
  switch (tierLevel) {
    case 1: return <Zap className="h-5 w-5 text-blue-600" />
    case 2: return <Star className="h-5 w-5 text-purple-600" />
    case 3: return <Crown className="h-5 w-5 text-yellow-600" />
    default: return <Shield className="h-5 w-5 text-gray-600" />
  }
}

const getPlanBadgeColor = (tierLevel: number) => {
  switch (tierLevel) {
    case 1: return 'text-blue-600 bg-blue-50 border-blue-200'
    case 2: return 'text-purple-600 bg-purple-50 border-purple-200'
    case 3: return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export default function BillingSettings() {
  const [billingSettings, setBillingSettings] = useState<BillingSettings>(mockBillingSettings)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const handlePlanUpgrade = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
    setShowUpgradeModal(true)
  }

  const handleAutoRenewalToggle = () => {
    setBillingSettings(prev => ({
      ...prev,
      autoRenewal: !prev.autoRenewal
    }))
  }

  const calculateSavings = (monthly: number, annual: number) => {
    const yearlyCostMonthly = monthly * 12
    const savings = yearlyCostMonthly - annual
    const percentage = Math.round((savings / yearlyCostMonthly) * 100)
    return { amount: savings, percentage }
  }

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">訂閱與帳務設定</h1>
          <p className="text-gray-600 mt-1">管理您的訂閱方案、付款方式與帳務偏好</p>
        </div>
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          查看帳單歷史
        </Button>
      </div>

      {/* Current Plan Status */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getPlanIcon(billingSettings.currentPlan.tierLevel)}
              <span>目前方案</span>
            </div>
            <Badge className={getPlanBadgeColor(billingSettings.currentPlan.tierLevel)}>
              {billingSettings.currentPlan.name}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">月費</p>
              <p className="text-xl font-bold text-gray-900">
                {billingSettings.currentPlan.monthlyPrice === 0 
                  ? '免費' 
                  : formatCurrency(billingSettings.currentPlan.monthlyPrice)
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">下次付款日</p>
              <p className="text-lg font-semibold text-gray-900">
                {billingSettings.nextBillingDate}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">佣金折扣</p>
              <p className="text-lg font-semibold text-green-600">
                {billingSettings.currentPlan.commissionDiscount * 100}% 折扣
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-3">
              <Switch 
                checked={billingSettings.autoRenewal}
                onCheckedChange={handleAutoRenewalToggle}
              />
              <span className="text-sm font-medium text-gray-900">自動續約</span>
              <span className="text-xs text-gray-500">避免服務中斷</span>
            </div>
            <Button variant="outline" size="sm">
              修改方案
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing Cycle Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>計費週期</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <Button
              variant={billingCycle === 'monthly' ? 'solid' : 'ghost'}
              colorScheme={billingCycle === 'monthly' ? 'primary' : 'gray'}
              onClick={() => setBillingCycle('monthly')}
            >
              月付
            </Button>
            <Button
              variant={billingCycle === 'annual' ? 'solid' : 'ghost'}
              colorScheme={billingCycle === 'annual' ? 'primary' : 'gray'}
              onClick={() => setBillingCycle('annual')}
              className="relative"
            >
              年付
              <Badge variant="success" size="sm" className="absolute -top-2 -right-2">
                省17%
              </Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">可選方案</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availablePlans.map((plan) => {
            const isCurrentPlan = plan.id === billingSettings.currentPlan.id
            const savings = billingCycle === 'annual' && plan.annualPrice > 0 
              ? calculateSavings(plan.monthlyPrice, plan.annualPrice)
              : null

            return (
              <Card 
                key={plan.id} 
                className={`relative ${
                  isCurrentPlan 
                    ? 'border-purple-300 bg-purple-50' 
                    : plan.isPopular 
                      ? 'border-blue-300 shadow-md' 
                      : ''
                }`}
              >
                {plan.isPopular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge variant="info" className="px-3 py-1">
                      最受歡迎
                    </Badge>
                  </div>
                )}
                
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge variant="success" className="px-3 py-1">
                      目前方案
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center">
                  <div className="flex justify-center mb-2">
                    {getPlanIcon(plan.tierLevel)}
                  </div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <p className="text-sm text-gray-600">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-center">
                    {billingCycle === 'monthly' ? (
                      <div>
                        <span className="text-3xl font-bold text-gray-900">
                          {plan.monthlyPrice === 0 ? '免費' : `NT$ ${plan.monthlyPrice.toLocaleString()}`}
                        </span>
                        {plan.monthlyPrice > 0 && (
                          <span className="text-gray-600">/月</span>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="text-3xl font-bold text-gray-900">
                          {plan.annualPrice === 0 ? '免費' : `NT$ ${plan.annualPrice.toLocaleString()}`}
                        </span>
                        {plan.annualPrice > 0 && (
                          <>
                            <span className="text-gray-600">/年</span>
                            {savings && (
                              <div className="text-sm text-green-600 mt-1">
                                省下 NT$ {savings.amount.toLocaleString()} ({savings.percentage}%)
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {plan.features.slice(0, 5).map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                    {plan.features.length > 5 && (
                      <p className="text-xs text-gray-500">
                        還有 {plan.features.length - 5} 項功能...
                      </p>
                    )}
                  </div>

                  {plan.commissionDiscount > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800">
                        💰 佣金優惠: {plan.commissionDiscount * 100}% 折扣
                      </p>
                    </div>
                  )}

                  <Button
                    variant={isCurrentPlan ? 'outline' : 'solid'}
                    colorScheme={isCurrentPlan ? 'gray' : 'primary'}
                    className="w-full"
                    disabled={isCurrentPlan}
                    onClick={() => !isCurrentPlan && handlePlanUpgrade(plan)}
                  >
                    {isCurrentPlan ? '目前方案' : plan.tierLevel > billingSettings.currentPlan.tierLevel ? '升級' : '降級'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>付款方式</span>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              新增付款方式
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {billingSettings.paymentMethods.map((method) => (
            <div 
              key={method.id} 
              className={`p-4 border rounded-lg ${
                method.isDefault ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded border">
                    {method.type === 'credit_card' ? (
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Building className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {method.type === 'credit_card' 
                        ? `${method.provider} •••• ${method.lastFour}`
                        : `${method.bankName} 銀行轉帳`
                      }
                    </p>
                    <p className="text-sm text-gray-600">
                      {method.type === 'credit_card' 
                        ? `到期日: ${method.expiryDate}`
                        : `戶名: ${method.accountName}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {method.isDefault && (
                    <Badge variant="success" size="sm">預設</Badge>
                  )}
                  <Button variant="ghost" size="sm">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Commission Rate Information */}
      <Card>
        <CardHeader>
          <CardTitle>佣金費率資訊</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">基礎費率</p>
              <p className="text-2xl font-bold text-gray-900">1.5%</p>
              <p className="text-xs text-gray-500">所有交易</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">方案折扣</p>
              <p className="text-2xl font-bold text-green-600">-0.15%</p>
              <p className="text-xs text-gray-500">專業版會員</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">實際費率</p>
              <p className="text-2xl font-bold text-blue-600">1.35%</p>
              <p className="text-xs text-gray-500">最終收費</p>
            </div>
          </div>
          
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">費率說明</p>
                <p className="text-sm text-amber-700 mt-1">
                  佣金費率根據您的訂閱方案和供應商評級調整。升級方案可享受更優惠的費率，
                  詳細費率表請參考<button className="underline">費率說明頁面</button>。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security & Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5 text-green-600" />
            <span>安全性與合規</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-700">PCI DSS 合規認證</span>
            </div>
            <Badge variant="success" size="sm">已驗證</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-700">SSL 加密傳輸</span>
            </div>
            <Badge variant="success" size="sm">已啟用</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-700">雙重驗證</span>
            </div>
            <Button variant="outline" size="sm">設定</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}