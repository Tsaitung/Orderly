import {
  type LucideIcon,
  Users,
  Shield,
  ShoppingCart,
  Database,
  CreditCard,
  BarChart3,
  Settings,
} from 'lucide-react'
import type { RiskLevel, RoleType } from './types'

const CATEGORY_NAMES: Record<string, string> = {
  user: '使用者管理',
  role: '角色權限',
  order: '訂單管理',
  product: '產品管理',
  finance: '財務管理',
  report: '報表分析',
  system: '系統設定',
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  user: Users,
  role: Shield,
  order: ShoppingCart,
  product: Database,
  finance: CreditCard,
  report: BarChart3,
  system: Settings,
}

const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
}

const ROLE_TYPE_COLORS: Record<RoleType, string> = {
  platform: 'bg-blue-100 text-blue-800',
  restaurant: 'bg-orange-100 text-orange-800',
  supplier: 'bg-green-100 text-green-800',
}

export function getCategoryName(category: string): string {
  return CATEGORY_NAMES[category] || category
}

export function getCategoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] || Shield
}

export function getRiskLevelColor(level: RiskLevel): string {
  return RISK_LEVEL_COLORS[level] || 'text-gray-600'
}

export function getRoleTypeColor(type: RoleType): string {
  return ROLE_TYPE_COLORS[type] || 'bg-gray-100 text-gray-800'
}
