import { NextRequest, NextResponse } from 'next/server'
import { AuthService, RegisterData } from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('請輸入有效的電子郵件地址'),
  password: z.string().min(8, '密碼至少需要 8 個字符'),
  organizationName: z.string().min(2, '組織名稱至少需要 2 個字符'),
  organizationType: z.enum(['restaurant', 'supplier'], {
    errorMap: () => ({ message: '組織類型必須是 restaurant 或 supplier' }),
  }),
  firstName: z.string().min(1, '請輸入姓名'),
  lastName: z.string().min(1, '請輸入姓名'),
  phone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 驗證請求數據
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: '請求數據格式錯誤',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const registerData: RegisterData = validationResult.data

    // 執行註冊
    const result = await AuthService.register(registerData)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    // 創建響應並設置 cookie
    const response = NextResponse.json({
      success: true,
      user: result.user,
      message: '註冊成功',
    })

    // 設置 JWT cookie
    if (result.token) {
      await AuthService.setSessionCookie(response, result.token)
    }

    return response
  } catch (error) {
    console.error('Register API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '服務器錯誤，請稍後再試',
      },
      { status: 500 }
    )
  }
}
