import * as React from 'react'
import { cn } from '@/lib/utils'
import { useFormAccessibility, useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import { Input } from './input'
import { Button } from './button'

interface FormFieldProps {
  label: string
  name: string
  type?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  helperText?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  error?: string
  className?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

/**
 * 符合 WCAG 2.1 AA 標準的表單欄位組件
 */
export function AccessibleFormField({
  label,
  name,
  type = 'text',
  required = false,
  disabled = false,
  placeholder,
  helperText,
  value,
  onChange,
  onBlur,
  error,
  className,
  leftIcon,
  rightIcon
}: FormFieldProps) {
  const fieldId = React.useId()
  const errorId = `${fieldId}-error`
  const helperTextId = `${fieldId}-helper`
  const descriptionId = `${fieldId}-description`

  const describedBy = React.useMemo(() => {
    const ids: string[] = []
    if (error) ids.push(errorId)
    if (helperText) ids.push(helperTextId)
    return ids.length > 0 ? ids.join(' ') : undefined
  }, [error, helperText, errorId, helperTextId])

  return (
    <div className={cn('space-y-2', className)}>
      {/* 標籤 */}
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span 
            className="text-red-500 ml-1" 
            aria-label="必填欄位"
          >
            *
          </span>
        )}
      </label>

      {/* 輸入欄位 */}
      <Input
        id={fieldId}
        name={name}
        type={type}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : 'false'}
        variant={error ? 'error' : 'default'}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
        className={error ? 'border-red-500 focus:ring-red-500' : ''}
      />

      {/* 幫助文字 */}
      {helperText && !error && (
        <p
          id={helperTextId}
          className="text-sm text-gray-600"
        >
          {helperText}
        </p>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <p
          id={errorId}
          className="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * 選擇框組件
 */
interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface AccessibleSelectProps {
  label: string
  name: string
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  required?: boolean
  disabled?: boolean
  placeholder?: string
  helperText?: string
  error?: string
  className?: string
}

export function AccessibleSelect({
  label,
  name,
  options,
  value,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  placeholder,
  helperText,
  error,
  className
}: AccessibleSelectProps) {
  const fieldId = React.useId()
  const errorId = `${fieldId}-error`
  const helperTextId = `${fieldId}-helper`

  const describedBy = React.useMemo(() => {
    const ids: string[] = []
    if (error) ids.push(errorId)
    if (helperText) ids.push(helperTextId)
    return ids.length > 0 ? ids.join(' ') : undefined
  }, [error, helperText, errorId, helperTextId])

  return (
    <div className={cn('space-y-2', className)}>
      {/* 標籤 */}
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span 
            className="text-red-500 ml-1" 
            aria-label="必填欄位"
          >
            *
          </span>
        )}
      </label>

      {/* 選擇框 */}
      <select
        id={fieldId}
        name={name}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : 'false'}
        className={cn(
          'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-[primary-500] focus:border-[primary-500]',
          'disabled:bg-gray-100 disabled:cursor-not-allowed',
          error && 'border-red-500 focus:ring-red-500 focus:border-red-500'
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {/* 幫助文字 */}
      {helperText && !error && (
        <p
          id={helperTextId}
          className="text-sm text-gray-600"
        >
          {helperText}
        </p>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <p
          id={errorId}
          className="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * 文字區域組件
 */
interface AccessibleTextareaProps {
  label: string
  name: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  required?: boolean
  disabled?: boolean
  placeholder?: string
  helperText?: string
  error?: string
  rows?: number
  maxLength?: number
  className?: string
}

export function AccessibleTextarea({
  label,
  name,
  value,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  placeholder,
  helperText,
  error,
  rows = 3,
  maxLength,
  className
}: AccessibleTextareaProps) {
  const fieldId = React.useId()
  const errorId = `${fieldId}-error`
  const helperTextId = `${fieldId}-helper`
  const countId = `${fieldId}-count`

  const currentLength = value?.length || 0
  const showCounter = maxLength && maxLength > 0

  const describedBy = React.useMemo(() => {
    const ids: string[] = []
    if (error) ids.push(errorId)
    if (helperText) ids.push(helperTextId)
    if (showCounter) ids.push(countId)
    return ids.length > 0 ? ids.join(' ') : undefined
  }, [error, helperText, showCounter, errorId, helperTextId, countId])

  return (
    <div className={cn('space-y-2', className)}>
      {/* 標籤 */}
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span 
            className="text-red-500 ml-1" 
            aria-label="必填欄位"
          >
            *
          </span>
        )}
      </label>

      {/* 文字區域 */}
      <textarea
        id={fieldId}
        name={name}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : 'false'}
        className={cn(
          'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-[primary-500] focus:border-[primary-500]',
          'disabled:bg-gray-100 disabled:cursor-not-allowed',
          'resize-vertical',
          error && 'border-red-500 focus:ring-red-500 focus:border-red-500'
        )}
      />

      {/* 字數統計 */}
      {showCounter && (
        <div
          id={countId}
          className="text-xs text-gray-500 text-right"
          aria-live="polite"
        >
          {currentLength} / {maxLength} 字
        </div>
      )}

      {/* 幫助文字 */}
      {helperText && !error && (
        <p
          id={helperTextId}
          className="text-sm text-gray-600"
        >
          {helperText}
        </p>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <p
          id={errorId}
          className="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * 複選框組件
 */
interface AccessibleCheckboxProps {
  label: string
  name: string
  checked?: boolean
  onChange?: (checked: boolean) => void
  required?: boolean
  disabled?: boolean
  helperText?: string
  error?: string
  className?: string
}

export function AccessibleCheckbox({
  label,
  name,
  checked = false,
  onChange,
  required = false,
  disabled = false,
  helperText,
  error,
  className
}: AccessibleCheckboxProps) {
  const fieldId = React.useId()
  const errorId = `${fieldId}-error`
  const helperTextId = `${fieldId}-helper`

  const describedBy = React.useMemo(() => {
    const ids: string[] = []
    if (error) ids.push(errorId)
    if (helperText) ids.push(helperTextId)
    return ids.length > 0 ? ids.join(' ') : undefined
  }, [error, helperText, errorId, helperTextId])

  return (
    <div className={cn('space-y-2', className)}>
      {/* 複選框 */}
      <div className="flex items-start space-x-3">
        <input
          id={fieldId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          required={required}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : 'false'}
          className={cn(
            'mt-0.5 h-4 w-4 text-[primary-500] border-gray-300 rounded',
            'focus:ring-2 focus:ring-[primary-500] focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-500'
          )}
        />
        <label
          htmlFor={fieldId}
          className="text-sm text-gray-700 cursor-pointer"
        >
          {label}
          {required && (
            <span 
              className="text-red-500 ml-1" 
              aria-label="必填欄位"
            >
              *
            </span>
          )}
        </label>
      </div>

      {/* 幫助文字 */}
      {helperText && !error && (
        <p
          id={helperTextId}
          className="text-sm text-gray-600 ml-7"
        >
          {helperText}
        </p>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <p
          id={errorId}
          className="text-sm text-red-600 ml-7"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * 單選按鈕組件
 */
interface RadioOption {
  value: string
  label: string
  disabled?: boolean
}

interface AccessibleRadioGroupProps {
  label: string
  name: string
  options: RadioOption[]
  value?: string
  onChange?: (value: string) => void
  required?: boolean
  disabled?: boolean
  helperText?: string
  error?: string
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function AccessibleRadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  required = false,
  disabled = false,
  helperText,
  error,
  orientation = 'vertical',
  className
}: AccessibleRadioGroupProps) {
  const groupId = React.useId()
  const errorId = `${groupId}-error`
  const helperTextId = `${groupId}-helper`

  const describedBy = React.useMemo(() => {
    const ids: string[] = []
    if (error) ids.push(errorId)
    if (helperText) ids.push(helperTextId)
    return ids.length > 0 ? ids.join(' ') : undefined
  }, [error, helperText, errorId, helperTextId])

  return (
    <fieldset className={cn('space-y-2', className)}>
      {/* 群組標籤 */}
      <legend className="block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span 
            className="text-red-500 ml-1" 
            aria-label="必填欄位"
          >
            *
          </span>
        )}
      </legend>

      {/* 單選按鈕群組 */}
      <div
        role="radiogroup"
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : 'false'}
        className={cn(
          'space-y-2',
          orientation === 'horizontal' && 'flex space-x-4 space-y-0'
        )}
      >
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`
          return (
            <div key={option.value} className="flex items-center space-x-2">
              <input
                id={optionId}
                name={name}
                type="radio"
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange?.(e.target.value)}
                required={required}
                disabled={disabled || option.disabled}
                className={cn(
                  'h-4 w-4 text-[primary-500] border-gray-300',
                  'focus:ring-2 focus:ring-[primary-500] focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  error && 'border-red-500'
                )}
              />
              <label
                htmlFor={optionId}
                className="text-sm text-gray-700 cursor-pointer"
              >
                {option.label}
              </label>
            </div>
          )
        })}
      </div>

      {/* 幫助文字 */}
      {helperText && !error && (
        <p
          id={helperTextId}
          className="text-sm text-gray-600"
        >
          {helperText}
        </p>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <p
          id={errorId}
          className="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </fieldset>
  )
}

/**
 * 表單提交按鈕組件
 */
interface FormActionsProps {
  onSubmit?: () => void
  onCancel?: () => void
  submitText?: string
  cancelText?: string
  isSubmitting?: boolean
  submitDisabled?: boolean
  className?: string
}

export function FormActions({
  onSubmit,
  onCancel,
  submitText = '提交',
  cancelText = '取消',
  isSubmitting = false,
  submitDisabled = false,
  className
}: FormActionsProps) {
  return (
    <div className={cn('flex gap-3 justify-end', className)}>
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {cancelText}
        </Button>
      )}
      
      {onSubmit && (
        <Button
          type="submit"
          variant="brand"
          onClick={onSubmit}
          loading={isSubmitting}
          disabled={submitDisabled || isSubmitting}
        >
          {submitText}
        </Button>
      )}
    </div>
  )
}