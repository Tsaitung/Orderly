import * as argon2 from 'argon2';

/**
 * Enhanced password service using Argon2id
 * Follows OWASP recommendations for password hashing
 */
export class PasswordService {
  private static readonly ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,         // 3 iterations
    parallelism: 1,      // 1 thread
  };

  /**
   * Hash password using Argon2id
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      return await argon2.hash(password, this.ARGON2_OPTIONS);
    } catch (error) {
      throw new Error(`Failed to hash password: ${error}`);
    }
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      throw new Error(`Failed to verify password: ${error}`);
    }
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    score: number;
  } {
    const errors: string[] = [];
    let score = 0;

    // Minimum length
    if (password.length < 12) {
      errors.push('密碼至少需要 12 個字符');
    } else {
      score += 20;
    }

    // Maximum length (prevent DoS)
    if (password.length > 128) {
      errors.push('密碼不能超過 128 個字符');
    }

    // Uppercase letters
    if (!/[A-Z]/.test(password)) {
      errors.push('密碼需要包含至少一個大寫字母');
    } else {
      score += 20;
    }

    // Lowercase letters
    if (!/[a-z]/.test(password)) {
      errors.push('密碼需要包含至少一個小寫字母');
    } else {
      score += 20;
    }

    // Numbers
    if (!/\d/.test(password)) {
      errors.push('密碼需要包含至少一個數字');
    } else {
      score += 20;
    }

    // Special characters
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('密碼需要包含至少一個特殊字符');
    } else {
      score += 20;
    }

    // Common patterns check
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /letmein/i,
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        errors.push('密碼不能包含常見的模式');
        score -= 10;
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.max(0, score),
    };
  }

  /**
   * Check if password has been used recently
   */
  static isPasswordInHistory(password: string, passwordHistory: string[]): Promise<boolean> {
    return Promise.all(
      passwordHistory.map(hash => this.verifyPassword(password, hash))
    ).then(results => results.some(result => result));
  }

  /**
   * Add password to history (keep last 5)
   */
  static async addToPasswordHistory(password: string, currentHistory: string[]): Promise<string[]> {
    const hashedPassword = await this.hashPassword(password);
    const updatedHistory = [hashedPassword, ...currentHistory];
    return updatedHistory.slice(0, 5); // Keep only last 5 passwords
  }
}