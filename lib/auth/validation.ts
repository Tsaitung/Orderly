/**
 * Auth Validation Utilities
 * Shared validation functions for authentication forms
 */

import {
  MIN_PASSWORD_LENGTH,
  EMAIL_MESSAGES,
  PASSWORD_MESSAGES,
  MFA_MESSAGES,
  RESET_MESSAGES,
  REGISTRATION_MESSAGES,
} from './constants'

// Email regex pattern
const EMAIL_PATTERN = /\S+@\S+\.\S+/

/**
 * Form error type
 */
export interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  code?: string
  newPassword?: string
  organizationName?: string
  organizationType?: string
  firstName?: string
  lastName?: string
  phone?: string
  submit?: string
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | undefined {
  if (!email) {
    return EMAIL_MESSAGES.required
  }
  if (!EMAIL_PATTERN.test(email)) {
    return EMAIL_MESSAGES.invalid
  }
  return undefined
}

/**
 * Validate password (for registration/reset - with length check)
 */
export function validatePassword(password: string): string | undefined {
  if (!password) {
    return PASSWORD_MESSAGES.required
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return PASSWORD_MESSAGES.tooShort
  }
  return undefined
}

/**
 * Validate password confirmation
 */
export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): string | undefined {
  if (!confirmPassword) {
    return '請確認密碼'
  }
  if (password !== confirmPassword) {
    return PASSWORD_MESSAGES.mismatch
  }
  return undefined
}

/**
 * Validate MFA code
 */
export function validateMfaCode(code: string): string | undefined {
  if (!code) {
    return MFA_MESSAGES.required
  }
  if (code.length !== 6) {
    return MFA_MESSAGES.invalidLength
  }
  return undefined
}

/**
 * Validate login form (step 1)
 */
export function validateLoginForm(email: string, password: string): FormErrors {
  const errors: FormErrors = {}

  const emailError = validateEmail(email)
  if (emailError) {
    errors.email = emailError
  }

  if (!password) {
    errors.password = PASSWORD_MESSAGES.required
  }

  return errors
}

/**
 * Validate registration step 1 (account info)
 */
export function validateRegistrationStep1(
  email: string,
  password: string,
  confirmPassword: string
): FormErrors {
  const errors: FormErrors = {}

  const emailError = validateEmail(email)
  if (emailError) {
    errors.email = emailError
  }

  const passwordError = validatePassword(password)
  if (passwordError) {
    errors.password = passwordError
  }

  const confirmError = validatePasswordConfirmation(password, confirmPassword)
  if (confirmError) {
    errors.confirmPassword = confirmError
  }

  return errors
}

/**
 * Validate registration step 2 (organization info)
 */
export function validateRegistrationStep2(
  organizationName: string,
  organizationType: string
): FormErrors {
  const errors: FormErrors = {}

  if (!organizationName) {
    errors.organizationName = REGISTRATION_MESSAGES.organizationNameRequired
  }
  if (!organizationType) {
    errors.organizationType = REGISTRATION_MESSAGES.organizationTypeRequired
  }

  return errors
}

/**
 * Validate registration step 3 (personal info)
 */
export function validateRegistrationStep3(
  firstName: string,
  lastName: string,
  phone: string
): FormErrors {
  const errors: FormErrors = {}

  if (!firstName) {
    errors.firstName = REGISTRATION_MESSAGES.firstNameRequired
  }
  if (!lastName) {
    errors.lastName = REGISTRATION_MESSAGES.lastNameRequired
  }
  if (!phone) {
    errors.phone = REGISTRATION_MESSAGES.phoneRequired
  }

  return errors
}

/**
 * Validate password reset form
 */
export function validatePasswordResetForm(
  code: string,
  newPassword: string,
  confirmPassword: string
): FormErrors {
  const errors: FormErrors = {}

  if (!code) {
    errors.code = RESET_MESSAGES.codeRequired
  }

  const passwordError = validatePassword(newPassword)
  if (passwordError) {
    errors.newPassword = passwordError
  }

  const confirmError = validatePasswordConfirmation(newPassword, confirmPassword)
  if (confirmError) {
    errors.confirmPassword = confirmError
  }

  return errors
}

/**
 * Check if errors object has any errors
 */
export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0
}

/**
 * Clear specific field error from errors object
 */
export function clearFieldError<K extends keyof FormErrors>(
  errors: FormErrors,
  field: K
): FormErrors {
  const newErrors = { ...errors }
  delete newErrors[field]
  return newErrors
}
