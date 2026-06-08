'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Chrome, Loader2, MessageCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SocialProvider } from '@/lib/validation/auth-schemas'

type OAuthInitiateResponse = {
  success: boolean
  authorization_url?: string
  authorizationUrl?: string
  state?: string
  code_verifier?: string
  codeVerifier?: string
  message?: string
}

const providerConfig: Record<
  SocialProvider,
  { label: string; icon: typeof MessageCircle; variant: 'default' | 'outline' }
> = {
  line: {
    label: 'Line',
    icon: MessageCircle,
    variant: 'default' as const,
  },
  google: {
    label: 'Google',
    icon: Chrome,
    variant: 'outline' as const,
  },
}

export default function LoginPage(): React.ReactElement {
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null)
  const [error, setError] = useState<string>('')

  async function startOAuth(provider: SocialProvider): Promise<void> {
    setLoadingProvider(provider)
    setError('')
    try {
      const response = await fetch(`/api/auth/oauth/${provider}/initiate`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
      const data: OAuthInitiateResponse = await response.json()
      const authorizationUrl = data.authorization_url || data.authorizationUrl

      if (!response.ok || !data.success || !authorizationUrl) {
        setError(data.message || '社群登入啟動失敗')
        return
      }

      if (data.state) sessionStorage.setItem(`oauth_state_${provider}`, data.state)
      const verifier = data.code_verifier || data.codeVerifier
      if (verifier) sessionStorage.setItem(`oauth_code_verifier_${provider}`, verifier)

      window.location.href = authorizationUrl
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setLoadingProvider(null)
    }
  }

  function renderProviderButton(provider: SocialProvider): React.ReactElement {
    const config = providerConfig[provider]
    const Icon = config.icon
    const isLoading = loadingProvider === provider

    return (
      <Button
        type="button"
        variant={config.variant}
        className="h-12 w-full justify-between"
        onClick={() => startOAuth(provider)}
        disabled={loadingProvider !== null}
      >
        <span className="flex items-center gap-3">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
          <span>{config.label}</span>
        </span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
          <ShieldCheck className="h-6 w-6 text-primary-600" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">登入井然平台</h1>
        <p className="text-sm text-gray-600">Line 為主要登入方式，Google 限已綁定帳號使用。</p>
      </div>

      <div className="space-y-3">
        {renderProviderButton('line')}
        {renderProviderButton('google')}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link href="/register" className="font-medium text-primary-600 hover:text-primary-500">
          建立帳號
        </Link>
        <Link
          href="/account-recovery"
          className="font-medium text-primary-600 hover:text-primary-500"
        >
          帳號恢復
        </Link>
      </div>
    </div>
  )
}
