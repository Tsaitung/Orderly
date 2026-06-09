/**
 * Delivery Zones Section
 * Handles adding and removing delivery zones
 */

'use client'

import React from 'react'
import { MapPin, Save, X, Edit, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { BaseSectionProps } from './types'

interface DeliveryZonesSectionProps extends BaseSectionProps {
  newDeliveryZone: string
  setNewDeliveryZone: (zone: string) => void
  addDeliveryZone: () => void
  removeDeliveryZone: (zone: string) => void
}

export function DeliveryZonesSection({
  profile,
  isEditing,
  onToggleEdit,
  form,
  isUpdating,
  onSubmit,
  onCancel,
  newDeliveryZone,
  setNewDeliveryZone,
  addDeliveryZone,
  removeDeliveryZone,
}: DeliveryZonesSectionProps): React.ReactElement {
  const { watch, handleSubmit } = form
  const deliveryZones = watch('delivery_zones') || []

  function handleKeyPress(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      addDeliveryZone()
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>配送區域</span>
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
            <div className="flex space-x-2">
              <Input
                placeholder="新增配送區域"
                value={newDeliveryZone}
                onChange={e => setNewDeliveryZone(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button type="button" onClick={addDeliveryZone}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {deliveryZones.map((zone, index) => (
                <Badge key={index} variant="outline" className="flex items-center space-x-1">
                  <span>{zone}</span>
                  <button
                    type="button"
                    onClick={() => removeDeliveryZone(zone)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
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
          <div className="flex flex-wrap gap-2">
            {profile.delivery_zones && profile.delivery_zones.length > 0 ? (
              profile.delivery_zones.map((zone, index) => (
                <Badge key={index} variant="outline">
                  {zone}
                </Badge>
              ))
            ) : (
              <p className="text-gray-500">尚未設定配送區域</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
