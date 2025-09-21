# Technical Architecture - Authentication & Authorization System

## Document Information
- **Version**: 1.0
- **Date**: 2025-09-19
- **Status**: Final Architecture Specification
- **Implementation Priority**: P0 - Critical Path

---

## 1. Executive Summary

### 1.1 Architecture Overview
The authentication system extends the existing User Service (port 3001) with enhanced security features, MFA support, and super user capabilities. It integrates with the API Gateway for distributed authentication across all microservices.

### 1.2 Technology Stack
- **Authentication**: JWT (RS256) with asymmetric keys
- **Password Hashing**: Argon2id
- **Session Management**: Redis with sliding windows
- **MFA**: TOTP (RFC 6238) + SMS/Email OTP
- **Rate Limiting**: Redis-based with token bucket algorithm
- **Database**: PostgreSQL with SQLAlchemy ORM + Alembic (via FastAPI user-service)
- **Audit Logging**: Structured JSON to centralized log system

### 1.3 Key Design Decisions
1. **Extend User Service** instead of creating new service (reduce complexity)
2. **RS256 JWT** for stateless authentication with public key verification
3. **Redis Sessions** for real-time revocation and device tracking
4. **Argon2id** for future-proof password hashing
5. **Event-driven** audit logging for compliance

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                    │
│                            Port 3000                          │
└────────────────────┬─────────────────────────────────────────┘
                     │ HTTPS/JWT
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                      API Gateway (Port 8000)                  │
│  • JWT Validation    • Rate Limiting    • Request Routing    │
│  • RBAC Enforcement  • Session Check    • Audit Logging      │
└────────┬───────────────────────┬──────────────────┬─────────┘
         │                       │                   │
         ▼                       ▼                   ▼
┌─────────────────┐   ┌─────────────────┐  ┌─────────────────┐
│  User Service   │   │  Order Service  │  │ Other Services  │
│   Port 3001     │   │   Port 3002     │  │   Ports 3003+   │
│                 │   │                 │  │                 │
│ • Registration  │   │ • Protected     │  │ • Protected     │
│ • Login/Logout  │   │   Endpoints     │  │   Endpoints     │
│ • MFA           │   │                 │  │                 │
│ • Password Mgmt │   │                 │  │                 │
│ • Super User    │   │                 │  │                 │
└────────┬────────┘   └────────┬────────┘  └────────┬────────┘
         │                     │                     │
         └─────────────────────┴─────────────────────┘
                               │
                   ┌───────────┴───────────┐
                   │                       │
         ┌─────────▼─────────┐   ┌────────▼────────┐
         │   PostgreSQL      │   │     Redis       │
         │    Port 5432      │   │   Port 6379     │
         │                   │   │                 │
         │ • Users           │   │ • Sessions      │
         │ • Organizations   │   │ • Rate Limits   │
         │ • Audit Logs      │   │ • OTP Codes     │
         │ • MFA Settings    │   │ • Blacklist     │
         └───────────────────┘   └─────────────────┘
```

### 2.2 Authentication Flow Sequence

```
User          Frontend        API Gateway      User Service      Redis         PostgreSQL
 │                │                │                │              │               │
 │  Enter Creds   │                │                │              │               │
 ├───────────────►│                │                │              │               │
 │                │  POST /login   │                │              │               │
 │                ├───────────────►│                │              │               │
 │                │                │  Forward       │              │               │
 │                │                ├───────────────►│              │               │
 │                │                │                │  Check User  │               │
 │                │                │                ├──────────────────────────────►│
 │                │                │                │◄──────────────────────────────┤
 │                │                │                │              │               │
 │                │                │                │  Verify Pass │               │
 │                │                │                │  (Argon2id)  │               │
 │                │                │                │              │               │
 │                │                │                │  Check MFA   │               │
 │                │                │                ├──────────────────────────────►│
 │                │                │                │◄──────────────────────────────┤
 │                │                │                │              │               │
 │                │                │  Send OTP      │              │               │
 │◄───────────────┼────────────────┼────────────────┤              │               │
 │                │                │                │              │               │
 │  Enter OTP     │                │                │              │               │
 ├───────────────►│                │                │              │               │
 │                │  POST /verify  │                │              │               │
 │                ├───────────────►│                │              │               │
 │                │                │  Forward       │              │               │
 │                │                ├───────────────►│              │               │
 │                │                │                │  Verify OTP  │               │
 │                │                │                ├─────────────►│               │
 │                │                │                │◄─────────────┤               │
 │                │                │                │              │               │
 │                │                │                │ Create Session               │
 │                │                │                ├─────────────►│               │
 │                │                │                │              │               │
 │                │                │                │  Generate JWT│               │
 │                │                │◄────────────────┤  (RS256)    │               │
 │                │                │                │              │               │
 │                │  Return Tokens │                │              │               │
 │                │◄────────────────┤                │              │               │
 │  Store Tokens  │                │                │              │               │
 │◄────────────────┤                │                │              │               │
 │                │                │                │              │               │
