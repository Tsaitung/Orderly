/**
 * Certifications Section
 * Handles quality certifications management
 */

'use client'

import React from 'react'
import { Star, Save, X, Edit, Plus, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { QualityCertification } from '../schemas/profile-schemas'
import type { BaseSectionProps } from './types'

interface CertificationsSectionProps extends BaseSectionProps {
  newCertification: QualityCertification
  setNewCertification: React.Dispatch<React.SetStateAction<QualityCertification>>
  addCertification: () => void
  removeCertification: (index: number) => void
}

export function CertificationsSection({
  profile,
  isEditing,
  onToggleEdit,
  form,
  isUpdating,
  onSubmit,
  onCancel,
  newCertification,
  setNewCertification,
  addCertification,
  removeCertification,
}: CertificationsSectionProps): React.ReactElement {
  const { watch, handleSubmit } = form
  const certifications = watch('quality_certifications') || []

  function updateCertificationField(
    field: keyof QualityCertification,
    value: string
  ): void {
    setNewCertification(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5" />
            <span>品質認證</span>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onToggleEdit}>
            {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            {isEditing ? '取消' : '編輯'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <NewCertificationForm
              certification={newCertification}
              onFieldChange={updateCertificationField}
              onAdd={addCertification}
            />

            <CertificationList
              certifications={certifications}
              onRemove={removeCertification}
              isEditing
            />

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
              <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isUpdating}>
                {isUpdating ? '儲存中...' : '儲存變更'}
                <Save className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <CertificationList
            certifications={profile.quality_certifications || []}
            isEditing={false}
          />
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// New Certification Form Sub-component
// ============================================================================

interface NewCertificationFormProps {
  certification: QualityCertification
  onFieldChange: (field: keyof QualityCertification, value: string) => void
  onAdd: () => void
}

function NewCertificationForm({
  certification,
  onFieldChange,
  onAdd,
}: NewCertificationFormProps): React.ReactElement {
  return (
    <div className="rounded-lg border bg-gray-50 p-4">
      <h4 className="mb-3 font-medium">新增認證</h4>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input
          placeholder="認證名稱 *"
          value={certification.name}
          onChange={e => onFieldChange('name', e.target.value)}
        />
        <Input
          placeholder="認證編號 *"
          value={certification.number}
          onChange={e => onFieldChange('number', e.target.value)}
        />
        <Input
          type="date"
          placeholder="到期日"
          value={certification.expires_at}
          onChange={e => onFieldChange('expires_at', e.target.value)}
        />
        <Input
          placeholder="發證機構"
          value={certification.issuer}
          onChange={e => onFieldChange('issuer', e.target.value)}
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="button" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          新增認證
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Certification List Sub-component
// ============================================================================

interface CertificationListProps {
  certifications: QualityCertification[]
  onRemove?: (index: number) => void
  isEditing: boolean
}

function CertificationList({
  certifications,
  onRemove,
  isEditing,
}: CertificationListProps): React.ReactElement {
  if (certifications.length === 0) {
    return <p className="text-gray-500">尚未新增任何認證</p>
  }

  return (
    <div className="space-y-3">
      {certifications.map((cert, index) => (
        <CertificationItem
          key={index}
          certification={cert}
          index={index}
          onRemove={onRemove}
          isEditing={isEditing}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Certification Item Sub-component
// ============================================================================

interface CertificationItemProps {
  certification: QualityCertification
  index: number
  onRemove?: (index: number) => void
  isEditing: boolean
}

function CertificationItem({
  certification,
  index,
  onRemove,
  isEditing,
}: CertificationItemProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center space-x-3">
        {!isEditing && (
          <div className="rounded-lg bg-yellow-100 p-2">
            <Star className="h-4 w-4 text-yellow-600" />
          </div>
        )}
        <div>
          <div className="font-medium">{certification.name}</div>
          <div className="text-sm text-gray-600">編號: {certification.number}</div>
          {certification.expires_at && (
            <div className="text-sm text-gray-600">到期: {certification.expires_at}</div>
          )}
          {certification.issuer && !isEditing && (
            <div className="text-sm text-gray-600">發證機構: {certification.issuer}</div>
          )}
        </div>
      </div>
      {isEditing && onRemove ? (
        <Button type="button" variant="outline" size="sm" onClick={() => onRemove(index)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : (
        <Badge variant="success">有效</Badge>
      )}
    </div>
  )
}
