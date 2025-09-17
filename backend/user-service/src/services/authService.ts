import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { CreateUserRequest, UserRole } from '@orderly/types';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN: string | number = process.env.JWT_EXPIRES_IN || '7d';

export class AuthService {
  async register(userData: CreateUserRequest & { organizationId?: string; role?: UserRole }) {
    const { email, name, phone, password, organizationId, role } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        password: hashedPassword
      }
    });

    // If organizationId and role provided, create user-organization relationship
    if (organizationId && role) {
      await prisma.userOrganization.create({
        data: {
          userId: user.id,
          organizationId,
          role
        }
      });
    }

    // Generate JWT token
    const token = this.generateToken(user.id, email, role || UserRole.RESTAURANT_STAFF, organizationId || '');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar
      },
      token
    };
  }

  async login(email: string, password: string) {
    // Find user with organization info
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userOrganizations: {
          where: { isActive: true },
          include: {
            organization: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Get primary organization (first active one)
    const primaryUserOrg = user.userOrganizations[0];
    if (!primaryUserOrg) {
      throw new Error('User has no active organization');
    }

    // Generate JWT token
    const token = this.generateToken(
      user.id,
      user.email,
      primaryUserOrg.role as UserRole,
      primaryUserOrg.organizationId
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        role: primaryUserOrg.role,
        organizationId: primaryUserOrg.organizationId,
        organizationName: primaryUserOrg.organization.name
      },
      token
    };
  }

  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    // Create reset token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });

    // TODO: Send email with reset link
    console.log(`Password reset token for ${email}: ${token}`);

    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetRecord || resetRecord.used || resetRecord.expiresAt < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password and mark reset as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword }
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true }
      })
    ]);

    return { message: 'Password reset successfully' };
  }

  private generateToken(userId: string, email: string, role: UserRole, organizationId: string): string {
    const payload = {
      id: userId,
      email,
      role,
      organizationId
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }
}