```

---

## 3. Database Schema Extensions

### 3.1 User Model Enhancements

```prisma
model User {
  id                    String    @id @default(cuid())
  email                 String    @unique
  passwordHash          String?
  organizationId        String
  role                  UserRole
  
  // Authentication fields
  emailVerified         Boolean   @default(false)
  emailVerifiedAt       DateTime?
  phoneNumber           String?
  phoneVerified         Boolean   @default(false)
  phoneVerifiedAt       DateTime?
  
  // MFA fields
  mfaEnabled            Boolean   @default(false)
  mfaMethod             MfaMethod?
  mfaSecret             String?   // Encrypted TOTP secret
  mfaBackupCodes        String[]  // Encrypted backup codes
  mfaEnforcedAt         DateTime?
  
  // Super user fields
  isSuperUser           Boolean   @default(false)
  superUserActivatedAt  DateTime?
  superUserExpiresAt    DateTime?
  superUserActivatedBy  String?
  superUserReason       String?
  
  // Security fields
  passwordChangedAt     DateTime?
  passwordResetToken    String?
  passwordResetExpires  DateTime?
  failedLoginAttempts   Int       @default(0)
  lockedUntil           DateTime?
  lastLoginAt           DateTime?
  lastLoginIp           String?
  lastLoginUserAgent    String?
  
  // Session management
  tokenVersion          Int       @default(0) // Increment to invalidate all tokens
  activeSessions        Session[]
  
  // Compliance
  termsAcceptedAt       DateTime?
  privacyAcceptedAt     DateTime?
  marketingConsent      Boolean   @default(false)
  
  // Metadata
  isActive              Boolean   @default(true)
  metadata              Json      @default("{}")
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  // Relations
  organization          Organization      @relation(fields: [organizationId], references: [id])
  passwordHistory       PasswordHistory[]
  loginHistory          LoginAttempt[]
  auditLogs             AuditLog[]
  notifications         Notification[]
  securityQuestions     SecurityQuestion[]
  
  @@index([email])
  @@index([organizationId])
  @@index([isSuperUser])
  @@map("users")
}

enum MfaMethod {
  TOTP
  SMS
  EMAIL
  BIOMETRIC
}

model Session {
  id              String    @id @default(cuid())
  userId          String
  sessionToken    String    @unique
  refreshToken    String    @unique
  
  // Device information
  deviceId        String?
  deviceName      String?
  deviceType      String?   // mobile, desktop, tablet
  
  // Session metadata
  ipAddress       String
  userAgent       String
  location        String?   // Geo-located city/country
  
  // Token management
  accessTokenJti  String    @unique // JWT ID for revocation
  isActive        Boolean   @default(true)
  lastActivity    DateTime  @default(now())
  
  // Expiration
  expiresAt       DateTime
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([sessionToken])
  @@index([refreshToken])
  @@index([isActive])
  @@map("sessions")
}

model PasswordHistory {
  id              String    @id @default(cuid())
  userId          String
  passwordHash    String
  createdAt       DateTime  @default(now())
  
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@map("password_history")
}

model LoginAttempt {
  id              String    @id @default(cuid())
  email           String
  userId          String?
  
  // Attempt details
  success         Boolean
  failureReason   String?   // invalid_password, account_locked, mfa_failed
  
  // Request metadata
  ipAddress       String
  userAgent       String
  location        String?
  
  // Security analysis
  riskScore       Float?    @default(0) // 0-100
  suspicious      Boolean   @default(false)
  
  createdAt       DateTime  @default(now())
  
  user            User?     @relation(fields: [userId], references: [id])
  
  @@index([email])
  @@index([userId])
  @@index([ipAddress])
  @@index([createdAt])
  @@map("login_attempts")
}

model SecurityQuestion {
  id              String    @id @default(cuid())
  userId          String
  question        String
  answerHash      String    // Hashed answer
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("security_questions")
}

model Organization {
  // ... existing fields ...
  
  // Verification fields
  verificationLevel     Int       @default(1) // 1: Email, 2: Phone, 3: Business
  businessVerified      Boolean   @default(false)
  verifiedAt            DateTime?
  verificationDocuments Json      @default("[]")
  
  // Compliance
  complianceStatus      String    @default("pending")
  riskScore             Float     @default(0)
  
  @@map("organizations")
}
```

---

## 4. API Endpoints Specification

### 4.1 Authentication Endpoints

#### Registration Endpoints

```typescript
// Restaurant Registration
POST /api/auth/register/restaurant
Request:
{
  // Step 1: Basic Information
  "organizationName": string,
  "businessRegistrationNumber": string,
  "email": string,
  "phoneNumber": string,
  "password": string,
  
  // Step 2: Business Details
  "restaurantType": "fine_dining" | "fast_casual" | "qsr" | "cafe" | "other",
  "locationCount": number,
  "monthlyPurchaseVolume": number,
  "supplierCount": number,
  "industrySegment": string,
  
  // Step 3: Verification
  "termsAccepted": boolean,
  "privacyAccepted": boolean,
  "marketingConsent": boolean
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": string,
      "email": string,
      "role": string,
      "organizationId": string
    },
    "organization": {
      "id": string,
      "name": string,
      "type": "restaurant",
      "verificationLevel": 1
    },
    "tokens": {
      "accessToken": string,
      "refreshToken": string,
      "expiresIn": 900
    },
    "nextSteps": [
      "verify_email",
      "verify_phone",
      "upload_business_license"
    ]
  }
}

// Supplier Registration
POST /api/auth/register/supplier
Request:
{
  // Similar structure with supplier-specific fields
  "productCategories": string[],
  "serviceAreas": string[],
  "minimumOrderRequirements": object,
  "deliveryCapabilities": object,
  "paymentTerms": string[],
  "bankAccountDetails": object // Encrypted
}
```

#### Login Endpoints

```typescript
// Standard Login
POST /api/auth/login
Request:
{
  "email": string,
  "password": string,
  "deviceId": string?, // Optional device fingerprint
  "rememberMe": boolean?
}

Response (without MFA):
{
  "success": true,
  "data": {
    "user": UserProfile,
    "tokens": {
      "accessToken": string,
      "refreshToken": string,
      "expiresIn": 900
    },
    "session": {
      "id": string,
      "deviceId": string
    }
  }
}

Response (with MFA):
{
  "success": true,
  "requiresMfa": true,
  "mfaMethod": "TOTP" | "SMS" | "EMAIL",
  "challengeToken": string, // Temporary token for MFA verification
  "message": "Please enter your verification code"
}

// MFA Verification
POST /api/auth/mfa/verify
Request:
{
  "challengeToken": string,
  "code": string,
  "trustDevice": boolean?
}

