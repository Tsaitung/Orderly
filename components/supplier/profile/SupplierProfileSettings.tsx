/**
 * Supplier Profile Settings Component
 * Container component that orchestrates profile settings sections
 */

'use client'

import React from 'react'
import { Building2, Shield, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { SUPPLIER_STATUS_LABELS } from '@/lib/api/supplier-types'
import { SupplierProfileSkeleton } from '../shared/SupplierLoadingStates'
import { SupplierPageErrorBoundary } from '../shared/SupplierErrorBoundary'
import { useProfileForm, type EditingSection } from './hooks/useProfileForm'
import {
  BasicInfoSection,
  DeliveryZonesSection,
  OperatingHoursSection,
  CertificationsSection,
  ContactPreferencesSection,
} from './sections'

// ============================================================================
// Profile Header Component
// ============================================================================

interface ProfileHeaderProps {
  status: string
  verifiedAt?: string
  completeness: number
}

function ProfileHeader({
  status,
  verifiedAt,
  completeness,
}: ProfileHeaderProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="rounded-lg bg-blue-100 p-3">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">供應商資料設定</CardTitle>
              <p className="mt-1 text-gray-600">管理您的供應商檔案和服務設定</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant={status === 'verified' ? 'success' : 'warning'}>
              {SUPPLIER_STATUS_LABELS[status as keyof typeof SUPPLIER_STATUS_LABELS]}
            </Badge>
            {verifiedAt && (
              <div className="flex items-center space-x-1 text-green-600">
                <Shield className="h-4 w-4" />
                <span className="text-sm">已驗證</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">資料完整度</span>
            <span className="text-sm font-bold text-blue-600">{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-2" />
          <p className="text-xs text-gray-500">完善的資料有助於提升客戶信任度和訂單轉換率</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Content Component
// ============================================================================

interface SupplierProfileSettingsContentProps {
  organizationId: string
}

function SupplierProfileSettingsContent({
  organizationId,
}: SupplierProfileSettingsContentProps): React.ReactElement {
  const {
    form,
    editingSection,
    setEditingSection,
    profile,
    loading,
    error,
    isUpdating,
    refetch,
    newCertification,
    setNewCertification,
    addCertification,
    removeCertification,
    newDeliveryZone,
    setNewDeliveryZone,
    addDeliveryZone,
    removeDeliveryZone,
    onSubmit,
    handleCancelEdit,
    completeness,
  } = useProfileForm(organizationId)

  if (loading && !profile) {
    return <SupplierProfileSkeleton />
  }

  if (error) {
    throw new Error(error)
  }

  if (!profile) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <AlertCircle className="mx-auto mb-2 h-8 w-8" />
          <p>無法載入供應商資料</p>
          <Button onClick={refetch} className="mt-4">
            重新載入
          </Button>
        </div>
      </Card>
    )
  }

  function createToggleHandler(section: EditingSection): () => void {
    return () => setEditingSection(editingSection === section ? null : section)
  }

  const sharedProps = {
    profile,
    form,
    isUpdating,
    onSubmit,
    onCancel: handleCancelEdit,
  }

  return (
    <div className="space-y-6">
      <ProfileHeader
        status={profile.status}
        verifiedAt={profile.verified_at}
        completeness={completeness}
      />

      <BasicInfoSection
        {...sharedProps}
        isEditing={editingSection === 'basic'}
        onToggleEdit={createToggleHandler('basic')}
      />

      <DeliveryZonesSection
        {...sharedProps}
        isEditing={editingSection === 'delivery'}
        onToggleEdit={createToggleHandler('delivery')}
        newDeliveryZone={newDeliveryZone}
        setNewDeliveryZone={setNewDeliveryZone}
        addDeliveryZone={addDeliveryZone}
        removeDeliveryZone={removeDeliveryZone}
      />

      <OperatingHoursSection
        {...sharedProps}
        isEditing={editingSection === 'hours'}
        onToggleEdit={createToggleHandler('hours')}
      />

      <CertificationsSection
        {...sharedProps}
        isEditing={editingSection === 'certifications'}
        onToggleEdit={createToggleHandler('certifications')}
        newCertification={newCertification}
        setNewCertification={setNewCertification}
        addCertification={addCertification}
        removeCertification={removeCertification}
      />

      <ContactPreferencesSection
        {...sharedProps}
        isEditing={editingSection === 'contact'}
        onToggleEdit={createToggleHandler('contact')}
      />
    </div>
  )
}

// ============================================================================
// Organization ID Hook
// ============================================================================

function useOrganizationId(): string | null {
  // TODO: Get from auth context when available
  // For now, use hardcoded value for testing
  return 'test-org-123'
}

// ============================================================================
// Main Export
// ============================================================================

export default function SupplierProfileSettings(): React.ReactElement {
  const organizationId = useOrganizationId()

  if (!organizationId) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <AlertCircle className="mx-auto mb-2 h-8 w-8" />
          <p>無法獲取供應商資訊，請重新登入</p>
        </div>
      </Card>
    )
  }

  return (
    <SupplierPageErrorBoundary>
      <SupplierProfileSettingsContent organizationId={organizationId} />
    </SupplierPageErrorBoundary>
  )
}
