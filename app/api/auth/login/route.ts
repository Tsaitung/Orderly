import { NextRequest, NextResponse } from 'next/server'
import { AuthService, LoginCredentials } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('請輸入有效的電子郵件地址'),
  password: z.string().min(6, '密碼至少需要 6 個字符')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 驗證請求數據
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: '請求數據格式錯誤',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const credentials: LoginCredentials = validationResult.data

    // 執行登入
    const result = await AuthService.login(credentials)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 401 })
    }

    // 創建響應並設置 cookie
    const response = NextResponse.json({
      success: true,
      user: result.user,
      message: '登入成功'
    })

    // 設置 JWT cookie
    if (result.token) {
      await AuthService.setSessionCookie(response, result.token)
    }

    return response

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json({
      success: false,
      error: '服務器錯誤，請稍後再試'
    }, { status: 500 })
  }
}