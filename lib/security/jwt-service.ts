/**
 * Secure JWT Service with RS256 Algorithm
 * Implements enterprise-grade JWT security with key rotation and token management
 */

import { SignJWT, jwtVerify, generateKeyPair, importJWK, exportJWK } from 'jose'
import crypto from 'crypto'

export interface JWTConfig {
  algorithm: 'RS256'
  issuer: string
  audience: string[]
  accessTokenExpiry: string
  refreshTokenExpiry: string
  keyRotationInterval: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  refreshExpiresAt: Date
}

export interface JWTPayload {
  sub: string // user ID
  email: string
  organizationId: string
  role: string
  organizationType: 'restaurant' | 'supplier'
  iat: number
  exp: number
  jti: string // JWT ID for revocation
  type: 'access' | 'refresh'
}

export interface KeyPair {
  publicKey: crypto.KeyObject
  privateKey: crypto.KeyObject
  kid: string // Key ID
  createdAt: Date
}

class SecureJWTService {
  private static instance: SecureJWTService
  private currentKeyPair: KeyPair | null = null
  private keyRotationTimer: NodeJS.Timeout | null = null
  private revokedTokens = new Set<string>()
  private config: JWTConfig

  private constructor() {
    this.config = {
      algorithm: 'RS256',
      issuer: 'orderly-platform',
      audience: ['orderly-web', 'orderly-api'],
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      keyRotationInterval: 24 * 60 * 60 * 1000, // 24 hours
    }
  }

  public static getInstance(): SecureJWTService {
    if (!SecureJWTService.instance) {
      SecureJWTService.instance = new SecureJWTService()
    }
    return SecureJWTService.instance
  }

  /**
   * Initialize the JWT service with key generation and rotation
   */
  public async initialize(): Promise<void> {
    await this.generateNewKeyPair()
    this.scheduleKeyRotation()
  }

  /**
   * Generate a new RSA key pair for JWT signing
   */
  private async generateNewKeyPair(): Promise<void> {
    const { publicKey, privateKey } = await generateKeyPair('RS256', {
      modulusLength: 2048,
    })

    this.currentKeyPair = {
      publicKey,
      privateKey,
      kid: crypto.randomUUID(),
      createdAt: new Date(),
    }
  }

  /**
   * Schedule automatic key rotation
   */
  private scheduleKeyRotation(): void {
    if (this.keyRotationTimer) {
      clearInterval(this.keyRotationTimer)
    }

    this.keyRotationTimer = setInterval(async () => {
      await this.rotateKeys()
    }, this.config.keyRotationInterval)
  }

  /**
   * Rotate encryption keys
   */
  private async rotateKeys(): Promise<void> {
    const oldKeyPair = this.currentKeyPair
    await this.generateNewKeyPair()

    // Log key rotation for security audit
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'key_rotation',
        oldKeyId: oldKeyPair?.kid,
        newKeyId: this.currentKeyPair?.kid,
        timestamp: new Date().toISOString(),
      })
    )
  }

  /**
   * Create access and refresh token pair
   */
  public async createTokenPair(
    payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti' | 'type'>
  ): Promise<TokenPair> {
    if (!this.currentKeyPair) {
      throw new Error('JWT service not initialized')
    }

    const now = Math.floor(Date.now() / 1000)
    const accessExpiry = now + 15 * 60 // 15 minutes
    const refreshExpiry = now + 7 * 24 * 60 * 60 // 7 days

    // Create access token
    const accessJti = crypto.randomUUID()
    const accessToken = await new SignJWT({
      ...payload,
      type: 'access',
      jti: accessJti,
    })
      .setProtectedHeader({
        alg: this.config.algorithm,
        kid: this.currentKeyPair.kid,
      })
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setIssuedAt(now)
      .setExpirationTime(accessExpiry)
      .sign(this.currentKeyPair.privateKey)

    // Create refresh token
    const refreshJti = crypto.randomUUID()
    const refreshToken = await new SignJWT({
      sub: payload.sub,
      type: 'refresh',
      jti: refreshJti,
    })
      .setProtectedHeader({
        alg: this.config.algorithm,
        kid: this.currentKeyPair.kid,
      })
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setIssuedAt(now)
      .setExpirationTime(refreshExpiry)
      .sign(this.currentKeyPair.privateKey)

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(accessExpiry * 1000),
      refreshExpiresAt: new Date(refreshExpiry * 1000),
    }
  }

  /**
   * Verify and decode JWT token
   */
  public async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      if (!this.currentKeyPair) {
        throw new Error('JWT service not initialized')
      }

      const { payload } = await jwtVerify(token, this.currentKeyPair.publicKey, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      })

      const jwtPayload = payload as JWTPayload

      // Check if token is revoked
      if (this.revokedTokens.has(jwtPayload.jti)) {
        return null
      }

      return jwtPayload
    } catch (error) {
      // Log failed verification for security monitoring
      console.log(
        JSON.stringify({
          level: 'warn',
          event: 'token_verification_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        })
      )
      return null
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    const payload = await this.verifyToken(refreshToken)

    if (!payload || payload.type !== 'refresh') {
      return null
    }

    // Revoke the old refresh token
    this.revokedTokens.add(payload.jti)

    // Create new token pair (this would typically require fetching fresh user data)
    return this.createTokenPair({
      sub: payload.sub,
      email: payload.email || '',
      organizationId: payload.organizationId || '',
      role: payload.role || '',
      organizationType: payload.organizationType || 'restaurant',
    })
  }

  /**
   * Revoke a token by adding it to the blacklist
   */
  public revokeToken(jti: string): void {
    this.revokedTokens.add(jti)

    // Log token revocation for security audit
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'token_revoked',
        jti,
        timestamp: new Date().toISOString(),
      })
    )
  }

  /**
   * Get public key for token verification (for microservices)
   */
  public getPublicKey(): crypto.KeyObject | null {
    return this.currentKeyPair?.publicKey || null
  }

  /**
   * Get current key ID
   */
  public getCurrentKeyId(): string | null {
    return this.currentKeyPair?.kid || null
  }

  /**
   * Cleanup on service shutdown
   */
  public shutdown(): void {
    if (this.keyRotationTimer) {
      clearInterval(this.keyRotationTimer)
      this.keyRotationTimer = null
    }
  }

  /**
   * Clear revoked tokens older than refresh token expiry
   */
  public cleanupRevokedTokens(): void {
    // This is a simplified implementation
    // In production, you'd want to store revoked tokens in Redis with TTL
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    // For now, we'll clear all tokens periodically
    // In production, implement with Redis and proper TTL
    if (this.revokedTokens.size > 10000) {
      this.revokedTokens.clear()
    }
  }
}

export default SecureJWTService
