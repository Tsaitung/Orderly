import { useEffect, useRef, useCallback, useState } from 'react'
import { 
  KeyboardNavigationManager, 
  ScreenReaderAnnouncer, 
  FocusManager,
  AriaLabelGenerator,
  AccessibilityEventHandler
} from '@/lib/accessibility/wcag-utils'

/**
 * 焦點管理 Hook
 * 提供完整的焦點管理功能，包括焦點陷阱和恢復
 */
export function useFocusManagement(isActive: boolean = false) {
  const focusManagerRef = useRef<FocusManager | null>(null)
  const containerRef = useRef<HTMLElement | null>(null)
  const keyboardManagerRef = useRef<KeyboardNavigationManager | null>(null)

  useEffect(() => {
    if (!focusManagerRef.current) {
      focusManagerRef.current = new FocusManager()
    }
  }, [])

  const initializeFocusTrap = useCallback((container: HTMLElement, triggerElement?: HTMLElement) => {
    if (!focusManagerRef.current || !container) return

    containerRef.current = container
    
    // 創建鍵盤導航管理器
    keyboardManagerRef.current = new KeyboardNavigationManager()
    
    // 初始化焦點管理
    const focusController = focusManagerRef.current.manageModalFocus(container, triggerElement)
    
    return {
      destroy: () => {
        focusController.destroy()
        if (keyboardManagerRef.current) {
          keyboardManagerRef.current.destroyFocusTrap()
          keyboardManagerRef.current = null
        }
        containerRef.current = null
      }
    }
  }, [])

  const saveFocus = useCallback(() => {
    focusManagerRef.current?.saveFocus()
  }, [])

  const restoreFocus = useCallback(() => {
    focusManagerRef.current?.restoreFocus()
  }, [])

  // 自動處理 isActive 狀態變化
  useEffect(() => {
    if (isActive) {
      saveFocus()
    } else {
      restoreFocus()
    }
  }, [isActive, saveFocus, restoreFocus])

  return {
    initializeFocusTrap,
    saveFocus,
    restoreFocus,
    containerRef
  }
}

/**
 * 螢幕閱讀器公告 Hook
 */
export function useScreenReaderAnnouncer() {
  const announcerRef = useRef<ScreenReaderAnnouncer | null>(null)

  useEffect(() => {
    announcerRef.current = ScreenReaderAnnouncer.getInstance()
  }, [])

  const announceUrgent = useCallback((message: string) => {
    const inst = announcerRef.current
    if (inst) inst.announceUrgent(message)
  }, [])

  const announcePolite = useCallback((message: string) => {
    const inst = announcerRef.current
    if (inst) inst.announcePolite(message)
  }, [])

  const announceFormError = useCallback((fieldName: string, errorMessage: string) => {
    announcerRef.current?.announceFormError(fieldName, errorMessage)
  }, [])

  const announceSuccess = useCallback((message: string) => {
    announcerRef.current?.announceSuccess(message)
  }, [])

  const announceLoading = useCallback((message?: string) => {
    announcerRef.current?.announceLoading(message)
  }, [])

  const announcePageChange = useCallback((pageName: string) => {
    announcerRef.current?.announcePageChange(pageName)
  }, [])

  return {
    announceUrgent,
    announcePolite,
    announceFormError,
    announceSuccess,
    announceLoading,
    announcePageChange
  }
}

/**
 * 鍵盤導航 Hook
 * 提供方向鍵導航、回車激活等鍵盤交互
 */
export function useKeyboardNavigation<T extends HTMLElement>(
  elements: T[],
  options: {
    orientation?: 'horizontal' | 'vertical'
    loop?: boolean
    autoFocus?: boolean
  } = {}
) {
  const { orientation = 'horizontal', loop = true, autoFocus = false } = options
  const [currentIndex, setCurrentIndex] = useState(-1)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (elements.length === 0) return

    const currentElement = event.target as HTMLElement
    const elementIndex = elements.indexOf(currentElement as T)
    
    if (elementIndex === -1) return

    let nextIndex = elementIndex
    const isHorizontal = orientation === 'horizontal'
    
    switch (event.key) {
      case isHorizontal ? 'ArrowRight' : 'ArrowDown':
        nextIndex = loop 
          ? (elementIndex + 1) % elements.length
          : Math.min(elementIndex + 1, elements.length - 1)
        break
      case isHorizontal ? 'ArrowLeft' : 'ArrowUp':
        nextIndex = loop
          ? elementIndex === 0 ? elements.length - 1 : elementIndex - 1
          : Math.max(elementIndex - 1, 0)
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = elements.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    const el = elements[nextIndex]
    if (el) el.focus()
    setCurrentIndex(nextIndex)
  }, [elements, orientation, loop])

  const focusElement = useCallback((index: number) => {
    if (index >= 0 && index < elements.length) {
      const el = elements[index]
      if (el) el.focus()
      setCurrentIndex(index)
    }
  }, [elements])

  const focusFirst = useCallback(() => {
    focusElement(0)
  }, [focusElement])

  const focusLast = useCallback(() => {
    focusElement(elements.length - 1)
  }, [focusElement, elements.length])

  const focusNext = useCallback(() => {
    const nextIndex = loop
      ? (currentIndex + 1) % elements.length
      : Math.min(currentIndex + 1, elements.length - 1)
    focusElement(nextIndex)
  }, [currentIndex, elements.length, focusElement, loop])

  const focusPrevious = useCallback(() => {
    const prevIndex = loop
      ? currentIndex === 0 ? elements.length - 1 : currentIndex - 1
      : Math.max(currentIndex - 1, 0)
    focusElement(prevIndex)
  }, [currentIndex, elements.length, focusElement, loop])

  // 自動聚焦第一個元素
  useEffect(() => {
    if (autoFocus && elements.length > 0 && currentIndex === -1) {
      focusFirst()
    }
  }, [autoFocus, elements.length, currentIndex, focusFirst])

  return {
    currentIndex,
    handleKeyDown,
    focusElement,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious
  }
}

