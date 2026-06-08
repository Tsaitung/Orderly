/**
 * Secure authentication service for token/session operations.
 */

import { NextRequest, NextResponse } from 'next/server'
import SecureJWTService, { JWTPayload, TokenPair } from './jwt-service'
import { SecurityLogger } from './security-logger'

export interface AuthUser {
  id: string
  email?: string
  organizationId: string
  role: string
  organizationType: 'restaurant' | 'supplier' | 'platform'
}

export interface AuthResult {
  success: boolean
  user?: AuthUser
  tokens?: TokenPair
  error?: string
  errorCode?: string
}

export interface SecurityContext {
  userId: string
  organizationId: string
  role: string
  organizationType: 'restaurant' | 'supplier' | 'platform'
  sessionId: string
  ipAddress?: string
  userAgent?: string
}

class SecureAuthService {
  private static instance: SecureAuthService
  private jwtService: SecureJWTService
  private logger: SecurityLogger

  private constructor() {
    this.jwtService = SecureJWTService.getInstance()
    this.logger = SecurityLogger.getInstance()
  }

  public static getInstance(): SecureAuthService {
    if (!SecureAuthService.instance) {
      SecureAuthService.instance = new SecureAuthService()
    }
    return SecureAuthService.instance
  }

  public async initialize(): Promise<void> {
    await this.jwtService.initialize()
    this.logger.info('auth_service_initialized', {})
  }

  public async createTokenPair(
    payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti' | 'type'>
  ): Promise<TokenPair> {
    return this.jwtService.createTokenPair(payload)
  }

  public async verifyAuth(token: string, ipAddress?: string): Promise<SecurityContext | null> {
    try {
      const payload = await this.jwtService.verifyToken(token)
      if (!payload || payload.type !== 'access') {
        this.logger.warn('token_verification_failed', {
          reason: 'Invalid or expired token',
          ipAddress,
        })
        return null
      }

      return {
        userId: payload.sub,
        organizationId: payload.organizationId,
        role: payload.role,
        organizationType: payload.organizationType,
        sessionId: payload.jti,
        ipAddress,
      }
    } catch (error) {
      this.logger.warn('token_verification_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress,
      })
      return null
    }
  }

  public async refreshToken(refreshToken: string): Promise<TokenPair | null> {
    try {
      return await this.jwtService.refreshAccessToken(refreshToken)
    } catch (error) {
      this.logger.warn('token_refresh_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return null
    }
  }

  public async logout(accessToken: string, refreshToken?: string): Promise<void> {
    try {
      const payload = await this.jwtService.verifyToken(accessToken)
      if (payload) {
        this.jwtService.revokeToken(payload.jti)
        this.logger.info('logout_success', {
          userId: payload.sub,
          sessionId: payload.jti,
        })
      }

      if (refreshToken) {
        const refreshPayload = await this.jwtService.verifyToken(refreshToken)
        if (refreshPayload) this.jwtService.revokeToken(refreshPayload.jti)
      }
    } catch (error) {
      this.logger.error('logout_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  public requireAuth(allowedRoles?: string[]) {
    return async (req: NextRequest): Promise<NextResponse | null> => {
      try {
        const authHeader = req.headers.get('authorization')
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
        if (!token) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing authentication token',
              errorCode: 'MISSING_TOKEN',
            },
            { status: 401 }
          )
        }

        const context = await this.verifyAuth(token, req.headers.get('x-forwarded-for') || undefined)
        if (!context) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid or expired token',
              errorCode: 'INVALID_TOKEN',
            },
            { status: 401 }
          )
        }

        if (allowedRoles && !allowedRoles.includes(context.role)) {
          this.logger.warn('insufficient_permissions', {
            userId: context.userId,
            role: context.role,
            requiredRoles: allowedRoles,
          })
          return NextResponse.json(
            {
              success: false,
              error: 'Insufficient permissions',
              errorCode: 'INSUFFICIENT_PERMISSIONS',
            },
            { status: 403 }
          )
        }

        ;(req as NextRequest & { securityContext?: SecurityContext }).securityContext = context
        return null
      } catch (error) {
        this.logger.error('auth_middleware_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication error',
            errorCode: 'AUTH_ERROR',
          },
          { status: 500 }
        )
      }
    }
  }

  public getSecurityContext(req: NextRequest): SecurityContext | null {
    return (req as NextRequest & { securityContext?: SecurityContext }).securityContext || null
  }

  public setSecureSessionCookie(response: NextResponse, tokens: TokenPair): void {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict' as const,
      maxAge: 15 * 60,
      path: '/',
    }

    response.cookies.set('orderly-access-token', tokens.accessToken, cookieOptions)
    response.cookies.set('orderly-refresh-token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60,
    })
  }

  public clearSessionCookies(response: NextResponse): void {
    response.cookies.delete('orderly-access-token')
    response.cookies.delete('orderly-refresh-token')
  }

  public shutdown(): void {
    this.jwtService.shutdown()
  }
}

export default SecureAuthService
