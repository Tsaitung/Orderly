'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SecureStorage } from '@/lib/secure-storage'
import { getRedirectPathForRole } from '@/lib/auth'

type MFAVerifyResponse = {
  success: boolean
  message?: string
  token?: string
  refresh_token?: string
  refreshToken?: string
  user?: {
    id: string
    email?: string
    role: string
    organization?: { id: string; type: 'restaurant' | 'supplier' | 'platform' }
    tenant?: { id: string; type: 'restaurant' | 'supplier' | 'platform' }
  }
}

export default function MFAPage(): React.ReactElement {
  const router = useRouter()
  const [challengeToken, setChallengeToken] = useState('')
  const [code, setCode] = useState('')
  const [useBackup, setUseBackup] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('orderly_mfa_challenge')
    if (!stored) {
      router.replace('/login')
      return
    }
    setChallengeToken(stored)
  }, [router])

  async function verifyMfa(): Promise<void> {
    if (!code.trim()) {
      setError('請輸入驗證碼')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_token: challengeToken,
          code: code.trim(),
          use_backup: useBackup,
        }),
      })
      const data: MFAVerifyResponse = await response.json()
      if (!response.ok || !data.success || !data.token || !data.user) {
        setError(data.message || 'MFA 驗證失敗')
        return
      }

      const organization = data.user.organization || data.user.tenant
      SecureStorage.setTokens({
        token: data.token,
        refreshToken: data.refresh_token || data.refreshToken,
        userId: data.user.id,
        email: data.user.email || '',
        role: data.user.role,
        organizationId: organization?.id || '',
        organizationType: organization?.type || 'restaurant',
        rememberMe: true,
      })
      sessionStorage.removeItem('orderly_mfa_challenge')
      router.replace(getRedirectPathForRole(data.user.role))
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
          <ShieldCheck className="h-6 w-6 text-primary-600" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">MFA 驗證</h1>
        <p className="text-sm text-gray-600">請輸入驗證器 App 或備份碼顯示的代碼。</p>
      </div>

      <div className="space-y-5">
        <div>
          <Label htmlFor="mfaCode">驗證碼</Label>
          <Input
            id="mfaCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={event => setCode(event.target.value)}
            placeholder="123456"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={useBackup}
            onChange={event => setUseBackup(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          使用備份碼
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button type="button" className="mt-6 h-12 w-full" onClick={verifyMfa} disabled={isLoading}>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : '完成驗證'}
      </Button>
    </div>
  )
}
