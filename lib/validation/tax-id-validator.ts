/**
 * Taiwan Tax ID Validation Service
 * Provides comprehensive validation for Taiwan business tax IDs (統一編號) and personal IDs (身分證字號)
 * Includes real-time API validation with Ministry of Finance business registry
 */

import type { TaxIdValidationResult, PersonalIdValidationResult } from '@orderly/types'

// Taiwan Tax ID validation constants
const TAX_ID_MULTIPLIERS = [1, 2, 1, 2, 1, 2, 4, 1]
const PERSONAL_ID_REGION_CODES: Record<string, string> = {
  A: '台北市',
  B: '台中市',
  C: '基隆市',
  D: '台南市',
  E: '高雄市',
  F: '新北市',
  G: '宜蘭縣',
  H: '桃園市',
  I: '嘉義市',
  J: '新竹縣',
  K: '苗栗縣',
  L: '台中縣',
  M: '南投縣',
  N: '彰化縣',
  O: '新竹市',
  P: '雲林縣',
  Q: '嘉義縣',
  R: '台南縣',
  S: '高雄縣',
  T: '屏東縣',
  U: '花蓮縣',
  V: '台東縣',
  W: '金門縣',
  X: '澎湖縣',
  Y: '陽明山管理局',
  Z: '連江縣',
}

/**
 * Validate Taiwan Tax ID (統一編號) format and checksum
 */
export function validateTaxIdFormat(taxId: string): boolean {
  // Remove any non-digit characters and check length
  const cleanTaxId = taxId.replace(/\D/g, '')
  if (cleanTaxId.length !== 8) {
    return false
  }

  // Convert to array of numbers
  const digits = cleanTaxId.split('').map(Number)

  // Calculate checksum using Taiwan's algorithm
  let sum = 0
  for (let i = 0; i < 8; i++) {
    let product = digits[i] * TAX_ID_MULTIPLIERS[i]
    if (product >= 10) {
      product = Math.floor(product / 10) + (product % 10)
    }
    sum += product
  }

  // Special case for 7th digit = 7
  if (digits[6] === 7) {
    const alternativeSum = sum + 1
    return sum % 10 === 0 || alternativeSum % 10 === 0
  }

  return sum % 10 === 0
}

/**
 * Validate Taiwan Personal ID (身分證字號) format and checksum
 */
export function validatePersonalIdFormat(personalId: string): PersonalIdValidationResult {
  // Basic format check
  const cleanId = personalId.toUpperCase().trim()
  if (!/^[A-Z]\d{9}$/.test(cleanId)) {
    return {
      isValid: false,
      errorMessage: '身分證字號格式不正確，應為1位英文字母加9位數字',
    }
  }

  const letter = cleanId[0]
  const digits = cleanId.slice(1).split('').map(Number)

  // Check if region code is valid
  if (!PERSONAL_ID_REGION_CODES[letter]) {
    return {
      isValid: false,
      errorMessage: '身分證字號第一位字母不是有效的縣市代碼',
    }
  }

  // Convert letter to numbers (A=10, B=11, ..., Z=35)
  const letterValue = letter.charCodeAt(0) - 'A'.charCodeAt(0) + 10
  const letterDigit1 = Math.floor(letterValue / 10)
  const letterDigit2 = letterValue % 10

  // Calculate checksum
  let sum = letterDigit1 + letterDigit2 * 9
  for (let i = 0; i < 8; i++) {
    sum += digits[i] * (8 - i)
  }
  sum += digits[8]

  if (sum % 10 !== 0) {
    return {
      isValid: false,
      errorMessage: '身分證字號檢查碼不正確',
    }
  }

  return { isValid: true }
}

/**
 * Real-time Tax ID validation with Ministry of Finance API
 * Note: This is a mock implementation - actual API integration would require government API access
 */
