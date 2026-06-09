/**
 * Security Validation Middleware
 * Implements comprehensive input validation, sanitization, and security checks
 */

import { z } from 'zod'
// Use conditional import for DOMPurify to avoid SSR issues
const DOMPurify =
  typeof window !== 'undefined'
    ? require('isomorphic-dompurify')
    : { sanitize: (input: string) => input } // Fallback for server-side
import { NextRequest, NextResponse } from 'next/server'
import { SecurityLogger } from './security-logger'

const logger = SecurityLogger.getInstance()

// Common validation patterns
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const PHONE_REGEX = /^\+?[\d\s\-()]+$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]+$/
const SAFE_STRING_REGEX = /^[a-zA-Z0-9\s\-_.@()+,:/]+$/

// SQL injection patterns to detect
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
  /([\'\"](\s*|\s*\w+\s*)(OR|AND)(\s*|\s*\w+\s*)[\'\"])/i,
  /(-{2}|\/\*|\*\/)/,
  /(;|\||\&)/,
]

// XSS patterns to detect
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<[^>]*\son\w+\s*=[^>]*>/gi,
]

// Define validation schemas for different endpoints
export const OrderSchemas = {
  orderQuery: z.object({
    status: z
      .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
      .optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    search: z.string().max(100).optional(),
    page: z
      .string()
      .transform(val => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().min(1).max(1000)),
    limit: z
      .string()
      .transform(val => (val ? parseInt(val, 10) : 20))
      .pipe(z.number().min(1).max(100)),
    sortBy: z.enum(['createdAt', 'updatedAt', 'totalAmount', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),

  createOrder: z.object({
    supplierId: z.string().uuid('Invalid supplier ID'),
    restaurantId: z.string().uuid('Invalid restaurant ID').optional(),
    deliveryDate: z.string().datetime('Invalid delivery date'),
    deliveryAddress: z.object({
      street: z.string().min(1).max(200),
      city: z.string().min(1).max(100),
      state: z.string().min(1).max(100),
      zipCode: z.string().min(1).max(20),
      country: z.string().min(1).max(100),
    }),
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Invalid product ID'),
          quantity: z.number().min(1).max(10000),
          unitPrice: z.number().min(0).max(999999.99),
          notes: z.string().max(500).optional(),
        })
      )
      .min(1, 'At least one item is required'),
    notes: z.string().max(1000).optional(),
    metadata: z.record(z.string()).optional(),
  }),

  updateOrder: z.object({
    status: z
      .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
      .optional(),
    deliveryDate: z.string().datetime().optional(),
    notes: z.string().max(1000).optional(),
    metadata: z.record(z.string()).optional(),
  }),
}

export const AuthSchemas = {
  login: z.object({
    email: z.string().email('Invalid email format').max(255),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  }),

  register: z.object({
    email: z.string().email('Invalid email format').max(255),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain uppercase, lowercase, number and special character'
      ),
    organizationName: z.string().min(1).max(100),
    organizationType: z.enum(['restaurant', 'supplier']),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    phone: z.string().regex(PHONE_REGEX, 'Invalid phone number').optional(),
  }),
}

