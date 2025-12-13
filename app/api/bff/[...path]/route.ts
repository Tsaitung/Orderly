import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACCESS_COOKIE_NAME = 'orderly_session'
const REFRESH_COOKIE_NAME = 'orderly_refresh'

// 本地開發環境的服務 URLs（僅在 API Gateway 不可用時使用）
const LOCAL_SERVICE_URLS = {
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  SUPPLIER_SERVICE_URL: process.env.SUPPLIER_SERVICE_URL || 'http://localhost:3008',
  CUSTOMER_HIERARCHY_SERVICE_URL:
    process.env.CUSTOMER_HIERARCHY_SERVICE_URL || 'http://localhost:3007',
  PRODUCT_SERVICE_URL: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003',
  ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
  ACCEPTANCE_SERVICE_URL: process.env.ACCEPTANCE_SERVICE_URL || 'http://localhost:3004/acceptance',
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
}

// 避免直連模式路徑拼錯：預設會補 /api，若 base 已含 /api 或 /acceptance 則避免重複
function joinBaseAndSubPath(base: string, subPath: string): string {
  const cleanBase = base.replace(/\/+$/, '')
  const segments = subPath.split('/').filter(Boolean)
  const baseSegments = cleanBase.split('/').filter(Boolean)
  const baseLast = baseSegments[baseSegments.length - 1]
  if (baseLast && segments[0] && baseLast === segments[0]) {
    segments.shift()
  }

  // acceptance 服務：服務自身已掛載 /acceptance，避免重複 /api
  if (cleanBase.endsWith('/acceptance')) {
    const joined = segments.join('/')
    return joined ? `${cleanBase}/${joined}` : cleanBase
  }

  // base 已含 /api 或 /api/v* 則直接拼接
  const baseHasApi = /\/api(\/v\d+)?$/.test(cleanBase)
  if (baseHasApi) {
    const joined = segments.join('/')
    return joined ? `${cleanBase}/${joined}` : cleanBase
  }

  // 如果 subPath 已經以 api/ 開頭，不需要再加 /api 前綴
  const subPathStartsWithApi = segments[0] === 'api'
  if (subPathStartsWithApi) {
    const joined = segments.join('/')
    return joined ? `${cleanBase}/${joined}` : cleanBase
  }

  // 預設加上 /api 前綴
  const joined = segments.join('/')
  return joined ? `${cleanBase}/api/${joined}` : `${cleanBase}/api`
}

// 智能服務路由 - 僅在本地開發且 Gateway 不可用時使用
function getDirectServiceUrl(path: string, environment: string): string | null {
  // 只在本地開發環境啟用直連
  if (environment === 'production') {
    return null
  }

  if (path.startsWith('v2/hierarchy') || path.startsWith('customers')) {
    return LOCAL_SERVICE_URLS.CUSTOMER_HIERARCHY_SERVICE_URL
  }
  if (path.startsWith('v1/users')) {
    return LOCAL_SERVICE_URLS.USER_SERVICE_URL
  }
  if (path.startsWith('v1/organizations') || path.startsWith('organizations')) {
    return LOCAL_SERVICE_URLS.USER_SERVICE_URL
  }
  if (path.startsWith('suppliers') || path.startsWith('api/suppliers')) {
    return LOCAL_SERVICE_URLS.SUPPLIER_SERVICE_URL
  }
  if (path.startsWith('v1/products') || path.startsWith('products')) {
    return LOCAL_SERVICE_URLS.PRODUCT_SERVICE_URL
  }
  if (path.startsWith('v1/orders') || path.startsWith('orders')) {
    return LOCAL_SERVICE_URLS.ORDER_SERVICE_URL
  }
  if (path.startsWith('v1/acceptance') || path.startsWith('acceptance')) {
    return LOCAL_SERVICE_URLS.ACCEPTANCE_SERVICE_URL
  }
  if (path.startsWith('v1/notifications') || path.startsWith('notifications')) {
    return LOCAL_SERVICE_URLS.NOTIFICATION_SERVICE_URL
  }

  return null
}

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

function setAuthCookies(resp: NextResponse, accessToken: string, refreshToken?: string): void {
  const accessMaxAge = getJwtMaxAgeSeconds(accessToken, 15 * 60)
  resp.cookies.set(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: accessMaxAge,
  })

  if (refreshToken) {
    const refreshMaxAge = getJwtMaxAgeSeconds(refreshToken, 7 * 24 * 60 * 60)
    resp.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: refreshMaxAge,
    })
  }
}

