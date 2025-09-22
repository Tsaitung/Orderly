'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Check, AlertCircle } from 'lucide-react'
import { http } from '@/lib/api/http'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'email' | 'sent' | 'reset'

interface PasswordResetForm {
  email: string
  code: string
  newPassword: string
  confirmPassword: string
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState<PasswordResetForm>({
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  })

  const updateForm = (field: keyof PasswordResetForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateEmail = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!form.email) newErrors.email = '請輸入電子信箱'
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = '請輸入有效的電子信箱'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateReset = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!form.code) newErrors.code = '請輸入重設碼'
    if (!form.newPassword) newErrors.newPassword = '請輸入新密碼'
    else if (form.newPassword.length < 12) newErrors.newPassword = '密碼至少需要 12 個字符'

    if (!form.confirmPassword) newErrors.confirmPassword = '請確認新密碼'
    else if (form.newPassword !== form.confirmPassword) newErrors.confirmPassword = '密碼確認不符'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail()) return

    setIsLoading(true)
    try {
      await http.post('/api/users/auth/forgot-password', { email: form.email })
      {
        setStep('sent')
      }
    } catch (error) {
      setErrors({ submit: '網路錯誤，請重試' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateReset()) return

    setIsLoading(true)
    try {
      await http.post('/api/users/auth/reset-password', {
        email: form.email,
        code: form.code,
        newPassword: form.newPassword,
      })
      {
        // Password reset successful, redirect to login
        window.location.href = '/login?message=password-reset-success'
      }
    } catch (error) {
      setErrors({ submit: '網路錯誤，請重試' })
    } finally {
      setIsLoading(false)
    }
  }

  const renderEmailStep = () => (
    <div className="space-y-6">
      {/* Icon */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
          <Mail className="h-6 w-6 text-primary-600" />
        </div>
      </div>

      <form onSubmit={handleSendResetEmail} className="space-y-6">
        <div>
          <Label htmlFor="email">電子信箱</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={e => updateForm('email', e.target.value)}
            placeholder="輸入您註冊時使用的電子信箱"
            className={errors.email ? 'border-red-500' : ''}
            disabled={isLoading}
          />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
          <p className="mt-1 text-xs text-gray-500">我們將發送密碼重設連結到這個信箱地址</p>
        </div>

        {errors.submit && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '發送中...' : '發送重設信件'}
        </Button>
      </form>
    </div>
  )

  const renderSentStep = () => (
    <div className="space-y-6 text-center">
      {/* Success Icon */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <Check className="h-8 w-8 text-green-600" />
      </div>

      <div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">重設信件已發送</h3>
        <p className="mb-4 text-gray-600">我們已將密碼重設說明發送到：</p>
        <p className="mb-4 font-medium text-gray-900">{form.email}</p>
        <p className="text-sm text-gray-500">
          請檢查您的信箱（包含垃圾信匣），並點擊信件中的連結來重設密碼。
        </p>
      </div>

      <div className="space-y-3">
        <Button onClick={() => setStep('reset')} className="w-full">
          我已收到重設碼
        </Button>

        <Button variant="outline" onClick={() => setStep('email')} className="w-full">
          重新發送
        </Button>
      </div>

      {/* Help text */}
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-start space-x-2">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
          <div className="text-xs text-blue-800">
            <p className="mb-1 font-medium">沒有收到信件？</p>
            <ul className="list-inside list-disc space-y-1">
              <li>檢查垃圾信匣或促銷信件匣</li>
              <li>確認信箱地址是否正確</li>
              <li>等待幾分鐘後再檢查</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  const renderResetStep = () => (
    <div className="space-y-6">
      <form onSubmit={handleResetPassword} className="space-y-6">
        <div>
          <Label htmlFor="code">重設碼</Label>
          <Input
            id="code"
            type="text"
            value={form.code}
            onChange={e => updateForm('code', e.target.value)}
            placeholder="輸入信件中的重設碼"
            className={errors.code ? 'border-red-500' : ''}
            disabled={isLoading}
          />
          {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code}</p>}
        </div>

        <div>
          <Label htmlFor="newPassword">新密碼</Label>
          <Input
            id="newPassword"
            type="password"
            value={form.newPassword}
            onChange={e => updateForm('newPassword', e.target.value)}
            placeholder="至少 12 個字符"
            className={errors.newPassword ? 'border-red-500' : ''}
            disabled={isLoading}
          />
          {errors.newPassword && <p className="mt-1 text-sm text-red-500">{errors.newPassword}</p>}
        </div>

        <div>
          <Label htmlFor="confirmPassword">確認新密碼</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={e => updateForm('confirmPassword', e.target.value)}
            placeholder="再次輸入新密碼"
            className={errors.confirmPassword ? 'border-red-500' : ''}
            disabled={isLoading}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
          )}
        </div>

        {errors.submit && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '重設中...' : '重設密碼'}
        </Button>
      </form>
    </div>
  )

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          {step === 'email' && '忘記密碼'}
          {step === 'sent' && '重設信件已發送'}
          {step === 'reset' && '重設密碼'}
        </h1>
        <p className="text-gray-600">
          {step === 'email' && '請輸入您的電子信箱，我們將發送密碼重設連結'}
          {step === 'sent' && '請檢查您的信箱並跟隨說明'}
          {step === 'reset' && '輸入重設碼並設定新密碼'}
        </p>
      </div>

      {/* Form Container */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {step === 'email' && renderEmailStep()}
        {step === 'sent' && renderSentStep()}
        {step === 'reset' && renderResetStep()}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-center space-x-4">
        <Link
          href="/login"
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>返回登入</span>
        </Link>

        {step === 'email' && (
          <>
            <span className="text-gray-300">|</span>
            <Link
              href="/register"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              註冊新帳戶
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
