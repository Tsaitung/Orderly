'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Chrome, LifeBuoy, Loader2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { SocialProvider } from '@/lib/validation/auth-schemas'

type RecoveryResponse = {
  success: boolean
  message?: string
  recovery_id?: string
  recoveryId?: string
}

export default function AccountRecoveryPage(): React.ReactElement {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function startSocialRecovery(provider: SocialProvider): Promise<void> {
    setIsLoading(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch(`/api/auth/oauth/${provider}/initiate`)
      const data = await response.json()
      const authorizationUrl = data.authorization_url || data.authorizationUrl
      if (!response.ok || !data.success || !authorizationUrl) {
        setError(data.message || '社群驗證啟動失敗')
        return
      }

      sessionStorage.setItem('orderly_oauth_recovery_provider', provider)
      if (data.state) sessionStorage.setItem(`oauth_state_${provider}`, data.state)
      const verifier = data.code_verifier || data.codeVerifier
      if (verifier) sessionStorage.setItem(`oauth_code_verifier_${provider}`, verifier)
      window.location.href = authorizationUrl
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  async function submitRecovery(): Promise<void> {
    setIsLoading(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/auth/account-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          organization_name: organizationName.trim() || undefined,
          note: note.trim() || undefined,
          evidence: {
            requested_from: 'account_recovery_page',
            note_present: Boolean(note.trim()),
          },
        }),
      })
      const data: RecoveryResponse = await response.json()
      if (!response.ok || !data.success) {
        setError(data.message || '建立恢復請求失敗')
        return
      }
      setMessage(data.message || '已建立恢復請求')
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
          <LifeBuoy className="h-6 w-6 text-primary-600" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">帳號恢復</h1>
        <p className="text-sm text-gray-600">Line 與 Google 皆無法使用時，平台支援會依資料審核。</p>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 justify-between"
            onClick={() => startSocialRecovery('line')}
            disabled={isLoading}
          >
            <span className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Line
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 justify-between"
            onClick={() => startSocialRecovery('google')}
            disabled={isLoading}
          >
            <span className="flex items-center gap-2">
              <Chrome className="h-4 w-4" />
              Google
            </span>
          </Button>
        </div>

        <div>
          <Label htmlFor="organizationName">機構名稱</Label>
          <Input
            id="organizationName"
            value={organizationName}
            onChange={event => setOrganizationName(event.target.value)}
            placeholder="餐廳或供應商名稱"
          />
        </div>
        <div>
          <Label htmlFor="email">電子信箱</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="billing@example.com"
          />
        </div>
        <div>
          <Label htmlFor="phone">電話</Label>
          <Input
            id="phone"
            value={phone}
            onChange={event => setPhone(event.target.value)}
            placeholder="+886 912 345 678"
          />
        </div>
        <div>
          <Label htmlFor="note">補充資料</Label>
          <Textarea
            id="note"
            value={note}
            onChange={event => setNote(event.target.value)}
            rows={4}
          />
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-700">{message}</p>
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button
        type="button"
        className="mt-6 h-12 w-full"
        onClick={submitRecovery}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : '送出恢復請求'}
      </Button>

      <div className="mt-6 text-center text-sm">
        <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
          返回登入
        </Link>
      </div>
    </div>
  )
}
