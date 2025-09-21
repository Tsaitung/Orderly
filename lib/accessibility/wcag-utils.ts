/**
 * WCAG 2.1 AA 無障礙工具函數
 * 
 * 提供符合 WCAG 2.1 AA 標準的各種輔助功能，包括：
 * - 顏色對比度檢查
 * - 鍵盤導航支援
 * - 螢幕閱讀器支援
 * - 焦點管理
 * - 語義化標記
 */

/**
 * 顏色對比度計算
 * WCAG 2.1 AA 要求：正常文字至少 4.5:1，大文字至少 3:1
 */
export class ColorContrastChecker {
  /**
   * 計算相對亮度
   */
  private static getRelativeLuminance(color: string): number {
    const rgb = this.hexToRgb(color)
    if (!rgb) return 0

    const normalize = (c: number) => {
      const v = c / 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    }

    const rs = normalize(rgb.r)
    const gs = normalize(rgb.g)
    const bs = normalize(rgb.b)

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  /**
   * 計算對比度比例
   */
  static getContrastRatio(color1: string, color2: string): number {
    const l1 = this.getRelativeLuminance(color1)
    const l2 = this.getRelativeLuminance(color2)
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    
    return (lighter + 0.05) / (darker + 0.05)
  }

  /**
   * 檢查是否符合 WCAG AA 標準
   */
  static isWCAGAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
    const contrast = this.getContrastRatio(foreground, background)
    return isLargeText ? contrast >= 3 : contrast >= 4.5
  }

  /**
   * 檢查是否符合 WCAG AAA 標準
   */
  static isWCAGAAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
    const contrast = this.getContrastRatio(foreground, background)
    return isLargeText ? contrast >= 4.5 : contrast >= 7
  }

  /**
   * 十六進制顏色轉 RGB
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result || result.length < 4) return null
    return {
      r: parseInt(result[1]!, 16),
      g: parseInt(result[2]!, 16),
      b: parseInt(result[3]!, 16)
    }
  }

  /**
   * 獲取建議的顏色調整
   */
  static getSuggestedColors(foreground: string, background: string): {
    isCompliant: boolean
    currentRatio: number
    suggestions: {
      darkerForeground?: string
      lighterForeground?: string
      darkerBackground?: string
      lighterBackground?: string
    }
  } {
    const currentRatio = this.getContrastRatio(foreground, background)
    const isCompliant = currentRatio >= 4.5

    return {
      isCompliant,
      currentRatio: Math.round(currentRatio * 100) / 100,
      suggestions: {
        // 這裡可以實現智能顏色建議演算法
        darkerForeground: this.adjustBrightness(foreground, -20),
        lighterForeground: this.adjustBrightness(foreground, 20),
        darkerBackground: this.adjustBrightness(background, -20),
        lighterBackground: this.adjustBrightness(background, 20)
      }
    }
  }

  /**
   * 調整顏色亮度
   */
  private static adjustBrightness(hex: string, percent: number): string {
    const rgb = this.hexToRgb(hex)
    if (!rgb) return hex

    const adjust = (value: number) => {
      const adjusted = value + (255 * percent / 100)
      return Math.max(0, Math.min(255, Math.round(adjusted)))
    }

    const r = adjust(rgb.r).toString(16).padStart(2, '0')
    const g = adjust(rgb.g).toString(16).padStart(2, '0')
    const b = adjust(rgb.b).toString(16).padStart(2, '0')

    return `#${r}${g}${b}`
  }
}

/**
 * 鍵盤導航管理器
 * 提供完整的鍵盤導航支援
 */
export class KeyboardNavigationManager {
  private focusableElements: HTMLElement[] = []
  private currentIndex = -1
  private trapContainer: HTMLElement | null = null

