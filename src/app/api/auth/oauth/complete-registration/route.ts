import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const ACCESS_COOKIE_NAME = 'orderly_session'
const REFRESH_COOKIE_NAME = 'orderly_refresh'

function isProbablyJwt(token: string): boolean {
  return token.split('.').length === 3
}

function resolveBackendBase(req: NextRequest): string {
  const candidate =
    process.env['ORDERLY_BACKEND_URL'] ||
    process.env['BACKEND_URL'] ||
    process.env['NEXT_PUBLIC_API_BASE_URL'] ||
    'http://localhost:8888'
  const cleaned = candidate.replace(/\/api(?:\/bff)?\/?$/i, '')
  if (cleaned.startsWith('http')) return cleaned
  const url = new URL(req.url)
  return `${url.protocol}//${url.host}`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => ({}))
  const backend = resolveBackendBase(req)
  const response = await fetch(`${backend}/api/auth/oauth/complete-registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  const nextResponse = NextResponse.json(data, { status: response.status })

  const accessToken: string | undefined = data.token || data.access_token
  const refreshToken: string | undefined = data.refresh_token
  if (accessToken && isProbablyJwt(accessToken)) {
    nextResponse.cookies.set(ACCESS_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    })
  }
  if (refreshToken && isProbablyJwt(refreshToken)) {
    nextResponse.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })
  }

  return nextResponse
}
