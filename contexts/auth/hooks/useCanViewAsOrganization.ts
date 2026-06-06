/**
 * useCanViewAsOrganization Hook
 * Returns whether the current user can view as another organization
 */

'use client'

import { useAuth } from './useAuth'

export function useCanViewAsOrganization(): boolean {
  const { canViewAsOrganization } = useAuth()
  return canViewAsOrganization()
}