Response:
{
  "success": true,
  "data": {
    "user": UserProfile,
    "tokens": {
      "accessToken": string,
      "refreshToken": string,
      "expiresIn": 900
    }
  }
}
```

#### Token Management

```typescript
// Refresh Token
POST /api/auth/refresh
Request:
{
  "refreshToken": string
}

Response:
{
  "success": true,
  "data": {
    "accessToken": string,
    "refreshToken": string, // New refresh token (rotation)
    "expiresIn": 900
  }
}

// Logout
POST /api/auth/logout
Headers: {
  "Authorization": "Bearer {accessToken}"
}
Request:
{
  "refreshToken": string,
  "logoutAll": boolean? // Logout from all devices
}

Response:
{
  "success": true,
  "message": "Successfully logged out"
}

// Revoke Token
POST /api/auth/revoke
Request:
{
  "token": string,
  "type": "access" | "refresh"
}
```

#### Password Management

```typescript
// Change Password
PUT /api/auth/password/change
Headers: {
  "Authorization": "Bearer {accessToken}"
}
Request:
{
  "currentPassword": string,
  "newPassword": string,
  "logoutOtherDevices": boolean?
}

// Forgot Password
POST /api/auth/password/forgot
Request:
{
  "email": string
}

// Reset Password
POST /api/auth/password/reset
Request:
{
  "token": string,
  "newPassword": string
}
```

#### MFA Management

```typescript
// Enable MFA
POST /api/auth/mfa/enable
Headers: {
  "Authorization": "Bearer {accessToken}"
}
Request:
{
  "method": "TOTP" | "SMS" | "EMAIL",
  "password": string // Re-authenticate
}

Response (TOTP):
{
  "success": true,
  "data": {
    "secret": string,
    "qrCode": string, // Base64 QR code image
    "backupCodes": string[]
  }
}

// Disable MFA
POST /api/auth/mfa/disable
Request:
{
  "password": string,
  "code": string // Current MFA code
}

// Generate Backup Codes
POST /api/auth/mfa/backup-codes
Response:
{
  "success": true,
  "data": {
    "backupCodes": string[]
  }
}
```

#### Super User Management

```typescript
// Activate Super User Mode
POST /api/auth/super-user/activate
Headers: {
  "Authorization": "Bearer {accessToken}"
}
Request:
{
  "password": string,
  "mfaCode": string,
  "reason": string, // Required justification
  "duration": number, // Hours (max 24)
  "approverUserId": string? // For dual approval
}

Response:
{
  "success": true,
  "data": {
    "activatedAt": string,
    "expiresAt": string,
    "newAccessToken": string // Token with super_user claim
  }
}

// Deactivate Super User Mode
POST /api/auth/super-user/deactivate
Headers: {
  "Authorization": "Bearer {accessToken}"
}

// Get Super User Activity
GET /api/auth/super-user/activity
Response:
{
  "success": true,
  "data": {
    "activations": [{
      "userId": string,
      "activatedAt": string,
      "expiresAt": string,
      "reason": string,
      "actions": AuditLog[]
    }]
  }
}
```

#### Session Management

```typescript
// List Active Sessions
GET /api/auth/sessions
Headers: {
  "Authorization": "Bearer {accessToken}"
}

Response:
{
  "success": true,
  "data": {
    "sessions": [{
      "id": string,
      "deviceName": string,
      "ipAddress": string,
      "location": string,
      "lastActivity": string,
      "current": boolean
    }]
  }
}

// Terminate Session
DELETE /api/auth/sessions/:sessionId
Headers: {
  "Authorization": "Bearer {accessToken}"
}
```

---

## 5. JWT Token Structure

### 5.1 Access Token Claims

```json
{
  // Standard JWT Claims
  "iss": "https://api.orderly.com",
  "sub": "user_cuid123",
  "aud": ["https://api.orderly.com"],
  "exp": 1234567890, // 15 minutes
  "iat": 1234567890,
  "jti": "jwt_unique_id", // For revocation
  
  // User Claims
  "userId": "user_cuid123",
  "email": "user@restaurant.com",
  "organizationId": "org_cuid456",
  "organizationType": "restaurant",
  
  // Role & Permissions
  "role": "restaurant_admin",
  "permissions": [
    "orders:create",
    "orders:read",
    "orders:update",
    "products:read",
    "billing:read"
  ],
  
  // Super User Claims (when activated)
  "isSuperUser": false,
  "superUserExpiresAt": null,
  
  // Session Claims
  "sessionId": "session_cuid789",
  "tokenVersion": 1, // For mass revocation
  
  // Security Claims
  "mfaVerified": true,
  "verificationLevel": 3
}
```

### 5.2 Refresh Token Structure

```json
{
  "jti": "refresh_unique_id",
  "sub": "user_cuid123",
  "sessionId": "session_cuid789",
  "tokenVersion": 1,
  "exp": 604800, // 7 days (or 30 days with remember me)
  "iat": 1234567890,
  "family": "family_id" // For refresh token rotation
}
```

---

## 6. Session Management Strategy

### 6.1 Redis Session Structure

```typescript
// Session Key Format: session:{userId}:{sessionId}
{
  "sessionId": "session_cuid789",
  "userId": "user_cuid123",
  "organizationId": "org_cuid456",
  
  // Token Management
  "accessTokenJti": "jwt_unique_id",
  "refreshTokenFamily": "family_id",
  "tokenVersion": 1,
  
  // Device Information
  "deviceId": "device_fingerprint",
  "deviceName": "Chrome on MacOS",
  "deviceType": "desktop",
  
  // Session Metadata
  "ipAddress": "203.0.113.0",
  "userAgent": "Mozilla/5.0...",
  "location": "Taipei, Taiwan",
  
  // Activity Tracking
  "createdAt": "2025-01-01T00:00:00Z",
  "lastActivity": "2025-01-01T00:15:00Z",
  "expiresAt": "2025-01-01T07:15:00Z",
  
  // Security Flags
  "isActive": true,
  "mfaVerified": true,
  "trustedDevice": false
}

