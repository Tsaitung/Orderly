import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

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
  const response = await fetch(`${resolveBackendBase(req)}/api/auth/account-recovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  return NextResponse.json(data, { status: response.status })
}