export async function validateTaxIdWithApi(taxId: string): Promise<TaxIdValidationResult> {
  // First validate format
  if (!validateTaxIdFormat(taxId)) {
    return {
      isValid: false,
      errorMessage: '統一編號格式不正確',
    }
  }

  try {
    // Mock API call - in production, this would call the actual MOF API
    // const response = await fetch(`https://api.mof.gov.tw/business-registry/${taxId}`, {
    //   headers: {
    //     'Authorization': `Bearer ${process.env.MOF_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   }
    // });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock validation logic based on known patterns
    const mockValidTaxIds = ['12345678', '23456789', '34567890', '45678901', '56789012']

    const isKnownValid = mockValidTaxIds.includes(taxId)

    if (isKnownValid) {
      return {
        isValid: true,
        companyName: `測試公司 ${taxId}`,
        businessAddress: '台北市信義區信義路五段7號',
        registrationDate: new Date('2020-01-01'),
        status: 'active',
      }
    }

    // For demo purposes, consider all other format-valid IDs as valid but with limited info
    return {
      isValid: true,
      companyName: `公司 ${taxId}`,
      status: 'active',
    }
  } catch (error) {
    console.error('Tax ID API validation failed:', error)
    return {
      isValid: false,
      errorMessage: '無法驗證統一編號，請稍後再試',
    }
  }
}

/**
 * Combined validation function for use in forms
 */
export async function validateBusinessIdentifier(
  businessType: 'company' | 'individual',
  identifier: string
): Promise<TaxIdValidationResult | PersonalIdValidationResult> {
  if (businessType === 'company') {
    return await validateTaxIdWithApi(identifier)
  } else {
    return validatePersonalIdFormat(identifier)
  }
}

/**
 * Client-side validation hooks for React forms
 */
export function useTaxIdValidation() {
  const validateTaxId = async (taxId: string): Promise<TaxIdValidationResult> => {
    if (!taxId) {
      return { isValid: false, errorMessage: '請輸入統一編號' }
    }

    if (!validateTaxIdFormat(taxId)) {
      return { isValid: false, errorMessage: '統一編號格式不正確' }
    }

    return await validateTaxIdWithApi(taxId)
  }

  const validatePersonalId = (personalId: string): PersonalIdValidationResult => {
    if (!personalId) {
      return { isValid: false, errorMessage: '請輸入身分證字號' }
    }

    return validatePersonalIdFormat(personalId)
  }

  return { validateTaxId, validatePersonalId }
}

/**
 * Utility functions for formatting and display
 */
export function formatTaxId(taxId: string): string {
  const clean = taxId.replace(/\D/g, '')
  if (clean.length <= 4) return clean
  if (clean.length <= 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`
}

export function formatPersonalId(personalId: string): string {
  const clean = personalId.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.length <= 1) return clean
  if (clean.length <= 6) return `${clean.slice(0, 1)}${clean.slice(1)}`
  return `${clean.slice(0, 1)}${clean.slice(1, 6)}****`
}

export function getRegionFromPersonalId(personalId: string): string {
  const letter = personalId.charAt(0).toUpperCase()
  return PERSONAL_ID_REGION_CODES[letter] || '未知地區'
}

/**
 * Validation error messages in Traditional Chinese
 */
export const VALIDATION_MESSAGES = {
  TAX_ID: {
    REQUIRED: '請輸入統一編號',
    INVALID_FORMAT: '統一編號必須為8位數字',
    INVALID_CHECKSUM: '統一編號檢查碼不正確',
    API_ERROR: '無法驗證統一編號，請稍後再試',
    NOT_FOUND: '查無此統一編號的公司資料',
  },
  PERSONAL_ID: {
    REQUIRED: '請輸入身分證字號',
    INVALID_FORMAT: '身分證字號格式不正確',
    INVALID_REGION: '身分證字號地區代碼不正確',
    INVALID_CHECKSUM: '身分證字號檢查碼不正確',
  },
} as const
