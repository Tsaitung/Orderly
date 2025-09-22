import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Debug: 記錄所有平台路徑請求
  if (pathname.startsWith('/platform')) {
    console.log('🔍 Platform request:', pathname)
  }

  // 公開路徑，不需要驗證
  const publicPaths = [
    '/',
    '/api/health',
    '/api/auth/login',
    '/api/auth/register',
    '/login',
    '/register',
  ]

  // 靜態資源路徑
  const staticPaths = ['/_next', '/favicon.ico', '/images', '/icons', '/assets']

  // 檢查是否為公開路徑或靜態資源
  if (publicPaths.includes(pathname) || staticPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 對於現在，先允許所有 API 路由通過，待後續實現完整認證
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 檢查 httpOnly cookie 是否存在（由 /api/auth/login 設置）
  const sessionCookie = request.cookies.get('orderly_session')


  // 對於受保護的路由，若無 session 則重定向到首頁
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/platform') ||
    pathname.startsWith('/settings')
  ) {
    if (!sessionCookie) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
