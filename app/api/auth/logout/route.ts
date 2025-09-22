import { NextResponse } from 'next/server'

export async function POST() {
  const resp = NextResponse.json({ success: true })
  resp.cookies.set('orderly_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  resp.cookies.set('orderly_refresh', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return resp
}
