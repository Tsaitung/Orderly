/**
 * Authentication validation schemas for social-only auth.
 */

import { z } from 'zod'

const DISPOSABLE_EMAIL_DOMAINS = ['tempmail.com', '10minutemail.com', 'guerrillamail.com']

export const socialProviderSchema = z.enum(['line', 'google'])

const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .refine(value => {
    if (!value) return true
    const domain = value.split('@')[1]
    return Boolean(domain && !DISPOSABLE_EMAIL_DOMAINS.includes(domain.toLowerCase()))
  }, '請使用商業電子信箱')
  .refine(value => !value || /\S+@\S+\.\S+/.test(value), '請輸入有效的電子信箱格式')

const mfaCodeSchema = z.string().regex(/^\d{6}$/, '驗證碼必須為 6 位數字')

const phoneSchema = z
  .string()
  .optional()
  .refine(phone => {
    if (!phone) return true
    const cleaned = phone.replace(/\s|-/g, '')
    return /^09\d{8}$/.test(cleaned)
  }, '請輸入有效的台灣手機號碼 (09xxxxxxxx)')

const organizationNameSchema = z
  .string()
  .min(2, '組織名稱至少需要 2 個字元')
  .max(100, '組織名稱過長')
  .refine(name => !/<script|javascript:|data:/i.test(name), '組織名稱包含不允許的字元')

const nameSchema = z
  .string()
  .min(1, '請輸入姓名')
  .max(50, '姓名過長')
  .refine(name => !/<script|javascript:|data:/i.test(name), '姓名包含不允許的字元')

export const socialLoginSchema = z.object({
  provider: socialProviderSchema,
})

export const registerFormSchema = z.object({
  email: optionalEmailSchema,
  organizationName: organizationNameSchema,
  organizationType: z.enum(['restaurant', 'supplier'], {
    errorMap: () => ({ message: '請選擇組織類型' }),
  }),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema,
  agreeToTerms: z.boolean().optional(),
})

export const mfaVerificationSchema = z.object({
  code: mfaCodeSchema,
  mfaSessionId: z.string().min(1, 'MFA 會話 ID 無效').optional(),
  rememberMe: z.boolean().default(false),
})

export type SocialProvider = z.infer<typeof socialProviderSchema>
export type SocialLoginData = z.infer<typeof socialLoginSchema>
export type LoginFormData = SocialLoginData
export type RegisterFormData = z.infer<typeof registerFormSchema>
export type MFAVerificationData = z.infer<typeof mfaVerificationSchema>

function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    return { success: true, data: schema.parse(data) }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.errors.forEach(err => {
        if (err.path.length > 0) errors[err.path[0] as string] = err.message
      })
      return { success: false, errors }
    }
    return { success: false, errors: { general: '驗證失敗' } }
  }
}

export class AuthValidation {
  static validateLogin(data: unknown) {
    return validateWithSchema(socialLoginSchema, data)
  }

  static validateRegistration(data: unknown) {
    return validateWithSchema(registerFormSchema, data)
  }

  static validateMFA(data: unknown) {
    return validateWithSchema(mfaVerificationSchema, data)
  }

  static sanitizeString(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim()
  }
}

export default AuthValidation
