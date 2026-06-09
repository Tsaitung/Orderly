import type { LucideIcon } from 'lucide-react'

export interface Permission {
  id: string
  name: string
  description: string
  category: string
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  module: string
  isSystemPermission: boolean
  riskLevel: 'low' | 'medium' | 'high'
}

export interface Role {
  id: string
  name: string
  code: string
  type: 'platform' | 'restaurant' | 'supplier'
  isSystemRole: boolean
  isActive: boolean
  permissions: string[]
  userCount: number
}

export interface PermissionCategory {
  id: string
  name: string
  icon: LucideIcon
  permissions: Permission[]
  collapsed: boolean
}

export interface MatrixChange {
  roleId: string
  permissionId: string
  granted: boolean
  previousState: boolean
}

export type RoleType = 'platform' | 'restaurant' | 'supplier'
export type RiskLevel = 'low' | 'medium' | 'high'
