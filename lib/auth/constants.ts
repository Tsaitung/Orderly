/**
 * Auth constants.
 */

export const SOCIAL_PROVIDERS = {
  line: { label: 'Line' },
  google: { label: 'Google' },
} as const

export const EMAIL_MESSAGES = {
  required: '請輸入電子信箱',
  invalid: '請輸入有效的電子信箱',
} as const

export const MFA_MESSAGES = {
  required: '請輸入驗證碼',
  invalidLength: '驗證碼應為 6 位數',
} as const

export const REGISTRATION_MESSAGES = {
  organizationNameRequired: '請輸入機構名稱',
  organizationTypeRequired: '請選擇機構類型',
  firstNameRequired: '請輸入名字',
  lastNameRequired: '請輸入姓氏',
  phoneRequired: '請輸入電話號碼',
} as const

export const API_ERROR_MESSAGES = {
  networkError: '網路錯誤，請重試',
  loginFailed: '登入失敗，請重新嘗試',
  mfaFailed: 'MFA 驗證失敗，請重試',
} as const

export const AUTH_ROUTES = {
  dashboard: '/dashboard',
  platform: '/platform',
  supplier: '/supplier',
  restaurant: '/restaurant',
  login: '/login',
  register: '/register',
  accountRecovery: '/account-recovery',
} as const

export const REGISTRATION_STEPS = [
  { id: 1, title: '社群帳號', description: '使用 Line 建立帳號' },
  { id: 2, title: '機構資訊', description: '設定您的機構類型' },
  { id: 3, title: '個人資訊', description: '完善您的個人檔案' },
] as const

export type LoginStep = 'login' | 'mfa'
