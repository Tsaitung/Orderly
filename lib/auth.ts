import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './db'
import { CacheService } from './redis'
import bcrypt from 'bcryptjs'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-for-development'
)

const COOKIE_NAME = 'orderly-session'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/'
}

export interface SessionPayload {
  userId: string
  email: string
  organizationId: string
  role: string
  organizationType: 'restaurant' | 'supplier'
  exp: number
  iat: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  organizationName: string
  organizationType: 'restaurant' | 'supplier'
  firstName: string
  lastName: string
  phone?: string
}

export class AuthService {
  static async createSession(payload: Omit<SessionPayload, 'exp' | 'iat'>): Promise<string> {
    const exp = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
    const iat = Math.floor(Date.now() / 1000)
    
    const fullPayload = { ...payload, exp, iat }
    
    const token = await new SignJWT(fullPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .sign(secret)

    return token
  }

  static async verifySession(token: string): Promise<SessionPayload | null> {
    try {
      const { payload } = await jwtVerify(token, secret)
      return payload as SessionPayload
    } catch (error) {
      console.error('Token verification failed:', error)
      return null
    }
  }

  static async setSessionCookie(response: NextResponse, token: string): Promise<void> {
    response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS)
  }

  static async getSessionFromCookie(): Promise<SessionPayload | null> {
    const cookieStore = cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value

    if (!token) {
      return null
    }

    return this.verifySession(token)
  }

  static async clearSession(): Promise<void> {
    const cookieStore = cookies()
    cookieStore.delete(COOKIE_NAME)
  }

  static async login(credentials: LoginCredentials): Promise<{
    success: boolean
    user?: any
    token?: string
    error?: string
  }> {
    try {
      // 查找用戶
      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
        include: {
          organization: true
        }
      })

      if (!user || !user.passwordHash) {
        return { success: false, error: '用戶不存在或密碼錯誤' }
      }

      if (!user.isActive) {
        return { success: false, error: '帳戶已被停用' }
      }

      // 驗證密碼
      const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash)
      if (!isPasswordValid) {
        return { success: false, error: '用戶不存在或密碼錯誤' }
      }

      // 更新最後登入時間
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })

      // 創建 JWT token
      const token = await this.createSession({
        userId: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
        organizationType: user.organization.type
      })

      // 快取用戶會話
      await CacheService.setUserSession(user.id, {
        userId: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
        organizationType: user.organization.type,
        lastLoginAt: new Date()
      })

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          organization: {
            id: user.organization.id,
            name: user.organization.name,
            type: user.organization.type
          }
        },
        token
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: '登入失敗，請稍後再試' }
    }
  }

  static async register(data: RegisterData): Promise<{
    success: boolean
    user?: any
    token?: string
    error?: string
  }> {
    try {
      // 檢查用戶是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      })

      if (existingUser) {
        return { success: false, error: '此電子郵件已被註冊' }
      }

      // 雜湊密碼
      const passwordHash = await bcrypt.hash(data.password, 12)

      // 使用交易創建組織和用戶
      const result = await prisma.$transaction(async (tx) => {
        // 創建組織
        const organization = await tx.organization.create({
          data: {
            name: data.organizationName,
            type: data.organizationType
          }
        })

        // 創建用戶
        const user = await tx.user.create({
          data: {
            email: data.email,
            passwordHash,
            organizationId: organization.id,
            role: data.organizationType === 'restaurant' 
              ? 'restaurant_admin' 
              : 'supplier_admin',
            metadata: {
              firstName: data.firstName,
              lastName: data.lastName,
              phone: data.phone
            }
          }
        })

        return { user, organization }
      })

      // 創建 JWT token
      const token = await this.createSession({
        userId: result.user.id,
        email: result.user.email,
        organizationId: result.user.organizationId,
        role: result.user.role,
        organizationType: result.organization.type
      })

      // 快取用戶會話
      await CacheService.setUserSession(result.user.id, {
        userId: result.user.id,
        email: result.user.email,
        organizationId: result.user.organizationId,
        role: result.user.role,
        organizationType: result.organization.type,
        registeredAt: new Date()
      })

      return {
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          organization: {
            id: result.organization.id,
            name: result.organization.name,
            type: result.organization.type
          }
        },
        token
      }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: '註冊失敗，請稍後再試' }
    }
  }

  static async logout(userId: string): Promise<void> {
    try {
      // 清除 Redis 中的用戶會話
      await CacheService.deleteUserSession(userId)
      
      // 增加用戶的 tokenVersion 來使所有現有 token 失效
      await prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } }
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  static async getCurrentUser(session: SessionPayload): Promise<any | null> {
    try {
      // 先嘗試從快取獲取
      const cachedUser = await CacheService.getUserSession(session.userId)
      if (cachedUser) {
        return cachedUser
      }

      // 從數據庫獲取最新用戶信息
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        include: {
          organization: true
        }
      })

      if (!user || !user.isActive) {
        return null
      }

      const userData = {
        id: user.id,
        email: user.email,
        role: user.role,
        metadata: user.metadata,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          type: user.organization.type,
          settings: user.organization.settings
        },
        lastLoginAt: user.lastLoginAt
      }

      // 快取用戶數據
      await CacheService.setUserSession(user.id, userData)

      return userData
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  static requireAuth(allowedRoles?: string[]) {
    return async (req: NextRequest) => {
      const cookieStore = req.cookies
      const token = cookieStore.get(COOKIE_NAME)?.value

      if (!token) {
        return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
      }

      const session = await this.verifySession(token)
      if (!session) {
        return NextResponse.json({ error: '無效的會話' }, { status: 401 })
      }

      // 檢查角色權限
      if (allowedRoles && !allowedRoles.includes(session.role)) {
        return NextResponse.json({ error: '權限不足' }, { status: 403 })
      }

      // 將會話信息附加到請求
      ;(req as any).user = session

      return null // 表示驗證通過
    }
  }
}

export default AuthService