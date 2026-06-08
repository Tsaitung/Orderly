/**
 * Supplier Onboarding Hooks
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import { supplierOnboardingApi } from '../api'
import { getErrorMessage } from '../errors'
import type { OnboardingProgress } from '../types'

/**
 * Hook to manage supplier onboarding progress
 */
export function useSupplierOnboarding(organizationId?: string) {
  const [onboarding, setOnboarding] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(!!organizationId)
  const [error, setError] = useState<string | null>(null)

  const [isUpdatingStep, setIsUpdatingStep] = useState(false)
  const [isCompletingStep, setIsCompletingStep] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchOnboarding = useCallback(async () => {
    if (!organizationId) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const progress = await supplierOnboardingApi.getProgress(organizationId)
      setOnboarding(progress)
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      console.error('Failed to fetch onboarding progress:', err)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    if (organizationId) {
      fetchOnboarding()
    }
  }, [organizationId, fetchOnboarding])

  const updateStep = useCallback(
    async ({ stepName, data }: { stepName: string; data: Record<string, unknown> }) => {
      if (!organizationId) {
        return
      }

      setIsUpdatingStep(true)
      try {
        const updatedProgress = await supplierOnboardingApi.updateStep(organizationId, stepName, {
          step_name: stepName,
          step_data: data,
        })
        setOnboarding(updatedProgress)
        toast.success('步驟更新成功')
        return updatedProgress
      } catch (err) {
        const errorMessage = getErrorMessage(err)
        toast.error(errorMessage)
        throw err
      } finally {
        setIsUpdatingStep(false)
      }
    },
    [organizationId]
  )

  const completeStep = useCallback(
    async (stepName: string) => {
      if (!organizationId) {
        return
      }

      setIsCompletingStep(true)
      try {
        const updatedProgress = await supplierOnboardingApi.completeStep(organizationId, stepName)
        setOnboarding(updatedProgress)
        toast.success('步驟完成')
        return updatedProgress
      } catch (err) {
        const errorMessage = getErrorMessage(err)
        toast.error(errorMessage)
        throw err
      } finally {
        setIsCompletingStep(false)
      }
    },
    [organizationId]
  )

  const submitForReview = useCallback(async () => {
    if (!organizationId) {
      return
    }

    setIsSubmitting(true)
    try {
      const updatedProgress = await supplierOnboardingApi.submitForReview(organizationId)
      setOnboarding(updatedProgress)
      toast.success('已提交審核')
      return updatedProgress
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      toast.error(errorMessage)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [organizationId])

  // Helper computed values
  const completedSteps = useMemo(() => {
    if (!onboarding) {
      return 0
    }
    return [
      onboarding.step_company_info,
      onboarding.step_business_documents,
      onboarding.step_delivery_setup,
      onboarding.step_product_categories,
      onboarding.step_verification,
    ].filter(Boolean).length
  }, [onboarding])

  const nextIncompleteStep = useMemo(() => {
    if (!onboarding) {
      return null
    }

    if (!onboarding.step_company_info) {
      return 'company_info'
    }
    if (!onboarding.step_business_documents) {
      return 'business_documents'
    }
    if (!onboarding.step_delivery_setup) {
      return 'delivery_setup'
    }
    if (!onboarding.step_product_categories) {
      return 'product_categories'
    }
    if (!onboarding.step_verification) {
      return 'verification'
    }

    return null
  }, [onboarding])

  const canSubmitForReview = useMemo(() => {
    return completedSteps >= 4 && !onboarding?.is_completed
  }, [completedSteps, onboarding?.is_completed])

  return {
    onboarding,
    loading,
    error,
    refetch: fetchOnboarding,

    // Actions
    updateStep,
    completeStep,
    submitForReview,

    // Loading states
    isUpdatingStep,
    isCompletingStep,
    isSubmitting,

    // Computed values
    completedSteps,
    totalSteps: 5,
    completionPercentage: Math.round((completedSteps / 5) * 100),
    nextIncompleteStep,
    canSubmitForReview,
    isCompleted: onboarding?.is_completed || false,
  }
}
