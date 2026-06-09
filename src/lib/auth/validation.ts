/**
 * Auth validation utilities for social-only auth forms.
 */

import { EMAIL_MESSAGES, MFA_MESSAGES, REGISTRATION_MESSAGES } from './constants'

const EMAIL_PATTERN = /\S+@\S+\.\S+/

export interface FormErrors {
  email?: string
  code?: string
  organizationName?: string
  organizationType?: string
  firstName?: string
  lastName?: string
  phone?: string
  submit?: string
}

export function validateEmail(email: string, required = true): string | undefined {
  if (!email) return required ? EMAIL_MESSAGES.required : undefined
  if (!EMAIL_PATTERN.test(email)) return EMAIL_MESSAGES.invalid
  return undefined
}

export function validateMfaCode(code: string): string | undefined {
  if (!code) return MFA_MESSAGES.required
  if (code.length !== 6) return MFA_MESSAGES.invalidLength
  return undefined
}

export function validateRegistrationStep1(email: string): FormErrors {
  const errors: FormErrors = {}
  const emailError = validateEmail(email, false)
  if (emailError) errors.email = emailError
  return errors
}

export function validateRegistrationStep2(
  organizationName: string,
  organizationType: string
): FormErrors {
  const errors: FormErrors = {}
  if (!organizationName) errors.organizationName = REGISTRATION_MESSAGES.organizationNameRequired
  if (!organizationType) errors.organizationType = REGISTRATION_MESSAGES.organizationTypeRequired
  return errors
}

export function validateRegistrationStep3(
  firstName: string,
  lastName: string,
  phone: string
): FormErrors {
  const errors: FormErrors = {}
  if (!firstName) errors.firstName = REGISTRATION_MESSAGES.firstNameRequired
  if (!lastName) errors.lastName = REGISTRATION_MESSAGES.lastNameRequired
  if (!phone) errors.phone = REGISTRATION_MESSAGES.phoneRequired
  return errors
}

export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0
}

export function clearFieldError<K extends keyof FormErrors>(
  errors: FormErrors,
  field: K
): FormErrors {
  const newErrors = { ...errors }
  delete newErrors[field]
  return newErrors
}
