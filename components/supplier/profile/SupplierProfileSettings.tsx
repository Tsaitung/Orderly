/**
 * Supplier Profile Settings Component
 * Provides complete CRUD functionality for supplier profile management
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Building2,
  MapPin,
  Clock,
  Phone,
  Mail,
  Save,
  X,
  Edit,
  Plus,
  Trash2,
  Star,
  Shield,
  Truck,
  AlertCircle,
  CheckCircle,
  FileText
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useSupplierProfile } from '@/lib/api/supplier-hooks';
import { 
  SupplierProfile, 
  SupplierProfileUpdateRequest, 
  DeliveryCapacity,
  DELIVERY_CAPACITY_LABELS,
  SUPPLIER_STATUS_LABELS 
} from '@/lib/api/supplier-types';
import { SupplierProfileSkeleton, SupplierFormSkeleton } from '../shared/SupplierLoadingStates';
import { SupplierPageErrorBoundary } from '../shared/SupplierErrorBoundary';
import { toast } from 'react-hot-toast';

// ============================================================================
// Validation Schemas
// ============================================================================

const operatingHoursSchema = z.object({
  monday: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '請輸入有效時間格式 (HH:MM)').optional(),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '請輸入有效時間格式 (HH:MM)').optional(),
    is_closed: z.boolean().default(false)
  }).optional(),
  tuesday: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '請輸入有效時間格式 (HH:MM)').optional(),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '請輸入有效時間格式 (HH:MM)').optional(),
    is_closed: z.boolean().default(false)
  }).optional(),
  wednesday: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '請輸入有效時間格式 (HH:MM)').optional(),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '請輸入有效時間格式 (HH:MM)').optional(),
    is_closed: z.boolean().default(false)
  }).optional(),
  thursday: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '請輸入有效時間格式 (HH:MM)').optional(),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '請輸入有效時間格式 (HH:MM)').optional(),
    is_closed: z.boolean().default(false)
  }).optional(),
  friday: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '請輸入有效時間格式 (HH:MM)').optional(),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '請輸入有效時間格式 (HH:MM)').optional(),
    is_closed: z.boolean().default(false)
  }).optional(),
  saturday: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '請輸入有效時間格式 (HH:MM)').optional(),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '請輸入有效時間格式 (HH:MM)').optional(),
    is_closed: z.boolean().default(false)
  }).optional(),
  sunday: z.object({
    open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '請輸入有效時間格式 (HH:MM)').optional(),
    close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '請輸入有效時間格式 (HH:MM)').optional(),
    is_closed: z.boolean().default(false)
  }).optional()
});

const qualityCertificationSchema = z.object({
  name: z.string().min(1, '請輸入認證名稱'),
  number: z.string().min(1, '請輸入認證編號'),
  expires_at: z.string().optional(),
  issuer: z.string().optional(),
  document_url: z.string().url('請輸入有效的URL').optional()
});

const contactPreferencesSchema = z.object({
  email_notifications: z.boolean().default(true),
  sms_notifications: z.boolean().default(false),
  whatsapp_notifications: z.boolean().default(false),
  preferred_contact_time: z.string().optional(),
  emergency_contact: z.string().optional()
});

const profileUpdateSchema = z.object({
  delivery_capacity: z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),
  delivery_capacity_kg_per_day: z.number().min(0, '配送容量必須大於等於0').optional(),
  operating_hours: operatingHoursSchema.optional(),
  delivery_zones: z.array(z.string()).optional(),
  minimum_order_amount: z.number().min(0, '最低訂單金額必須大於等於0').optional(),
  payment_terms_days: z.number().min(1, '付款期限必須大於0天').max(365, '付款期限不能超過365天').optional(),
  quality_certifications: z.array(qualityCertificationSchema).optional(),
  contact_preferences: contactPreferencesSchema.optional(),
  public_description: z.string().max(1000, '描述不能超過1000字元').optional()
});

type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

// ============================================================================
// Component Props
// ============================================================================

interface SupplierProfileSettingsContentProps {
  organizationId: string;
}

// ============================================================================
// Main Component
// ============================================================================

function SupplierProfileSettingsContent({ organizationId }: SupplierProfileSettingsContentProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [newCertification, setNewCertification] = useState({ name: '', number: '', expires_at: '', issuer: '', document_url: '' });
  const [newDeliveryZone, setNewDeliveryZone] = useState('');

  const {
    data: profile,
    loading,
    error,
    updateProfile,
    isUpdating,
    updateError,
    refetch
  } = useSupplierProfile(organizationId);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty }
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema)
  });

  // Initialize form with current profile data
  useEffect(() => {
    if (profile) {
      reset({
        delivery_capacity: profile.delivery_capacity,
        delivery_capacity_kg_per_day: profile.delivery_capacity_kg_per_day,
        operating_hours: profile.operating_hours,
        delivery_zones: profile.delivery_zones,
        minimum_order_amount: profile.minimum_order_amount,
        payment_terms_days: profile.payment_terms_days,
        quality_certifications: profile.quality_certifications,
        contact_preferences: profile.contact_preferences,
        public_description: profile.public_description
      });
    }
  }, [profile, reset]);

  if (loading && !profile) {
    return <SupplierProfileSkeleton />;
  }

  if (error) {
    throw new Error(error);
  }

  if (!profile) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>無法載入供應商資料</p>
          <Button onClick={refetch} className="mt-4">
            重新載入
          </Button>
        </div>
      </Card>
    );
  }

  const onSubmit = async (data: ProfileUpdateFormData) => {
    try {
      await updateProfile(data);
      setEditingSection(null);
      toast.success('設定已更新');
    } catch (error) {
      toast.error(updateError || '更新失敗，請稍後再試');
    }
  };

  const handleCancelEdit = () => {
    reset();
    setEditingSection(null);
  };

  const addCertification = () => {
    if (!newCertification.name || !newCertification.number) {
      toast.error('請填寫認證名稱和編號');
      return;
    }

    const currentCertifications = watch('quality_certifications') || [];
    setValue('quality_certifications', [...currentCertifications, newCertification]);
    setNewCertification({ name: '', number: '', expires_at: '', issuer: '', document_url: '' });
  };

  const removeCertification = (index: number) => {
    const currentCertifications = watch('quality_certifications') || [];
    setValue('quality_certifications', currentCertifications.filter((_, i) => i !== index));
  };

  const addDeliveryZone = () => {
    if (!newDeliveryZone.trim()) {
      toast.error('請輸入配送區域');
      return;
    }

    const currentZones = watch('delivery_zones') || [];
    if (currentZones.includes(newDeliveryZone.trim())) {
      toast.error('此配送區域已存在');
      return;
    }

    setValue('delivery_zones', [...currentZones, newDeliveryZone.trim()]);
    setNewDeliveryZone('');
  };

  const removeDeliveryZone = (zone: string) => {
    const currentZones = watch('delivery_zones') || [];
    setValue('delivery_zones', currentZones.filter(z => z !== zone));
  };

  const getProfileCompleteness = () => {
    let completed = 0;
    const total = 8;

    if (profile.delivery_capacity) completed++;
    if (profile.delivery_capacity_kg_per_day > 0) completed++;
    if (profile.operating_hours && Object.keys(profile.operating_hours).length > 0) completed++;
    if (profile.delivery_zones && profile.delivery_zones.length > 0) completed++;
    if (profile.minimum_order_amount > 0) completed++;
    if (profile.payment_terms_days > 0) completed++;
    if (profile.quality_certifications && profile.quality_certifications.length > 0) completed++;
    if (profile.public_description) completed++;

    return Math.round((completed / total) * 100);
  };

  const completeness = getProfileCompleteness();

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">供應商資料設定</CardTitle>
                <p className="text-gray-600 mt-1">管理您的供應商檔案和服務設定</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={profile.status === 'verified' ? 'success' : 'warning'}>
                {SUPPLIER_STATUS_LABELS[profile.status]}
              </Badge>
              {profile.verified_at && (
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
            <p className="text-xs text-gray-500">
              完善的資料有助於提升客戶信任度和訂單轉換率
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>基本資訊</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSection(editingSection === 'basic' ? null : 'basic')}
            >
              {editingSection === 'basic' ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
              {editingSection === 'basic' ? '取消' : '編輯'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editingSection === 'basic' ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="delivery_capacity">配送能力</Label>
                  <Controller
                    name="delivery_capacity"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        {Object.entries(DELIVERY_CAPACITY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
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
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    )}
                  />
                  {errors.delivery_capacity_kg_per_day && (
                    <p className="text-sm text-red-600">{errors.delivery_capacity_kg_per_day.message}</p>
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
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
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
                    <Textarea
                      placeholder="描述您的業務特色、產品優勢等..."
                      rows={3}
                      {...field}
                    />
                  )}
                />
                {errors.public_description && (
                  <p className="text-sm text-red-600">{errors.public_description.message}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  取消
                </Button>
                <Button type="submit" disabled={isUpdating || !isDirty}>
                  {isUpdating ? '儲存中...' : '儲存變更'}
                  <Save className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-500">配送能力</Label>
                  <p className="text-gray-900">{DELIVERY_CAPACITY_LABELS[profile.delivery_capacity]}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">每日配送容量</Label>
                  <p className="text-gray-900">{profile.delivery_capacity_kg_per_day} 公斤</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">最低訂單金額</Label>
                  <p className="text-gray-900">NT$ {profile.minimum_order_amount?.toLocaleString() || 0}</p>
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

      {/* Delivery Zones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>配送區域</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSection(editingSection === 'delivery' ? null : 'delivery')}
            >
              {editingSection === 'delivery' ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
              {editingSection === 'delivery' ? '取消' : '編輯'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editingSection === 'delivery' ? (
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="新增配送區域"
                  value={newDeliveryZone}
                  onChange={(e) => setNewDeliveryZone(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addDeliveryZone()}
                />
                <Button type="button" onClick={addDeliveryZone}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(watch('delivery_zones') || []).map((zone, index) => (
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
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  取消
                </Button>
                <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isUpdating}>
                  {isUpdating ? '儲存中...' : '儲存變更'}
                  <Save className="h-4 w-4 ml-2" />
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

      {/* Operating Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>營業時間</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSection(editingSection === 'hours' ? null : 'hours')}
            >
              {editingSection === 'hours' ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
              {editingSection === 'hours' ? '取消' : '編輯'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editingSection === 'hours' ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                const dayNames = {
                  monday: '星期一',
                  tuesday: '星期二', 
                  wednesday: '星期三',
                  thursday: '星期四',
                  friday: '星期五',
                  saturday: '星期六',
                  sunday: '星期日'
                };

                return (
                  <div key={day} className="flex items-center space-x-4">
                    <div className="w-20 text-sm font-medium">
                      {dayNames[day as keyof typeof dayNames]}
                    </div>
                    <Controller
                      name={`operating_hours.${day}.is_closed` as any}
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <span className="text-sm text-gray-500">休息</span>
                    <Controller
                      name={`operating_hours.${day}.open` as any}
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="time"
                          {...field}
                          disabled={watch(`operating_hours.${day}.is_closed` as any)}
                          className="w-32"
                        />
                      )}
                    />
                    <span className="text-gray-400">-</span>
                    <Controller
                      name={`operating_hours.${day}.close` as any}
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="time"
                          {...field}
                          disabled={watch(`operating_hours.${day}.is_closed` as any)}
                          className="w-32"
                        />
                      )}
                    />
                  </div>
                );
              })}
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  取消
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? '儲存中...' : '儲存變更'}
                  <Save className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              {profile.operating_hours && Object.keys(profile.operating_hours).length > 0 ? (
                Object.entries(profile.operating_hours).map(([day, hours]) => {
                  const dayNames = {
                    monday: '星期一',
                    tuesday: '星期二',
                    wednesday: '星期三', 
                    thursday: '星期四',
                    friday: '星期五',
                    saturday: '星期六',
                    sunday: '星期日'
                  };

                  return (
                    <div key={day} className="flex items-center justify-between">
                      <span className="font-medium">{dayNames[day as keyof typeof dayNames]}</span>
                      <span className="text-gray-600">
                        {hours.is_closed ? '休息' : `${hours.open} - ${hours.close}`}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500">尚未設定營業時間</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Certifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>品質認證</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSection(editingSection === 'certifications' ? null : 'certifications')}
            >
              {editingSection === 'certifications' ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
              {editingSection === 'certifications' ? '取消' : '編輯'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editingSection === 'certifications' ? (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium mb-3">新增認證</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="認證名稱 *"
                    value={newCertification.name}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="認證編號 *"
                    value={newCertification.number}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, number: e.target.value }))}
                  />
                  <Input
                    type="date"
                    placeholder="到期日"
                    value={newCertification.expires_at}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, expires_at: e.target.value }))}
                  />
                  <Input
                    placeholder="發證機構"
                    value={newCertification.issuer}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, issuer: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end mt-3">
                  <Button type="button" onClick={addCertification}>
                    <Plus className="h-4 w-4 mr-2" />
                    新增認證
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {(watch('quality_certifications') || []).map((cert, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{cert.name}</div>
                      <div className="text-sm text-gray-600">編號: {cert.number}</div>
                      {cert.expires_at && (
                        <div className="text-sm text-gray-600">到期: {cert.expires_at}</div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCertification(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  取消
                </Button>
                <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isUpdating}>
                  {isUpdating ? '儲存中...' : '儲存變更'}
                  <Save className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {profile.quality_certifications && profile.quality_certifications.length > 0 ? (
                profile.quality_certifications.map((cert, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Star className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <div className="font-medium">{cert.name}</div>
                        <div className="text-sm text-gray-600">編號: {cert.number}</div>
                        {cert.expires_at && (
                          <div className="text-sm text-gray-600">到期: {cert.expires_at}</div>
                        )}
                        {cert.issuer && (
                          <div className="text-sm text-gray-600">發證機構: {cert.issuer}</div>
                        )}
                      </div>
                    </div>
                    <Badge variant="success">有效</Badge>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">尚未新增任何認證</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>聯絡偏好</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSection(editingSection === 'contact' ? null : 'contact')}
            >
              {editingSection === 'contact' ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
              {editingSection === 'contact' ? '取消' : '編輯'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editingSection === 'contact' ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email 通知</Label>
                    <p className="text-sm text-gray-600">接收訂單和重要消息</p>
                  </div>
                  <Controller
                    name="contact_preferences.email_notifications"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS 通知</Label>
                    <p className="text-sm text-gray-600">接收緊急通知</p>
                  </div>
                  <Controller
                    name="contact_preferences.sms_notifications"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>WhatsApp 通知</Label>
                    <p className="text-sm text-gray-600">接收即時訊息</p>
                  </div>
                  <Controller
                    name="contact_preferences.whatsapp_notifications"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>偏好聯絡時間</Label>
                  <Controller
                    name="contact_preferences.preferred_contact_time"
                    control={control}
                    render={({ field }) => (
                      <Input
                        placeholder="例如: 09:00-18:00"
                        {...field}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>緊急聯絡人</Label>
                  <Controller
                    name="contact_preferences.emergency_contact"
                    control={control}
                    render={({ field }) => (
                      <Input
                        placeholder="緊急聯絡電話"
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  取消
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? '儲存中...' : '儲存變更'}
                  <Save className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Email 通知</span>
                <Badge variant={profile.contact_preferences?.email_notifications ? 'success' : 'secondary'}>
                  {profile.contact_preferences?.email_notifications ? '開啟' : '關閉'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>SMS 通知</span>
                <Badge variant={profile.contact_preferences?.sms_notifications ? 'success' : 'secondary'}>
                  {profile.contact_preferences?.sms_notifications ? '開啟' : '關閉'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>WhatsApp 通知</span>
                <Badge variant={profile.contact_preferences?.whatsapp_notifications ? 'success' : 'secondary'}>
                  {profile.contact_preferences?.whatsapp_notifications ? '開啟' : '關閉'}
                </Badge>
              </div>
              {profile.contact_preferences?.preferred_contact_time && (
                <div className="flex items-center justify-between">
                  <span>偏好聯絡時間</span>
                  <span className="text-gray-600">{profile.contact_preferences.preferred_contact_time}</span>
                </div>
              )}
              {profile.contact_preferences?.emergency_contact && (
                <div className="flex items-center justify-between">
                  <span>緊急聯絡人</span>
                  <span className="text-gray-600">{profile.contact_preferences.emergency_contact}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for getting organization ID from auth context
function useOrganizationId(): string | null {
  // TODO: Get from auth context when available
  // For now, use hardcoded value for testing
  return "test-org-123";
}

export default function SupplierProfileSettings() {
  const organizationId = useOrganizationId();

  if (!organizationId) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>無法獲取供應商資訊，請重新登入</p>
        </div>
      </Card>
    );
  }

  return (
    <SupplierPageErrorBoundary>
      <SupplierProfileSettingsContent organizationId={organizationId} />
    </SupplierPageErrorBoundary>
  );
}