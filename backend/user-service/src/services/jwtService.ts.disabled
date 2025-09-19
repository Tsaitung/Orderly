import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';

export interface JWTPayload {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
  organizationType: 'restaurant' | 'supplier';
  isSuperUser: boolean;
  superUserExpiresAt?: string;
  sessionId: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  businessVerified: boolean;
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Enhanced JWT service using RS256 asymmetric encryption
 * Supports access/refresh token pairs with session management
 */
export class JWTService {
  // RSA keys for production should be generated and stored securely
  // For development, we'll use environment variables or generate them
  private static readonly PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || this.generateDevKey();
  private static readonly PUBLIC_KEY = process.env.JWT_PUBLIC_KEY || this.generateDevKey();
  
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';  // 15 minutes
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';  // 7 days
  private static readonly REMEMBER_ME_EXPIRY = '30d';   // 30 days

  /**
   * Generate development RSA key (DO NOT use in production)
   */
  private static generateDevKey(): string {
    // This is for development only - in production, use proper RSA key pairs
    return process.env.JWT_SECRET || 'dev-secret-key-replace-in-production';
  }

  /**
   * Create JWT token pair with session tracking
   */
  static async createTokenPair(
    userId: string,
    deviceInfo: any = {},
    rememberMe: boolean = false
  ): Promise<TokenPair> {
    try {
      // Get user with organization info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          organization: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Create session
      const sessionId = uuidv4();
      const refreshTokenExpiry = rememberMe 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);  // 7 days

      const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Check if user is super user and still valid
      const isSuperUser = user.isSuperUser && 
        user.superUserExpiresAt && 
        user.superUserExpiresAt > new Date();

      // Create access token payload
      const accessPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
        organizationType: user.organization.type,
        isSuperUser: isSuperUser || false,
        superUserExpiresAt: user.superUserExpiresAt?.toISOString(),
        sessionId,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        businessVerified: user.businessVerified,
      };

      // Sign tokens
      const accessToken = jwt.sign(
        accessPayload,
        this.PRIVATE_KEY,
        {
          algorithm: 'HS256', // Using HS256 for now, upgrade to RS256 when proper keys are available
          expiresIn: this.ACCESS_TOKEN_EXPIRY,
          issuer: 'orderly-platform',
          audience: 'orderly-users',
        }
      );

      const refreshToken = jwt.sign(
        { userId, sessionId, type: 'refresh' },
        this.PRIVATE_KEY,
        {
          algorithm: 'HS256',
          expiresIn: rememberMe ? this.REMEMBER_ME_EXPIRY : this.REFRESH_TOKEN_EXPIRY,
          issuer: 'orderly-platform',
          audience: 'orderly-users',
        }
      );

      // Save session to database
      await prisma.session.create({
        data: {
          id: sessionId,
          userId,
          token: accessToken,
          refreshToken,
          deviceInfo,
          expiresAt: refreshTokenExpiry,
          lastActivity: new Date(),
        },
      });

      // Update user's last login
      await prisma.user.update({
        where: { id: userId },
        data: { 
          lastLoginAt: new Date(),
          failedLoginAttempts: 0, // Reset failed attempts on successful login
        },
      });

      return {
        accessToken,
        refreshToken,
        expiresAt: accessTokenExpiry,
      };

    } catch (error) {
      throw new Error(`Failed to create token pair: ${error}`);
    }
  }

  /**
   * Verify and decode JWT token
   */
  static async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = jwt.verify(token, this.PUBLIC_KEY, {
        algorithms: ['HS256'],
        issuer: 'orderly-platform',
        audience: 'orderly-users',
      }) as JWTPayload;

      // Check if session exists and is valid
      const session = await prisma.session.findFirst({
        where: {
          id: decoded.sessionId,
          userId: decoded.userId,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!session) {
        return null;
      }

      // Update session activity
      await prisma.session.update({
        where: { id: decoded.sessionId },
        data: { lastActivity: new Date() },
      });

      return decoded;

    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<TokenPair | null> {
    try {
      const decoded = jwt.verify(refreshToken, this.PUBLIC_KEY, {
        algorithms: ['HS256'],
      }) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Find session
      const session = await prisma.session.findFirst({
        where: {
          refreshToken,
          userId: decoded.userId,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!session) {
        return null;
      }

      // Create new token pair
      return this.createTokenPair(decoded.userId, session.deviceInfo);

    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  /**
   * Revoke all sessions for a user
   */
  static async revokeAllSessions(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * Revoke specific session
   */
  static async revokeSession(sessionId: string): Promise<void> {
    await prisma.session.delete({
      where: { id: sessionId },
    });
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Get active sessions for user
   */
  static async getActiveSessions(userId: string): Promise<any[]> {
    return prisma.session.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        lastActivity: true,
        createdAt: true,
        isTrusted: true,
      },
      orderBy: {
        lastActivity: 'desc',
      },
    });
  }
}