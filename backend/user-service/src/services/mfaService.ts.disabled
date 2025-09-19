import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface TOTPSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFAVerificationResult {
  success: boolean;
  attemptsRemaining?: number;
  lockoutExpiry?: Date;
}

/**
 * Multi-Factor Authentication service
 * Supports TOTP, SMS, and Email verification
 */
export class MFAService {
  private static readonly BACKUP_CODES_COUNT = 8;
  private static readonly OTP_EXPIRY_MINUTES = 10;
  private static readonly MAX_ATTEMPTS = 3;

  /**
   * Setup TOTP for user
   */
  static async setupTOTP(userId: string, appName: string = 'Orderly'): Promise<TOTPSetup> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate secret
      const secret = authenticator.generateSecret();
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      
      // Create TOTP URI
      const totpUri = authenticator.keyuri(
        user.email,
        appName,
        secret
      );

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(totpUri);

      // Save to database (don't enable until verified)
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaSecret: secret,
          mfaBackupCodes: backupCodes,
          // Don't enable MFA until verified
        },
      });

      return {
        secret,
        qrCodeUrl,
        backupCodes,
      };

    } catch (error) {
      throw new Error(`Failed to setup TOTP: ${error}`);
    }
  }

  /**
   * Verify TOTP code and enable MFA
   */
  static async verifyAndEnableTOTP(userId: string, code: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { mfaSecret: true },
      });

      if (!user?.mfaSecret) {
        return false;
      }

      // Verify the code
      const isValid = authenticator.verify({
        token: code,
        secret: user.mfaSecret,
      });

      if (isValid) {
        // Enable MFA
        await prisma.user.update({
          where: { id: userId },
          data: {
            mfaEnabled: true,
            mfaMethod: 'totp',
          },
        });
        return true;
      }

      return false;

    } catch (error) {
      throw new Error(`Failed to verify TOTP: ${error}`);
    }
  }

  /**
   * Generate OTP for SMS/Email
   */
  static async generateOTP(
    userId: string, 
    method: 'sms' | 'email',
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    try {
      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiry
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Save verification record
      await prisma.mFAVerification.create({
        data: {
          id: uuidv4(),
          userId,
          method,
          code,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });

      return code;

    } catch (error) {
      throw new Error(`Failed to generate OTP: ${error}`);
    }
  }

  /**
   * Verify OTP code (SMS/Email)
   */
  static async verifyOTP(
    userId: string,
    code: string,
    method: 'sms' | 'email'
  ): Promise<MFAVerificationResult> {
    try {
      // Find the most recent verification for this user and method
      const verification = await prisma.mFAVerification.findFirst({
        where: {
          userId,
          method,
          verified: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!verification) {
        return { success: false };
      }

      // Check if too many attempts
      if (verification.attempts >= this.MAX_ATTEMPTS) {
        return { 
          success: false,
          attemptsRemaining: 0,
          lockoutExpiry: verification.expiresAt,
        };
      }

      // Increment attempts
      await prisma.mFAVerification.update({
        where: { id: verification.id },
        data: {
          attempts: verification.attempts + 1,
        },
      });

      // Verify code
      if (verification.code === code) {
        // Mark as verified
        await prisma.mFAVerification.update({
          where: { id: verification.id },
          data: {
            verified: true,
            verifiedAt: new Date(),
          },
        });

        return { success: true };
      }

      return {
        success: false,
        attemptsRemaining: this.MAX_ATTEMPTS - (verification.attempts + 1),
      };

    } catch (error) {
      throw new Error(`Failed to verify OTP: ${error}`);
    }
  }

  /**
   * Verify TOTP code for login
   */
  static async verifyTOTP(userId: string, code: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          mfaSecret: true, 
          mfaEnabled: true,
          mfaBackupCodes: true,
        },
      });

      if (!user?.mfaSecret || !user.mfaEnabled) {
        return false;
      }

      // First try TOTP verification
      const isValidTOTP = authenticator.verify({
        token: code,
        secret: user.mfaSecret,
      });

      if (isValidTOTP) {
        return true;
      }

      // Try backup codes
      const backupCodes = user.mfaBackupCodes as string[];
      if (backupCodes && backupCodes.includes(code)) {
        // Remove used backup code
        const updatedBackupCodes = backupCodes.filter(bc => bc !== code);
        
        await prisma.user.update({
          where: { id: userId },
          data: {
            mfaBackupCodes: updatedBackupCodes,
          },
        });

        return true;
      }

      return false;

    } catch (error) {
      throw new Error(`Failed to verify TOTP: ${error}`);
    }
  }

  /**
   * Disable MFA for user
   */
  static async disableMFA(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaMethod: 'none',
        mfaSecret: null,
        mfaBackupCodes: [],
      },
    });
  }

  /**
   * Generate backup codes
   */
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      // Generate 8-character alphanumeric code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  /**
   * Regenerate backup codes
   */
  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    const backupCodes = this.generateBackupCodes();
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaBackupCodes: backupCodes,
      },
    });

    return backupCodes;
  }

  /**
   * Check if user has MFA enabled
   */
  static async isMFAEnabled(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });

    return user?.mfaEnabled || false;
  }

  /**
   * Get MFA status for user
   */
  static async getMFAStatus(userId: string): Promise<{
    enabled: boolean;
    method: string;
    backupCodesCount: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        mfaEnabled: true,
        mfaMethod: true,
        mfaBackupCodes: true,
      },
    });

    const backupCodes = user?.mfaBackupCodes as string[] || [];

    return {
      enabled: user?.mfaEnabled || false,
      method: user?.mfaMethod || 'none',
      backupCodesCount: backupCodes.length,
    };
  }

  /**
   * Clean up expired verifications
   */
  static async cleanupExpiredVerifications(): Promise<number> {
    const result = await prisma.mFAVerification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}