/**
 * Auth Library Index
 * Central export point for auth utilities
 */

// Constants
export {
  SOCIAL_PROVIDERS,
  EMAIL_MESSAGES,
  MFA_MESSAGES,
  REGISTRATION_MESSAGES,
  API_ERROR_MESSAGES,
  AUTH_ROUTES,
  REGISTRATION_STEPS,
  type LoginStep,
} from './constants'

// Validation
export {
  type FormErrors,
  validateEmail,
  validateMfaCode,
  validateRegistrationStep1,
  validateRegistrationStep2,
  validateRegistrationStep3,
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
