import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const ACCESS_COOKIE_NAME = 'orderly_session'
const REFRESH_COOKIE_NAME = 'orderly_refresh'

function isProbablyJwt(token: string): boolean {
  return token.split('.').length === 3
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  const raw = parts[1]
  const padded = raw.padEnd(raw.length + ((4 - (raw.length % 4)) % 4), '=')
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  try {
    const json = Buffer.from(base64, 'base64').toString('utf8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function getJwtMaxAgeSeconds(token: string, fallbackSeconds: number): number {
  const payload = decodeJwtPayload(token)
  const exp = typeof payload?.exp === 'number' ? payload.exp : null
  if (!exp) return fallbackSeconds
  const now = Math.floor(Date.now() / 1000)
  const delta = exp - now
  return delta > 0 ? delta : 0
}

const resolveBackendBase = (req?: NextRequest): string => {
  const candidate =
    process.env.ORDERLY_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:8000'

  // 若帶有 /api 或 /api/bff 前綴，移除以避免 /api/api 重複
  const cleaned = candidate.replace(/\/api(?:\/bff)?\/?$/i, '')
  if (cleaned.startsWith('http')) {
    return cleaned
  }

  // 相對路徑回退至當前請求的 origin
  if (req) {
    try {
      const u = new URL(req.url)
      return `${u.protocol}//${u.host}`
    } catch (_) {
      /* ignore */
    }
  }
  return 'http://localhost:8000'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, rememberMe } = body || {}
    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Missing credentials' }, { status: 400 })
    }

    const base = resolveBackendBase(req)
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe: !!rememberMe }),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok || !data?.success) {
      return NextResponse.json(
        { success: false, message: data?.message || 'Login failed' },
        { status: 401 }
      )
    }

    const accessToken: string | undefined = data.token || data.access_token
    const refreshToken: string | undefined = data.refresh_token

    const resp = NextResponse.json({ success: true, user: data.user })

    if (accessToken && isProbablyJwt(accessToken)) {
      const maxAge = getJwtMaxAgeSeconds(accessToken, 15 * 60)
      resp.cookies.set(ACCESS_COOKIE_NAME, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge,
      })
    }
    if (refreshToken && isProbablyJwt(refreshToken)) {
      const maxAge = getJwtMaxAgeSeconds(refreshToken, 7 * 24 * 60 * 60)
      resp.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge,
      })
    }

    return resp
  } catch (e) {
    return NextResponse.json({ success: false, message: 'Unexpected error' }, { status: 500 })
  }
}
