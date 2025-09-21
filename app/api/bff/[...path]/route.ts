import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:8000'

export async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const subPath = params.path?.join('/') || ''
  const url = new URL(req.url)
  const qs = url.search ? url.search : ''
  const target = `${GATEWAY_BASE}/api/${subPath}${qs}`

  const method = req.method
  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => {
    if (k.toLowerCase() === 'host') return
    headers[k] = v
  })

  // Inject Authorization from httpOnly cookie for server-side auth
  const access = req.cookies.get('orderly_session')?.value
  if (access) {
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

  const res = await fetch(target, init)
  const respHeaders = new Headers()
  res.headers.forEach((v, k) => {
    if (["content-encoding", "transfer-encoding", "connection"].includes(k.toLowerCase())) return
    respHeaders.set(k, v)
  })

  const data = await res.arrayBuffer()
  return new NextResponse(data, { status: res.status, headers: respHeaders })
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as OPTIONS }

