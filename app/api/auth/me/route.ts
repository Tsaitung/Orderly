import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // 獲取當前會話
    const session = await AuthService.getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: '未授權訪問'
      }, { status: 401 })
    }

    // 獲取用戶詳細信息
    const user = await AuthService.getCurrentUser(session)
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用戶不存在或已被停用'
      }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user
    })

  } catch (error) {
    console.error('Get current user API error:', error)
    return NextResponse.json({
      success: false,
      error: '服務器錯誤'
    }, { status: 500 })
  }
}