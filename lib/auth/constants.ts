/**
 * Auth Constants
 * Shared constants for authentication module
 */

// Minimum password length
export const MIN_PASSWORD_LENGTH = 12

// Password validation messages
export const PASSWORD_MESSAGES = {
  required: '請輸入密碼',
  tooShort: `密碼至少需要 ${MIN_PASSWORD_LENGTH} 個字符`,
  mismatch: '密碼確認不符',
} as const

// Email validation messages
export const EMAIL_MESSAGES = {
  required: '請輸入電子信箱',
  invalid: '請輸入有效的電子信箱',
} as const

// MFA validation messages
export const MFA_MESSAGES = {
  required: '請輸入驗證碼',
  invalidLength: '驗證碼應為 6 位數',
} as const

// Reset password messages
export const RESET_MESSAGES = {
  codeRequired: '請輸入重設碼',
  newPasswordRequired: '請輸入新密碼',
  confirmRequired: '請確認新密碼',
} as const

// Registration messages
export const REGISTRATION_MESSAGES = {
  organizationNameRequired: '請輸入機構名稱',
  organizationTypeRequired: '請選擇機構類型',
  firstNameRequired: '請輸入名字',
  lastNameRequired: '請輸入姓氏',
  phoneRequired: '請輸入電話號碼',
} as const

// API error messages
export const API_ERROR_MESSAGES = {
  networkError: '網路錯誤，請重試',
  loginFailed: '登入失敗，請檢查您的帳號密碼',
  mfaFailed: 'MFA 驗證失敗，請重試',
} as const

// Routes for redirection after login
export const AUTH_ROUTES = {
  dashboard: '/dashboard',
  platform: '/platform',
  supplier: '/supplier',
  restaurant: '/restaurant',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
} as const

// Registration step definitions
export const REGISTRATION_STEPS = [
  { id: 1, title: '帳戶資訊', description: '設定您的登入資訊' },
  { id: 2, title: '機構資訊', description: '告訴我們您的機構類型' },
  { id: 3, title: '個人資訊', description: '完善您的個人檔案' },
] as const

// Password reset step types
export type PasswordResetStep = 'email' | 'sent' | 'reset'

// Login step types
export type LoginStep = 'login' | 'mfa'
