import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合併 className 工具函數
 * 支援條件式 className 和 Tailwind CSS 衝突解決
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化貨幣金額
 * @param amount 金額
 * @param currency 貨幣代碼，默認為 TWD
 * @param locale 地區設定，默認為 zh-TW
 */
export function formatCurrency(
  amount: number,
  currency: string = 'TWD',
  locale: string = 'zh-TW'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * 格式化數字（加千分位）
 * @param num 數字
 * @param locale 地區設定
 */
export function formatNumber(num: number, locale: string = 'zh-TW'): string {
  return new Intl.NumberFormat(locale).format(num)
}

/**
 * 格式化日期
 * @param date 日期
 * @param options 格式選項（包含 relative 選項）
 * @param locale 地區設定
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions & { relative?: boolean } = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  },
  locale: string = 'zh-TW'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // 相對時間格式
  if (options.relative) {
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMins < 1) return '剛剛'
    if (diffMins < 60) return `${diffMins} 分鐘前`
    if (diffHours < 24) return `${diffHours} 小時前`
    if (diffDays < 7) return `${diffDays} 天前`
    // 超過一週回歸一般格式
  }
  
  return new Intl.DateTimeFormat(locale, options).format(dateObj)
}

/**
 * 格式化相對時間
 * @param date 日期
 * @param locale 地區設定
 */
export function formatRelativeTime(
  date: Date | string,
  locale: string = 'zh-TW'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  
  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second')
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute')
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour')
  } else if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day')
  } else {
    return formatDate(dateObj)
  }
}

/**
 * 產生隨機 ID
 * @param length 長度，默認為 8
 */
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 深度複製對象
 * @param obj 要複製的對象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {return obj}
  if (obj instanceof Date) {return new Date(obj.getTime()) as unknown as T}
  if (obj instanceof Array) {return obj.map(item => deepClone(item)) as unknown as T}
  if (typeof obj === 'object') {
    const copy: Record<string, unknown> = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copy[key] = deepClone((obj as Record<string, unknown>)[key])
      }
    }
    return copy as T
  }
  return obj
}

/**
 * 防抖函數
 * @param func 要防抖的函數
 * @param delay 延遲時間（毫秒）
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * 節流函數
 * @param func 要節流的函數
 * @param delay 節流間隔（毫秒）
 */
export function throttle<T extends (...args: never[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => { inThrottle = false }, delay)
    }
  }
}

/**
 * 計算信心分數的顏色和標籤
 * @param score 信心分數 (0-1)
 */
export function getConfidenceLevel(score: number) {
  if (score >= 0.9) {
    return {
      level: 'high',
      label: '高',
      color: 'text-reconciliation-approved',
      bgColor: 'bg-reconciliation-approved/10',
      description: '自動匹配成功'
    }
  } else if (score >= 0.7) {
    return {
      level: 'medium',
      label: '中',
      color: 'text-reconciliation-pending',
      bgColor: 'bg-reconciliation-pending/10',
      description: '建議人工確認'
    }
  } else {
    return {
      level: 'low',
      label: '低',
      color: 'text-reconciliation-disputed',
      bgColor: 'bg-reconciliation-disputed/10',
      description: '需要人工處理'
    }
  }
}

/**
 * 計算對帳狀態的樣式
 * @param status 對帳狀態
 */
export function getReconciliationStatusStyle(status: string) {
  const statusMap = {
    pending: {
      label: '待處理',
      className: 'status-pending',
      icon: '⏳'
    },
    processing: {
      label: '處理中',
      className: 'status-processing',
      icon: '🔄'
    },
    approved: {
      label: '已完成',
      className: 'status-approved',
      icon: '✅'
    },
    disputed: {
      label: '有爭議',
      className: 'status-disputed',
      icon: '⚠️'
    },
    draft: {
      label: '草稿',
      className: 'status-draft',
      icon: '📝'
    }
  }
  
  return statusMap[status as keyof typeof statusMap] || statusMap.draft
}

/**
 * 計算 ERP 同步狀態的樣式
 * @param status ERP 同步狀態
 */
export function getERPSyncStatusStyle(status: string) {
  const statusMap = {
    connected: {
      label: '已連接',
      className: 'erp-connected',
      icon: '🟢'
    },
    syncing: {
      label: '同步中',
      className: 'erp-syncing',
      icon: '🔄'
    },
    error: {
      label: '錯誤',
      className: 'erp-error',
      icon: '🔴'
    },
    offline: {
      label: '離線',
      className: 'erp-offline',
      icon: '⚫'
    }
  }
  
  return statusMap[status as keyof typeof statusMap] || statusMap.offline
}

/**
 * 驗證電子郵件格式
 * @param email 電子郵件地址
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 驗證台灣手機號碼格式
 * @param phone 手機號碼
 */
export function isValidTaiwanPhone(phone: string): boolean {
  const phoneRegex = /^09\d{8}$/
  return phoneRegex.test(phone.replace(/\s|-/g, ''))
}

/**
 * 驗證台灣統一編號
 * @param taxId 統一編號
 */
export function isValidTaiwanTaxId(taxId: string): boolean {
  if (!/^\d{8}$/.test(taxId)) {return false}
  
  const weights = [1, 2, 1, 2, 1, 2, 4, 1]
  let sum = 0
  
  for (let i = 0; i < 8; i++) {
    const digit = parseInt(taxId[i])
    const product = digit * weights[i]
    sum += Math.floor(product / 10) + (product % 10)
  }
  
  return sum % 10 === 0
}

/**
 * 安全的 JSON 解析
 * @param str JSON 字符串
 * @param defaultValue 默認值
 */
export function safeJsonParse<T>(str: string, defaultValue: T): T {
  try {
    const parsed = JSON.parse(str)
    return parsed !== null && parsed !== undefined ? parsed : defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * 計算百分比
 * @param value 數值
 * @param total 總數
 * @param decimals 小數位數
 */
export function calculatePercentage(
  value: number,
  total: number,
  decimals: number = 1
): number {
  if (total === 0) {return 0}
  return Number(((value / total) * 100).toFixed(decimals))
}

/**
 * 檢查是否為生產環境
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * 檢查是否為開發環境
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * 獲取錯誤訊息
 * @param error 錯誤對象
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return '發生未知錯誤'
}