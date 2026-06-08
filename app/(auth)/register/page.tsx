'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, Loader2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SecureStorage } from '@/lib/secure-storage'
import { getRedirectPathForRole } from '@/lib/auth'

type OAuthRegistrationData = {
  provider: 'line' | 'google'
  registration_ticket?: string
  registrationTicket?: string
  email?: string
  name?: string
}

type CompleteRegistrationResponse = {
  success: boolean
  message?: string
  token?: string
  refresh_token?: string
  user?: {
    id: string
    email?: string
    role: string
    organization?: { id: string; type: 'restaurant' | 'supplier' | 'platform' }
    tenant?: { id: string; type: 'restaurant' | 'supplier' | 'platform' }
  }
}

export default function RegisterPage(): React.ReactElement {
  const [oauthData, setOauthData] = useState<OAuthRegistrationData | null>(null)
  const [organizationName, setOrganizationName] = useState('')
  const [organizationType, setOrganizationType] = useState<'restaurant' | 'supplier'>('restaurant')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('orderly_oauth_registration')
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as OAuthRegistrationData
      setOauthData(parsed)
      setEmail(parsed.email || '')
    } catch {
      sessionStorage.removeItem('orderly_oauth_registration')
    }
  }, [])

  async function startLineRegistration(): Promise<void> {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/oauth/line/initiate')
      const data = await response.json()
      const authorizationUrl = data.authorization_url || data.authorizationUrl
      if (!response.ok || !data.success || !authorizationUrl) {
        setError(data.message || 'Line 註冊啟動失敗')
        return
      }
      if (data.state) sessionStorage.setItem('oauth_state_line', data.state)
      const verifier = data.code_verifier || data.codeVerifier
      if (verifier) sessionStorage.setItem('oauth_code_verifier_line', verifier)
      window.location.href = authorizationUrl
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  async function completeRegistration(): Promise<void> {
    if (!oauthData) return
    if (!organizationName.trim()) {
      setError('請輸入機構名稱')
      return
    }

    const registrationTicket = oauthData.registration_ticket || oauthData.registrationTicket
    if (!registrationTicket) {
      setError('社群註冊資料無效')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/oauth/complete-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: oauthData.provider,
          registration_ticket: registrationTicket,
          email: email.trim() || undefined,
          organization_name: organizationName.trim(),
          organization_type: organizationType,
          phone: phone.trim() || undefined,
        }),
      })
      const data: CompleteRegistrationResponse = await response.json()
      if (!response.ok || !data.success || !data.token || !data.user) {
        setError(data.message || '註冊失敗')
        return
      }

      const organization = data.user.organization || data.user.tenant
      SecureStorage.setTokens({
        token: data.token,
        refreshToken: data.refresh_token,
        userId: data.user.id,
        email: data.user.email || '',
        role: data.user.role,
        organizationId: organization?.id || '',
        organizationType: organization?.type || organizationType,
        rememberMe: true,
      })
      sessionStorage.removeItem('orderly_oauth_registration')
      window.location.href = getRedirectPathForRole(data.user.role)
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  if (!oauthData) {
    return (
      <div className="w-full">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <MessageCircle className="h-6 w-6 text-primary-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">建立井然帳號</h1>
          <p className="text-sm text-gray-600">新帳號使用 Line 建立。</p>
        </div>

        <Button type="button" className="h-12 w-full justify-between" onClick={startLineRegistration} disabled={isLoading}>
          <span className="flex items-center gap-3">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
            <span>Line</span>
          </span>
          <ArrowRight className="h-4 w-4" />
        </Button>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
            返回登入
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
          <Building2 className="h-6 w-6 text-primary-600" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">完成帳號資料</h1>
        <p className="text-sm text-gray-600">Email 僅作為對帳聯絡資訊。</p>
      </div>

      <div className="space-y-5">
        <div>
          <Label htmlFor="organizationName">機構名稱</Label>
          <Input
            id="organizationName"
            value={organizationName}
            onChange={event => setOrganizationName(event.target.value)}
            placeholder="您的餐廳或供應商名稱"
          />
        </div>

        <div>
          <Label htmlFor="organizationType">機構類型</Label>
          <Select
            value={organizationType}
            onValueChange={(value: 'restaurant' | 'supplier') => setOrganizationType(value)}
          >
            <SelectTrigger id="organizationType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="restaurant">餐廳方</SelectItem>
              <SelectItem value="supplier">供應商</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="email">電子信箱（選填）</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="billing@example.com"
          />
        </div>

        <div>
          <Label htmlFor="phone">電話（選填）</Label>
          <Input
            id="phone"
            value={phone}
            onChange={event => setPhone(event.target.value)}
            placeholder="+886 912 345 678"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button type="button" className="mt-6 h-12 w-full" onClick={completeRegistration} disabled={isLoading}>
        {isLoading ? '送出中...' : '完成註冊'}
      </Button>
    </div>
  )
}
