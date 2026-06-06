/**
 * useViewMode Hook
 * Returns the current view mode state for super user organization switching
 */

'use client'

import { useAuth } from './useAuth'
import type { ViewMode } from '../types'

export function useViewMode(): ViewMode {
  const { viewMode } = useAuth()
  return viewMode
}
