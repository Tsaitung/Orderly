'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Trophy,
  Star,
  Shield,
  Zap,
  TrendingUp,
  Target,
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Users,
  Package,
  Truck,
  DollarSign,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Types
interface SupplierRating {
  tier: 'platinum' | 'gold' | 'silver' | 'bronze'
  overallRating: number
  qualityRating: number
  deliveryRating: number
  serviceRating: number
  financialRating: number
  period: string
  transactionCount: number
  totalGMV: number
  improvement: {
    overall: number
    quality: number
    delivery: number
    service: number
    financial: number
  }
}

interface RatingBenefit {
  tier: 'platinum' | 'gold' | 'silver' | 'bronze'
  name: string
  commissionDiscount: number
  benefits: string[]
  requirements: {
    minGMV: number
    minRating: number
    minTransactions: number
  }
}

interface PerformanceMetric {
  category: string
  current: number
  target: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  impact: 'high' | 'medium' | 'low'
  description: string
}

// Mock data
const currentRating: SupplierRating = {
  tier: 'gold',
  overallRating: 4.2,
  qualityRating: 4.1,
  deliveryRating: 4.4,
  serviceRating: 4.0,
  financialRating: 4.3,
  period: '2024-10',
  transactionCount: 156,
  totalGMV: 2450000,
  improvement: {
    overall: 0.2,
    quality: 0.1,
    delivery: 0.3,
    service: -0.1,
    financial: 0.2,
  },
}

const ratingTiers: RatingBenefit[] = [
  {
    tier: 'platinum',
    name: '白金等級',
    commissionDiscount: 25,
    benefits: [
      '佣金25%折扣 (實付1.13%)',
      '專屬客戶成功經理',
      '優先新功能體驗',
      '客製化報表服務',
      '7x24專線客服',
      '行銷推廣支援',
      '供應鏈金融優惠',
      '品牌聯名機會',
    ],
    requirements: {
      minGMV: 5000000,
      minRating: 4.5,
      minTransactions: 200,
    },
  },
  {
    tier: 'gold',
    name: '黃金等級',
    commissionDiscount: 15,
    benefits: [
      '佣金15%折扣 (實付1.28%)',
      '優先客服支援',
      '進階分析報表',
      '行銷工具使用',
      'API優先級提升',
      '季度業務檢視',
      '培訓資源存取',
    ],
    requirements: {
      minGMV: 2000000,
      minRating: 4.0,
      minTransactions: 100,
    },
  },
  {
    tier: 'silver',
    name: '白銀等級',
    commissionDiscount: 8,
    benefits: [
      '佣金8%折扣 (實付1.38%)',
      '標準客服支援',
      '基礎分析報表',
      '標準API存取',
      '月度效能報告',
    ],
    requirements: {
      minGMV: 800000,
      minRating: 3.5,
      minTransactions: 50,
    },
  },
  {
    tier: 'bronze',
    name: '青銅等級',
    commissionDiscount: 0,
    benefits: [
      '標準佣金費率 (1.5%)',
      '基礎客服支援',
      '基本報表功能',
      '標準API限制',
      '自助服務資源',
    ],
    requirements: {
      minGMV: 0,
      minRating: 0,
      minTransactions: 0,
    },
  },
]

const performanceMetrics: PerformanceMetric[] = [
  {
    category: '準時交貨率',
    current: 92.5,
    target: 95.0,
    unit: '%',
    trend: 'up',
    impact: 'high',
    description: '影響配送評級，建議優化物流流程',
  },
  {
    category: '品質投訴率',
    current: 2.1,
    target: 1.5,
    unit: '%',
    trend: 'down',
    impact: 'high',
    description: '影響品質評級，需要加強品控',
  },
  {
    category: '客服回應時間',
    current: 4.2,
    target: 3.0,
    unit: '小時',
    trend: 'stable',
    impact: 'medium',
    description: '影響服務評級，建議增加客服人力',
  },
  {
    category: '帳款天數',
    current: 18,
    target: 15,
    unit: '天',
    trend: 'up',
    impact: 'medium',
    description: '影響財務評級，表現良好',
  },
  {
    category: '訂單履約率',
    current: 96.8,
    target: 98.0,
    unit: '%',
    trend: 'up',
    impact: 'high',
    description: '整體表現優秀，接近目標',
  },
]

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'platinum':
      return 'text-purple-600 bg-purple-50 border-purple-200'
    case 'gold':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'silver':
      return 'text-gray-600 bg-gray-50 border-gray-200'
    case 'bronze':
      return 'text-orange-600 bg-orange-50 border-orange-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

