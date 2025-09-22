'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, ArrowRight, Package, DollarSign, MapPin, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  completed: boolean
  path: string
}

export default function SupplierOnboardingDashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [organization, setOrganization] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([
    {
      id: 'company_info',
      title: '公司資訊',
      description: '完善您的公司基本資料和聯絡方式',
      icon: Building,
      completed: true, // Already completed during registration
      path: '/supplier/settings/company',
    },
    {
      id: 'product_categories',
      title: '產品類別',
      description: '選擇您要銷售的產品類別',
      icon: Package,
      completed: false,
      path: '/supplier/onboarding/categories',
    },
    {
      id: 'sku_setup',
      title: 'SKU 設定',
      description: '建立您的產品庫存單位',
      icon: Package,
      completed: false,
      path: '/supplier/onboarding/skus',
    },
    {
      id: 'pricing_config',
      title: '定價設定',
      description: '設定產品價格和定價策略',
      icon: DollarSign,
      completed: false,
      path: '/supplier/onboarding/pricing',
    },
  ])

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/bff/api/invitations/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setOrganization(data)

        // Update onboarding steps based on organization progress
        if (data.onboardingProgress) {
          setOnboardingSteps(prev =>
            prev.map(step => ({
              ...step,
              completed: data.onboardingProgress[step.id] !== undefined,
            }))
          )
        }
      } else {
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  const completedSteps = onboardingSteps.filter(step => step.completed).length
  const totalSteps = onboardingSteps.length
  const progressPercentage = (completedSteps / totalSteps) * 100

  const handleStepClick = (step: OnboardingStep) => {
    if (!step.completed) {
      router.push(step.path)
    }
  }

  const continueToNextStep = () => {
    const nextStep = onboardingSteps.find(step => !step.completed)
    if (nextStep) {
      router.push(nextStep.path)
    } else {
      router.push('/supplier')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">歡迎加入井然平台！</h1>
          <p className="text-gray-600">
            {organization?.name}，讓我們完成剩餘的設定步驟，開始您的數位化供應鏈之旅
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="mb-8 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">設定進度</h2>
            <span className="text-sm text-gray-600">
              {completedSteps} / {totalSteps} 已完成
            </span>
          </div>

          <div className="mb-4 h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-primary-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <p className="text-sm text-gray-600">
            {completedSteps === totalSteps
              ? '🎉 所有設定已完成！您現在可以開始接收訂單了。'
              : `還有 ${totalSteps - completedSteps} 個步驟需要完成。`}
          </p>
        </Card>

        {/* Onboarding Steps */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {onboardingSteps.map((step, index) => {
            const StepIcon = step.icon
            return (
              <Card
                key={step.id}
                className={cn(
                  'cursor-pointer p-6 transition-all hover:shadow-lg',
                  step.completed ? 'border-green-200 bg-green-50' : 'hover:border-primary-300'
                )}
                onClick={() => handleStepClick(step)}
              >
                <div className="flex items-start space-x-4">
                  <div
                    className={cn(
                      'rounded-lg p-3',
                      step.completed ? 'bg-green-100' : 'bg-primary-100'
                    )}
                  >
                    {step.completed ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <StepIcon className="h-6 w-6 text-primary-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="mb-2 font-semibold text-gray-900">
                      {step.title}
                      {step.completed && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                          已完成
                        </span>
                      )}
                    </h3>
                    <p className="mb-3 text-sm text-gray-600">{step.description}</p>

                    {!step.completed && (
                      <div className="flex items-center text-sm font-medium text-primary-600">
                        <span>開始設定</span>
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-gray-900">快速操作</h3>

          <div className="flex flex-col gap-4 sm:flex-row">
            {completedSteps < totalSteps ? (
              <Button onClick={continueToNextStep} className="flex items-center space-x-2">
                <span>繼續設定</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => router.push('/supplier')}
                className="flex items-center space-x-2"
              >
                <span>前往供應商後台</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => router.push('/supplier/settings')}
              className="flex items-center space-x-2"
            >
              <Building className="h-4 w-4" />
              <span>公司設定</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => window.open('/help/supplier-guide', '_blank')}
              className="flex items-center space-x-2"
            >
              <span>使用指南</span>
            </Button>
          </div>
        </Card>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            需要幫助？查看我們的{' '}
            <a href="/help/supplier-guide" className="text-primary-600 hover:underline">
              供應商使用指南
            </a>{' '}
            或聯繫客服：02-1234-5678
          </p>
        </div>
      </div>
    </div>
  )
}
