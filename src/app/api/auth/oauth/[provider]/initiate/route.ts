import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const PROVIDERS = new Set(['line', 'google'])

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

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
): Promise<NextResponse> {
  const provider = params.provider.toLowerCase()
  if (!PROVIDERS.has(provider)) {
    return NextResponse.json({ success: false, message: 'Unsupported provider' }, { status: 400 })
  }

  const redirectUri = new URL(`/auth/callback/${provider}`, req.url).toString()
  const backend = resolveBackendBase(req)
  const url = new URL(`${backend}/api/auth/oauth/${provider}/initiate`)
  url.searchParams.set('redirect_uri', redirectUri)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  const data = await response.json().catch(() => ({}))
  return NextResponse.json(data, { status: response.status })
}
