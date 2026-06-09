/**
 * Profile Form Hook
 * Encapsulates all form logic for supplier profile settings
 */

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { useSupplierProfile } from '@/lib/api/supplier-hooks'
import {
  profileUpdateSchema,
  ProfileUpdateFormData,
  QualityCertification,
  DEFAULT_CERTIFICATION,
} from '../schemas/profile-schemas'
import type { SupplierProfile, SupplierProfileUpdateRequest } from '@/lib/api/supplier-types'

// ============================================================================
// Types
// ============================================================================

export type EditingSection = 'basic' | 'delivery' | 'hours' | 'certifications' | 'contact' | null

export interface UseProfileFormReturn {
  // Form state
  form: ReturnType<typeof useForm<ProfileUpdateFormData>>
  editingSection: EditingSection
  setEditingSection: (section: EditingSection) => void

  // Profile data
  profile: SupplierProfile | null
  loading: boolean
  error: string | null
  isUpdating: boolean
  refetch: () => void

  // Certification management
  newCertification: QualityCertification
  setNewCertification: React.Dispatch<React.SetStateAction<QualityCertification>>
  addCertification: () => void
  removeCertification: (index: number) => void

  // Delivery zone management
  newDeliveryZone: string
  setNewDeliveryZone: React.Dispatch<React.SetStateAction<string>>
  addDeliveryZone: () => void
  removeDeliveryZone: (zone: string) => void

  // Form actions
  onSubmit: (data: ProfileUpdateFormData) => Promise<void>
  handleCancelEdit: () => void

  // Profile completeness
  completeness: number
}

// ============================================================================
// Profile Completeness Calculator
// ============================================================================

function calculateProfileCompleteness(profile: SupplierProfile): number {
  let completed = 0
  const total = 8

  if (profile.delivery_capacity) completed++
  if (profile.delivery_capacity_kg_per_day > 0) completed++
  if (profile.operating_hours && Object.keys(profile.operating_hours).length > 0) completed++
  if (profile.delivery_zones && profile.delivery_zones.length > 0) completed++
  if (profile.minimum_order_amount > 0) completed++
  if (profile.payment_terms_days > 0) completed++
  if (profile.quality_certifications && profile.quality_certifications.length > 0) completed++
  if (profile.public_description) completed++

  return Math.round((completed / total) * 100)
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useProfileForm(organizationId: string): UseProfileFormReturn {
  const [editingSection, setEditingSection] = useState<EditingSection>(null)
  const [newCertification, setNewCertification] =
    useState<QualityCertification>(DEFAULT_CERTIFICATION)
  const [newDeliveryZone, setNewDeliveryZone] = useState('')

  const {
    data: profile,
    loading,
    error,
    updateProfile,
    isUpdating,
    updateError,
    refetch,
  } = useSupplierProfile(organizationId)

  const form = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
  })

  const { watch, setValue, reset } = form

  // Initialize form with current profile data
  useEffect(() => {
    if (profile) {
      reset({
        delivery_capacity: profile.delivery_capacity,
        delivery_capacity_kg_per_day: profile.delivery_capacity_kg_per_day,
        operating_hours: profile.operating_hours,
        delivery_zones: profile.delivery_zones,
        minimum_order_amount: profile.minimum_order_amount,
        payment_terms_days: profile.payment_terms_days,
        quality_certifications: profile.quality_certifications,
        contact_preferences: profile.contact_preferences,
        public_description: profile.public_description,
      })
    }
  }, [profile, reset])

  // Form submission handler
  const onSubmit = useCallback(
    async (data: ProfileUpdateFormData) => {
      try {
        // Cast to SupplierProfileUpdateRequest - schemas are compatible
        // but TypeScript cannot infer the full compatibility
        await updateProfile(data as unknown as SupplierProfileUpdateRequest)
        setEditingSection(null)
        toast.success('設定已更新')
      } catch {
        toast.error(updateError || '更新失敗，請稍後再試')
      }
    },
    [updateProfile, updateError]
  )

  // Cancel edit handler
  const handleCancelEdit = useCallback(() => {
    reset()
    setEditingSection(null)
  }, [reset])

  // Certification management
  const addCertification = useCallback(() => {
    if (!newCertification.name || !newCertification.number) {
      toast.error('請填寫認證名稱和編號')
      return
    }

    const currentCertifications = watch('quality_certifications') || []
    setValue('quality_certifications', [...currentCertifications, newCertification])
    setNewCertification(DEFAULT_CERTIFICATION)
  }, [newCertification, watch, setValue])

  const removeCertification = useCallback(
    (index: number) => {
      const currentCertifications = watch('quality_certifications') || []
      setValue(
        'quality_certifications',
        currentCertifications.filter((_, i) => i !== index)
      )
    },
    [watch, setValue]
  )

  // Delivery zone management
  const addDeliveryZone = useCallback(() => {
    const trimmedZone = newDeliveryZone.trim()
    if (!trimmedZone) {
      toast.error('請輸入配送區域')
      return
    }

    const currentZones = watch('delivery_zones') || []
    if (currentZones.includes(trimmedZone)) {
      toast.error('此配送區域已存在')
      return
    }

    setValue('delivery_zones', [...currentZones, trimmedZone])
    setNewDeliveryZone('')
  }, [newDeliveryZone, watch, setValue])

  const removeDeliveryZone = useCallback(
    (zone: string) => {
      const currentZones = watch('delivery_zones') || []
      setValue(
        'delivery_zones',
        currentZones.filter(z => z !== zone)
      )
    },
    [watch, setValue]
  )

  // Calculate profile completeness
  const completeness = profile ? calculateProfileCompleteness(profile) : 0

  return {
    form,
    editingSection,
    setEditingSection,
    profile,
    loading,
    error,
    isUpdating,
    refetch,
    newCertification,
    setNewCertification,
    addCertification,
    removeCertification,
    newDeliveryZone,
    setNewDeliveryZone,
    addDeliveryZone,
    removeDeliveryZone,
    onSubmit,
    handleCancelEdit,
    completeness,
  }
}
