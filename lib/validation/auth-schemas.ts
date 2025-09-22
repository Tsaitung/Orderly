/**
 * Authentication Form Validation Schemas
 * Provides runtime type validation and sanitization for auth forms
 */

import { z } from 'zod'

// Email validation with Taiwan business email patterns
const emailSchema = z
  .string()
  .min(1, '請輸入電子信箱')
  .email('請輸入有效的電子信箱格式')
  .max(254, '電子信箱過長')
  .refine(email => {
    // Additional validation for business emails
    const domain = email.split('@')[1]
    if (!domain) return false

    // Block obvious disposable email domains
    const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com']
    return !disposableDomains.includes(domain.toLowerCase())
  }, '請使用商業電子信箱')

// Password validation with strong security requirements
const passwordSchema = z
  .string()
  .min(8, '密碼至少需要 8 個字元')
  .max(128, '密碼過長')
  .refine(password => {
    // Must contain at least one uppercase letter
    return /[A-Z]/.test(password)
  }, '密碼必須包含至少一個大寫字母')
  .refine(password => {
    // Must contain at least one lowercase letter
    return /[a-z]/.test(password)
  }, '密碼必須包含至少一個小寫字母')
  .refine(password => {
    // Must contain at least one number
    return /\d/.test(password)
  }, '密碼必須包含至少一個數字')
  .refine(password => {
    // Must contain at least one special character
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  }, '密碼必須包含至少一個特殊字元')

// MFA code validation
const mfaCodeSchema = z.string().regex(/^\d{6}$/, '驗證碼必須為 6 位數字')

// Phone number validation (Taiwan format)
const phoneSchema = z
  .string()
  .optional()
  .refine(phone => {
    if (!phone) return true // Optional field
    const cleaned = phone.replace(/\s|-/g, '')
    return /^09\d{8}$/.test(cleaned)
  }, '請輸入有效的台灣手機號碼 (09xxxxxxxx)')

// Organization name validation
const organizationNameSchema = z
  .string()
  .min(2, '組織名稱至少需要 2 個字元')
  .max(100, '組織名稱過長')
  .refine(name => {
    // Basic sanitization - no script tags or dangerous patterns
    return !/<script|javascript:|data:/i.test(name)
  }, '組織名稱包含不允許的字元')

// Name validation
const nameSchema = z
  .string()
  .min(1, '請輸入姓名')
  .max(50, '姓名過長')
  .refine(name => {
    // Basic sanitization
    return !/<script|javascript:|data:/i.test(name)
  }, '姓名包含不允許的字元')

// Login form schema
export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '請輸入密碼'), // Don't validate strength for login
  rememberMe: z.boolean().default(false),
})

// Registration form schema
export const registerFormSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    organizationName: organizationNameSchema,
    organizationType: z.enum(['restaurant', 'supplier'], {
      errorMap: () => ({ message: '請選擇組織類型' }),
    }),
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema,
    agreeToTerms: z.boolean().refine(val => val === true, {
      message: '請同意服務條款和隱私政策',
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: '密碼確認不符',
    path: ['confirmPassword'],
  })

// MFA verification schema
export const mfaVerificationSchema = z.object({
  code: mfaCodeSchema,
  mfaSessionId: z.string().min(1, 'MFA 會話 ID 無效'),
  email: emailSchema,
  rememberMe: z.boolean().default(false),
})

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

// Password reset schema
export const passwordResetSchema = z
  .object({
    token: z.string().min(1, '重置令牌無效'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: '密碼確認不符',
    path: ['confirmPassword'],
  })

// Type definitions from schemas
export type LoginFormData = z.infer<typeof loginFormSchema>
export type RegisterFormData = z.infer<typeof registerFormSchema>
export type MFAVerificationData = z.infer<typeof mfaVerificationSchema>
export type PasswordResetRequestData = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetData = z.infer<typeof passwordResetSchema>

// Validation helpers
export class AuthValidation {
  /**
   * Validate and sanitize login form data
   */
  static validateLogin(
    data: unknown
  ): { success: true; data: LoginFormData } | { success: false; errors: Record<string, string> } {
    try {
      const result = loginFormSchema.parse(data)
      return { success: true, data: result }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            errors[err.path[0] as string] = err.message
          }
        })
        return { success: false, errors }
      }
      return { success: false, errors: { general: '驗證失敗' } }
    }
  }

  /**
   * Validate and sanitize registration form data
   */
  static validateRegistration(
    data: unknown
  ):
    | { success: true; data: RegisterFormData }
    | { success: false; errors: Record<string, string> } {
    try {
      const result = registerFormSchema.parse(data)
      return { success: true, data: result }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            errors[err.path[0] as string] = err.message
          }
        })
        return { success: false, errors }
      }
      return { success: false, errors: { general: '驗證失敗' } }
    }
  }

  /**
   * Validate MFA verification data
   */
  static validateMFA(
    data: unknown
  ):
    | { success: true; data: MFAVerificationData }
    | { success: false; errors: Record<string, string> } {
    try {
      const result = mfaVerificationSchema.parse(data)
      return { success: true, data: result }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            errors[err.path[0] as string] = err.message
          }
        })
        return { success: false, errors }
      }
      return { success: false, errors: { general: '驗證失敗' } }
    }
  }

  /**
   * Sanitize string input to prevent XSS
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim()
  }

  /**
   * Check password strength
   */
  static checkPasswordStrength(password: string): {
    score: number // 0-4
    feedback: string[]
  } {
    const feedback: string[] = []
    let score = 0

    if (password.length >= 8) score++
    else feedback.push('密碼至少需要 8 個字元')

    if (/[A-Z]/.test(password)) score++
    else feedback.push('需要大寫字母')

    if (/[a-z]/.test(password)) score++
    else feedback.push('需要小寫字母')

    if (/\d/.test(password)) score++
    else feedback.push('需要數字')

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++
    else feedback.push('需要特殊字元')

    return { score, feedback }
  }
}

export default AuthValidation
