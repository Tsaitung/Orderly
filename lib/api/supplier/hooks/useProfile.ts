/**
 * Supplier Profile Hooks
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { supplierProfileApi } from '../api'
import { getErrorMessage } from '../errors'
import type {
  SupplierProfile,
  SupplierProfileCreateRequest,
  SupplierProfileUpdateRequest,
} from '../types'

interface UseAsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Hook to fetch and manage supplier profile
 */
export function useSupplierProfile(organizationId?: string) {
  const [state, setState] = useState<UseAsyncState<SupplierProfile>>({
    data: null,
    loading: !!organizationId,
    error: null,
  })

  const [isUpdating, setIsUpdating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!organizationId) {
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const profile = await supplierProfileApi.getProfile(organizationId)
      setState({ data: profile, loading: false, error: null })
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setState({ data: null, loading: false, error: errorMessage })
      console.error('Failed to fetch supplier profile:', err)
    }
  }, [organizationId])

  useEffect(() => {
    if (organizationId) {
      fetchProfile()
    }
  }, [organizationId, fetchProfile])

  const updateProfile = useCallback(
    async (data: SupplierProfileUpdateRequest) => {
      if (!organizationId) {
        return
      }

      setIsUpdating(true)
      setUpdateError(null)
      try {
        const updatedProfile = await supplierProfileApi.updateProfile(organizationId, data)
        setState(prev => ({ ...prev, data: updatedProfile }))
        toast.success('供應商資料更新成功')
        return updatedProfile
      } catch (err) {
        const errorMessage = getErrorMessage(err)
        setUpdateError(errorMessage)
        toast.error(errorMessage)
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    [organizationId]
  )

  const createProfile = useCallback(async (data: SupplierProfileCreateRequest) => {
    setIsCreating(true)
    setCreateError(null)
    try {
      const newProfile = await supplierProfileApi.createProfile(data)
      setState(prev => ({ ...prev, data: newProfile }))
      toast.success('供應商資料建立成功')
      return newProfile
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setCreateError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [])

  const mutate = useCallback((newData: SupplierProfile | null) => {
    setState(prev => ({ ...prev, data: newData }))
  }, [])

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch: fetchProfile,
    mutate,
    updateProfile,
    createProfile,
    isUpdating,
    isCreating,
    updateError,
    createError,
  }
}