// Rate Limit Key Format: ratelimit:{userId}:{endpoint}
{
  "count": 5,
  "windowStart": 1234567890,
  "blockedUntil": null
}

// OTP Key Format: otp:{type}:{userId}
{
  "code": "123456",
  "attempts": 0,
  "expiresAt": "2025-01-01T00:10:00Z"
}

// Token Blacklist Key Format: blacklist:{jti}
{
  "blacklisted": true,
  "reason": "manual_revocation",
  "expiresAt": "2025-01-01T00:30:00Z"
}
```

### 6.2 Session Management Rules

1. **Sliding Window**: Update `lastActivity` on each request, extend expiration
2. **Concurrent Sessions**: Maximum 5 active sessions per user
3. **Device Trust**: Remember device for 30 days after MFA verification
4. **Geo-Location Check**: Alert on login from new country
5. **Session Binding**: Validate IP + User Agent consistency

---

## 7. MFA Implementation

### 7.1 TOTP Implementation (RFC 6238)

```typescript
// TOTP Configuration
const TOTP_CONFIG = {
  issuer: "Orderly Platform",
  algorithm: "SHA256",
  digits: 6,
  period: 30, // seconds
  window: 1, // Accept codes from ±1 time windows
  qrCodeSize: 200
};

// Generate TOTP Secret
function generateTOTPSecret(user: User): TOTPSecret {
  const secret = speakeasy.generateSecret({
    name: `Orderly:${user.email}`,
    issuer: TOTP_CONFIG.issuer,
    length: 32
  });
  
  // Encrypt secret before storing
  const encrypted = encrypt(secret.base32, process.env.ENCRYPTION_KEY);
  
  return {
    secret: encrypted,
    qrCode: secret.otpauth_url,
    backupCodes: generateBackupCodes(8)
  };
}

// Verify TOTP Code
function verifyTOTPCode(user: User, code: string): boolean {
  const decrypted = decrypt(user.mfaSecret, process.env.ENCRYPTION_KEY);
  
  return speakeasy.totp.verify({
    secret: decrypted,
    encoding: 'base32',
    token: code,
    window: TOTP_CONFIG.window,
    algorithm: TOTP_CONFIG.algorithm
  });
}
```

### 7.2 SMS/Email OTP Implementation

```typescript
// OTP Generation
function generateOTP(length: number = 6): string {
  return crypto.randomInt(0, Math.pow(10, length))
    .toString()
    .padStart(length, '0');
}

// Store OTP in Redis
async function storeOTP(userId: string, type: 'SMS' | 'EMAIL'): Promise<string> {
  const code = generateOTP();
  const key = `otp:${type.toLowerCase()}:${userId}`;
  
  await redis.setex(key, 600, JSON.stringify({ // 10 minutes
    code,
    attempts: 0,
    createdAt: new Date().toISOString()
  }));
  
  return code;
}

// Send OTP
async function sendOTP(user: User, type: 'SMS' | 'EMAIL'): Promise<void> {
  const code = await storeOTP(user.id, type);
  
  if (type === 'SMS') {
    await twilioClient.messages.create({
      body: `Your Orderly verification code is: ${code}`,
      to: user.phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });
  } else {
    await sendEmail({
      to: user.email,
      subject: 'Orderly Verification Code',
      template: 'otp',
      data: { code, expiresIn: '10 minutes' }
    });
  }
}
```

---

## 8. Rate Limiting & Security

### 8.1 Rate Limiting Strategy

```typescript
// Rate Limit Configuration
const RATE_LIMITS = {
  // Authentication endpoints
  '/api/auth/login': {
    window: 900, // 15 minutes
    max: 5,
    blockDuration: 1800 // 30 minutes after max attempts
  },
  '/api/auth/register': {
    window: 3600, // 1 hour
    max: 3,
    blockDuration: 3600
  },
  '/api/auth/password/forgot': {
    window: 3600,
    max: 3,
    blockDuration: 7200
  },
  '/api/auth/mfa/verify': {
    window: 300, // 5 minutes
    max: 5,
    blockDuration: 900
  },
  
  // General API endpoints
  'default': {
    window: 60, // 1 minute
    max: 100, // 100 requests per minute
    blockDuration: 300
  },
  
  // Super user has higher limits
  'super_user': {
    window: 60,
    max: 1000,
    blockDuration: 0 // Never block super users
  }
};

