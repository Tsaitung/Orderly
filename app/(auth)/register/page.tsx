'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { http } from '@/lib/api/http'

interface RegistrationData {
  // Step 1: Account Info
  email: string
  password: string
  confirmPassword: string

  // Step 2: Organization Info
  organizationName: string
  organizationType: 'restaurant' | 'supplier' | ''

  // Step 3: Personal Info
  firstName: string
  lastName: string
  phone: string
  position: string
}

const STEPS = [
  { id: 1, title: '帳戶資訊', description: '設定您的登入資訊' },
  { id: 2, title: '機構資訊', description: '告訴我們您的機構類型' },
  { id: 3, title: '個人資訊', description: '完善您的個人檔案' },
]

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const stepDef = (STEPS[currentStep - 1] ?? STEPS[0])!

  const [formData, setFormData] = useState<RegistrationData>({
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    organizationType: '',
    firstName: '',
    lastName: '',
    phone: '',
    position: '',
  })

  const updateFormData = (field: keyof RegistrationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.email) newErrors.email = '請輸入電子信箱'
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = '請輸入有效的電子信箱'

      if (!formData.password) newErrors.password = '請輸入密碼'
      else if (formData.password.length < 12) newErrors.password = '密碼至少需要 12 個字符'

      if (!formData.confirmPassword) newErrors.confirmPassword = '請確認密碼'
      else if (formData.password !== formData.confirmPassword)
        newErrors.confirmPassword = '密碼確認不符'
    }

    if (step === 2) {
      if (!formData.organizationName) newErrors.organizationName = '請輸入機構名稱'
      if (!formData.organizationType) newErrors.organizationType = '請選擇機構類型'
    }

    if (step === 3) {
      if (!formData.firstName) newErrors.firstName = '請輸入名字'
      if (!formData.lastName) newErrors.lastName = '請輸入姓氏'
      if (!formData.phone) newErrors.phone = '請輸入電話號碼'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => prev - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(3)) return

    setIsLoading(true)
    try {
      await http.post('/api/users/auth/register', {
        email: formData.email,
        password: formData.password,
        organizationName: formData.organizationName,
        organizationType: formData.organizationType,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      })
      {
        // Registration successful, redirect to dashboard or show success message
        window.location.href = '/dashboard'
      }
    } catch (error) {
      setErrors({ submit: '網路錯誤，請重試' })
    } finally {
      setIsLoading(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="mb-8 flex items-center justify-center">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
              currentStep > step.id
                ? 'bg-primary-500 text-white'
                : currentStep === step.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 text-gray-500'
            )}
          >
            {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
          </div>

          {index < STEPS.length - 1 && (
            <div
              className={cn(
                'mx-2 h-0.5 w-12',
                currentStep > step.id ? 'bg-primary-500' : 'bg-gray-200'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="email">電子信箱</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={e => updateFormData('email', e.target.value)}
          placeholder="your.email@company.com"
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
      </div>

      <div>
        <Label htmlFor="password">密碼</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={e => updateFormData('password', e.target.value)}
          placeholder="至少 12 個字符"
          className={errors.password ? 'border-red-500' : ''}
        />
        {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
      </div>

      <div>
        <Label htmlFor="confirmPassword">確認密碼</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={e => updateFormData('confirmPassword', e.target.value)}
          placeholder="再次輸入密碼"
          className={errors.confirmPassword ? 'border-red-500' : ''}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
        )}
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="organizationName">機構名稱</Label>
        <Input
          id="organizationName"
          value={formData.organizationName}
          onChange={e => updateFormData('organizationName', e.target.value)}
          placeholder="您的餐廳或供應商名稱"
          className={errors.organizationName ? 'border-red-500' : ''}
        />
        {errors.organizationName && (
          <p className="mt-1 text-sm text-red-500">{errors.organizationName}</p>
        )}
      </div>

      <div>
        <Label>機構類型</Label>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => updateFormData('organizationType', 'restaurant')}
            className={cn(
              'rounded-lg border-2 p-4 text-left transition-colors',
              formData.organizationType === 'restaurant'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="font-medium">餐廳方</div>
            <div className="mt-1 text-sm text-gray-500">我需要採購食材和用品</div>
          </button>

          <button
            type="button"
            onClick={() => updateFormData('organizationType', 'supplier')}
            className={cn(
              'rounded-lg border-2 p-4 text-left transition-colors',
              formData.organizationType === 'supplier'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="font-medium">供應商</div>
            <div className="mt-1 text-sm text-gray-500">我提供食材或餐飲用品</div>
          </button>
        </div>
        {errors.organizationType && (
          <p className="mt-1 text-sm text-red-500">{errors.organizationType}</p>
        )}
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lastName">姓氏</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={e => updateFormData('lastName', e.target.value)}
            placeholder="王"
            className={errors.lastName ? 'border-red-500' : ''}
          />
          {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>}
        </div>

        <div>
          <Label htmlFor="firstName">名字</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={e => updateFormData('firstName', e.target.value)}
            placeholder="小明"
            className={errors.firstName ? 'border-red-500' : ''}
          />
          {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="phone">電話號碼</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={e => updateFormData('phone', e.target.value)}
          placeholder="+886 912 345 678"
          className={errors.phone ? 'border-red-500' : ''}
        />
        {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
      </div>

      <div>
        <Label htmlFor="position">職位（選填）</Label>
        <Input
          id="position"
          value={formData.position}
          onChange={e => updateFormData('position', e.target.value)}
          placeholder="採購經理、主廚、營運總監等"
        />
      </div>
    </div>
  )

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">註冊井然平台</h1>
        <p className="text-gray-600">{stepDef.description}</p>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Form */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold">
          第 {currentStep} 步：{stepDef.title}
        </h2>

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        {/* Error message */}
        {errors.submit && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>上一步</span>
          </Button>

          {currentStep < 3 ? (
            <Button type="button" onClick={handleNext} className="flex items-center space-x-2">
              <span>下一步</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              {isLoading ? '註冊中...' : '完成註冊'}
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          已有帳戶？{' '}
          <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
            立即登入
          </Link>
        </p>
      </div>
    </div>
  )
}
