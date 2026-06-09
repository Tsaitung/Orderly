/**
 * Shared Types for Profile Sections
 */

import type { UseFormReturn } from 'react-hook-form'
import type { ProfileUpdateFormData } from '../schemas/profile-schemas'
import type { SupplierProfile } from '@/lib/api/supplier-types'

export interface BaseSectionProps {
  profile: SupplierProfile
  isEditing: boolean
  onToggleEdit: () => void
  form: UseFormReturn<ProfileUpdateFormData>
  isUpdating: boolean
  onSubmit: (data: ProfileUpdateFormData) => Promise<void>
  onCancel: () => void
}
