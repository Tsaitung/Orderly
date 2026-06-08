/**
 * Basic Information Section
 * Handles delivery capacity, minimum order, payment terms, and public description
 */

'use client'

import React from 'react'
import { Controller } from 'react-hook-form'
import { User, Save, X, Edit } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { DELIVERY_CAPACITY_LABELS } from '@/lib/api/supplier-types'
import type { BaseSectionProps } from './types'

export function BasicInfoSection({
  profile,
  isEditing,
  onToggleEdit,
  form,
  isUpdating,
  onSubmit,
  onCancel,
}: BaseSectionProps): React.ReactElement {
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = form

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>基本資訊</span>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="delivery_capacity">配送能力</Label>
                <Controller
                  name="delivery_capacity"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      {Object.entries(DELIVERY_CAPACITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  )}
                />
                {errors.delivery_capacity && (
                  <p className="text-sm text-red-600">{errors.delivery_capacity.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_capacity_kg_per_day">每日配送容量 (公斤)</Label>
                <Controller
                  name="delivery_capacity_kg_per_day"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  )}
                />
                {errors.delivery_capacity_kg_per_day && (
                  <p className="text-sm text-red-600">
                    {errors.delivery_capacity_kg_per_day.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimum_order_amount">最低訂單金額 (NT$)</Label>
                <Controller
                  name="minimum_order_amount"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  )}
                />
                {errors.minimum_order_amount && (
                  <p className="text-sm text-red-600">{errors.minimum_order_amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_terms_days">付款期限 (天)</Label>
                <Controller
                  name="payment_terms_days"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || 30)}
                    />
                  )}
                />
                {errors.payment_terms_days && (
                  <p className="text-sm text-red-600">{errors.payment_terms_days.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="public_description">公開描述</Label>
              <Controller
                name="public_description"
                control={control}
                render={({ field }) => (
                  <Textarea placeholder="描述您的業務特色、產品優勢等..." rows={3} {...field} />
                )}
              />
              {errors.public_description && (
                <p className="text-sm text-red-600">{errors.public_description.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
              <Button type="submit" disabled={isUpdating || !isDirty}>
                {isUpdating ? '儲存中...' : '儲存變更'}
                <Save className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-500">配送能力</Label>
                <p className="text-gray-900">
                  {DELIVERY_CAPACITY_LABELS[profile.delivery_capacity]}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">每日配送容量</Label>
                <p className="text-gray-900">{profile.delivery_capacity_kg_per_day} 公斤</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">最低訂單金額</Label>
                <p className="text-gray-900">
                  NT$ {profile.minimum_order_amount?.toLocaleString() || 0}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-500">付款期限</Label>
                <p className="text-gray-900">{profile.payment_terms_days} 天</p>
              </div>
              {profile.public_description && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">公開描述</Label>
                  <p className="text-gray-900">{profile.public_description}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
