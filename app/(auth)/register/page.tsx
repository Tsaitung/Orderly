'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { http } from '@/lib/api/http'
import {
  type FormErrors,
  validateRegistrationStep1,
  validateRegistrationStep2,
  validateRegistrationStep3,
  hasErrors,
  REGISTRATION_STEPS,
  API_ERROR_MESSAGES,
} from '@/lib/auth'
import { createFieldUpdater } from '@/lib/auth/form-utils'

interface RegistrationData {
  email: string
  password: string
  confirmPassword: string
  organizationName: string
  organizationType: 'restaurant' | 'supplier' | ''
  firstName: string
  lastName: string
  phone: string
  position: string
}

export default function RegisterPage(): React.ReactElement {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const stepDef = REGISTRATION_STEPS[currentStep - 1] ?? REGISTRATION_STEPS[0]

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

  const updateField = createFieldUpdater(setFormData, setErrors)

  function validateStep(step: number): boolean {
    let stepErrors: FormErrors = {}

    if (step === 1) {
      stepErrors = validateRegistrationStep1(
        formData.email,
        formData.password,
        formData.confirmPassword
      )
    } else if (step === 2) {
      stepErrors = validateRegistrationStep2(formData.organizationName, formData.organizationType)
    } else if (step === 3) {
      stepErrors = validateRegistrationStep3(formData.firstName, formData.lastName, formData.phone)
    }

    setErrors(stepErrors)
    return !hasErrors(stepErrors)
  }

  function handleNext(): void {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1)
    }
  }

  function handleBack(): void {
    setCurrentStep(prev => prev - 1)
  }

  async function handleSubmit(): Promise<void> {
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
      window.location.href = '/dashboard'
    } catch {
      setErrors({ submit: API_ERROR_MESSAGES.networkError })
    } finally {
      setIsLoading(false)
    }
  }

  function renderStepIndicator(): React.ReactElement {
    return (
      <div className="mb-8 flex items-center justify-center">
        {REGISTRATION_STEPS.map((step, index) => (
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

            {index < REGISTRATION_STEPS.length - 1 && (
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
  }

  function renderStep1(): React.ReactElement {
    return (
      <div className="space-y-6">
        <div>
          <Label htmlFor="email">電子信箱</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={e => updateField('email', e.target.value)}
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
            onChange={e => updateField('password', e.target.value)}
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
            onChange={e => updateField('confirmPassword', e.target.value)}
            placeholder="再次輸入密碼"
            className={errors.confirmPassword ? 'border-red-500' : ''}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
          )}
        </div>
      </div>
    )
  }

  function renderStep2(): React.ReactElement {
    return (
      <div className="space-y-6">
        <div>
          <Label htmlFor="organizationName">機構名稱</Label>
          <Input
            id="organizationName"
            value={formData.organizationName}
            onChange={e => updateField('organizationName', e.target.value)}
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
              onClick={() => updateField('organizationType', 'restaurant')}
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
              onClick={() => updateField('organizationType', 'supplier')}
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
  }

  function renderStep3(): React.ReactElement {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="lastName">姓氏</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={e => updateField('lastName', e.target.value)}
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
              onChange={e => updateField('firstName', e.target.value)}
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
            onChange={e => updateField('phone', e.target.value)}
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
            onChange={e => updateField('position', e.target.value)}
            placeholder="採購經理、主廚、營運總監等"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">註冊井然平台</h1>
        <p className="text-gray-600">{stepDef.description}</p>
      </div>

      {renderStepIndicator()}

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold">
          第 {currentStep} 步：{stepDef.title}
        </h2>

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        {errors.submit && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

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
