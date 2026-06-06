/**
 * Supplier Profile Validation Schemas
 * Zod schemas for supplier profile form validation
 */

import { z } from 'zod'

// ============================================================================
// Time Format Regex
// ============================================================================

const TIME_FORMAT_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
const TIME_FORMAT_ERROR = '請輸入有效時間格式 (HH:MM)'

// ============================================================================
// Day Hours Schema (Reusable)
// ============================================================================

const dayHoursSchema = z
  .object({
    open: z.string().regex(TIME_FORMAT_REGEX, TIME_FORMAT_ERROR).optional(),
    close: z.string().regex(TIME_FORMAT_REGEX, TIME_FORMAT_ERROR).optional(),
    is_closed: z.boolean().default(false),
  })
  .optional()

// ============================================================================
// Operating Hours Schema
// ============================================================================

export const operatingHoursSchema = z.object({
  monday: dayHoursSchema,
  tuesday: dayHoursSchema,
  wednesday: dayHoursSchema,
  thursday: dayHoursSchema,
  friday: dayHoursSchema,
  saturday: dayHoursSchema,
  sunday: dayHoursSchema,
})

export type OperatingHours = z.infer<typeof operatingHoursSchema>

// ============================================================================
// Quality Certification Schema
// ============================================================================

export const qualityCertificationSchema = z.object({
  name: z.string().min(1, '請輸入認證名稱'),
  number: z.string().min(1, '請輸入認證編號'),
  expires_at: z.string().optional(),
  issuer: z.string().optional(),
  document_url: z.string().url('請輸入有效的URL').optional().or(z.literal('')),
})

export type QualityCertification = z.infer<typeof qualityCertificationSchema>

// ============================================================================
// Contact Preferences Schema
// ============================================================================

export const contactPreferencesSchema = z.object({
  email_notifications: z.boolean().default(true),
  sms_notifications: z.boolean().default(false),
  whatsapp_notifications: z.boolean().default(false),
  preferred_contact_time: z.string().optional(),
  emergency_contact: z.string().optional(),
})

export type ContactPreferences = z.infer<typeof contactPreferencesSchema>

// ============================================================================
// Profile Update Schema (Main Form)
// ============================================================================

export const profileUpdateSchema = z.object({
  delivery_capacity: z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),
  delivery_capacity_kg_per_day: z.number().min(0, '配送容量必須大於等於0').optional(),
  operating_hours: operatingHoursSchema.optional(),
  delivery_zones: z.array(z.string()).optional(),
  minimum_order_amount: z.number().min(0, '最低訂單金額必須大於等於0').optional(),
  payment_terms_days: z
    .number()
    .min(1, '付款期限必須大於0天')
    .max(365, '付款期限不能超過365天')
    .optional(),
  quality_certifications: z.array(qualityCertificationSchema).optional(),
  contact_preferences: contactPreferencesSchema.optional(),
  public_description: z.string().max(1000, '描述不能超過1000字元').optional(),
})

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>

// ============================================================================
// Constants
// ============================================================================

export const DAY_NAMES = {
  monday: '星期一',
  tuesday: '星期二',
  wednesday: '星期三',
  thursday: '星期四',
  friday: '星期五',
  saturday: '星期六',
  sunday: '星期日',
} as const

export type DayKey = keyof typeof DAY_NAMES

export const WEEKDAYS: DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_CERTIFICATION: QualityCertification = {
  name: '',
  number: '',
  expires_at: '',
  issuer: '',
  document_url: '',
}

export const DEFAULT_CONTACT_PREFERENCES: ContactPreferences = {
  email_notifications: true,
  sms_notifications: false,
  whatsapp_notifications: false,
  preferred_contact_time: '',
  emergency_contact: '',
}
