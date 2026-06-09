/**
 * Supplier Profile Module
 * Re-exports main component and related utilities
 */

// Main component
export { default as SupplierProfileSettings } from './SupplierProfileSettings'
export { default } from './SupplierProfileSettings'

// Schemas
export {
  profileUpdateSchema,
  operatingHoursSchema,
  qualityCertificationSchema,
  contactPreferencesSchema,
  DAY_NAMES,
  WEEKDAYS,
  DEFAULT_CERTIFICATION,
  DEFAULT_CONTACT_PREFERENCES,
  type ProfileUpdateFormData,
  type OperatingHours,
  type QualityCertification,
  type ContactPreferences,
  type DayKey,
} from './schemas/profile-schemas'

// Hook
export {
  useProfileForm,
  type EditingSection,
  type UseProfileFormReturn,
} from './hooks/useProfileForm'

// Sections (for custom compositions)
export {
  BasicInfoSection,
  DeliveryZonesSection,
  OperatingHoursSection,
  CertificationsSection,
  ContactPreferencesSection,
  type BaseSectionProps,
} from './sections'
