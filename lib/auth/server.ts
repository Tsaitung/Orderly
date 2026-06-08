/**
 * Server-side auth helpers for sessions and token-backed request context.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import SecureAuthService from '../security/auth-service'
import { CacheService } from '../redis'

const authService = SecureAuthService.getInstance()

if (typeof window === 'undefined') {
  authService.initialize().catch(console.error)
}

export interface SessionPayload {
  userId: string
  email?: string
  organizationId: string
  role: string
  organizationType: 'restaurant' | 'supplier' | 'platform'
  exp?: number
  iat?: number
  lastLoginAt?: Date
  registeredAt?: Date
}

export class AuthService {
  static async createSession(payload: Omit<SessionPayload, 'exp' | 'iat'>): Promise<string> {
    const tokens = await authService.createTokenPair({
      sub: payload.userId,
      email: payload.email || '',
      organizationId: payload.organizationId,
      role: payload.role,
      organizationType: payload.organizationType,
    })
    return tokens.accessToken
  }

  static async verifySession(token: string): Promise<SessionPayload | null> {
    const context = await authService.verifyAuth(token)
    if (!context) return null

    return {
      userId: context.userId,
      organizationId: context.organizationId,
      role: context.role,
      organizationType: context.organizationType,
    }
  }

  static async setSessionCookie(response: NextResponse, token: string): Promise<void> {
    response.cookies.set('orderly-session', token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    })
  }

  static async getSessionFromCookie(): Promise<SessionPayload | null> {
    const cookieStore = cookies()
    const token =
      cookieStore.get('orderly-session')?.value || cookieStore.get('orderly-access-token')?.value
    if (!token) return null
    return this.verifySession(token)
  }

  static async clearSession(): Promise<void> {
    const cookieStore = cookies()
    cookieStore.delete('orderly-session')
    cookieStore.delete('orderly-access-token')
    cookieStore.delete('orderly-refresh-token')
  }

  static async logout(userId: string, accessToken?: string, refreshToken?: string): Promise<void> {
    try {
      if (accessToken) await authService.logout(accessToken, refreshToken)
      await CacheService.deleteUserSession(userId)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  static async getCurrentUser(session: SessionPayload): Promise<SessionPayload | null> {
    try {
      const cachedUser = await CacheService.getUserSession(session.userId)
      if (cachedUser) return cachedUser as SessionPayload

      return {
        userId: session.userId,
        email: session.email,
        organizationId: session.organizationId,
        role: session.role,
        organizationType: session.organizationType,
        lastLoginAt: new Date(),
      }
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  static requireAuth(allowedRoles?: string[]) {
    return authService.requireAuth(allowedRoles)
  }

  static getSecurityContext = authService.getSecurityContext.bind(authService)
}
