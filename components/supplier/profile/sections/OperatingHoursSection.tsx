/**
 * Operating Hours Section
 * Handles weekly operating hours configuration
 */

'use client'

import React from 'react'
import { Controller } from 'react-hook-form'
import { Clock, Save, X, Edit } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { DAY_NAMES, WEEKDAYS, type DayKey } from '../schemas/profile-schemas'
import type { BaseSectionProps } from './types'

export function OperatingHoursSection({
  profile,
  isEditing,
  onToggleEdit,
  form,
  isUpdating,
  onSubmit,
  onCancel,
}: BaseSectionProps): React.ReactElement {
  const { control, handleSubmit, watch } = form

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>營業時間</span>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onToggleEdit}>
            {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            {isEditing ? '取消' : '編輯'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {WEEKDAYS.map(day => (
              <DayRow key={day} day={day} control={control} watch={watch} />
            ))}
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? '儲存中...' : '儲存變更'}
                <Save className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            {profile.operating_hours && Object.keys(profile.operating_hours).length > 0 ? (
              Object.entries(profile.operating_hours).map(([day, hours]) => (
                <div key={day} className="flex items-center justify-between">
                  <span className="font-medium">{DAY_NAMES[day as DayKey]}</span>
                  <span className="text-gray-600">
                    {hours.is_closed ? '休息' : `${hours.open} - ${hours.close}`}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">尚未設定營業時間</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Day Row Sub-component
// ============================================================================

interface DayRowProps {
  day: DayKey
  control: BaseSectionProps['form']['control']
  watch: BaseSectionProps['form']['watch']
}

function DayRow({ day, control, watch }: DayRowProps): React.ReactElement {
  const isClosed = watch(`operating_hours.${day}.is_closed`)

  return (
    <div className="flex items-center space-x-4">
      <div className="w-20 text-sm font-medium">{DAY_NAMES[day]}</div>
      <Controller
        name={`operating_hours.${day}.is_closed`}
        control={control}
        render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
      />
      <span className="text-sm text-gray-500">休息</span>
      <Controller
        name={`operating_hours.${day}.open`}
        control={control}
        render={({ field }) => (
          <Input type="time" {...field} disabled={isClosed} className="w-32" />
        )}
      />
      <span className="text-gray-400">-</span>
      <Controller
        name={`operating_hours.${day}.close`}
        control={control}
        render={({ field }) => (
          <Input type="time" {...field} disabled={isClosed} className="w-32" />
        )}
      />
    </div>
  )
}
