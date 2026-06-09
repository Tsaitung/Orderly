/**
 * useOrganization Hook
 * Provides organization management functionality
 */

'use client'

import { useAuth } from './useAuth'
import type { Organization, ViewMode } from '../types'

interface UseOrganizationResult {
  currentOrganization: Organization | null
  organizations: Organization[]
  viewMode: ViewMode
  switchToOrganizationView: (organizationId: string) => Promise<boolean>
  exitViewMode: () => void
  refreshOrganizations: () => Promise<void>
  canViewAsOrganization: boolean
  getCurrentOrganizationId: () => string | null
}

export function useOrganization(): UseOrganizationResult {
  const {
    currentOrganization,
    organizations,
    viewMode,
    switchToOrganizationView,
    exitViewMode,
    refreshOrganizations,
    canViewAsOrganization,
    getCurrentOrganizationId,
  } = useAuth()

  return {
    currentOrganization,
    organizations,
    viewMode,
    switchToOrganizationView,
    exitViewMode,
    refreshOrganizations,
    canViewAsOrganization: canViewAsOrganization(),
    getCurrentOrganizationId,
  }
}
