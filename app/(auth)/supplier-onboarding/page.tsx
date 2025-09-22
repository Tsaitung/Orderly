'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Building2, User, Phone, MapPin, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { http } from '@/lib/api/http';
import type { 
  InvitationDetailResponse, 
  SupplierOnboardingRequest, 
  BusinessType,
  OnboardingStep,
  AccountSetupFormData,
  CompanyInfoFormData,
  ContactDetailsFormData
} from '@orderly/types';

const ONBOARDING_STEPS = [
  { id: 'account', title: '帳戶設定', icon: User, description: '建立您的登入帳戶' },
  { id: 'company', title: '公司資訊', icon: Building2, description: '設定公司基本資料' },
  { id: 'contact', title: '聯絡資訊', icon: Phone, description: '完善聯絡方式' },
  { id: 'verification', title: '身份驗證', icon: ShieldCheck, description: '驗證營業資格' },
  { id: 'completion', title: '完成註冊', icon: Check, description: '歡迎加入井然平台' }
] as const;

type StepId = typeof ONBOARDING_STEPS[number]['id'];

interface OnboardingFormData {
  // Account Setup
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  
  // Company Info
  organizationName: string;
  businessType: BusinessType;
  taxId: string;
  personalId: string;
  businessLicenseNumber: string;
  
  // Contact Details
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
}

