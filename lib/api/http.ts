export type HttpOptions = {
  baseUrl?: string
  headers?: Record<string, string>
}

// Prefer BFF proxy for same-origin requests; only use external base when explicitly overridden
const defaultBase = '/api/bff'

/**
 * Build query string from params object
 * Filters out undefined, null, and empty string values
 */
export function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return ''
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  }
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ''
}

async function request<T>(path: string, init?: RequestInit, opts?: HttpOptions): Promise<T> {
  const base = opts?.baseUrl || defaultBase
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.headers || {}),
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
  }
  return res.json()
}

function withBody<T>(method: string, path: string, body?: unknown, opts?: HttpOptions): Promise<T> {
  return request<T>(path, { method, body: JSON.stringify(body ?? {}) }, opts)
}

export const http = {
  request,
  get: <T>(path: string, opts?: HttpOptions) => request<T>(path, { method: 'GET' }, opts),
  post: <T>(path: string, body?: unknown, opts?: HttpOptions) => withBody<T>('POST', path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: HttpOptions) => withBody<T>('PATCH', path, body, opts),
  put: <T>(path: string, body?: unknown, opts?: HttpOptions) => withBody<T>('PUT', path, body, opts),
  delete: <T>(path: string, opts?: HttpOptions) => request<T>(path, { method: 'DELETE' }, opts),
}
