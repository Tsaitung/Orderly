/**
 * useCurrentRole Hook
 * Returns the current effective role for routing and UI decisions
 */

'use client'

import { useAuth } from './useAuth'
import type { CurrentRole } from '../types'

export function useCurrentRole(): CurrentRole {
  const { getCurrentRole } = useAuth()
  return getCurrentRole()
}
