import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 公開路徑，不需要驗證
  const publicPaths = [
    '/',
    '/api/health',
    '/api/auth/login',
    '/api/auth/register',
    '/login',
    '/register'
  ]

  // 靜態資源路徑
  const staticPaths = [
    '/_next',
    '/favicon.ico',
    '/images',
    '/icons',
    '/assets'
  ]

  // 檢查是否為公開路徑或靜態資源
  if (publicPaths.includes(pathname) || 
      staticPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 對於現在，先允許所有 API 路由通過，待後續實現完整認證
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 對於受保護的路由，暫時重定向到首頁
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/admin') ||
      pathname.startsWith('/settings')) {
    
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
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