  /**
   * 獲取可聚焦元素的選擇器
   */
  private static FOCUSABLE_SELECTORS = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
    'audio[controls]',
    'video[controls]',
    'summary'
  ].join(', ')

  /**
   * 初始化焦點陷阱
   */
  initFocusTrap(container: HTMLElement): void {
    this.trapContainer = container
    this.updateFocusableElements()
    this.setupEventListeners()
    
    // 設置初始焦點
    if (this.focusableElements.length > 0) {
      const first = this.focusableElements[0]
      if (first) first.focus()
      this.currentIndex = 0
    }
  }

  /**
   * 移除焦點陷阱
   */
  destroyFocusTrap(): void {
    this.removeEventListeners()
    this.trapContainer = null
    this.focusableElements = []
    this.currentIndex = -1
  }

  /**
   * 更新可聚焦元素列表
   */
  private updateFocusableElements(): void {
    if (!this.trapContainer) return

    const nodes = Array.from(
      this.trapContainer.querySelectorAll<HTMLElement>(KeyboardNavigationManager.FOCUSABLE_SELECTORS)
    )
    this.focusableElements = nodes.filter(el => this.isVisible(el))
  }

  /**
   * 檢查元素是否可見
   */
  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element)
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           element.offsetParent !== null
  }

  /**
   * 處理鍵盤事件
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.trapContainer || this.focusableElements.length === 0) return

    switch (event.key) {
      case 'Tab':
        this.handleTabNavigation(event)
        break
      case 'Escape':
        this.handleEscapeKey(event)
        break
      case 'ArrowDown':
      case 'ArrowUp':
        this.handleArrowNavigation(event)
        break
      case 'Home':
        this.focusFirst()
        event.preventDefault()
        break
      case 'End':
        this.focusLast()
        event.preventDefault()
        break
    }
  }

  /**
   * 處理 Tab 導航
   */
  private handleTabNavigation(event: KeyboardEvent): void {
    const isShiftTab = event.shiftKey
    const firstElement = this.focusableElements[0]
    const lastElement = this.focusableElements[this.focusableElements.length - 1]

    if (isShiftTab && document.activeElement === firstElement && lastElement) {
      lastElement.focus()
      event.preventDefault()
    } else if (!isShiftTab && document.activeElement === lastElement && firstElement) {
      firstElement.focus()
      event.preventDefault()
    }
  }

  /**
   * 處理箭頭鍵導航
   */
  private handleArrowNavigation(event: KeyboardEvent): void {
    const currentElement = document.activeElement as HTMLElement
    const currentIndex = this.focusableElements.indexOf(currentElement)
    
    if (currentIndex === -1) return

    let nextIndex: number
    if (event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % this.focusableElements.length
    } else {
      nextIndex = currentIndex === 0 ? this.focusableElements.length - 1 : currentIndex - 1
    }

    const next = this.focusableElements[nextIndex]
    if (next) next.focus()
    event.preventDefault()
  }

  /**
   * 處理 Escape 鍵
   */
  private handleEscapeKey(event: KeyboardEvent): void {
    // 觸發自定義事件，讓父組件處理
    this.trapContainer?.dispatchEvent(new CustomEvent('escapeKey', { 
      detail: { originalEvent: event }
    }))
  }

  /**
   * 聚焦第一個元素
   */
  private focusFirst(): void {
    if (this.focusableElements.length > 0) {
      const first = this.focusableElements[0]
      if (first) first.focus()
      this.currentIndex = 0
    }
  }

  /**
   * 聚焦最後一個元素
   */
  private focusLast(): void {
    if (this.focusableElements.length > 0) {
      const lastIndex = this.focusableElements.length - 1
      const last = this.focusableElements[lastIndex]
      if (last) last.focus()
      this.currentIndex = lastIndex
    }
  }

  /**
   * 設置事件監聽器
   */
  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown)
  }

  /**
   * 移除事件監聽器
   */
  private removeEventListeners(): void {
    document.removeEventListener('keydown', this.handleKeyDown)
  }
}

/**
 * 螢幕閱讀器公告管理器
 * 提供優雅的螢幕閱讀器通知功能
 */
export class ScreenReaderAnnouncer {
  private static instance: ScreenReaderAnnouncer
  private liveRegion: HTMLElement | null = null
  private politeRegion: HTMLElement | null = null