// Rate Limiter Implementation
class RateLimiter {
  async checkLimit(userId: string, endpoint: string): Promise<RateLimitResult> {
    const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
    const key = `ratelimit:${userId}:${endpoint}`;
    
    const current = await redis.get(key);
    if (!current) {
      await redis.setex(key, config.window, 1);
      return { allowed: true, remaining: config.max - 1 };
    }
    
    const count = parseInt(current);
    if (count >= config.max) {
      // Block the user
      if (config.blockDuration > 0) {
        await redis.setex(`blocked:${userId}:${endpoint}`, config.blockDuration, 'true');
      }
      return { allowed: false, remaining: 0, retryAfter: config.blockDuration };
    }
    
    await redis.incr(key);
    return { allowed: true, remaining: config.max - count - 1 };
  }
}
```

### 8.2 Security Headers Configuration

```typescript
// Security Headers Middleware
const securityHeaders = {
  // HSTS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Prevent Clickjacking
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  
  // XSS Protection
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  
  // CSP
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.orderly.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};
```

### 8.3 Threat Detection

```typescript
// Suspicious Activity Detection
class ThreatDetector {
  async analyzLoginAttempt(attempt: LoginAttempt): Promise<ThreatAnalysis> {
    const riskScore = 0;
    const signals = [];
    
    // Check for brute force
    const recentAttempts = await this.getRecentAttempts(attempt.email, 3600);
    if (recentAttempts > 10) {
      riskScore += 30;
      signals.push('possible_brute_force');
    }
    
    // Check for credential stuffing
    const uniqueIPs = await this.getUniqueIPs(attempt.email, 3600);
    if (uniqueIPs > 5) {
      riskScore += 40;
      signals.push('multiple_ip_addresses');
    }
    
    // Check for impossible travel
    const lastLogin = await this.getLastLogin(attempt.userId);
    if (lastLogin) {
      const timeDiff = Date.now() - lastLogin.timestamp;
      const distance = geoDistance(lastLogin.location, attempt.location);
      const speed = distance / (timeDiff / 3600000); // km/h
      
      if (speed > 900) { // Faster than commercial flight
        riskScore += 50;
        signals.push('impossible_travel');
      }
    }
    
    // Check for known bad IPs
    if (await this.isBlacklistedIP(attempt.ipAddress)) {
      riskScore += 70;
      signals.push('blacklisted_ip');
    }
    
    // Check for Tor/VPN
    if (await this.isTorOrVPN(attempt.ipAddress)) {
      riskScore += 20;
      signals.push('tor_vpn_detected');
    }
    
    return {
      riskScore: Math.min(riskScore, 100),
      signals,
      requiresAdditionalVerification: riskScore > 50,
      shouldBlock: riskScore > 80
    };
  }
}
```

---

## 9. Integration Architecture

### 9.1 API Gateway Integration

```typescript
// API Gateway Auth Middleware Enhancement
export const enhancedAuthMiddleware = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify JWT with public key (RS256)
    const publicKey = await getPublicKey();
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://api.orderly.com',
      audience: 'https://api.orderly.com'
    }) as JWTPayload;
    
    // Check token blacklist
    if (await isTokenBlacklisted(decoded.jti)) {
      return res.status(401).json({ error: 'Token revoked' });
    }
    
    // Verify session in Redis
    const session = await getSession(decoded.sessionId);
    if (!session || !session.isActive) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    // Check token version (for mass revocation)
    if (decoded.tokenVersion !== session.tokenVersion) {
      return res.status(401).json({ error: 'Token version mismatch' });
    }
    
    // Update session activity
    await updateSessionActivity(decoded.sessionId);
    
    // Attach user context
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      organizationId: decoded.organizationId,
      role: decoded.role,
      permissions: decoded.permissions,
      isSuperUser: decoded.isSuperUser,
      sessionId: decoded.sessionId,
      verificationLevel: decoded.verificationLevel
    };
    
    // Add security headers
    res.setHeader('X-User-ID', decoded.userId);
    res.setHeader('X-Session-ID', decoded.sessionId);
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({ 
      error: 'Authentication failed' 
    });
  }
};
```

### 9.2 Microservice Communication

```typescript
// Service-to-Service Authentication
class ServiceAuth {
  private serviceTokens = new Map<string, string>();
  
  async getServiceToken(targetService: string): Promise<string> {
    // Check cache
    const cached = this.serviceTokens.get(targetService);
    if (cached && !this.isExpired(cached)) {
      return cached;
    }
    
    // Generate new service token
    const token = jwt.sign(
      {
        service: 'api-gateway',
        target: targetService,
        permissions: ['internal:all']
      },
      process.env.SERVICE_SECRET,
      {
        expiresIn: '1h',
        algorithm: 'HS256'
      }
    );
    
    this.serviceTokens.set(targetService, token);
    return token;
  }
  
