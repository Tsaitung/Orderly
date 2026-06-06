/**
 * Auth Library Index
 * Central export point for auth utilities
 */

// Constants
export {
  MIN_PASSWORD_LENGTH,
  PASSWORD_MESSAGES,
  EMAIL_MESSAGES,
  MFA_MESSAGES,
  RESET_MESSAGES,
  REGISTRATION_MESSAGES,
  API_ERROR_MESSAGES,
  AUTH_ROUTES,
  REGISTRATION_STEPS,
  type PasswordResetStep,
  type LoginStep,
} from './constants'

// Validation
export {
  type FormErrors,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateMfaCode,
  validateLoginForm,
  validateRegistrationStep1,
  validateRegistrationStep2,
  validateRegistrationStep3,
  validatePasswordResetForm,
  hasErrors,
  clearFieldError,
} from './validation'

// Form utilities
export {
  createFieldUpdater,
  getRedirectPathForRole,
  getRedirectPathFromSession,
  isStaging,
  executeStagingAdminLogin,
  formatMfaCode,
  createSubmitHandler,
  type ErrorBannerProps,
  hasSubmitError,
  getSubmitError,
} from './form-utils'
