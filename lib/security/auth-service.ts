/**
 * Secure Authentication Service
 * Replaces the insecure mock authentication with enterprise-grade security
 */

import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import SecureJWTService, { JWTPayload, TokenPair } from './jwt-service'
import { SecurityLogger } from './security-logger'
import { z } from 'zod'

// Input validation schemas
const LoginSchema = z.object({
  email: z.string().email().min(1, 'Email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const RegisterSchema = z.object({
  email: z.string().email().min(1, 'Email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number and special character'
    ),
  organizationName: z.string().min(1, 'Organization name is required'),
  organizationType: z.enum(['restaurant', 'supplier']),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
})

export interface AuthUser {
  id: string
  email: string
  organizationId: string
  role: string
  organizationType: 'restaurant' | 'supplier'
  firstName?: string
  lastName?: string
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
  organizationType: 'restaurant' | 'supplier'
  sessionId: string
  ipAddress?: string
  userAgent?: string
}

class SecureAuthService {
  private static instance: SecureAuthService
  private jwtService: SecureJWTService
  private logger: SecurityLogger
  private saltRounds = 12

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

  /**
   * Initialize the authentication service
   */
  public async initialize(): Promise<void> {
    await this.jwtService.initialize()
    this.logger.info('auth_service_initialized', {})
  }

  /**
   * Secure password hashing
   */
  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds)
  }

  /**
   * Verify password against hash
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /**
   * Sanitize and validate login input
   */
  private validateLoginInput(input: unknown): { email: string; password: string } {
    const result = LoginSchema.safeParse(input)
    if (!result.success) {
      throw new Error(`Invalid login input: ${result.error.errors.map(e => e.message).join(', ')}`)
    }
    return result.data
  }

  /**
   * Sanitize and validate registration input
   */
  private validateRegisterInput(input: unknown): z.infer<typeof RegisterSchema> {
    const result = RegisterSchema.safeParse(input)
    if (!result.success) {
      throw new Error(
        `Invalid registration input: ${result.error.errors.map(e => e.message).join(', ')}`
      )
    }
    return result.data
  }

  /**
   * Authenticate user with email and password
   */
  public async login(
    credentials: unknown,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    try {
      // Validate input
      const { email, password } = this.validateLoginInput(credentials)

      // Sanitize email
      const sanitizedEmail = email.toLowerCase().trim()

      this.logger.info('login_attempt', {
        email: sanitizedEmail,
        ipAddress,
        userAgent,
      })

      // Call user service to authenticate
      const baseUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001'
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': ipAddress || '',
          'User-Agent': userAgent || '',
        },
        body: JSON.stringify({ email: sanitizedEmail, password }),
      })

      const data = await response.json()

      if (!data?.success) {
        this.logger.warn('login_failed', {
          email: sanitizedEmail,
          ipAddress,
          reason: data?.error || 'Invalid credentials',
        })
        return {
          success: false,
          error: 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS',
        }
      }

      const user = data.user as {
        id: string
        email: string
        role: string
        organization: { id: string; type: 'restaurant' | 'supplier' }
      }

      // Create secure JWT tokens
      const tokens = await this.jwtService.createTokenPair({
        sub: user.id,
        email: user.email,
        organizationId: user.organization.id,
        role: user.role,
        organizationType: user.organization.type,
      })

      this.logger.info('login_success', {
        userId: user.id,
        email: sanitizedEmail,
        organizationId: user.organization.id,
        ipAddress,
      })

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          organizationId: user.organization.id,
          role: user.role,
          organizationType: user.organization.type,
        },
        tokens,
      }
    } catch (error) {
      this.logger.error('login_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress,
      })
      return {
        success: false,
        error: 'Authentication failed',
        errorCode: 'AUTH_ERROR',
      }
    }
  }

  /**
   * Register new user
   */
  public async register(
    userData: unknown,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    try {
      // Validate input
      const validatedData = this.validateRegisterInput(userData)

      // Sanitize email
      const sanitizedEmail = validatedData.email.toLowerCase().trim()

      this.logger.info('registration_attempt', {
        email: sanitizedEmail,
        organizationType: validatedData.organizationType,
        ipAddress,
      })

      // Call user service to register
      const baseUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001'
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': ipAddress || '',
          'User-Agent': userAgent || '',
        },
        body: JSON.stringify({
          email: sanitizedEmail,
          password: validatedData.password,
          organizationName: validatedData.organizationName,
          organizationType: validatedData.organizationType,
        }),
      })

      const result = await response.json()

      if (!result?.success) {
        this.logger.warn('registration_failed', {
          email: sanitizedEmail,
          reason: result?.error || 'Registration failed',
          ipAddress,
        })
        return {
          success: false,
          error: result?.error || 'Registration failed',
          errorCode: 'REGISTRATION_FAILED',
        }
      }

      const user = result.user as {
        id: string
        email: string
        role: string
        organization: { id: string; type: 'restaurant' | 'supplier' }
      }

      // Create secure JWT tokens
      const tokens = await this.jwtService.createTokenPair({
        sub: user.id,
        email: user.email,
        organizationId: user.organization.id,
        role: user.role,
        organizationType: user.organization.type,
      })

      this.logger.info('registration_success', {
        userId: user.id,
        email: sanitizedEmail,
        organizationId: user.organization.id,
        ipAddress,
      })

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          organizationId: user.organization.id,
          role: user.role,
          organizationType: user.organization.type,
        },
        tokens,
      }
    } catch (error) {
      this.logger.error('registration_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress,
      })
      return {
        success: false,
        error: 'Registration failed',
        errorCode: 'REGISTRATION_ERROR',
      }
    }
  }

  /**
   * Verify JWT token and return user context
   */
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
        userAgent: undefined,
      }
    } catch (error) {
      this.logger.warn('token_verification_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress,
      })
      return null
    }
  }

  /**
   * Refresh access token
   */
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

  /**
   * Logout and revoke tokens
   */
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
        if (refreshPayload) {
          this.jwtService.revokeToken(refreshPayload.jti)
        }
      }
    } catch (error) {
      this.logger.error('logout_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Middleware for protecting routes
   */
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

        const context = await this.verifyAuth(token, req.ip)
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

        // Check role permissions
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

        // Attach security context to request
        ;(req as any).securityContext = context

        return null // Continue processing
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

  /**
   * Get security context from request
   */
  public getSecurityContext(req: NextRequest): SecurityContext | null {
    return (req as any).securityContext || null
  }

  /**
   * Generate secure session cookie
   */
  public setSecureSessionCookie(response: NextResponse, tokens: TokenPair): void {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 15 * 60, // 15 minutes (access token lifetime)
      path: '/',
    }

    response.cookies.set('orderly-access-token', tokens.accessToken, cookieOptions)
    response.cookies.set('orderly-refresh-token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })
  }

  /**
   * Clear session cookies
   */
  public clearSessionCookies(response: NextResponse): void {
    response.cookies.delete('orderly-access-token')
    response.cookies.delete('orderly-refresh-token')
  }

  /**
   * Cleanup resources
   */
  public shutdown(): void {
    this.jwtService.shutdown()
  }
}

export default SecureAuthService