function clearAuthCookies(resp: NextResponse): void {
  resp.cookies.set(ACCESS_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  resp.cookies.set(REFRESH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function tryRefreshTokens(params: {
  req: NextRequest
  backendBaseUrl: string
  routingStrategy: 'gateway' | 'direct'
}): Promise<{ accessToken: string; refreshToken?: string } | null> {
  const refresh = params.req.cookies.get(REFRESH_COOKIE_NAME)?.value
  if (!refresh || !isProbablyJwt(refresh)) return null

  const refreshBase =
    params.routingStrategy === 'gateway' ? params.backendBaseUrl : LOCAL_SERVICE_URLS.USER_SERVICE_URL

  const refreshUrl = joinBaseAndSubPath(refreshBase, 'auth/refresh')
  const res = await fetchWithTimeout(
    refreshUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refresh}`,
      },
      body: JSON.stringify({}),
    },
    15000
  )

  const data = await res.json().catch(() => ({} as any))
  if (!res.ok || !data?.success) return null

  const accessToken: string | undefined = data.token || data.access_token
  const newRefresh: string | undefined = data.refresh_token
  if (!accessToken || !isProbablyJwt(accessToken)) return null

  return { accessToken, refreshToken: newRefresh && isProbablyJwt(newRefresh) ? newRefresh : refresh }
}

export async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const subPath = params.path?.join('/') || ''
  const url = new URL(req.url)
  const qs = url.search ? url.search : ''

  // ✅ 直接讀取環境變數，若缺失則從 NEXT_PUBLIC_API_BASE_URL 推導
  const deriveBackendFromPublic = (reqUrl?: URL): string | null => {
    const pub = process.env.NEXT_PUBLIC_API_BASE_URL
    if (!pub) return null
    try {
      if (pub.startsWith('http')) {
        const u = new URL(pub)
        return `${u.protocol}//${u.host}`
      }
      if (pub.startsWith('/') && reqUrl) {
        return `${reqUrl.protocol}//${reqUrl.host}`
      }
    } catch (_) {}
    return null
  }

  const BACKEND_URL =
    process.env.ORDERLY_BACKEND_URL ||
    process.env.BACKEND_URL ||
    deriveBackendFromPublic(new URL(req.url)) ||
    'http://localhost:8000'
  
  const nodeEnv = process.env.NODE_ENV || 'development'
  const environment = nodeEnv === 'staging' ? 'staging' :
                     nodeEnv === 'production' ? 'production' : 
                     'development'

  // 優先使用 API Gateway（Cloud Run 友好）
  let target = `${BACKEND_URL}/api/${subPath}${qs}`
  let routingStrategy: 'gateway' | 'direct' = 'gateway'
  const directServiceUrl = getDirectServiceUrl(subPath, environment)

  // 本地開發環境：如果 Gateway 不可用，嘗試直連服務
  if (environment !== 'production') {
    try {
      // 快速檢測 Gateway 是否可用（不等待響應）
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 100) // 100ms 超時

      await fetch(`${BACKEND_URL}/health`, {
        signal: controller.signal,
        method: 'HEAD',
      })
      // Gateway 可用，保持使用 Gateway
    } catch {
      // Gateway 不可用，嘗試直連服務
      if (directServiceUrl) {
        target = `${joinBaseAndSubPath(directServiceUrl, subPath)}${qs}`
        routingStrategy = 'direct'
      }
    }
  }

  console.log(`[BFF] ${req.method} ${subPath} -> ${target} (${routingStrategy})`)

  const method = req.method
  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => {
    if (k.toLowerCase() === 'host') return
    headers[k] = v
  })

  // Inject Authorization from httpOnly cookie for server-side auth
  const access = req.cookies.get(ACCESS_COOKIE_NAME)?.value
  if (access && isProbablyJwt(access)) {
    headers['authorization'] = `Bearer ${access}`
  }

  const init: RequestInit = { method, headers }

  if (!['GET', 'HEAD'].includes(method)) {
    const body = await req.arrayBuffer()
    init.body = body
  }

  try {
    console.log(`[BFF] Making request to: ${target}`)
    console.log(`[BFF] Request headers:`, JSON.stringify(headers, null, 2))

    let res = await fetchWithTimeout(target, init, 30000)
    console.log(`[BFF] Response status: ${res.status}`)
    console.log(
      `[BFF] Response headers:`,
      JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2)
    )

    // 在本地開發環境中，若 Gateway 回傳錯誤，對特定資源（如 products/skus）自動回退直連服務
    const isLocal = environment !== 'production'
    const isGateway = routingStrategy === 'gateway'
    const isServerError = res.status >= 500 || [404, 502, 503].includes(res.status)
    const canDirect = Boolean(directServiceUrl)
    const isProductDomain = subPath.startsWith('products') || subPath.startsWith('v1/products')

    if (isLocal && isGateway && isServerError && canDirect && isProductDomain) {
      const fallbackTarget = `${joinBaseAndSubPath(directServiceUrl, subPath)}${qs}`
      console.warn(
        `[BFF] Gateway returned ${res.status}. Falling back to direct service: ${fallbackTarget}`
      )
      try {
        const fallbackRes = await fetchWithTimeout(fallbackTarget, init, 30000)
        console.log(`[BFF] Fallback response status: ${fallbackRes.status}`)
        if (fallbackRes.ok || fallbackRes.status !== res.status) {
          res = fallbackRes
          routingStrategy = 'direct'
          target = fallbackTarget
        }
      } catch (fallbackErr) {
        console.error('[BFF] Fallback fetch failed:', fallbackErr)
      }
    }

    // Token expired / missing token: if we have refresh token cookie, refresh then retry once.
    let refreshedTokens: { accessToken: string; refreshToken?: string } | null = null
    const canAttemptRefresh =
      req.method !== 'OPTIONS' &&
      res.status === 401 &&
      !subPath.startsWith('auth/') &&
      !subPath.startsWith('api/auth/')

    if (canAttemptRefresh) {
      refreshedTokens = await tryRefreshTokens({
        req,
        backendBaseUrl: BACKEND_URL,
        routingStrategy,
      }).catch(() => null)

      if (refreshedTokens) {
        headers['authorization'] = `Bearer ${refreshedTokens.accessToken}`
        res = await fetchWithTimeout(target, init, 30000)
      }
    }

    const respHeaders = new Headers()
    res.headers.forEach((v, k) => {
      if (['content-encoding', 'transfer-encoding', 'connection'].includes(k.toLowerCase())) return
      respHeaders.set(k, v)
    })

    const data = await res.arrayBuffer()

    // Log response body for debugging (only for errors)
    if (res.status >= 400) {
      const textData = new TextDecoder().decode(data)
      console.error(`[BFF] Error response body:`, textData)
    }

    const resp = new NextResponse(data, { status: res.status, headers: respHeaders })

    if (refreshedTokens) {
      setAuthCookies(resp, refreshedTokens.accessToken, refreshedTokens.refreshToken)
    } else if (canAttemptRefresh && res.status === 401) {
      // Refresh failed; clear cookies so client can force re-login.
      clearAuthCookies(resp)
    }

    return resp
  } catch (error: any) {
    console.error(`[BFF] Error fetching ${target}:`, {
      message: error.message,
      cause: error.cause,
      stack: error.stack,
    })

    // 本地環境：主要請求失敗時，嘗試對產品域名執行直連回退
    const isLocal = environment !== 'production'
    const directUrl = getDirectServiceUrl(subPath, environment)
    const isProductDomain = subPath.startsWith('products') || subPath.startsWith('v1/products')
    if (isLocal && directUrl && isProductDomain) {
      const fallbackTarget = `${joinBaseAndSubPath(directUrl, subPath)}${qs}`
      console.warn(`[BFF] Primary fetch failed. Trying fallback: ${fallbackTarget}`)
      try {
        const fallbackRes = await fetch(fallbackTarget, init)
        const respHeaders = new Headers()
        fallbackRes.headers.forEach((v, k) => {
          if (['content-encoding', 'transfer-encoding', 'connection'].includes(k.toLowerCase()))
            return
          respHeaders.set(k, v)
        })
        const data = await fallbackRes.arrayBuffer()
        return new NextResponse(data, { status: fallbackRes.status, headers: respHeaders })
      } catch (fallbackErr: any) {
        console.error('[BFF] Fallback fetch also failed:', {
          message: fallbackErr.message,
          cause: fallbackErr.cause,
          stack: fallbackErr.stack,
        })
      }
    }

    // 如果是本地開發且服務不可用，返回友好的錯誤信息
    if (environment !== 'production' && error.cause?.code === 'ECONNREFUSED') {
      const serviceName =
        routingStrategy === 'direct' ? target.split('//')[1]?.split('/')[0] || 'Unknown Service' : 'API Gateway'
      return new NextResponse(
        JSON.stringify({
          error: 'Service Unavailable',
          message: `${serviceName} is not running. Please start the required service.`,
          path: subPath,
          target: target,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // 其他錯誤
    return new NextResponse(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to process request',
        path: subPath,
        target: target,
        errorType: error.constructor.name,
        errorMessage: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
}
