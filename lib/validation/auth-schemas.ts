/**
 * Authentication Form Validation Schemas
 * Provides runtime type validation and sanitization for auth forms
 */

import { z } from 'zod'

// Disposable email domains to block
const DISPOSABLE_EMAIL_DOMAINS = ['tempmail.com', '10minutemail.com', 'guerrillamail.com']

// Password validation rules - single source of truth
const PASSWORD_RULES = [
  { pattern: /[A-Z]/, message: '密碼必須包含至少一個大寫字母', feedbackMsg: '需要大寫字母' },
  { pattern: /[a-z]/, message: '密碼必須包含至少一個小寫字母', feedbackMsg: '需要小寫字母' },
  { pattern: /\d/, message: '密碼必須包含至少一個數字', feedbackMsg: '需要數字' },
  {
    pattern: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    message: '密碼必須包含至少一個特殊字元',
    feedbackMsg: '需要特殊字元',
  },
] as const

// Email validation with Taiwan business email patterns
const emailSchema = z
  .string()
  .min(1, '請輸入電子信箱')
  .email('請輸入有效的電子信箱格式')
  .max(254, '電子信箱過長')
  .refine(email => {
    const domain = email.split('@')[1]
    return domain && !DISPOSABLE_EMAIL_DOMAINS.includes(domain.toLowerCase())
  }, '請使用商業電子信箱')

// Password validation with strong security requirements
const basePasswordSchema = z.string().min(8, '密碼至少需要 8 個字元').max(128, '密碼過長')

const passwordSchema = PASSWORD_RULES.reduce(
  (schema, rule) => schema.refine(pwd => rule.pattern.test(pwd), rule.message),
  basePasswordSchema
)

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

// Generic validation helper
function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const result = schema.parse(data)
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

// Validation helpers
export class AuthValidation {
  /**
   * Validate and sanitize login form data
   */
  static validateLogin(data: unknown) {
    return validateWithSchema(loginFormSchema, data)
  }

  /**
   * Validate and sanitize registration form data
   */
  static validateRegistration(data: unknown) {
    return validateWithSchema(registerFormSchema, data)
  }

  /**
   * Validate MFA verification data
   */
  static validateMFA(data: unknown) {
    return validateWithSchema(mfaVerificationSchema, data)
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
   * Check password strength (returns score 0-5 and feedback array)
   */
  static checkPasswordStrength(password: string): { score: number; feedback: string[] } {
    const lengthCheck = password.length >= 8
    const ruleResults = PASSWORD_RULES.map(rule => ({
      passed: rule.pattern.test(password),
      msg: rule.feedbackMsg,
    }))

    const feedback: string[] = []
    if (!lengthCheck) feedback.push('密碼至少需要 8 個字元')
    ruleResults.filter(r => !r.passed).forEach(r => feedback.push(r.msg))

    const score = (lengthCheck ? 1 : 0) + ruleResults.filter(r => r.passed).length
    return { score, feedback }
  }
}

export default AuthValidation