export default function SupplierOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationCode = searchParams.get('code');

  const [currentStep, setCurrentStep] = useState<StepId>('account');
  const [invitation, setInvitation] = useState<InvitationDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<OnboardingFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    organizationName: '',
    businessType: 'company' as BusinessType,
    taxId: '',
    personalId: '',
    businessLicenseNumber: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    address: ''
  });

  // Load invitation details on mount
  useEffect(() => {
    if (!invitationCode) {
      router.push('/auth/supplier-invite');
      return;
    }

    loadInvitationDetails();
  }, [invitationCode, router]);

  const loadInvitationDetails = async () => {
    if (!invitationCode) return;

    try {
      const data = await http.get<any>(`/api/invitations/verify/${invitationCode}`);
      if (data && (data.canBeAccepted ?? true)) {
        setInvitation(data);
        // Pre-fill form with invitation data
        setFormData(prev => ({
          ...prev,
          email: data.inviteeEmail,
          organizationName: data.inviteeCompanyName,
          contactPerson: data.inviteeContactPerson || '',
          contactEmail: data.inviteeEmail
        }));
      } else {
        setError('邀請無效或已過期');
        setTimeout(() => router.push('/auth/supplier-invite'), 3000);
      }
    } catch (err) {
      setError('無法載入邀請資訊');
    }
  };

  const updateFormData = (field: keyof OnboardingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};

    switch (currentStep) {
      case 'account':
        if (!formData.email) errors.email = '請輸入電子信箱';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = '請輸入有效的電子信箱';
        
        if (!formData.password) errors.password = '請輸入密碼';
        else if (formData.password.length < 12) errors.password = '密碼至少需要12個字符';
        
        if (!formData.confirmPassword) errors.confirmPassword = '請確認密碼';
        else if (formData.password !== formData.confirmPassword) errors.confirmPassword = '密碼確認不符';
        
        if (!formData.firstName) errors.firstName = '請輸入名字';
        if (!formData.lastName) errors.lastName = '請輸入姓氏';
        break;

      case 'company':
        if (!formData.organizationName) errors.organizationName = '請輸入公司名稱';
        
        if (formData.businessType === 'company') {
          if (!formData.taxId) errors.taxId = '公司類型必須提供統一編號';
          else if (!/^\d{8}$/.test(formData.taxId)) errors.taxId = '統一編號必須為8位數字';
        }
        
        if (formData.businessType === 'individual') {
          if (!formData.personalId) errors.personalId = '個人商號必須提供身分證字號';
          else if (!/^[A-Z]\d{9}$/.test(formData.personalId)) errors.personalId = '身分證字號格式不正確';
        }
        break;

      case 'contact':
        if (!formData.contactPerson) errors.contactPerson = '請輸入聯絡人姓名';
        if (!formData.contactPhone) errors.contactPhone = '請輸入聯絡電話';
        if (!formData.contactEmail) errors.contactEmail = '請輸入聯絡信箱';
        else if (!/\S+@\S+\.\S+/.test(formData.contactEmail)) errors.contactEmail = '請輸入有效的電子信箱';
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    const currentIndex = ONBOARDING_STEPS.findIndex(step => step.id === currentStep);
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(ONBOARDING_STEPS[currentIndex + 1].id as StepId);
    }
  };

  const handleBack = () => {
    const currentIndex = ONBOARDING_STEPS.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(ONBOARDING_STEPS[currentIndex - 1].id as StepId);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep() || !invitationCode) return;

    setLoading(true);
    setError('');

    try {
      const request: SupplierOnboardingRequest = {
        invitationCode,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        organizationName: formData.organizationName,
        businessType: formData.businessType,
        taxId: formData.businessType === 'company' ? formData.taxId : undefined,
        personalId: formData.businessType === 'individual' ? formData.personalId : undefined,
        businessLicenseNumber: formData.businessLicenseNumber || undefined,
        contactPerson: formData.contactPerson,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        address: formData.address || undefined
      };

      const data = await http.post<any>(`/api/invitations/accept`, request);
      if (data?.accessToken && data?.refreshToken) {
        // Store tokens
        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);
        
        setCurrentStep('completion');
        
        // Redirect to supplier dashboard after delay
        setTimeout(() => {
          router.push('/dashboard/supplier');
        }, 3000);
      } else {
        setError(data.detail || '註冊失敗，請重試');
      }
    } catch (err) {
      setError('網路錯誤，請重試');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {ONBOARDING_STEPS.map((step, index) => {
        const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === currentStep);
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        
        return (
          <div key={step.id} className="flex items-center">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
              isCompleted 
                ? "bg-green-500 text-white" 
                : isCurrent
                  ? "bg-primary-500 text-white"
                  : "bg-gray-200 text-gray-500"
            )}>
              {isCompleted ? (
                <Check className="w-5 h-5" />
              ) : (
                <step.icon className="w-5 h-5" />
              )}
            </div>
            
            {index < ONBOARDING_STEPS.length - 1 && (
              <div className={cn(
                "w-12 h-0.5 mx-2 transition-colors",
                isCompleted ? "bg-green-500" : "bg-gray-200"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderAccountSetup = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">建立您的帳戶</h2>
        <p className="text-gray-600">這將作為您登入井然平台的憑證</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lastName">姓氏</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => updateFormData('lastName', e.target.value)}
            placeholder="王"
            className={validationErrors.lastName ? 'border-red-500' : ''}
          />
          {validationErrors.lastName && <p className="text-sm text-red-500 mt-1">{validationErrors.lastName}</p>}
        </div>
        
        <div>
          <Label htmlFor="firstName">名字</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => updateFormData('firstName', e.target.value)}
            placeholder="小明"
            className={validationErrors.firstName ? 'border-red-500' : ''}
          />
          {validationErrors.firstName && <p className="text-sm text-red-500 mt-1">{validationErrors.firstName}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="email">電子信箱</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => updateFormData('email', e.target.value)}
          placeholder="your.email@company.com"
          className={validationErrors.email ? 'border-red-500' : ''}
          disabled={!!invitation?.inviteeEmail}
        />
        {validationErrors.email && <p className="text-sm text-red-500 mt-1">{validationErrors.email}</p>}
      </div>

      <div>
        <Label htmlFor="password">密碼</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => updateFormData('password', e.target.value)}
          placeholder="至少12個字符"
          className={validationErrors.password ? 'border-red-500' : ''}
        />
        {validationErrors.password && <p className="text-sm text-red-500 mt-1">{validationErrors.password}</p>}
      </div>

      <div>
        <Label htmlFor="confirmPassword">確認密碼</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => updateFormData('confirmPassword', e.target.value)}
          placeholder="再次輸入密碼"
          className={validationErrors.confirmPassword ? 'border-red-500' : ''}
        />
        {validationErrors.confirmPassword && <p className="text-sm text-red-500 mt-1">{validationErrors.confirmPassword}</p>}
      </div>

      <div>
        <Label htmlFor="phone">手機號碼（選填）</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => updateFormData('phone', e.target.value)}
          placeholder="+886 912 345 678"
        />
      </div>
    </div>
  );

  const renderCompanyInfo = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">公司資訊</h2>
        <p className="text-gray-600">設定您的營業主體資料</p>
      </div>

      <div>
        <Label htmlFor="organizationName">公司/商號名稱</Label>
        <Input
          id="organizationName"
          value={formData.organizationName}
          onChange={(e) => updateFormData('organizationName', e.target.value)}
          placeholder="您的公司或商號名稱"
          className={validationErrors.organizationName ? 'border-red-500' : ''}
          disabled={!!invitation?.inviteeCompanyName}
        />
        {validationErrors.organizationName && <p className="text-sm text-red-500 mt-1">{validationErrors.organizationName}</p>}
      </div>

      <div>
        <Label htmlFor="businessType">營業類型</Label>
        <Select 
          value={formData.businessType} 
          onValueChange={(value: BusinessType) => updateFormData('businessType', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="選擇營業類型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="company">公司（有統編）</SelectItem>
            <SelectItem value="individual">個人商號（身分證字號）</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.businessType === 'company' && (
        <div>
          <Label htmlFor="taxId">統一編號</Label>
          <Input
            id="taxId"
            value={formData.taxId}
            onChange={(e) => updateFormData('taxId', e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="12345678"
            className={validationErrors.taxId ? 'border-red-500' : ''}
            maxLength={8}
          />
          {validationErrors.taxId && <p className="text-sm text-red-500 mt-1">{validationErrors.taxId}</p>}
          <p className="text-xs text-gray-500 mt-1">8位數字的公司統一編號</p>
        </div>
      )}

      {formData.businessType === 'individual' && (
        <div>
          <Label htmlFor="personalId">身分證字號</Label>
          <Input
            id="personalId"
            value={formData.personalId}
            onChange={(e) => updateFormData('personalId', e.target.value.toUpperCase().slice(0, 10))}
            placeholder="A123456789"
            className={validationErrors.personalId ? 'border-red-500' : ''}
            maxLength={10}
          />
          {validationErrors.personalId && <p className="text-sm text-red-500 mt-1">{validationErrors.personalId}</p>}
          <p className="text-xs text-gray-500 mt-1">1位英文字母 + 9位數字</p>
        </div>
      )}

      <div>
        <Label htmlFor="businessLicenseNumber">營業執照號碼（選填）</Label>
        <Input
          id="businessLicenseNumber"
          value={formData.businessLicenseNumber}
          onChange={(e) => updateFormData('businessLicenseNumber', e.target.value)}
          placeholder="營業執照或許可證號碼"
        />
      </div>
    </div>
  );

  const renderContactDetails = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">聯絡資訊</h2>
        <p className="text-gray-600">讓我們知道如何聯繫您</p>
      </div>

      <div>
        <Label htmlFor="contactPerson">主要聯絡人</Label>
        <Input
          id="contactPerson"
          value={formData.contactPerson}
          onChange={(e) => updateFormData('contactPerson', e.target.value)}
          placeholder="負責業務聯繫的同事姓名"
          className={validationErrors.contactPerson ? 'border-red-500' : ''}
        />
        {validationErrors.contactPerson && <p className="text-sm text-red-500 mt-1">{validationErrors.contactPerson}</p>}
      </div>

      <div>
        <Label htmlFor="contactPhone">聯絡電話</Label>
        <Input
          id="contactPhone"
          value={formData.contactPhone}
          onChange={(e) => updateFormData('contactPhone', e.target.value)}
          placeholder="02-1234-5678 或 0912-345-678"
          className={validationErrors.contactPhone ? 'border-red-500' : ''}
        />
        {validationErrors.contactPhone && <p className="text-sm text-red-500 mt-1">{validationErrors.contactPhone}</p>}
      </div>

      <div>
        <Label htmlFor="contactEmail">聯絡信箱</Label>
        <Input
          id="contactEmail"
          type="email"
          value={formData.contactEmail}
          onChange={(e) => updateFormData('contactEmail', e.target.value)}
          placeholder="business@company.com"
          className={validationErrors.contactEmail ? 'border-red-500' : ''}
        />
        {validationErrors.contactEmail && <p className="text-sm text-red-500 mt-1">{validationErrors.contactEmail}</p>}
      </div>

      <div>
        <Label htmlFor="address">營業地址（選填）</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => updateFormData('address', e.target.value)}
          placeholder="完整的營業地址"
          rows={3}
        />
      </div>
    </div>
  );

  const renderVerification = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">確認資訊</h2>
        <p className="text-gray-600">請檢查您輸入的資訊是否正確</p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div>
          <h3 className="font-medium text-gray-900">帳戶資訊</h3>
          <p className="text-sm text-gray-600">
            {formData.lastName} {formData.firstName} ({formData.email})
          </p>
        </div>

        <div>
          <h3 className="font-medium text-gray-900">公司資訊</h3>
          <p className="text-sm text-gray-600">{formData.organizationName}</p>
          <p className="text-sm text-gray-600">
            {formData.businessType === 'company' ? `統編: ${formData.taxId}` : `身分證: ${formData.personalId}`}
          </p>
        </div>

        <div>
          <h3 className="font-medium text-gray-900">聯絡資訊</h3>
          <p className="text-sm text-gray-600">{formData.contactPerson}</p>
          <p className="text-sm text-gray-600">{formData.contactPhone}</p>
          <p className="text-sm text-gray-600">{formData.contactEmail}</p>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">下一步</h4>
        <p className="text-sm text-blue-700">
          提交註冊後，您將可以開始設定產品目錄、定價策略，並開始接收來自 {invitation?.inviterOrganizationName} 的訂單。
        </p>
      </div>
    </div>
  );

  const renderCompletion = () => (
    <div className="text-center space-y-6">
      <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
        <Check className="h-8 w-8 text-green-500" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900">註冊成功！</h2>
        <p className="text-gray-600">歡迎加入井然平台供應商行列</p>
      </div>

      <div className="bg-green-50 p-4 rounded-lg">
        <p className="text-sm text-green-700">
          您的帳戶已經建立完成，系統正在為您準備供應商儀表板...
        </p>
      </div>

      <div className="text-xs text-gray-500">
        頁面將在 3 秒後自動跳轉到您的供應商後台
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'account':
        return renderAccountSetup();
      case 'company':
        return renderCompanyInfo();
      case 'contact':
        return renderContactDetails();
      case 'verification':
        return renderVerification();
      case 'completion':
        return renderCompletion();
      default:
        return null;
    }
  };

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">載入邀請資訊中...</p>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  const currentStepIndex = ONBOARDING_STEPS.findIndex(step => step.id === currentStep);
  const currentStepInfo = ONBOARDING_STEPS[currentStepIndex];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">供應商註冊</h1>
          <p className="text-gray-600">加入井然平台，開始您的數位化供應鏈旅程</p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Current Step Content */}
        <div className="bg-white p-8 rounded-lg shadow-sm border">
          <div className="flex items-center mb-6">
            <currentStepInfo.icon className="w-6 h-6 text-primary-600 mr-3" />
            <div>
              <h2 className="font-semibold text-gray-900">{currentStepInfo.title}</h2>
              <p className="text-sm text-gray-600">{currentStepInfo.description}</p>
            </div>
          </div>

          {renderCurrentStep()}

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Navigation */}
          {currentStep !== 'completion' && (
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>上一步</span>
              </Button>

              {currentStep === 'verification' ? (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center space-x-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>完成註冊</span>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center space-x-2"
                >
                  <span>下一步</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
