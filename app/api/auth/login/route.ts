import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, rememberMe } = body || {}
    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Missing credentials' }, { status: 400 })
    }

    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe: !!rememberMe })
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok || !data?.success) {
      return NextResponse.json({ success: false, message: data?.message || 'Login failed' }, { status: 401 })
    }

    const accessToken: string | undefined = data.token || data.access_token
    const refreshToken: string | undefined = data.refresh_token

    const resp = NextResponse.json({ success: true, user: data.user })

    if (accessToken) {
      const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7 // 30d or 7d
      resp.cookies.set('orderly_session', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge,
      })
    }
    if (refreshToken) {
      const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 14 // optionally longer
      resp.cookies.set('orderly_refresh', refreshToken, {
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
