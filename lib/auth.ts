/**
 * Secure Authentication Service - Production Ready
 * Replaces insecure JWT implementation with enterprise-grade security
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import SecureAuthService from './security/auth-service'
import { CacheService } from './redis'

// Initialize secure authentication service
const authService = SecureAuthService.getInstance()

// Ensure service is initialized
if (typeof window === 'undefined') {
  authService.initialize().catch(console.error)
}

export interface SessionPayload {
  userId: string
  email: string
  organizationId: string
  role: string
  organizationType: 'restaurant' | 'supplier'
  exp?: number
  iat?: number
  lastLoginAt?: Date
  registeredAt?: Date
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
  /**
   * Create secure JWT tokens with RS256 algorithm
   */
  static async createSession(payload: Omit<SessionPayload, 'exp' | 'iat'>): Promise<string> {
    const tokens = await authService.createTokenPair({
      sub: payload.userId,
      email: payload.email,
      organizationId: payload.organizationId,
      role: payload.role,
      organizationType: payload.organizationType
    })
    return tokens.accessToken
  }

  /**
   * Verify JWT token securely
   */
  static async verifySession(token: string): Promise<SessionPayload | null> {
    const context = await authService.verifyAuth(token)
    if (!context) {
      return null
    }

    return {
      userId: context.userId,
      email: '', // Will be fetched from user service if needed
      organizationId: context.organizationId,
      role: context.role,
      organizationType: context.organizationType
    }
  }

  /**
   * Set secure session cookies
   */
  static async setSessionCookie(response: NextResponse, token: string): Promise<void> {
    // For backward compatibility, set the old cookie format
    // But recommend using the new secure cookie format
    response.cookies.set('orderly-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/'
    })
  }

  /**
   * Get session from cookie with security validation
   */
  static async getSessionFromCookie(): Promise<SessionPayload | null> {
    const cookieStore = cookies()
    const token = cookieStore.get('orderly-session')?.value ||
                  cookieStore.get('orderly-access-token')?.value

    if (!token) {
      return null
    }

    return this.verifySession(token)
  }

  /**
   * Clear session cookies securely
   */
  static async clearSession(): Promise<void> {
    const cookieStore = cookies()
    cookieStore.delete('orderly-session')
    cookieStore.delete('orderly-access-token')
    cookieStore.delete('orderly-refresh-token')
  }

  /**
   * Secure login with comprehensive validation and security logging
   */
  static async login(credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<{
    success: boolean
    user?: SessionPayload
    token?: string
    error?: string
    errorCode?: string
  }> {
    const result = await authService.login(credentials, ipAddress, userAgent)
    
    if (result.success && result.user && result.tokens) {
      // Cache user session for backward compatibility
      await CacheService.setUserSession(result.user.id, {
        userId: result.user.id,
        email: result.user.email,
        organizationId: result.user.organizationId,
        role: result.user.role,
        organizationType: result.user.organizationType,
        lastLoginAt: new Date()
      })
      
      return {
        success: true,
        user: {
          userId: result.user.id,
          email: result.user.email,
          organizationId: result.user.organizationId,
          role: result.user.role,
          organizationType: result.user.organizationType
        },
        token: result.tokens.accessToken
      }
    }
    
    return {
      success: false,
      error: result.error || '登入失敗',
      errorCode: result.errorCode
    }
  }

  /**
   * Secure registration with input validation and security checks
   */
  static async register(data: RegisterData, ipAddress?: string, userAgent?: string): Promise<{
    success: boolean
    user?: SessionPayload
    token?: string
    error?: string
    errorCode?: string
  }> {
    const result = await authService.register(data, ipAddress, userAgent)
    
    if (result.success && result.user && result.tokens) {
      // Cache user session for backward compatibility
      await CacheService.setUserSession(result.user.id, {
        userId: result.user.id,
        email: result.user.email,
        organizationId: result.user.organizationId,
        role: result.user.role,
        organizationType: result.user.organizationType,
        registeredAt: new Date()
      })
      
      return {
        success: true,
        user: {
          userId: result.user.id,
          email: result.user.email,
          organizationId: result.user.organizationId,
          role: result.user.role,
          organizationType: result.user.organizationType
        },
        token: result.tokens.accessToken
      }
    }
    
    return {
      success: false,
      error: result.error || '註冊失敗',
      errorCode: result.errorCode
    }
  }

  /**
   * Secure logout with token revocation
   */
  static async logout(userId: string, accessToken?: string, refreshToken?: string): Promise<void> {
    try {
      // Revoke JWT tokens
      if (accessToken) {
        await authService.logout(accessToken, refreshToken)
      }
      
      // Clear Redis cache
      await CacheService.deleteUserSession(userId)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  /**
   * Get current user with security validation
   */
  static async getCurrentUser(session: SessionPayload): Promise<SessionPayload | null> {
    try {
      // Try to get from cache first
      const cachedUser = await CacheService.getUserSession(session.userId)
      if (cachedUser) {
        return cachedUser as SessionPayload
      }

      // Return session data as fallback
      return {
        userId: session.userId,
        email: session.email,
        organizationId: session.organizationId,
        role: session.role,
        organizationType: session.organizationType,
        lastLoginAt: new Date()
      }
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  /**
   * Secure authentication middleware with comprehensive security checks
   */
  static requireAuth(allowedRoles?: string[]) {
    return authService.requireAuth(allowedRoles)
  }

  /**
   * Get security context from authenticated request
   */
  static getSecurityContext(req: NextRequest) {
    return authService.getSecurityContext(req)
  }

  /**
   * Set secure session cookies with new token format
   */
  static setSecureSessionCookies(response: NextResponse, tokens: any) {
    return authService.setSecureSessionCookie(response, tokens)
  }

  /**
   * Clear all session cookies
   */
  static clearSessionCookies(response: NextResponse) {
    return authService.clearSessionCookies(response)
  }
}

export default AuthService
