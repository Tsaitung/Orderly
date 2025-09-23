import { NextRequest, NextResponse } from 'next/server'

// 智能環境檢測 - Cloud Run 友好
// 使用運行時環境變數而非構建時變數
const BACKEND_URL =
  process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
    ? process.env.ORDERLY_BACKEND_URL || process.env.BACKEND_URL // Cloud Run 運行時變數
    : process.env.BACKEND_URL || 'http://localhost:8000'

// 本地開發環境的服務 URLs（僅在 API Gateway 不可用時使用）
const LOCAL_SERVICE_URLS = {
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  SUPPLIER_SERVICE_URL: process.env.SUPPLIER_SERVICE_URL || 'http://localhost:3008',
  CUSTOMER_HIERARCHY_SERVICE_URL:
    process.env.CUSTOMER_HIERARCHY_SERVICE_URL || 'http://localhost:3007',
  PRODUCT_SERVICE_URL: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003',
  ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
  ACCEPTANCE_SERVICE_URL: process.env.ACCEPTANCE_SERVICE_URL || 'http://localhost:3004',
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
}

// 智能服務路由 - 僅在本地開發且 Gateway 不可用時使用
function getDirectServiceUrl(path: string): string | null {
  // 只在本地開發環境啟用直連
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  if (path.startsWith('v2/hierarchy') || path.startsWith('customers')) {
    return LOCAL_SERVICE_URLS.CUSTOMER_HIERARCHY_SERVICE_URL
  }
  if (path.startsWith('v1/users')) {
    return LOCAL_SERVICE_URLS.USER_SERVICE_URL
  }
  if (path.startsWith('suppliers')) {
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

export async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const subPath = params.path?.join('/') || ''
  const url = new URL(req.url)
  const qs = url.search ? url.search : ''

  // 優先使用 API Gateway（Cloud Run 友好）
  let target = `${BACKEND_URL}/api/${subPath}${qs}`
  let routingStrategy: 'gateway' | 'direct' = 'gateway'
  const directServiceUrl = getDirectServiceUrl(subPath)

  // 本地開發環境：如果 Gateway 不可用，嘗試直連服務
  if (process.env.NODE_ENV !== 'production') {
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
        target = `${directServiceUrl}/api/${subPath}${qs}`
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
  const access = req.cookies.get('orderly_session')?.value
  // Only forward valid JWT tokens (must have 3 parts separated by dots)
  if (access && access.split('.').length === 3) {
    headers['authorization'] = `Bearer ${access}`
  }

  const init: RequestInit = { method, headers }

  if (!['GET', 'HEAD'].includes(method)) {
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await req.text()
      init.body = body
    } else {
      // For other types (form-data, etc.) just stream
      init.body = req.body as any
    }
  }

  try {
    console.log(`[BFF] Making request to: ${target}`)
    console.log(`[BFF] Request headers:`, JSON.stringify(headers, null, 2))

    let res = await fetch(target, init)
    console.log(`[BFF] Response status: ${res.status}`)
    console.log(
      `[BFF] Response headers:`,
      JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2)
    )

    // 在本地開發環境中，若 Gateway 回傳錯誤，對特定資源（如 products/skus）自動回退直連服務
    const isLocal = process.env.NODE_ENV !== 'production'
    const isGateway = routingStrategy === 'gateway'
    const isServerError = res.status >= 500 || [404, 502, 503].includes(res.status)
    const canDirect = Boolean(directServiceUrl)
    const isProductDomain = subPath.startsWith('products') || subPath.startsWith('v1/products')

    if (isLocal && isGateway && isServerError && canDirect && isProductDomain) {
      const fallbackTarget = `${directServiceUrl}/api/${subPath}${qs}`
      console.warn(
        `[BFF] Gateway returned ${res.status}. Falling back to direct service: ${fallbackTarget}`
      )
      try {
        const fallbackRes = await fetch(fallbackTarget, init)
        console.log(`[BFF] Fallback response status: ${fallbackRes.status}`)
        if (fallbackRes.ok || fallbackRes.status !== res.status) {
          res = fallbackRes
          routingStrategy = 'direct'
        }
      } catch (fallbackErr) {
        console.error('[BFF] Fallback fetch failed:', fallbackErr)
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

    return new NextResponse(data, { status: res.status, headers: respHeaders })
  } catch (error: any) {
    console.error(`[BFF] Error fetching ${target}:`, {
      message: error.message,
      cause: error.cause,
      stack: error.stack,
    })

    // 本地環境：主要請求失敗時，嘗試對產品域名執行直連回退
    const isLocal = process.env.NODE_ENV !== 'production'
    const directUrl = getDirectServiceUrl(subPath)
    const isProductDomain = subPath.startsWith('products') || subPath.startsWith('v1/products')
    if (isLocal && directUrl && isProductDomain) {
      const fallbackTarget = `${directUrl}/api/${subPath}${qs}`
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
    if (process.env.NODE_ENV !== 'production' && error.cause?.code === 'ECONNREFUSED') {
      const serviceName =
        routingStrategy === 'direct' ? target.split('//')[1].split('/')[0] : 'API Gateway'
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
