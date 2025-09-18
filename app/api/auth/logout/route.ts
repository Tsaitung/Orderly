import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 獲取當前會話
    const session = await AuthService.getSessionFromCookie()
    
    if (session) {
      // 執行登出
      await AuthService.logout(session.userId)
    }

    // 創建響應並清除 cookie
    const response = NextResponse.json({
      success: true,
      message: '登出成功'
    })

    // 清除會話 cookie
    response.cookies.delete('orderly-session')

    return response

  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json({
      success: false,
      error: '登出失敗'
    }, { status: 500 })
  }
}