  private constructor() {
    this.createLiveRegions()
  }

  static getInstance(): ScreenReaderAnnouncer {
    if (!ScreenReaderAnnouncer.instance) {
      ScreenReaderAnnouncer.instance = new ScreenReaderAnnouncer()
    }
    return ScreenReaderAnnouncer.instance
  }

  /**
   * 創建 ARIA live regions
   */
  private createLiveRegions(): void {
    // 創建 assertive live region (緊急公告)
    this.liveRegion = document.createElement('div')
    this.liveRegion.setAttribute('aria-live', 'assertive')
    this.liveRegion.setAttribute('aria-atomic', 'true')
    this.liveRegion.setAttribute('class', 'sr-only')
    this.liveRegion.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `

    // 創建 polite live region (一般公告)
    this.politeRegion = document.createElement('div')
    this.politeRegion.setAttribute('aria-live', 'polite')
    this.politeRegion.setAttribute('aria-atomic', 'true')
    this.politeRegion.setAttribute('class', 'sr-only')
    this.politeRegion.style.cssText = this.liveRegion.style.cssText

    document.body.appendChild(this.liveRegion)
    document.body.appendChild(this.politeRegion)
  }

  /**
   * 緊急公告（會中斷螢幕閱讀器）
   */
  announceUrgent(message: string): void {
    if (this.liveRegion) {
      this.liveRegion.textContent = message
      
      // 清除消息避免重複公告
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = ''
        }
      }, 1000)
    }
  }

  /**
   * 禮貌公告（等待螢幕閱讀器完成當前朗讀）
   */
  announcePolite(message: string): void {
    if (this.politeRegion) {
      this.politeRegion.textContent = message
      
      // 清除消息避免重複公告
      setTimeout(() => {
        if (this.politeRegion) {
          this.politeRegion.textContent = ''
        }
      }, 1000)
    }
  }

  /**
   * 公告表單驗證錯誤
   */
  announceFormError(fieldName: string, errorMessage: string): void {
    const message = `${fieldName}欄位發生錯誤：${errorMessage}`
    this.announceUrgent(message)
  }

  /**
   * 公告操作成功
   */
  announceSuccess(message: string): void {
    this.announcePolite(`操作成功：${message}`)
  }

  /**
   * 公告載入狀態
   */
  announceLoading(message: string = '載入中，請稍候'): void {
    this.announcePolite(message)
  }

  /**
   * 公告頁面變更
   */
  announcePageChange(pageName: string): void {
    this.announcePolite(`已切換到${pageName}頁面`)
  }
}

/**
 * 焦點管理工具
 */
export class FocusManager {
  private previousActiveElement: HTMLElement | null = null
  private restoreFocusTarget: HTMLElement | null = null

  /**
   * 保存當前焦點
   */
  saveFocus(): void {
    this.previousActiveElement = document.activeElement as HTMLElement
  }

  /**
   * 恢復之前保存的焦點
   */
  restoreFocus(): void {
    if (this.restoreFocusTarget) {
      this.restoreFocusTarget.focus()
      this.restoreFocusTarget = null
    } else if (this.previousActiveElement) {
      this.previousActiveElement.focus()
      this.previousActiveElement = null
    }
  }

  /**
   * 設置焦點恢復目標
   */
  setRestoreFocusTarget(element: HTMLElement): void {
    this.restoreFocusTarget = element
  }

  /**
   * 管理模態框焦點
   */
  manageModalFocus(modalElement: HTMLElement, triggerElement?: HTMLElement): {
    destroy: () => void
  } {
    // 保存觸發元素
    if (triggerElement) {
      this.setRestoreFocusTarget(triggerElement)
    } else {
      this.saveFocus()
    }

    // 設置焦點陷阱
    const keyboardManager = new KeyboardNavigationManager()
    keyboardManager.initFocusTrap(modalElement)

    // 監聽 ESC 鍵關閉模態框
    const handleEscape = () => {
      this.restoreFocus()
    }

    modalElement.addEventListener('escapeKey', handleEscape)

    return {
      destroy: () => {
        keyboardManager.destroyFocusTrap()
        modalElement.removeEventListener('escapeKey', handleEscape)
      }
    }
  }
}

/**
 * ARIA 標籤生成器
 */
export class AriaLabelGenerator {
  /**
   * 生成表單欄位的完整 ARIA 標籤
   */
  static generateFormFieldLabels(config: {
    fieldName: string
    isRequired?: boolean
    hasError?: boolean
    errorMessage?: string
    helperText?: string
    description?: string
  }): {
    'aria-label': string
    'aria-describedby'?: string
    'aria-invalid'?: boolean
    'aria-required'?: boolean
  } {
    const { fieldName, isRequired, hasError, errorMessage, helperText, description } = config
    
    let ariaLabel = fieldName
    if (isRequired) {
      ariaLabel += '，必填欄位'
    }

    const describedByIds: string[] = []
    const attributes: { 'aria-label': string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; 'aria-required'?: boolean } = {
      'aria-label': ariaLabel
    }

    if (isRequired) {
      attributes['aria-required'] = true
    }

    if (hasError) {
      attributes['aria-invalid'] = true
      if (errorMessage) {
        describedByIds.push(`${fieldName}-error`)
      }
    }

    if (helperText) {
      describedByIds.push(`${fieldName}-helper`)
    }

    if (description) {
      describedByIds.push(`${fieldName}-description`)
    }

    if (describedByIds.length > 0) {
      attributes['aria-describedby'] = describedByIds.join(' ')
    }

    return attributes
  }

  /**
   * 生成按鈕的 ARIA 標籤
   */
  static generateButtonLabels(config: {
    action: string
    target?: string
    state?: 'loading' | 'disabled' | 'pressed'
    hasIcon?: boolean
    iconDescription?: string
  }): {
    'aria-label': string
    'aria-disabled'?: boolean
    'aria-pressed'?: boolean
    'aria-busy'?: boolean
  } {
    const { action, target, state, hasIcon, iconDescription } = config
    
    let ariaLabel = action
    if (target) {
      ariaLabel += target
    }

    if (hasIcon && iconDescription) {
      ariaLabel += `，${iconDescription}圖示`
    }

    const attributes: any = {
      'aria-label': ariaLabel
    }

    switch (state) {
      case 'loading':
        attributes['aria-busy'] = true
        attributes['aria-label'] += '，載入中'
        break
      case 'disabled':
        attributes['aria-disabled'] = true
        break
      case 'pressed':
        attributes['aria-pressed'] = true
        break
    }

    return attributes as any
  }

  /**
   * 生成狀態徽章的 ARIA 標籤
   */
  static generateStatusBadgeLabel(status: string, context?: string): string {
    let label = `狀態：${status}`
    if (context) {
      label += `，${context}`
    }
    return label
  }

  /**
   * 生成導航連結的 ARIA 標籤
   */
  static generateNavigationLabel(linkText: string, isCurrent?: boolean, hasSubmenu?: boolean): {
    'aria-label': string
    'aria-current'?: string
    'aria-haspopup'?: boolean
    'aria-expanded'?: boolean
  } {
    const attributes: { 'aria-label': string; 'aria-current'?: string; 'aria-haspopup'?: boolean; 'aria-expanded'?: boolean } = {
      'aria-label': linkText
    }

    if (isCurrent) {
      attributes['aria-current'] = 'page'
      attributes['aria-label'] += '，目前頁面'
    }

    if (hasSubmenu) {
      attributes['aria-haspopup'] = true
      attributes['aria-expanded'] = false
    }

    return attributes
  }
}

/**
 * 無障礙驗證工具
 */
export class AccessibilityValidator {
  /**
   * 驗證頁面的基本無障礙需求
   */
  static validatePage(): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // 檢查是否有 main landmark
    if (!document.querySelector('main')) {
      errors.push('頁面缺少 main landmark')
    }

    // 檢查是否有頁面標題
    if (!document.title || document.title.trim() === '') {
      errors.push('頁面缺少標題')
    }

    // 檢查圖片是否有 alt 文字
    const images = document.querySelectorAll('img')
    images.forEach((img, index) => {
      if (!img.hasAttribute('alt')) {
        warnings.push(`第 ${index + 1} 張圖片缺少 alt 屬性`)
      }
    })

    // 檢查表單標籤
    const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, select, textarea')
    inputs.forEach((input, index) => {
      const hasLabel = input.hasAttribute('aria-label') || 
                      input.hasAttribute('aria-labelledby') ||
                      document.querySelector(`label[for="${input.id}"]`)
      
      if (!hasLabel) {
        warnings.push(`第 ${index + 1} 個表單欄位缺少標籤`)
      }
    })

    // 檢查頭部結構
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    if (headings.length === 0) {
      warnings.push('頁面缺少標題結構')
    } else {
      const h1Count = document.querySelectorAll('h1').length
      if (h1Count === 0) {
        warnings.push('頁面缺少 h1 標題')
      } else if (h1Count > 1) {
        warnings.push('頁面有多個 h1 標題')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 驗證顏色對比度
   */
  static validateColorContrast(): {
    isValid: boolean
    issues: Array<{
      element: HTMLElement
      foreground: string
      background: string
      ratio: number
      required: number
    }>
  } {
    const issues: any[] = []
    
    // 檢查所有文字元素的對比度
    const textElements = document.querySelectorAll<HTMLElement>('p, span, div, a, button, h1, h2, h3, h4, h5, h6, label')
    
    textElements.forEach(element => {
      const computed = window.getComputedStyle(element as Element)
      const foreground = computed.color
      const background = computed.backgroundColor
      
      if (foreground && background && background !== 'rgba(0, 0, 0, 0)') {
        const ratio = ColorContrastChecker.getContrastRatio(
          this.rgbToHex(foreground),
          this.rgbToHex(background)
        )
        
        const fontSize = parseFloat(computed.fontSize)
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && computed.fontWeight === 'bold')
        const required = isLargeText ? 3 : 4.5
        
        if (ratio < required) {
          issues.push({
            element,
            foreground,
            background,
            ratio: Math.round(ratio * 100) / 100,
            required
          })
        }
      }
    })

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  /**
   * RGB 顏色轉十六進制
   */
  private static rgbToHex(rgb: string): string {
    const match = rgb.match(/\d+/g)
    if (!match || match.length < 3) return '#000000'
    
    const [r, g, b] = match.map(Number) as unknown as [number, number, number]
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
  }
}

/**
 * 無障礙事件處理器
 */
export class AccessibilityEventHandler {
  /**
   * 處理鍵盤激活事件（Space 和 Enter）
   */
  static handleKeyboardActivation(callback: () => void) {
    return (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        callback()
      }
    }
  }

  /**
   * 處理 ESC 鍵關閉事件
   */
  static handleEscapeClose(callback: () => void) {
    return (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        callback()
      }
    }
  }

  /**
   * 處理方向鍵導航
   */
  static handleArrowNavigation(
    elements: HTMLElement[],
    orientation: 'horizontal' | 'vertical' = 'horizontal'
  ) {
    return (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      const currentIndex = elements.indexOf(target)
      if (currentIndex === -1) return

      let nextIndex = currentIndex
      const isHorizontal = orientation === 'horizontal'
      
      switch (event.key) {
        case isHorizontal ? 'ArrowRight' : 'ArrowDown':
          nextIndex = (currentIndex + 1) % elements.length
          break
        case isHorizontal ? 'ArrowLeft' : 'ArrowUp':
          nextIndex = currentIndex === 0 ? elements.length - 1 : currentIndex - 1
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
    }
  }
}

// 導出所有無障礙工具
export default {
  ColorContrastChecker,
  KeyboardNavigationManager,
  ScreenReaderAnnouncer,
  FocusManager,
  AriaLabelGenerator,
  AccessibilityValidator,
  AccessibilityEventHandler
}
