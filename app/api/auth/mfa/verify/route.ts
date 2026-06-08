import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const ACCESS_COOKIE_NAME = 'orderly_session'
const REFRESH_COOKIE_NAME = 'orderly_refresh'

function isProbablyJwt(token: string): boolean {
  return token.split('.').length === 3
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  const raw = parts[1]
  if (!raw) return null
  const padded = raw.padEnd(raw.length + ((4 - (raw.length % 4)) % 4), '=')
  try {
    return JSON.parse(Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
  } catch {
    return null
  }
}

function getJwtMaxAgeSeconds(token: string, fallbackSeconds: number): number {
  const payload = decodeJwtPayload(token)
  const exp = typeof payload?.['exp'] === 'number' ? payload['exp'] : null
  return exp ? Math.max(exp - Math.floor(Date.now() / 1000), 0) : fallbackSeconds
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

function withAuthCookies(response: NextResponse, accessToken?: string, refreshToken?: string): NextResponse {
  if (accessToken && isProbablyJwt(accessToken)) {
    response.cookies.set(ACCESS_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: getJwtMaxAgeSeconds(accessToken, 15 * 60),
    })
  }
  if (refreshToken && isProbablyJwt(refreshToken)) {
    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: getJwtMaxAgeSeconds(refreshToken, 7 * 24 * 60 * 60),
    })
  }
  return response
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => ({}))
  const challenge = typeof body.challenge_token === 'string' ? body.challenge_token : undefined
  if (!challenge || !isProbablyJwt(challenge)) {
    return NextResponse.json({ success: false, message: 'Missing MFA challenge token' }, { status: 400 })
  }

  const response = await fetch(`${resolveBackendBase(req)}/api/auth/mfa/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${challenge}`,
    },
    body: JSON.stringify({
      code: body.code,
      use_backup: body.use_backup || body.useBackup || false,
    }),
  })
  const data = await response.json().catch(() => ({}))
  const nextResponse = NextResponse.json(data, { status: response.status })
  return withAuthCookies(nextResponse, data.token || data.access_token, data.refresh_token)
}
