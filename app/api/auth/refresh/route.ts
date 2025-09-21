import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const refresh = req.cookies.get('orderly_refresh')?.value
    if (!refresh) {
      return NextResponse.json({ success: false, message: 'No refresh token' }, { status: 400 })
    }

    const base = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/bff'
    const res = await fetch(`${base}/users/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refresh}`
      },
      body: JSON.stringify({})
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok || !data?.success) {
      return NextResponse.json({ success: false, message: data?.message || 'Refresh failed' }, { status: 401 })
    }

    const accessToken: string | undefined = data.token || data.access_token
    const newRefresh: string | undefined = data.refresh_token

    const remember = true // keep extended; or infer from prior cookie Max-Age (not accessible directly)
    const resp = NextResponse.json({ success: true })

    if (accessToken) {
      const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7
      resp.cookies.set('orderly_session', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge,
      })
    }
    if (newRefresh) {
      const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 14
      resp.cookies.set('orderly_refresh', newRefresh, {
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
