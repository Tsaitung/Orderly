export type HttpOptions = {
  baseUrl?: string
  headers?: Record<string, string>
}

// Prefer BFF proxy for same-origin requests; fall back to env or localhost gateway
const defaultBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/bff'

async function request<T>(path: string, init?: RequestInit, opts?: HttpOptions): Promise<T> {
  const base = opts?.baseUrl || defaultBase
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.headers || {}),
      ...(init?.headers || {})
    }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
  }
  return res.json()
}

export const http = {
  get: <T>(path: string, opts?: HttpOptions) => request<T>(path, { method: 'GET' }, opts),
  post: <T>(path: string, body?: any, opts?: HttpOptions) => request<T>(path, { method: 'POST', body: JSON.stringify(body || {}) }, opts),
  patch: <T>(path: string, body?: any, opts?: HttpOptions) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body || {}) }, opts)
}