/**
 * ARIA 標籤生成 Hook
 */
export function useAriaLabels() {
  const generateFormFieldLabels = useCallback((config: Parameters<typeof AriaLabelGenerator.generateFormFieldLabels>[0]) => {
    return AriaLabelGenerator.generateFormFieldLabels(config)
  }, [])

  const generateButtonLabels = useCallback((config: Parameters<typeof AriaLabelGenerator.generateButtonLabels>[0]) => {
    return AriaLabelGenerator.generateButtonLabels(config)
  }, [])

  const generateStatusBadgeLabel = useCallback((status: string, context?: string) => {
    return AriaLabelGenerator.generateStatusBadgeLabel(status, context)
  }, [])

  const generateNavigationLabel = useCallback((config: Parameters<typeof AriaLabelGenerator.generateNavigationLabel>[0]) => {
    return AriaLabelGenerator.generateNavigationLabel(config)
  }, [])

  return {
    generateFormFieldLabels,
    generateButtonLabels,
    generateStatusBadgeLabel,
    generateNavigationLabel
  }
}

/**
 * 鍵盤事件處理 Hook
 */
export function useKeyboardEvents() {
  const handleActivation = useCallback((callback: () => void) => {
    return AccessibilityEventHandler.handleKeyboardActivation(callback)
  }, [])

  const handleEscapeClose = useCallback((callback: () => void) => {
    return AccessibilityEventHandler.handleEscapeClose(callback)
  }, [])

  const handleArrowNavigation = useCallback((
    elements: HTMLElement[],
    orientation: 'horizontal' | 'vertical' = 'horizontal'
  ) => {
    return AccessibilityEventHandler.handleArrowNavigation(elements, orientation)
  }, [])

  return {
    handleActivation,
    handleEscapeClose,
    handleArrowNavigation
  }
}

/**
 * 模態框無障礙管理 Hook
 */
export function useModalAccessibility(isOpen: boolean) {
  const modalRef = useRef<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const { initializeFocusTrap, restoreFocus } = useFocusManagement()
  const { announcePolite } = useScreenReaderAnnouncer()
  const focusControllerRef = useRef<{ destroy: () => void } | null>(null)

  // 設置觸發元素
  const setTriggerElement = useCallback((element: HTMLElement) => {
    triggerRef.current = element
  }, [])

  // 處理模態框開啟/關閉
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // 模態框開啟
      announcePolite('對話框已開啟')
      focusControllerRef.current = initializeFocusTrap(modalRef.current, triggerRef.current || undefined) || null
      
      // 阻止背景滾動
      document.body.style.overflow = 'hidden'
      
    } else if (!isOpen) {
      // 模態框關閉
      if (focusControllerRef.current) {
        focusControllerRef.current.destroy()
        focusControllerRef.current = null
      }
      
      // 恢復背景滾動
      document.body.style.overflow = ''
      
      // 宣告關閉並恢復焦點
      announcePolite('對話框已關閉')
      restoreFocus()
    }

    // 清理函數
    return () => {
      if (focusControllerRef.current) {
        focusControllerRef.current.destroy()
        focusControllerRef.current = null
      }
      document.body.style.overflow = ''
    }
  }, [isOpen, initializeFocusTrap, restoreFocus, announcePolite])

  return {
    modalRef,
    setTriggerElement
  }
}

/**
 * 表單無障礙驗證 Hook
 */
