'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Smartphone, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/auth'
import { AuthValidation, type LoginFormData } from '@/lib/validation/auth-schemas'
import { http } from '@/lib/api/http'
import {
  type FormErrors,
  validateMfaCode,
  API_ERROR_MESSAGES,
  type LoginStep,
} from '@/lib/auth'
import {
  createFieldUpdater,
  getRedirectPathFromSession,
  isStaging,
  executeStagingAdminLogin,
  formatMfaCode,
} from '@/lib/auth/form-utils'

interface MFAForm {
  code: string
  mfaSessionId: string
}

export default function LoginPage(): React.ReactElement {
  const { login } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<LoginStep>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const [loginForm, setLoginForm] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  })

  const [mfaForm, setMFAForm] = useState<MFAForm>({
    code: '',
    mfaSessionId: '',
  })

  const [mfaMethod] = useState<string>('')

  const updateLoginField = createFieldUpdater(setLoginForm, setErrors)

  function updateMFAForm(field: keyof MFAForm, value: string): void {
    setMFAForm(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field as keyof FormErrors]
        return newErrors
      })
    }
  }

  function validateLogin(): boolean {
    const validation = AuthValidation.validateLogin(loginForm)
    if (!validation.success) {
      setErrors(validation.errors)
      return false
    }
    setErrors({})
    return true
  }

  function validateMFA(): boolean {
    const codeError = validateMfaCode(mfaForm.code)
    if (codeError) {
      setErrors({ code: codeError })
      return false
    }
    setErrors({})
    return true
  }

  async function handleLogin(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!validateLogin()) return

    setIsLoading(true)
    try {
      const result = await login(loginForm)

      if (result.success) {
        const redirectPath = getRedirectPathFromSession()
        router.push(redirectPath)
      } else {
        setErrors({ submit: result.error || API_ERROR_MESSAGES.loginFailed })
      }
    } catch {
      setErrors({ submit: API_ERROR_MESSAGES.networkError })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleMFAVerification(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!validateMFA()) return

    setIsLoading(true)
    try {
      const data = await http.post<{ data: { accessToken: string; refreshToken: string } }>(
        '/api/users/auth/verify-mfa',
        {
          email: loginForm.email,
          code: mfaForm.code,
          mfaSessionId: mfaForm.mfaSessionId,
          rememberMe: loginForm.rememberMe,
        }
      )

      if (data?.data?.accessToken && data?.data?.refreshToken) {
        localStorage.setItem('accessToken', data.data.accessToken)
        localStorage.setItem('refreshToken', data.data.refreshToken)
        window.location.href = '/dashboard'
      } else {
        setErrors({ submit: API_ERROR_MESSAGES.mfaFailed })
      }
    } catch {
      setErrors({ submit: API_ERROR_MESSAGES.networkError })
    } finally {
      setIsLoading(false)
    }
  }

  function renderLoginForm(): React.ReactElement {
    return (
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <Label htmlFor="email">電子信箱</Label>
          <Input
            id="email"
            type="email"
            value={loginForm.email}
            onChange={e =>
              updateLoginField('email', AuthValidation.sanitizeString(e.target.value))
            }
            placeholder="your.email@company.com"
            className={errors.email ? 'border-red-500' : ''}
            disabled={isLoading}
            autoComplete="email"
          />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
        </div>

        <div>
          <Label htmlFor="password">密碼</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={loginForm.password}
              onChange={e => updateLoginField('password', e.target.value)}
              placeholder="輸入您的密碼"
              className={errors.password ? 'border-red-500 pr-12' : 'pr-12'}
              disabled={isLoading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              checked={loginForm.rememberMe}
              onCheckedChange={checked => updateLoginField('rememberMe', checked as boolean)}
            />
            <Label htmlFor="rememberMe" className="text-sm text-gray-600">
              記住我
            </Label>
          </div>

          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            忘記密碼？
          </Link>
        </div>

        {errors.submit && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '登入中...' : '登入'}
        </Button>

        {isStaging() && (
          <div className="mt-4 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
              onClick={executeStagingAdminLogin}
            >
              Staging 環境：管理員快速登入
            </Button>
            <p className="mt-2 text-center text-xs text-orange-600">
              點擊後將自動清理舊數據並登入為平台管理員
            </p>
          </div>
        )}
      </form>
    )
  }

  function renderMFAForm(): React.ReactElement {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            {mfaMethod === 'totp' ? (
              <Smartphone className="h-6 w-6 text-primary-600" />
            ) : (
              <Shield className="h-6 w-6 text-primary-600" />
            )}
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">多重身份驗證</h3>
          <p className="text-sm text-gray-600">
            {mfaMethod === 'totp'
              ? '請開啟您的驗證器應用程式，並輸入 6 位數驗證碼'
              : '請輸入發送到您裝置的驗證碼'}
          </p>
        </div>

        <form onSubmit={handleMFAVerification} className="space-y-6">
          <div>
            <Label htmlFor="mfaCode">驗證碼</Label>
            <Input
              id="mfaCode"
              type="text"
              value={mfaForm.code}
              onChange={e => updateMFAForm('code', formatMfaCode(e.target.value))}
              placeholder="000000"
              className={`text-center text-lg tracking-widest ${errors.code ? 'border-red-500' : ''}`}
              maxLength={6}
              disabled={isLoading}
            />
            {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code}</p>}
          </div>

          {errors.submit && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '驗證中...' : '驗證並登入'}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setStep('login')}
              disabled={isLoading}
            >
              返回登入
            </Button>
          </div>
        </form>

        {mfaMethod === 'totp' && (
          <div className="text-center text-xs text-gray-500">
            <p>
              找不到驗證器？請聯絡技術支援
              <br />
              或使用備份驗證碼
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          {step === 'login' ? '登入井然平台' : '身份驗證'}
        </h1>
        <p className="text-gray-600">
          {step === 'login' ? '歡迎回來！請登入您的帳戶' : '為了確保帳戶安全，請完成多重身份驗證'}
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {step === 'login' ? renderLoginForm() : renderMFAForm()}
      </div>

      {step === 'login' && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            還沒有帳戶？{' '}
            <Link href="/register" className="font-medium text-primary-600 hover:text-primary-500">
              立即註冊
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
