/**
 * Acceptance Management Module
 * 驗收管理模組導出入口
 */

// Main component
export { AcceptanceManagement, default } from './AcceptanceManagement'

// Sub-components
export { AcceptanceStatsCards } from './components/AcceptanceStatsCards'
export { AcceptanceHeader } from './components/AcceptanceHeader'
export { AcceptanceFilters } from './components/AcceptanceFilters'
export { AcceptanceCard } from './components/AcceptanceCard'
export { AcceptanceList } from './components/AcceptanceList'
export { AcceptanceDetail } from './components/AcceptanceDetail'
export { AcceptanceErrorState } from './components/AcceptanceErrorState'
export { NewAcceptanceDialog } from './components/NewAcceptanceDialog'

// Hooks
export { useAcceptanceManagement } from './hooks/useAcceptanceManagement'

// Types
export type {
  AcceptedItem,
  AcceptanceDiscrepancy,
  AcceptanceRecord,
  AcceptanceStatus,
  AcceptanceStats,
  AcceptanceFilterState,
  StatusOption,
} from './types'

export { STATUS_OPTIONS } from './types'

// Utilities
export {
  getStatusIcon,
  getStatusText,
  getStatusVariant,
  getQualityStars,
  getConditionText,
  getConditionVariant,
  getDiscrepancySeverityText,
  getDiscrepancySeverityVariant,
  formatDateTime,
  isOnTimeDelivery,
} from './utils'

// Mock data (for testing)
export { mockAcceptanceRecords } from './mock-data'
