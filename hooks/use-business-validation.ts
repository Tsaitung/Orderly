/**
 * React hooks for business identifier validation
 * Provides real-time validation for tax IDs and personal IDs with debouncing and caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  validateTaxIdWithApi, 
  validatePersonalIdFormat, 
  validateTaxIdFormat,
  VALIDATION_MESSAGES 
} from '@/lib/validation/tax-id-validator';
import type { TaxIdValidationResult, PersonalIdValidationResult, BusinessType } from '@orderly/types';

interface ValidationState<T> {
  isValidating: boolean;
  isValid: boolean | null;
  result: T | null;
  error: string | null;
}

interface UseBusinessValidationOptions {
  debounceMs?: number;
  validateOnMount?: boolean;
  cacheResults?: boolean;
}

/**
 * Hook for validating tax IDs with real-time API calls
 */
export function useTaxIdValidation(
  taxId: string,
  options: UseBusinessValidationOptions = {}
) {
  const {
    debounceMs = 800,
    validateOnMount = false,
    cacheResults = true
  } = options;

  const [state, setState] = useState<ValidationState<TaxIdValidationResult>>({
    isValidating: false,
    isValid: null,
    result: null,
    error: null
  });

  const debounceRef = useRef<NodeJS.Timeout>();
  const cacheRef = useRef<Map<string, TaxIdValidationResult>>(new Map());
  const mountedRef = useRef(true);

  const validateTaxId = useCallback(async (id: string) => {
    if (!id || id.length !== 8) {
      setState({
        isValidating: false,
        isValid: false,
        result: null,
        error: id ? VALIDATION_MESSAGES.TAX_ID.INVALID_FORMAT : VALIDATION_MESSAGES.TAX_ID.REQUIRED
      });
      return;
    }

    // Check format first (client-side)
    if (!validateTaxIdFormat(id)) {
      setState({
        isValidating: false,
        isValid: false,
        result: null,
        error: VALIDATION_MESSAGES.TAX_ID.INVALID_CHECKSUM
      });
      return;
    }

    // Check cache
    if (cacheResults && cacheRef.current.has(id)) {
      const cachedResult = cacheRef.current.get(id)!;
      setState({
        isValidating: false,
        isValid: cachedResult.isValid,
        result: cachedResult,
        error: cachedResult.isValid ? null : cachedResult.errorMessage || null
      });
      return;
    }

    // Set validating state
    setState(prev => ({
      ...prev,
      isValidating: true,
      error: null
    }));

    try {
      const result = await validateTaxIdWithApi(id);
      
      if (!mountedRef.current) return;

      // Cache result
      if (cacheResults) {
        cacheRef.current.set(id, result);
      }

      setState({
        isValidating: false,
        isValid: result.isValid,
        result,
        error: result.isValid ? null : result.errorMessage || null
      });
    } catch (error) {
      if (!mountedRef.current) return;
      
      setState({
        isValidating: false,
        isValid: false,
        result: null,
        error: VALIDATION_MESSAGES.TAX_ID.API_ERROR
      });
    }
  }, [cacheResults]);

  const debouncedValidate = useCallback((id: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      validateTaxId(id);
    }, debounceMs);
  }, [validateTaxId, debounceMs]);

  // Effect for tax ID changes
  useEffect(() => {
    if (taxId || validateOnMount) {
      debouncedValidate(taxId);
    } else {
      setState({
        isValidating: false,
        isValid: null,
        result: null,
        error: null
      });
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [taxId, debouncedValidate, validateOnMount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const retryValidation = useCallback(() => {
    validateTaxId(taxId);
  }, [validateTaxId, taxId]);

  return {
    ...state,
    retryValidation,
    companyName: state.result?.companyName,
    businessAddress: state.result?.businessAddress,
    registrationDate: state.result?.registrationDate,
    businessStatus: state.result?.status
  };
}

/**
 * Hook for validating personal IDs (client-side only)
 */
export function usePersonalIdValidation(personalId: string) {
  const [state, setState] = useState<ValidationState<PersonalIdValidationResult>>({
    isValidating: false,
    isValid: null,
    result: null,
    error: null
  });

  useEffect(() => {
    if (!personalId) {
      setState({
        isValidating: false,
        isValid: null,
        result: null,
        error: null
      });
      return;
    }

    const result = validatePersonalIdFormat(personalId);
    setState({
      isValidating: false,
      isValid: result.isValid,
      result,
      error: result.isValid ? null : result.errorMessage || null
    });
  }, [personalId]);

  return state;
}

/**
 * Combined hook for business identifier validation based on business type
 */
export function useBusinessIdentifierValidation(
  businessType: BusinessType | null,
  identifier: string,
  options: UseBusinessValidationOptions = {}
) {
  const taxIdValidation = useTaxIdValidation(
    businessType === 'company' ? identifier : '',
    { ...options, validateOnMount: businessType === 'company' && options.validateOnMount }
  );

  const personalIdValidation = usePersonalIdValidation(
    businessType === 'individual' ? identifier : ''
  );

  if (businessType === 'company') {
    return {
      ...taxIdValidation,
      type: 'company' as const,
      displayValue: taxIdValidation.companyName
    };
  } else if (businessType === 'individual') {
    return {
      ...personalIdValidation,
      type: 'individual' as const,
      retryValidation: () => {}, // No retry needed for client-side validation
      displayValue: null
    };
  }

  return {
    isValidating: false,
    isValid: null,
    result: null,
    error: null,
    type: null,
    retryValidation: () => {},
    displayValue: null
  };
}

/**
 * Hook for form field validation with enhanced UX
 */
export function useBusinessIdentifierField(
  businessType: BusinessType | null,
  initialValue: string = '',
  options: UseBusinessValidationOptions & {
    showSuccessMessage?: boolean;
    autoFormat?: boolean;
  } = {}
) {
  const [value, setValue] = useState(initialValue);
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);

  const validation = useBusinessIdentifierValidation(businessType, value, options);

  const handleChange = useCallback((newValue: string) => {
    let formattedValue = newValue;
    
    if (options.autoFormat) {
      if (businessType === 'company') {
        // Auto-format tax ID (remove non-digits, limit to 8)
        formattedValue = newValue.replace(/\D/g, '').slice(0, 8);
      } else if (businessType === 'individual') {
        // Auto-format personal ID (uppercase, limit to 10)
        formattedValue = newValue.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
      }
    }

    setValue(formattedValue);
  }, [businessType, options.autoFormat]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    setTouched(true);
  }, []);

  const handleFocus = useCallback(() => {
    setFocused(true);
  }, []);

  const showError = touched && !focused && validation.error;
  const showLoading = validation.isValidating && touched;
  const showSuccess = options.showSuccessMessage && 
    touched && 
    !focused && 
    validation.isValid && 
    !validation.isValidating;

  const getFieldStatus = () => {
    if (showLoading) return 'validating';
    if (showError) return 'error';
    if (showSuccess) return 'success';
    return 'default';
  };

  const getFieldMessage = () => {
    if (showError) return validation.error;
    if (showSuccess && validation.displayValue) {
      return `已驗證：${validation.displayValue}`;
    }
    if (showSuccess) return '格式正確';
    return null;
  };

  const reset = useCallback(() => {
    setValue(initialValue);
    setTouched(false);
    setFocused(false);
  }, [initialValue]);

  return {
    value,
    setValue: handleChange,
    onBlur: handleBlur,
    onFocus: handleFocus,
    validation,
    status: getFieldStatus(),
    message: getFieldMessage(),
    showError,
    showLoading,
    showSuccess,
    touched,
    focused,
    reset
  };
}