export function useFormAccessibility<T extends Record<string, any>>(
  formData: T,
  validationRules: Record<keyof T, { required?: boolean; validator?: (value: any) => string | null }>
) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
  const { announceFormError, announceSuccess } = useScreenReaderAnnouncer()
  const { generateFormFieldLabels } = useAriaLabels()

  const validateField = useCallback((fieldName: keyof T, value: any): string | null => {
    const rules = validationRules[fieldName]
    if (!rules) return null

    // 必填驗證
    if (rules.required && (!value || value.toString().trim() === '')) {
      return `${String(fieldName)}為必填欄位`
    }

    // 自定義驗證
    if (rules.validator) {
      return rules.validator(value)
    }

    return null
  }, [validationRules])

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {}
    let hasErrors = false

    Object.keys(validationRules).forEach(fieldName => {
      const key = fieldName as keyof T
      const error = validateField(key, formData[key])
      if (error) {
        newErrors[key] = error
        hasErrors = true
      }
    })

    setErrors(newErrors)

    // 宣告驗證結果
    if (hasErrors) {
      const firstError = Object.entries(newErrors)[0]
      if (firstError) {
        announceFormError(String(firstError[0]), firstError[1] as string)
      }
    } else {
      announceSuccess('表單驗證通過')
    }

    return !hasErrors
  }, [formData, validationRules, validateField, announceFormError, announceSuccess])

  const handleFieldBlur = useCallback((fieldName: keyof T) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }))
    
    const error = validateField(fieldName, formData[fieldName])
    setErrors(prev => ({ ...prev, [fieldName]: error }))
    
    if (error) {
      announceFormError(String(fieldName), error)
    }
  }, [formData, validateField, announceFormError])

  const getFieldProps = useCallback((fieldName: keyof T, displayName?: string) => {
    const hasError = Boolean(errors[fieldName] && touched[fieldName])
    const errorMessage = errors[fieldName]
    const isRequired = validationRules[fieldName]?.required

    return {
      ...generateFormFieldLabels({
        fieldName: displayName || String(fieldName),
        isRequired,
        hasError,
        errorMessage
      }),
      onBlur: () => handleFieldBlur(fieldName),
      error: hasError ? errorMessage : undefined
    }
  }, [errors, touched, validationRules, generateFormFieldLabels, handleFieldBlur])

  const clearErrors = useCallback(() => {
    setErrors({})
    setTouched({})
  }, [])

  return {
    errors,
    touched,
    validateForm,
    validateField,
    handleFieldBlur,
    getFieldProps,
    clearErrors,
    hasErrors: Object.keys(errors).length > 0
  }
}

/**
 * 無障礙狀態管理 Hook
 */
export function useAccessibilityState() {
  const [announcements, setAnnouncements] = useState<string[]>([])
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null)
  const { announcePolite } = useScreenReaderAnnouncer()

  const addAnnouncement = useCallback((message: string) => {
    setAnnouncements(prev => [...prev, message])
    announcePolite(message)
    
    // 自動清除舊公告
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1))
    }, 5000)
  }, [announcePolite])

  const trackFocus = useCallback(() => {
    const handleFocus = (event: FocusEvent) => {
      setFocusedElement(event.target as HTMLElement)
    }

    document.addEventListener('focusin', handleFocus)
    return () => document.removeEventListener('focusin', handleFocus)
  }, [])

  useEffect(() => {
    return trackFocus()
  }, [trackFocus])

  return {
    announcements,
    focusedElement,
    addAnnouncement,
    trackFocus
  }
}

/**
 * 複合無障礙功能 Hook
 * 整合多個無障礙功能，提供完整的解決方案
 */
export function useAccessibility(options: {
  announcePageLoad?: boolean
  trackFocus?: boolean
  validateContrast?: boolean
} = {}) {
  const { announcePageLoad = true, trackFocus = true, validateContrast = false } = options
  
  const focusManagement = useFocusManagement()
  const screenReader = useScreenReaderAnnouncer()
  const keyboardEvents = useKeyboardEvents()
  const ariaLabels = useAriaLabels()
  const accessibilityState = useAccessibilityState()

  // 頁面載入公告
  useEffect(() => {
    if (announcePageLoad) {
      const title = document.title
      screenReader.announcePageChange(title)
    }
  }, [announcePageLoad, screenReader])

  // 對比度驗證
  useEffect(() => {
    if (validateContrast && process.env.NODE_ENV === 'development') {
      import('@/lib/accessibility/wcag-utils').then(({ AccessibilityValidator }) => {
        const contrastResult = AccessibilityValidator.validateColorContrast()
        if (!contrastResult.isValid) {
          console.warn('無障礙警告：發現顏色對比度問題', contrastResult.issues)
        }
      })
    }
  }, [validateContrast])

  return {
    ...focusManagement,
    ...screenReader,
    ...keyboardEvents,
    ...ariaLabels,
    ...accessibilityState
  }
}
