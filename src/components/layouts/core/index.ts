// Core Layout Components
export { DashboardLayout } from './DashboardLayout'
export { DashboardProvider } from './DashboardProvider'
export { DashboardSidebar, MobileSidebar } from './DashboardSidebar'
export { DashboardHeader } from './DashboardHeader'

// Configuration and Types
export type {
  UserRole,
  SpacingVariant,
  NavigationItem,
  UserInfo,
  ThemeConfig,
  DashboardLayoutProps,
  DashboardContextType,
} from './DashboardConfig'

export {
  ROLE_THEMES,
  SPACING_CONFIG,
  BREAKPOINTS,
  LAYOUT_SIZES,
  LAYOUT_CLASSES,
} from './DashboardConfig'

// Custom Hooks
export {
  useDashboard,
  useDashboardTheme,
  useDashboardSpacing,
  useDashboardNavigation,
} from './DashboardProvider'