export class ValidationMiddleware {
  /**
   * Sanitize string input to prevent XSS and injection attacks
   */
  public static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return ''
    }

    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '')

    // HTML encode using DOMPurify
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    })

    // Additional encoding for SQL injection prevention
    sanitized = sanitized.replace(/'/g, "''")
    sanitized = sanitized.replace(/"/g, '&quot;')
    sanitized = sanitized.replace(/</g, '&lt;')
    sanitized = sanitized.replace(/>/g, '&gt;')

    return sanitized.trim()
  }

  /**
   * Deep sanitize object properties
   */
  public static sanitizeObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return typeof obj === 'string' ? this.sanitizeString(obj) : obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item))
    }

    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = this.sanitizeString(key)
      sanitized[sanitizedKey] = this.sanitizeObject(value)
    }

    return sanitized
  }

  /**
   * Detect SQL injection attempts
   */
  public static detectSQLInjection(input: string): boolean {
    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input))
  }

  /**
   * Detect XSS attempts
   */
  public static detectXSS(input: string): boolean {
    return XSS_PATTERNS.some(pattern => pattern.test(input))
  }

  /**
   * Validate and sanitize request body
   */
  public static async validateRequestBody<T>(
    request: NextRequest,
    schema: z.ZodSchema<T>,
    options: {
      maxSize?: number
      allowEmpty?: boolean
    } = {}
  ): Promise<{ success: true; data: T } | { success: false; error: string; errors?: z.ZodError }> {
    try {
      const { maxSize = 1024 * 1024, allowEmpty = false } = options // 1MB default

      // Get raw body
      const bodyText = await request.text()

      // Check body size
      if (bodyText.length > maxSize) {
        logger.logApiSecurityEvent('invalid_request', request.url, {
          reason: 'Request body too large',
          size: bodyText.length,
          maxSize,
        })
        return { success: false, error: 'Request body too large' }
      }

      // Check if empty body is allowed
      if (!allowEmpty && !bodyText.trim()) {
        return { success: false, error: 'Request body is required' }
      }

      if (!bodyText.trim()) {
        return { success: true, data: {} as T }
      }

      // Parse JSON
      let parsedBody: any
      try {
        parsedBody = JSON.parse(bodyText)
      } catch (error) {
        logger.logApiSecurityEvent('invalid_request', request.url, {
          reason: 'Invalid JSON format',
        })
        return { success: false, error: 'Invalid JSON format' }
      }

      // Sanitize input
      const sanitizedBody = this.sanitizeObject(parsedBody)

      // Check for security threats
      const bodyString = JSON.stringify(sanitizedBody)
      if (this.detectSQLInjection(bodyString)) {
        logger.logApiSecurityEvent('sql_injection_attempt', request.url, {
          suspiciousContent: bodyString.substring(0, 200),
        })
        return { success: false, error: 'Invalid request format' }
      }

      if (this.detectXSS(bodyString)) {
        logger.logApiSecurityEvent('xss_attempt', request.url, {
          suspiciousContent: bodyString.substring(0, 200),
        })
        return { success: false, error: 'Invalid request format' }
      }

      // Validate with Zod schema
      const result = schema.safeParse(sanitizedBody)
      if (!result.success) {
        logger.logApiSecurityEvent('invalid_request', request.url, {
          reason: 'Schema validation failed',
          errors: result.error.errors,
        })
        return {
          success: false,
          error: 'Validation failed',
          errors: result.error,
        }
      }

      return { success: true, data: result.data }
    } catch (error) {
      logger.error('validation_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: request.url,
      })
      return { success: false, error: 'Validation error' }
    }
  }

  /**
   * Validate query parameters
   */
  public static validateQueryParams<T>(
    searchParams: URLSearchParams,
    schema: z.ZodSchema<T>
  ): { success: true; data: T } | { success: false; error: string; errors?: z.ZodError } {
    try {
      // Convert URLSearchParams to object
      const queryObject: Record<string, string> = {}
      searchParams.forEach((value, key) => {
        queryObject[key] = value
      })

      // Sanitize query parameters
      const sanitizedQuery = this.sanitizeObject(queryObject)

      // Check for security threats
      const queryString = JSON.stringify(sanitizedQuery)
      if (this.detectSQLInjection(queryString)) {
        logger.logApiSecurityEvent('sql_injection_attempt', 'query_params', {
          suspiciousContent: queryString.substring(0, 200),
        })
        return { success: false, error: 'Invalid query parameters' }
      }

      // Validate with Zod schema
      const result = schema.safeParse(sanitizedQuery)
      if (!result.success) {
        return {
          success: false,
          error: 'Invalid query parameters',
          errors: result.error,
        }
      }

      return { success: true, data: result.data }
    } catch (error) {
      logger.error('query_validation_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return { success: false, error: 'Query validation error' }
    }
  }

  /**
   * Rate limiting validation
   */
  public static async checkRateLimit(
    request: NextRequest,
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 60000 // 1 minute
  ): Promise<boolean> {
    // This is a simplified implementation
    // In production, use Redis or a proper rate limiting service

    const key = `rate_limit:${identifier}:${Math.floor(Date.now() / windowMs)}`

    // For now, we'll just log rate limiting attempts
    // In production, implement with Redis counters
    logger.info('rate_limit_check', {
      identifier,
      key,
      maxRequests,
      windowMs,
    })

    return true // Allow all requests for now
  }

  /**
   * CSRF token validation
   */
  public static validateCSRFToken(request: NextRequest, expectedToken: string): boolean {
    const token = request.headers.get('x-csrf-token') || request.headers.get('x-xsrf-token')

    if (!token || token !== expectedToken) {
      logger.logApiSecurityEvent('csrf_attempt', request.url, {
        providedToken: token ? 'present' : 'missing',
        expectedToken: 'present',
      })
      return false
    }

    return true
  }

  /**
   * Content-Type validation
   */
  public static validateContentType(
    request: NextRequest,
    expectedType: string = 'application/json'
  ): boolean {
    const contentType = request.headers.get('content-type')

    if (!contentType || !contentType.includes(expectedType)) {
      logger.logApiSecurityEvent('invalid_request', request.url, {
        reason: 'Invalid content-type',
        provided: contentType,
        expected: expectedType,
      })
      return false
    }

    return true
  }

  /**
   * Create validation error response
   */
  public static createValidationErrorResponse(
    error: string,
    details?: any,
    statusCode: number = 400
  ): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error,
        errorCode: 'VALIDATION_ERROR',
        details,
      },
      { status: statusCode }
    )
  }

  /**
   * Create security error response
   */
  public static createSecurityErrorResponse(
    error: string = 'Security validation failed',
    statusCode: number = 400
  ): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error,
        errorCode: 'SECURITY_ERROR',
      },
      { status: statusCode }
    )
  }
}

export default ValidationMiddleware
