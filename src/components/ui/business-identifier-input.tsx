/**
 * Business Identifier Input Component
 * Enhanced input field for tax IDs and personal IDs with real-time validation
 */

import React from 'react'
import { CheckCircle, AlertCircle, Loader2, Building, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBusinessIdentifierField } from '@/hooks/use-business-validation'
import type { BusinessType } from '@orderly/types'

interface BusinessIdentifierInputProps {
  businessType: BusinessType | null
  value: string
  onChange: (value: string) => void
  onValidationChange?: (isValid: boolean, result?: any) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  showCompanyInfo?: boolean
  autoFormat?: boolean
}

export function BusinessIdentifierInput({
  businessType,
  value,
  onChange,
  onValidationChange,
  label,
  placeholder,
  required = false,
  disabled = false,
  className,
  showCompanyInfo = true,
  autoFormat = true,
}: BusinessIdentifierInputProps) {
  const field = useBusinessIdentifierField(businessType, value, {
    debounceMs: 800,
    cacheResults: true,
    showSuccessMessage: true,
    autoFormat,
  })

  // Sync with parent component
  React.useEffect(() => {
    if (field.value !== value) {
      onChange(field.value)
    }
  }, [field.value, value, onChange])

  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange(field.validation.isValid || false, field.validation.result)
    }
  }, [field.validation.isValid, field.validation.result, onValidationChange])

  const getInputIcon = () => {
    if (field.showLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    }
    if (field.showSuccess) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    if (field.showError) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    if (businessType === 'company') {
      return <Building className="h-4 w-4 text-gray-400" />
    }
    if (businessType === 'individual') {
      return <User className="h-4 w-4 text-gray-400" />
    }
    return null
  }

  const getInputClassName = () => {
    return cn(
      'pr-10',
      field.status === 'error' && 'border-red-500 focus:border-red-500 focus:ring-red-500',
      field.status === 'success' && 'border-green-500 focus:border-green-500 focus:ring-green-500',
      field.status === 'validating' && 'border-blue-500 focus:border-blue-500 focus:ring-blue-500',
      className
    )
  }

  const getLabel = () => {
    if (label) return label
    if (businessType === 'company') return '統一編號'
    if (businessType === 'individual') return '身分證字號'
    return '企業識別碼'
  }

  const getPlaceholder = () => {
    if (placeholder) return placeholder
    if (businessType === 'company') return '請輸入8位統一編號'
    if (businessType === 'individual') return '請輸入身分證字號 (如: A123456789)'
    return '請先選擇營業類型'
  }

  const formatDisplayValue = (value: string) => {
    if (businessType === 'company' && value.length === 8) {
      return `${value.slice(0, 4)}-${value.slice(4)}`
    }
    return value
  }

  return (
    <div className="space-y-2">
      <Label
        htmlFor={`business-identifier-${businessType}`}
        className="flex items-center space-x-2"
      >
        <span>{getLabel()}</span>
        {required && <span className="text-red-500">*</span>}
      </Label>

      <div className="relative">
        <Input
          id={`business-identifier-${businessType}`}
          type="text"
          value={autoFormat ? formatDisplayValue(field.value) : field.value}
          onChange={e => field.setValue(e.target.value)}
          onBlur={field.onBlur}
          onFocus={field.onFocus}
          placeholder={getPlaceholder()}
          disabled={disabled || !businessType}
          className={getInputClassName()}
          maxLength={businessType === 'company' ? 9 : 10} // Account for formatting
        />

        <div className="absolute inset-y-0 right-0 flex items-center pr-3">{getInputIcon()}</div>
      </div>

      {/* Status Message */}
      {field.message && (
        <div
          className={cn(
            'flex items-center space-x-1 text-xs',
            field.status === 'error' && 'text-red-600',
            field.status === 'success' && 'text-green-600',
            field.status === 'validating' && 'text-blue-600'
          )}
        >
          {field.status === 'validating' && <Loader2 className="h-3 w-3 animate-spin" />}
          {field.status === 'success' && <CheckCircle className="h-3 w-3" />}
          {field.status === 'error' && <AlertCircle className="h-3 w-3" />}
          <span>{field.message}</span>
        </div>
      )}

      {/* Company Information Display */}
      {showCompanyInfo &&
        field.validation.result &&
        field.validation.isValid &&
        businessType === 'company' &&
        'companyName' in field.validation.result && (
          <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">公司資訊</span>
            </div>

            <div className="space-y-1 text-sm text-green-700">
              <div>
                <span className="font-medium">公司名稱：</span>
                {field.validation.result.companyName}
              </div>

              {field.validation.result.businessAddress && (
                <div>
                  <span className="font-medium">營業地址：</span>
                  {field.validation.result.businessAddress}
                </div>
              )}

              {field.validation.result.registrationDate && (
                <div>
                  <span className="font-medium">設立日期：</span>
                  {new Date(field.validation.result.registrationDate).toLocaleDateString('zh-TW')}
                </div>
              )}

              <div>
                <span className="font-medium">營業狀態：</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-1 text-xs',
                    field.validation.result.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  )}
                >
                  {field.validation.result.status === 'active' ? '營業中' : '其他狀態'}
                </span>
              </div>
            </div>
          </div>
        )}

      {/* Retry Button for API Errors */}
      {field.status === 'error' && field.validation.error?.includes('API') && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={field.validation.retryValidation}
          className="w-full"
        >
          重新驗證
        </Button>
      )}

      {/* Help Text */}
      {businessType && !field.touched && (
        <div className="text-xs text-gray-500">
          {businessType === 'company' && <span>統一編號為8位數字，將自動驗證公司資訊</span>}
          {businessType === 'individual' && <span>身分證字號格式：1位英文字母 + 9位數字</span>}
        </div>
      )}
    </div>
  )
}

export default BusinessIdentifierInput
