/**
 * Contact Preferences Section
 * Handles notification settings and contact information
 */

'use client'

import React from 'react'
import { Controller } from 'react-hook-form'
import { Mail, Save, X, Edit } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import type { BaseSectionProps } from './types'

export function ContactPreferencesSection({
  profile,
  isEditing,
  onToggleEdit,
  form,
  isUpdating,
  onSubmit,
  onCancel,
}: BaseSectionProps): React.ReactElement {
  const { control, handleSubmit } = form

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>聯絡偏好</span>
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
            <div className="space-y-4">
              <NotificationToggle
                control={control}
                name="contact_preferences.email_notifications"
                label="Email 通知"
                description="接收訂單和重要消息"
              />

              <NotificationToggle
                control={control}
                name="contact_preferences.sms_notifications"
                label="SMS 通知"
                description="接收緊急通知"
              />

              <NotificationToggle
                control={control}
                name="contact_preferences.whatsapp_notifications"
                label="WhatsApp 通知"
                description="接收即時訊息"
              />

              <div className="space-y-2">
                <Label>偏好聯絡時間</Label>
                <Controller
                  name="contact_preferences.preferred_contact_time"
                  control={control}
                  render={({ field }) => <Input placeholder="例如: 09:00-18:00" {...field} />}
                />
              </div>

              <div className="space-y-2">
                <Label>緊急聯絡人</Label>
                <Controller
                  name="contact_preferences.emergency_contact"
                  control={control}
                  render={({ field }) => <Input placeholder="緊急聯絡電話" {...field} />}
                />
              </div>
            </div>

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
          <ContactPreferencesDisplay preferences={profile.contact_preferences} />
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Notification Toggle Sub-component
// ============================================================================

type NotificationFieldName =
  | 'contact_preferences.email_notifications'
  | 'contact_preferences.sms_notifications'
  | 'contact_preferences.whatsapp_notifications'

interface NotificationToggleProps {
  control: BaseSectionProps['form']['control']
  name: NotificationFieldName
  label: string
  description: string
}

function NotificationToggle({
  control,
  name,
  label,
  description,
}: NotificationToggleProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label>{label}</Label>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
        )}
      />
    </div>
  )
}

// ============================================================================
// Contact Preferences Display Sub-component
// ============================================================================

interface ContactPreferencesDisplayProps {
  preferences?: {
    email_notifications?: boolean
    sms_notifications?: boolean
    whatsapp_notifications?: boolean
    preferred_contact_time?: string
    emergency_contact?: string
  }
}

function ContactPreferencesDisplay({
  preferences,
}: ContactPreferencesDisplayProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <NotificationStatus label="Email 通知" enabled={preferences?.email_notifications} />
      <NotificationStatus label="SMS 通知" enabled={preferences?.sms_notifications} />
      <NotificationStatus label="WhatsApp 通知" enabled={preferences?.whatsapp_notifications} />
      {preferences?.preferred_contact_time && (
        <div className="flex items-center justify-between">
          <span>偏好聯絡時間</span>
          <span className="text-gray-600">{preferences.preferred_contact_time}</span>
        </div>
      )}
      {preferences?.emergency_contact && (
        <div className="flex items-center justify-between">
          <span>緊急聯絡人</span>
          <span className="text-gray-600">{preferences.emergency_contact}</span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Notification Status Sub-component
// ============================================================================

interface NotificationStatusProps {
  label: string
  enabled?: boolean
}

function NotificationStatus({ label, enabled }: NotificationStatusProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <Badge variant={enabled ? 'success' : 'secondary'}>{enabled ? '開啟' : '關閉'}</Badge>
    </div>
  )
}
