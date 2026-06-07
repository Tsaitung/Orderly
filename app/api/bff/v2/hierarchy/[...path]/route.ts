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

function resolveGatewayBase(req?: NextRequest): string {
  const candidate =
    process.env.ORDERLY_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:8888'

  const cleaned = candidate.replace(/\/api(?:\/bff)?\/?$/i, '')
  if (cleaned.startsWith('http')) {
    return cleaned
  }

  if (req) {
    try {
      const u = new URL(req.url)
      return `${u.protocol}//${u.host}`
    } catch (_) {
      /* ignore */
    }
  }
  return 'http://localhost:8888'
}

// 代理到 monolith customer hierarchy API
const resolveHierarchyServiceBase = (): string => {
  const custom = process.env.NEXT_PUBLIC_CUSTOMER_HIERARCHY_API_URL
  if (custom) {
    return custom.replace(/\/+$/, '')
  }
  return `${resolveGatewayBase()}/api/v2`
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = path?.join('/') || ''
  const url = new URL(req.url)
  const searchParams = url.searchParams.toString()
  const queryStr = searchParams ? `?${searchParams}` : ''
  const target = `${resolveHierarchyServiceBase()}/hierarchy/${pathStr}${queryStr}`

  const originalAuthHeader = req.headers.get('authorization')
  const accessCookie = req.cookies.get(ACCESS_COOKIE_NAME)?.value
  const refreshCookie = req.cookies.get(REFRESH_COOKIE_NAME)?.value

  const buildAuthHeader = (token?: string): string | undefined => {
    if (!token || !isProbablyJwt(token)) return undefined
    return `Bearer ${token}`
  }

  const authHeader =
    originalAuthHeader ||
    (accessCookie && isProbablyJwt(accessCookie) ? buildAuthHeader(accessCookie) : undefined)

  try {
    const bodyText = req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined

    const doRequest = async (authorization?: string) => {
      const response = await fetch(target, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...(authorization && { Authorization: authorization }),
        },
        body: bodyText,
      })
      const data = await response.json().catch(() => ({}))
      return { response, data }
    }

    let { response, data } = await doRequest(authHeader || undefined)

    let refreshedTokens: { accessToken: string; refreshToken?: string } | null = null
    if (response.status === 401 && refreshCookie && isProbablyJwt(refreshCookie)) {
      const gatewayBase = resolveGatewayBase(req)
      const refreshRes = await fetch(`${gatewayBase}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshCookie}`,
        },
        body: JSON.stringify({}),
      })
      const refreshData = await refreshRes.json().catch(() => ({} as any))

      if (refreshRes.ok && refreshData?.success) {
        const newAccess: string | undefined = refreshData.token || refreshData.access_token
        const newRefresh: string | undefined = refreshData.refresh_token
        if (newAccess && isProbablyJwt(newAccess)) {
          refreshedTokens = {
            accessToken: newAccess,
            refreshToken: newRefresh && isProbablyJwt(newRefresh) ? newRefresh : refreshCookie,
          }
          ;({ response, data } = await doRequest(buildAuthHeader(refreshedTokens.accessToken)))
        }
      }
    }

    const resp = NextResponse.json(data, { status: response.status })

    if (refreshedTokens) {
      resp.cookies.set(ACCESS_COOKIE_NAME, refreshedTokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: getJwtMaxAgeSeconds(refreshedTokens.accessToken, 15 * 60),
      })
      if (refreshedTokens.refreshToken) {
        resp.cookies.set(REFRESH_COOKIE_NAME, refreshedTokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: getJwtMaxAgeSeconds(refreshedTokens.refreshToken, 7 * 24 * 60 * 60),
        })
      }
    }

    return resp
  } catch (error) {
    console.error('Hierarchy BFF proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy to hierarchy service', detail: String(error) },
      { status: 500 }
    )
  }
}

export const GET = handler
export const POST = handler
export const PATCH = handler
export const DELETE = handler
export const PUT = handler
