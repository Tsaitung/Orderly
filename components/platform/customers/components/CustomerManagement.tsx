// ============================================================================
// Customer Management - Dashboard Interface
// ============================================================================
// Enhanced Customer Hierarchy Dashboard with tabbed BI interface

'use client'

import React from 'react'
import { CustomerHierarchyDashboard } from './dashboard/CustomerHierarchyDashboard'

// Import for backward compatibility
import { CustomerHierarchyProvider } from '../context/CustomerHierarchyContext'

// ============================================================================
// Legacy Component Implementation (for reference)
// ============================================================================
// The old implementation is preserved as a comment for reference
// Now using the new CustomerHierarchyDashboard component

// ============================================================================
// Main Export with Provider
// ============================================================================

interface CustomerManagementProps {
  className?: string
}

export function CustomerManagement({ className }: CustomerManagementProps) {
  return <CustomerHierarchyDashboard className={className} />
}