const getTierIcon = (tier: string) => {
  switch (tier) {
    case 'platinum':
      return <Trophy className="h-6 w-6 text-purple-600" />
    case 'gold':
      return <Star className="h-6 w-6 text-yellow-600" />
    case 'silver':
      return <Shield className="h-6 w-6 text-gray-600" />
    case 'bronze':
      return <Zap className="h-6 w-6 text-orange-600" />
    default:
      return <Award className="h-6 w-6 text-gray-600" />
  }
}

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up':
      return <ArrowUp className="h-4 w-4 text-green-600" />
    case 'down':
      return <ArrowDown className="h-4 w-4 text-red-600" />
    default:
      return <Minus className="h-4 w-4 text-gray-600" />
  }
}

const getImpactColor = (impact: string) => {
  switch (impact) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export default function RatingBenefits() {
  const [selectedMetric, setSelectedMetric] = useState<PerformanceMetric | null>(null)
  const [showCalculator, setShowCalculator] = useState(false)

  const currentTierData = ratingTiers.find(tier => tier.tier === currentRating.tier)
  const nextTierData =
    ratingTiers[ratingTiers.findIndex(tier => tier.tier === currentRating.tier) - 1]

  const calculateCommissionSavings = (discount: number) => {
    const baseRate = 1.5
    const discountedRate = baseRate * (1 - discount / 100)
    const monthlySavings = (currentRating.totalGMV * (baseRate - discountedRate)) / 100
    return monthlySavings
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">評級與權益</h1>
          <p className="mt-1 text-gray-600">查看當前評級、享受的權益與改善建議</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowCalculator(true)}>
          <BarChart3 className="mr-2 h-4 w-4" />
          佣金計算器
        </Button>
      </div>

      {/* Current Rating Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Current Tier */}
        <Card className={`border-l-4 ${getTierColor(currentRating.tier)}`}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              {getTierIcon(currentRating.tier)}
              <span>目前等級</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Badge className={`${getTierColor(currentRating.tier)} px-4 py-2 text-lg`}>
                {currentTierData?.name}
              </Badge>
              <p className="mt-2 text-sm text-gray-600">
                享受 {currentTierData?.commissionDiscount}% 佣金折扣
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">整體評分</span>
                <span className="text-lg font-semibold">{currentRating.overallRating}/5.0</span>
              </div>
              <Progress value={currentRating.overallRating * 20} className="w-full" />
            </div>

            <div className="text-sm text-gray-600">
              <p>本月交易: {currentRating.transactionCount} 筆</p>
              <p>本月GMV: {formatCurrency(currentRating.totalGMV)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Rating Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>評級明細</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                label: '品質',
                value: currentRating.qualityRating,
                improvement: currentRating.improvement.quality,
              },
              {
                label: '配送',
                value: currentRating.deliveryRating,
                improvement: currentRating.improvement.delivery,
              },
              {
                label: '服務',
                value: currentRating.serviceRating,
                improvement: currentRating.improvement.service,
              },
              {
                label: '財務',
                value: currentRating.financialRating,
                improvement: currentRating.improvement.financial,
              },
            ].map(metric => (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{metric.label}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{metric.value.toFixed(1)}</span>
                    {metric.improvement > 0 ? (
                      <Badge variant="success" size="sm">
                        +{metric.improvement.toFixed(1)}
                      </Badge>
                    ) : metric.improvement < 0 ? (
                      <Badge variant="destructive" size="sm">
                        {metric.improvement.toFixed(1)}
                      </Badge>
                    ) : (
                      <Badge variant="default" size="sm">
                        0.0
                      </Badge>
                    )}
                  </div>
                </div>
                <Progress value={metric.value * 20} className="w-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Next Level Progress */}
        {nextTierData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-blue-600" />
                <span>升級進度</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm text-gray-600">距離 {nextTierData.name} 還需要:</p>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">GMV要求</span>
                      <span className="font-medium">
                        {(
                          (currentRating.totalGMV / nextTierData.requirements.minGMV) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <Progress
                      value={(currentRating.totalGMV / nextTierData.requirements.minGMV) * 100}
                      className="mt-1 w-full"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      還需{' '}
                      {formatCurrency(nextTierData.requirements.minGMV - currentRating.totalGMV)}
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">評分要求</span>
                      <span className="font-medium">
                        {(
                          (currentRating.overallRating / nextTierData.requirements.minRating) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        (currentRating.overallRating / nextTierData.requirements.minRating) * 100
                      }
                      className="mt-1 w-full"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      還需提升{' '}
                      {(nextTierData.requirements.minRating - currentRating.overallRating).toFixed(
                        1
                      )}{' '}
                      分
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-medium text-blue-800">升級後可節省</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(calculateCommissionSavings(nextTierData.commissionDiscount))}
                </p>
                <p className="text-xs text-blue-700">每月佣金支出</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>效能指標</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            {performanceMetrics.map((metric, index) => (
              <div
                key={index}
                className="cursor-pointer rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
                onClick={() => setSelectedMetric(metric)}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">{metric.category}</h3>
                  {getTrendIcon(metric.trend)}
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-xl font-bold text-gray-900">{metric.current}</span>
                    <span className="text-sm text-gray-600">{metric.unit}</span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">
                      目標: {metric.target}
                      {metric.unit}
                    </span>
                    <Badge className={getImpactColor(metric.impact)} size="sm">
                      {metric.impact === 'high' ? '高' : metric.impact === 'medium' ? '中' : '低'}
                      影響
                    </Badge>
                  </div>

                  <Progress
                    value={Math.min((metric.current / metric.target) * 100, 100)}
                    className="w-full"
                  />
                </div>
              </div>
            ))}
          </div>

          {selectedMetric && (
            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="mb-2 font-medium text-blue-900">{selectedMetric.category} 改善建議</h4>
              <p className="text-sm text-blue-700">{selectedMetric.description}</p>
              <Button
                variant="link"
                size="sm"
                className="mt-2 h-auto p-0"
                onClick={() => setSelectedMetric(null)}
              >
                關閉
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>等級權益比較</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {ratingTiers.map(tier => (
              <div
                key={tier.tier}
                className={`rounded-lg border-2 p-4 ${
                  tier.tier === currentRating.tier
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="mb-4 text-center">
                  <div className="mb-2 flex justify-center">{getTierIcon(tier.tier)}</div>
                  <h3 className="font-semibold text-gray-900">{tier.name}</h3>
                  <p className="text-sm text-gray-600">
                    {tier.commissionDiscount > 0
                      ? `${tier.commissionDiscount}% 佣金折扣`
                      : '標準費率'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="mb-2 font-medium text-gray-900">權益內容</h4>
                    <div className="space-y-1">
                      {tier.benefits.slice(0, 4).map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 flex-shrink-0 text-green-600" />
                          <span className="text-xs text-gray-700">{benefit}</span>
                        </div>
                      ))}
                      {tier.benefits.length > 4 && (
                        <p className="mt-1 text-xs text-gray-500">
                          還有 {tier.benefits.length - 4} 項權益...
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 font-medium text-gray-900">升級要求</h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p>月GMV: {formatCurrency(tier.requirements.minGMV)}</p>
                      <p>評分: {tier.requirements.minRating}/5.0</p>
                      <p>交易數: {tier.requirements.minTransactions} 筆</p>
                    </div>
                  </div>

                  {tier.tier === currentRating.tier && (
                    <Badge variant="success" className="w-full justify-center">
                      目前等級
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Improvement Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span>改善建議</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 font-medium text-gray-900">短期目標 (1-3個月)</h3>
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">提升回應速度</span>
                  </div>
                  <p className="text-xs text-gray-600">目標: 客服回應時間從4.2小時縮短至3小時內</p>
                  <p className="mt-1 text-xs text-blue-600">預期提升服務評級 0.3分</p>
                </div>

                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 flex items-center space-x-2">
                    <Package className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">降低品質投訴</span>
                  </div>
                  <p className="text-xs text-gray-600">目標: 品質投訴率從2.1%降至1.5%以下</p>
                  <p className="mt-1 text-xs text-green-600">預期提升品質評級 0.4分</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-medium text-gray-900">長期目標 (3-6個月)</h3>
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 flex items-center space-x-2">
                    <Truck className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">優化配送效率</span>
                  </div>
                  <p className="text-xs text-gray-600">目標: 準時交貨率從92.5%提升至95%以上</p>
                  <p className="mt-1 text-xs text-purple-600">預期提升配送評級 0.5分</p>
                </div>

                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 flex items-center space-x-2">
                    <Users className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">擴大業務規模</span>
                  </div>
                  <p className="text-xs text-gray-600">目標: 月GMV從245萬提升至500萬以上</p>
                  <p className="mt-1 text-xs text-orange-600">符合白金等級GMV要求</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Savings Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span>佣金節省計算</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {ratingTiers.map(tier => (
              <div key={tier.tier} className="rounded-lg bg-gray-50 p-4 text-center">
                <div className="mb-2 flex justify-center">{getTierIcon(tier.tier)}</div>
                <h4 className="mb-1 font-medium text-gray-900">{tier.name}</h4>
                <p className="mb-2 text-sm text-gray-600">
                  實付費率: {(1.5 * (1 - tier.commissionDiscount / 100)).toFixed(2)}%
                </p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(calculateCommissionSavings(tier.commissionDiscount))}
                </p>
                <p className="text-xs text-gray-500">月節省金額</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-800">
              💡 提示: 升級至白金等級，一年可節省佣金支出約
              <span className="font-bold">
                {formatCurrency(calculateCommissionSavings(25) * 12)}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