  // Add to internal service calls
  async callService(service: string, path: string, options: RequestOptions) {
    const token = await this.getServiceToken(service);
    
    return fetch(`${service}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        'X-Service-Token': token,
        'X-Correlation-ID': req.correlationId,
        'X-User-Context': JSON.stringify(req.user)
      }
    });
  }
}
```

---

## 10. Super User Permission System

### 10.1 Super User Activation Workflow

```typescript
class SuperUserManager {
  async activateSuperUser(
    requestingUser: User,
    reason: string,
    duration: number = 1, // hours
    approverId?: string
  ): Promise<SuperUserActivation> {
    // Validate requesting user
    if (!this.canActivateSuperUser(requestingUser)) {
      throw new ForbiddenError('User not authorized for super user activation');
    }
    
    // Check if already super user
    if (requestingUser.isSuperUser && requestingUser.superUserExpiresAt > new Date()) {
      throw new ConflictError('Super user mode already active');
    }
    
    // Require dual approval for extended duration
    if (duration > 1 && !approverId) {
      throw new ValidationError('Dual approval required for extended super user access');
    }
    
    // Verify approver if provided
    if (approverId) {
      const approver = await getUserById(approverId);
      if (!this.canApproveSuperUser(approver)) {
        throw new ForbiddenError('Approver not authorized');
      }
      
      // Send approval request
      await this.sendApprovalRequest(requestingUser, approver, reason, duration);
      return { status: 'pending_approval' };
    }
    
    // Activate super user
    const expiresAt = new Date(Date.now() + duration * 3600000);
    
    await prisma.user.update({
      where: { id: requestingUser.id },
      data: {
        isSuperUser: true,
        superUserActivatedAt: new Date(),
        superUserExpiresAt: expiresAt,
        superUserActivatedBy: approverId || 'self',
        superUserReason: reason
      }
    });
    
    // Audit log
    await this.auditLog({
      action: 'super_user_activated',
      userId: requestingUser.id,
      metadata: {
        reason,
        duration,
        expiresAt,
        approverId
      }
    });
    
    // Send notifications
    await this.notifySecurityTeam(requestingUser, reason, duration);
    
    // Generate new token with super user claims
    const newToken = await this.generateSuperUserToken(requestingUser);
    
    return {
      status: 'activated',
      expiresAt,
      newAccessToken: newToken
    };
  }
  
  private canActivateSuperUser(user: User): boolean {
    return user.role === 'platform_admin' && 
           user.mfaEnabled && 
           user.verificationLevel === 3;
  }
  
  private canApproveSuperUser(user: User): boolean {
    return user.role === 'platform_admin' && 
           !user.isSuperUser; // Cannot approve if already super user
  }
}
```

### 10.2 Super User Audit Trail

```typescript
// Enhanced Audit Logging for Super Users
class SuperUserAuditLogger {
  async logAction(user: User, action: AuditAction): Promise<void> {
    const auditEntry = {
      id: generateId(),
      userId: user.id,
      action: action.type,
      entityType: action.entityType,
      entityId: action.entityId,
      
      // Enhanced metadata for super users
      metadata: {
        ...action.metadata,
        isSuperUserAction: user.isSuperUser,
        superUserReason: user.superUserReason,
        organizationsCrossed: action.crossOrganizationAccess ? 
          action.organizationIds : [],
        dataClassification: action.dataClassification,
        complianceFlags: action.complianceFlags
      },
      
      // Request context
      ipAddress: action.ipAddress,
      userAgent: action.userAgent,
      correlationId: action.correlationId,
      
      // Timestamps
      createdAt: new Date()
    };
    
    // Store in database
    await prisma.auditLog.create({ data: auditEntry });
    
    // Send to SIEM
    await this.sendToSIEM(auditEntry);
    
    // Real-time alerting for sensitive actions
    if (this.isSensitiveAction(action)) {
      await this.alertSecurityTeam(auditEntry);
    }
  }
  
  private isSensitiveAction(action: AuditAction): boolean {
    const sensitiveActions = [
      'user_data_export',
      'bulk_data_modification',
      'permission_override',
      'cross_org_access',
      'system_configuration_change'
    ];
    
    return sensitiveActions.includes(action.type) ||
           action.affectedRecords > 100 ||
           action.dataClassification === 'sensitive';
  }
}
```

---

## 11. Audit Logging Architecture

### 11.1 Audit Event Structure

```typescript
interface AuditEvent {
  // Event Identification
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  
  // Actor Information
  actor: {
    userId?: string;
    email?: string;
    role?: string;
    organizationId?: string;
    isSuperUser: boolean;
    sessionId?: string;
    ipAddress: string;
    userAgent: string;
    location?: string;
  };
  
  // Target Information
  target: {
    type: string; // user, order, product, etc.
    id: string;
    organizationId?: string;
    previousState?: any;
    newState?: any;
  };
  
  // Action Details
  action: {
    type: string; // create, update, delete, read, approve
    method: string; // HTTP method
    endpoint: string;
    parameters?: Record<string, any>;
    result: 'success' | 'failure';
    errorMessage?: string;
  };
  
  // Context
  context: {
    correlationId: string;
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
    serviceName: string;
    environment: string;
  };
  
  // Compliance & Security
  compliance: {
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
    regulatoryFlags: string[]; // GDPR, HIPAA, etc.
    retentionPeriod: number; // days
    encryptionRequired: boolean;
  };
}

enum AuditEventType {
  // Authentication Events
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_REGISTER = 'user.register',
  PASSWORD_CHANGE = 'password.change',
  PASSWORD_RESET = 'password.reset',
  MFA_ENABLE = 'mfa.enable',
  MFA_DISABLE = 'mfa.disable',
  MFA_VERIFY = 'mfa.verify',
  
  // Authorization Events  
  PERMISSION_GRANT = 'permission.grant',
  PERMISSION_REVOKE = 'permission.revoke',
  ROLE_ASSIGN = 'role.assign',
  SUPER_USER_ACTIVATE = 'super_user.activate',
  SUPER_USER_DEACTIVATE = 'super_user.deactivate',
  
  // Security Events
  SUSPICIOUS_ACTIVITY = 'security.suspicious',
  RATE_LIMIT_EXCEEDED = 'security.rate_limit',
  INVALID_TOKEN = 'security.invalid_token',
  SESSION_HIJACK_ATTEMPT = 'security.session_hijack',
  
  // Data Events
  DATA_CREATE = 'data.create',
  DATA_READ = 'data.read',
  DATA_UPDATE = 'data.update',
  DATA_DELETE = 'data.delete',
  DATA_EXPORT = 'data.export',
  
  // Business Events
  ORDER_CREATE = 'order.create',
  ORDER_APPROVE = 'order.approve',
  PAYMENT_PROCESS = 'payment.process',
  RECONCILIATION_COMPLETE = 'reconciliation.complete'
}
```

### 11.2 Audit Pipeline

```typescript
class AuditPipeline {
  private queue: Queue;
  private storage: AuditStorage;
  private analyzer: SecurityAnalyzer;
  
  async process(event: AuditEvent): Promise<void> {
    // Step 1: Validate and enrich
    const enriched = await this.enrich(event);
    
    // Step 2: Store immediately (write-through)
    await this.storage.write(enriched);
    
    // Step 3: Queue for analysis (async)
    await this.queue.push({
      type: 'audit_analysis',
      data: enriched
    });
    
    // Step 4: Real-time security analysis
    const threat = await this.analyzer.analyze(enriched);
    if (threat.severity === 'critical') {
      await this.handleCriticalThreat(threat);
    }
  }
  
  private async enrich(event: AuditEvent): Promise<EnrichedAuditEvent> {
    return {
      ...event,
      enrichment: {
        geoLocation: await this.getGeoLocation(event.actor.ipAddress),
        deviceFingerprint: await this.getDeviceFingerprint(event.actor.userAgent),
        riskScore: await this.calculateRiskScore(event),
        anomalyFlags: await this.detectAnomalies(event)
      }
    };
  }
  
  private async handleCriticalThreat(threat: ThreatAnalysis): Promise<void> {
    // Immediate actions
    await Promise.all([
      this.lockUserAccount(threat.userId),
      this.revokeAllSessions(threat.userId),
      this.notifySecurityTeam(threat),
      this.createIncident(threat)
    ]);
  }
}
```

---

## 12. Performance Optimization

### 12.1 Caching Strategy

```typescript
// Multi-layer Cache Architecture
class AuthCache {
  private l1Cache: NodeCache; // In-memory cache (process level)
  private l2Cache: Redis;      // Distributed cache
  
  // Cache Configuration
  private readonly TTL = {
    publicKey: 3600,      // 1 hour
    userProfile: 300,     // 5 minutes
    permissions: 600,     // 10 minutes
    session: 900,         // 15 minutes
    rateLimit: 60        // 1 minute
  };
  
  async getUser(userId: string): Promise<User | null> {
    // L1 Cache Check
    const l1Result = this.l1Cache.get<User>(`user:${userId}`);
    if (l1Result) return l1Result;
    
    // L2 Cache Check
    const l2Result = await this.l2Cache.get(`user:${userId}`);
    if (l2Result) {
      const user = JSON.parse(l2Result);
      this.l1Cache.set(`user:${userId}`, user, this.TTL.userProfile);
      return user;
    }
    
    // Database Fetch
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true }
    });
    
    if (user) {
      // Write-through caching
      await this.l2Cache.setex(
        `user:${userId}`,
        this.TTL.userProfile,
        JSON.stringify(user)
      );
      this.l1Cache.set(`user:${userId}`, user, this.TTL.userProfile);
    }
    
    return user;
  }
  
  async invalidateUser(userId: string): Promise<void> {
    // Invalidate all layers
    this.l1Cache.del(`user:${userId}`);
    await this.l2Cache.del(`user:${userId}`);
    
    // Invalidate related caches
    await this.l2Cache.del(`permissions:${userId}`);
    await this.l2Cache.del(`sessions:${userId}:*`);
  }
}
```

### 12.2 Database Query Optimization

```sql
-- Optimized indexes for authentication queries
CREATE INDEX idx_users_email_active ON users(email, is_active) WHERE is_active = true;
CREATE INDEX idx_users_org_role ON users(organization_id, role);
CREATE INDEX idx_sessions_user_active ON sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_sessions_token ON sessions(session_token) USING hash;
CREATE INDEX idx_login_attempts_email_time ON login_attempts(email, created_at DESC);
CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, created_at DESC);

-- Partial indexes for super users
CREATE INDEX idx_users_super_active ON users(id) 
  WHERE is_super_user = true AND super_user_expires_at > NOW();

-- Composite indexes for common queries
CREATE INDEX idx_users_verification ON users(email_verified, phone_verified, organization_id);
```

---

## 13. Deployment & Migration Strategy

### 13.1 Phased Rollout Plan

```yaml
# Phase 1: Foundation (Week 1-2)
- Database schema migration
- Basic authentication endpoints
- JWT implementation with RS256
- Password hashing with Argon2id
- Session management in Redis

# Phase 2: Enhanced Security (Week 3-4)
- MFA implementation (TOTP, SMS, Email)
- Rate limiting
- Threat detection
- Audit logging

# Phase 3: Super User System (Week 5)
- Super user activation workflow
- Enhanced audit trail
- Dual approval mechanism
- Time-bound permissions

# Phase 4: Business Verification (Week 6)
- Government API integration
- Document upload system
- Verification workflow
- Progressive access control

# Phase 5: Production Hardening (Week 7-8)
- Performance optimization
- Security testing
- Load testing
- Documentation
```

### 13.2 Migration Scripts

```typescript
// User Migration Script
async function migrateUsers(): Promise<void> {
  const batchSize = 100;
  let offset = 0;
  
  while (true) {
    const users = await prisma.user.findMany({
      skip: offset,
      take: batchSize,
      where: { passwordHash: null }
    });
    
    if (users.length === 0) break;
    
    for (const user of users) {
      // Generate secure password
      const tempPassword = generateSecurePassword();
      const hash = await argon2.hash(tempPassword, ARGON2_CONFIG);
      
      // Update user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hash,
          passwordChangedAt: new Date(),
          tokenVersion: 1,
          emailVerified: false,
          phoneVerified: false
        }
      });
      
      // Send password reset email
      await sendPasswordResetEmail(user.email, tempPassword);
      
      // Audit log
      await auditLog({
        action: 'user_migration',
        userId: user.id,
        metadata: { migrationBatch: offset / batchSize }
      });
    }
    
    offset += batchSize;
    console.log(`Migrated ${offset} users...`);
  }
}
```

---

## 14. Monitoring & Alerting

### 14.1 Key Metrics

```typescript
// Authentication Metrics
const AUTH_METRICS = {
  // Performance Metrics
  'auth.login.duration': histogram({
    name: 'auth_login_duration_seconds',
    help: 'Login request duration',
    buckets: [0.1, 0.5, 1, 2, 5]
  }),
  
  // Success/Failure Rates
  'auth.login.success': counter({
    name: 'auth_login_success_total',
    help: 'Successful login attempts'
  }),
  
  'auth.login.failure': counter({
    name: 'auth_login_failure_total',
    help: 'Failed login attempts',
    labelNames: ['reason']
  }),
  
  // MFA Metrics
  'auth.mfa.enrolled': gauge({
    name: 'auth_mfa_enrolled_users',
    help: 'Number of users with MFA enabled'
  }),
  
  // Security Metrics
  'auth.suspicious.activity': counter({
    name: 'auth_suspicious_activity_total',
    help: 'Suspicious authentication attempts',
    labelNames: ['type']
  }),
  
  // Session Metrics
  'auth.sessions.active': gauge({
    name: 'auth_sessions_active',
    help: 'Number of active sessions'
  }),
  
  // Super User Metrics
  'auth.superuser.activations': counter({
    name: 'auth_superuser_activations_total',
    help: 'Super user mode activations'
  })
};
```

### 14.2 Alert Rules

```yaml
# Prometheus Alert Rules
groups:
  - name: authentication
    rules:
      - alert: HighFailedLoginRate
        expr: rate(auth_login_failure_total[5m]) > 10
        for: 5m
        annotations:
          summary: "High failed login rate detected"
          description: "Failed login rate is {{ $value }} per second"
      
      - alert: SuperUserActivation
        expr: increase(auth_superuser_activations_total[1m]) > 0
        annotations:
          summary: "Super user mode activated"
          description: "User {{ $labels.user_id }} activated super user mode"
      
      - alert: SuspiciousActivity
        expr: rate(auth_suspicious_activity_total[5m]) > 5
        for: 5m
        annotations:
          summary: "Suspicious authentication activity detected"
          description: "Type: {{ $labels.type }}, Rate: {{ $value }}"
      
      - alert: MFAAdoptionLow
        expr: auth_mfa_enrolled_users / auth_total_users < 0.6
        for: 24h
        annotations:
          summary: "MFA adoption below target"
          description: "Only {{ $value | humanizePercentage }} of users have MFA enabled"
```

---

## 15. Security Checklist

### 15.1 Implementation Checklist

- [ ] **Password Security**
  - [ ] Argon2id hashing implemented
  - [ ] Password complexity validation
  - [ ] Password history check (last 5)
  - [ ] Secure password reset flow
  - [ ] Password strength meter UI

- [ ] **JWT Security**
  - [ ] RS256 asymmetric signing
  - [ ] Short-lived access tokens (15 min)
  - [ ] Refresh token rotation
  - [ ] JTI for revocation support
  - [ ] Token version for mass revocation

- [ ] **MFA Implementation**
  - [ ] TOTP support with QR codes
  - [ ] SMS OTP with rate limiting
  - [ ] Email OTP as fallback
  - [ ] Backup codes generation
  - [ ] Device trust management

- [ ] **Session Security**
  - [ ] Secure session storage in Redis
  - [ ] Session binding (IP + UA)
  - [ ] Concurrent session limits
  - [ ] Session activity tracking
  - [ ] Automatic session expiry

- [ ] **Rate Limiting**
  - [ ] Per-endpoint rate limits
  - [ ] Progressive blocking
  - [ ] IP-based rate limiting
  - [ ] User-based rate limiting
  - [ ] Bypass for super users

- [ ] **Audit & Compliance**
  - [ ] Comprehensive audit logging
  - [ ] Structured log format
  - [ ] Log retention policies
  - [ ] GDPR compliance
  - [ ] Data encryption at rest

- [ ] **Security Headers**
  - [ ] HSTS with preload
  - [ ] CSP policy configured
  - [ ] X-Frame-Options DENY
  - [ ] X-Content-Type-Options
  - [ ] Referrer Policy

- [ ] **Threat Detection**
  - [ ] Brute force detection
  - [ ] Impossible travel check
  - [ ] Tor/VPN detection
  - [ ] Anomaly detection
  - [ ] Real-time alerting

---

## 16. API Testing Strategy

### 16.1 Test Coverage Requirements

```typescript
// Unit Test Example
describe('AuthService', () => {
  describe('login', () => {
    it('should successfully authenticate valid credentials', async () => {
      const result = await authService.login({
        email: 'test@example.com',
        password: 'ValidPassword123!'
      });
      
      expect(result.success).toBe(true);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });
    
    it('should enforce rate limiting after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await authService.login({
          email: 'test@example.com',
          password: 'WrongPassword'
        });
      }
      
      const result = await authService.login({
        email: 'test@example.com',
        password: 'ValidPassword123!'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});

// Integration Test Example
describe('Auth API Integration', () => {
  it('should complete full authentication flow with MFA', async () => {
    // Step 1: Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'mfa@example.com',
        password: 'SecurePassword123!'
      });
    
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.requiresMfa).toBe(true);
    
    const challengeToken = loginRes.body.challengeToken;
    
    // Step 2: Verify MFA
    const mfaCode = await getMFACodeFromTestHelper();
    const mfaRes = await request(app)
      .post('/api/auth/mfa/verify')
      .send({
        challengeToken,
        code: mfaCode
      });
    
    expect(mfaRes.status).toBe(200);
    expect(mfaRes.body.data.tokens.accessToken).toBeDefined();
  });
});
```

---

## 17. Documentation Requirements

### 17.1 API Documentation (OpenAPI)

```yaml
openapi: 3.0.0
info:
  title: Orderly Authentication API
  version: 1.0.0
  description: Authentication and authorization endpoints

paths:
  /api/auth/login:
    post:
      summary: User login
      tags: [Authentication]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 12
                deviceId:
                  type: string
                rememberMe:
                  type: boolean
      responses:
        200:
          description: Login successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoginResponse'
        401:
          description: Invalid credentials
        429:
          description: Rate limit exceeded

components:
  schemas:
    LoginResponse:
      type: object
      properties:
        success:
          type: boolean
        requiresMfa:
          type: boolean
        data:
          type: object
          properties:
            user:
              $ref: '#/components/schemas/UserProfile'
            tokens:
              $ref: '#/components/schemas/TokenPair'

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

---

## 18. Conclusion

This comprehensive technical architecture provides a secure, scalable, and maintainable authentication system for the Orderly platform. The design emphasizes:

1. **Security First**: Industry-leading practices with Argon2id, RS256 JWT, and comprehensive MFA
2. **Performance**: Multi-layer caching, optimized queries, and efficient session management
3. **Scalability**: Stateless authentication with distributed session store
4. **Compliance**: Complete audit trail and GDPR/SOC2 compliance features
5. **User Experience**: Progressive verification with minimal friction
6. **Monitoring**: Comprehensive metrics and real-time threat detection

The phased implementation approach ensures minimal disruption to existing services while progressively enhancing security capabilities. The super user system provides necessary administrative capabilities with strong safeguards and complete audit trails.

---

## Document Control

- **Version**: 1.0
- **Date**: 2025-09-19
- **Author**: System Architecture Team
- **Review**: Security Team, Engineering Lead
- **Next Review**: 2025-02-19
