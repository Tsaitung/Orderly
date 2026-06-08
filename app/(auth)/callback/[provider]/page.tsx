'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SecureStorage } from '@/lib/secure-storage'
import { getRedirectPathForRole } from '@/lib/auth'
import type { SocialProvider } from '@/lib/validation/auth-schemas'

type OAuthCallbackResponse = {
  success: boolean
  message?: string
  requires_registration?: boolean
  requiresRegistration?: boolean
  requires_mfa?: boolean
  requiresMfa?: boolean
  challenge_token?: string
  challengeToken?: string
  mfa_method?: string
  mfaMethod?: string
  token?: string
  refresh_token?: string
  refreshToken?: string
  user?: {
    id: string
    email?: string
    role: string
    tenant?: { id: string; type: 'restaurant' | 'supplier' | 'platform' }
    organization?: { id: string; type: 'restaurant' | 'supplier' | 'platform' }
  }
  oauth_data?: Record<string, unknown>
  oauthData?: Record<string, unknown>
}

const providers = new Set(['line', 'google'])

export default function OAuthCallbackPage(): React.ReactElement {
  const params = useParams<{ provider: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('驗證中')
  const [lineFallback, setLineFallback] = useState(false)

  useEffect(() => {
    async function exchangeCode(): Promise<void> {
      const provider = params.provider?.toLowerCase() as SocialProvider
      if (!providers.has(provider)) {
        setStatus('error')
        setMessage('不支援的社群登入提供者')
        return
      }

      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const expectedState = sessionStorage.getItem(`oauth_state_${provider}`)
      const codeVerifier = sessionStorage.getItem(`oauth_code_verifier_${provider}`) || undefined
      const isLinkMode = sessionStorage.getItem('orderly_oauth_link_provider') === provider
      const isRecoveryMode = sessionStorage.getItem('orderly_oauth_recovery_provider') === provider

      if (!code || !state || (expectedState && expectedState !== state)) {
        setStatus('error')
        setMessage('社群登入狀態無效')
        return
      }

      try {
        if (isLinkMode) {
          const response = await fetch('/api/auth/oauth/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider,
              code,
              state,
              code_verifier: codeVerifier,
              redirect_uri: `${window.location.origin}/auth/callback/${provider}`,
            }),
          })
          const data: OAuthCallbackResponse = await response.json()
          sessionStorage.removeItem('orderly_oauth_link_provider')
          sessionStorage.removeItem(`oauth_state_${provider}`)
          sessionStorage.removeItem(`oauth_code_verifier_${provider}`)

          if (!response.ok || !data.success) {
            setStatus('error')
            setMessage(data.message || '社群帳號綁定失敗')
            return
          }

          setStatus('success')
          setMessage(data.message || '社群帳號已綁定')
          router.replace('/supplier/settings')
          return
        }

        if (isRecoveryMode) {
          const response = await fetch('/api/auth/oauth/recover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider,
              code,
              state,
              code_verifier: codeVerifier,
              redirect_uri: `${window.location.origin}/auth/callback/${provider}`,
            }),
          })
          const data: OAuthCallbackResponse = await response.json()
          sessionStorage.removeItem('orderly_oauth_recovery_provider')
          sessionStorage.removeItem(`oauth_state_${provider}`)
          sessionStorage.removeItem(`oauth_code_verifier_${provider}`)

          if (!response.ok || !data.success) {
            setStatus('error')
            setMessage(data.message || '社群帳號恢復驗證失敗')
            return
          }

          setStatus('success')
          setMessage(data.message || '社群帳號已驗證，請回到登入頁使用此社群登入')
          return
        }

        const response = await fetch(`/api/auth/oauth/${provider}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            state,
            code_verifier: codeVerifier,
            redirect_uri: `${window.location.origin}/auth/callback/${provider}`,
          }),
        })
        const data: OAuthCallbackResponse = await response.json()

        sessionStorage.removeItem(`oauth_state_${provider}`)
        sessionStorage.removeItem(`oauth_code_verifier_${provider}`)

        if (data.requires_registration || data.requiresRegistration) {
          const oauthData = data.oauth_data || data.oauthData
          if (oauthData) sessionStorage.setItem('orderly_oauth_registration', JSON.stringify(oauthData))
          router.replace('/register?oauth=1')
          return
        }

        if (data.requires_mfa || data.requiresMfa) {
          const challengeToken = data.challenge_token || data.challengeToken
          if (challengeToken) sessionStorage.setItem('orderly_mfa_challenge', challengeToken)
          router.replace('/mfa')
          return
        }

        const accessToken = data.token
        const refreshToken = data.refresh_token || data.refreshToken
        const user = data.user
        if (!response.ok || !data.success || !accessToken || !user) {
          setStatus('error')
          setMessage(data.message || '社群登入失敗')
          setLineFallback(provider === 'google')
          return
        }

        const organization = user.organization || user.tenant
        SecureStorage.setTokens({
          token: accessToken,
          refreshToken,
          userId: user.id,
          email: user.email || '',
          role: user.role,
          organizationId: organization?.id || '',
          organizationType: organization?.type || 'restaurant',
          rememberMe: true,
        })

        setStatus('success')
        setMessage('登入成功')
        router.replace(getRedirectPathForRole(user.role))
      } catch {
        setStatus('error')
        setMessage('網路錯誤，請稍後再試')
      }
    }

    exchangeCode()
  }, [params.provider, router, searchParams])

  return (
    <div className="w-full text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-primary-600" />}
        {status === 'success' && <CheckCircle2 className="h-6 w-6 text-green-600" />}
        {status === 'error' && <XCircle className="h-6 w-6 text-red-600" />}
      </div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{message}</h1>
      {status === 'error' && (
        <Button type="button" className="mt-4" onClick={() => router.replace('/login')}>
          {lineFallback ? '使用 Line 登入' : '返回登入'}
        </Button>
      )}
    </div>
  )
}
