/**
 * Secure Token Storage
 * Provides encrypted client-side storage with automatic cleanup
 */

import CryptoJS from 'crypto-js'

const STORAGE_KEY = 'orderly_session'

// Safe process.env access for browser compatibility
function getEncryptionKey(): string {
  if (typeof window !== 'undefined') {
    // Browser environment - use fallback (process not available)
    return 'orderly-fallback-key-dev'
  }
  // Server environment
  return process.env.NEXT_PUBLIC_STORAGE_KEY || 'orderly-fallback-key-dev'
}

const ENCRYPTION_KEY = getEncryptionKey()

interface StoredData {
  token: string
  refreshToken?: string
  userId: string
  email: string
  role: string
  organizationId: string
  organizationType: 'restaurant' | 'supplier'
  expiresAt: number
  rememberMe: boolean
}

export class SecureStorage {
  /**
   * Store tokens securely with encryption
   */
  static setTokens(data: Omit<StoredData, 'expiresAt'> & { expiresIn?: number }): void {
    try {
      const expiresAt = Date.now() + (data.expiresIn || 7 * 24 * 60 * 60 * 1000) // Default 7 days

      const storeData: StoredData = {
        token: data.token,
        refreshToken: data.refreshToken,
        userId: data.userId,
        email: data.email,
        role: data.role,
        organizationId: data.organizationId,
        organizationType: data.organizationType,
        expiresAt,
        rememberMe: data.rememberMe,
      }

      // Encrypt the data
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(storeData), ENCRYPTION_KEY).toString()

      // Use sessionStorage for temporary sessions, localStorage for "remember me"
      const storage = data.rememberMe ? localStorage : sessionStorage
      storage.setItem(STORAGE_KEY, encrypted)
    } catch (error) {
      console.error('Failed to store tokens securely:', error)
      throw new Error('Authentication storage failed')
    }
  }

  /**
   * Retrieve and decrypt stored tokens
   */
  static getTokens(): StoredData | null {
    try {
      // Try both storages
      let encrypted = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)

      if (!encrypted) {
        return null
      }

      // Decrypt the data
      const decryptedBytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY)
      const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8)

      if (!decryptedData) {
        // Invalid encryption, clear storage
        this.clearTokens()
        return null
      }

      const data: StoredData = JSON.parse(decryptedData)

      // Check if expired
      if (Date.now() > data.expiresAt) {
        this.clearTokens()
        return null
      }

      return data
    } catch (error) {
      console.error('Failed to retrieve tokens:', error)
      this.clearTokens()
      return null
    }
  }

  /**
   * Get only the access token
   */
  static getAccessToken(): string | null {
    const data = this.getTokens()
    return data?.token || null
  }

  /**
   * Get only the refresh token
   */
  static getRefreshToken(): string | null {
    const data = this.getTokens()
    return data?.refreshToken || null
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return this.getTokens() !== null
  }

  /**
   * Clear all stored tokens
   */
  static clearTokens(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear tokens:', error)
    }
  }

  /**
   * Update tokens (for refresh scenarios)
   */
  static updateTokens(token: string, refreshToken?: string): void {
    const existing = this.getTokens()
    if (!existing) {
      throw new Error('No existing session to update')
    }

    this.setTokens({
      ...existing,
      token,
      refreshToken: refreshToken || existing.refreshToken,
    })
  }

  /**
   * Get user information from stored session
   */
  static getUserInfo(): Pick<
    StoredData,
    'userId' | 'email' | 'role' | 'organizationId' | 'organizationType'
  > | null {
    const data = this.getTokens()
    if (!data) return null

    return {
      userId: data.userId,
      email: data.email,
      role: data.role,
      organizationId: data.organizationId,
      organizationType: data.organizationType,
    }
  }

  /**
   * Check if session will expire soon (within 1 hour)
   */
  static willExpireSoon(): boolean {
    const data = this.getTokens()
    if (!data) return false

    const oneHour = 60 * 60 * 1000
    return data.expiresAt - Date.now() < oneHour
  }

  /**
   * Migrate from insecure localStorage to secure storage
   */
  static migrateFromLegacyStorage(): void {
    try {
      // Check for old tokens
      const oldToken = localStorage.getItem('access_token')
      const oldRefreshToken = localStorage.getItem('refresh_token')

      if (oldToken) {
        console.warn('Found legacy insecure token storage, clearing...')
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')

        // Don't migrate the tokens as they may be compromised
        console.warn('Legacy tokens cleared for security. Please log in again.')
      }
    } catch (error) {
      console.error('Failed to migrate legacy storage:', error)
    }
  }
}

// Auto-migrate on import
if (typeof window !== 'undefined') {
  SecureStorage.migrateFromLegacyStorage()
}

export default SecureStorage
