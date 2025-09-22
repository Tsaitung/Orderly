# Product Requirements Document - Authentication & Registration Module

## Document Information

- **Version**: 1.0
- **Date**: 2025-09-19
- **Owner**: Product Team
- **Status**: In Review
- **Implementation Priority**: P0 - Critical

---

## 1. Executive Summary

### 1.1 Product Context

The Orderly platform requires a secure yet simple authentication system that supports B2B registration for restaurants and suppliers while maintaining enterprise-grade security. This module will serve as the gateway for all users accessing the platform and must integrate seamlessly with our existing role-based access control (RBAC) system.

### 1.2 Business Objectives

- Enable rapid onboarding of restaurants and suppliers (< 5 minutes registration)
- Maintain 99.9% authentication service availability
- Achieve 0% unauthorized access incidents
- Support 10,000+ concurrent authenticated users
- Enable super user capabilities for critical platform operations

### 1.3 Success Metrics

| Metric                       | Target           | Measurement Method      |
| ---------------------------- | ---------------- | ----------------------- |
| Registration Completion Rate | > 85%            | Funnel analysis         |
| Average Registration Time    | < 5 minutes      | Time tracking           |
| Login Success Rate           | > 95%            | Authentication logs     |
| Password Recovery Success    | > 90%            | Recovery flow analytics |
| MFA Adoption Rate            | > 60% for admins | User settings analysis  |
| Security Incident Rate       | 0 breaches       | Security monitoring     |

---

## 2. User Roles & Permissions

### 2.1 Existing Role Structure

Based on current system analysis:

- **restaurant_admin**: Full restaurant organization control
- **restaurant_manager**: Operational management without settings
- **restaurant_operator**: Order creation and basic operations
- **supplier_admin**: Full supplier organization control
- **supplier_manager**: Product and order management
- **platform_admin**: Platform-wide administration

### 2.2 New Super User Permission

**Role Name**: `super_user`

**Definition**: A cross-organizational permission level that transcends standard role boundaries for critical platform operations and emergency interventions.

**Key Characteristics**:

- Not a standalone role but an additional permission flag
- Can be assigned to any existing role (e.g., platform_admin with super_user)
- Time-bound activation (expires after 24 hours by default)
- Requires multi-factor authentication for activation
- All actions are audit-logged with enhanced detail

**Use Cases**:

1. **Emergency Access**: Resolve critical system issues across organizations
2. **Data Migration**: Bulk operations during system upgrades
3. **Compliance Audits**: Access all data for regulatory requirements
4. **Security Incident Response**: Investigate and contain security breaches
5. **Critical Bug Fixes**: Apply patches that require cross-tenant access
6. **Customer Support Escalation**: Resolve complex multi-organization issues

**Permissions Matrix**:
| Permission | Standard Admin | Super User |
|------------|---------------|------------|
| View own organization data | ✓ | ✓ |
| Modify own organization | ✓ | ✓ |
| View all organizations | ✗ | ✓ |
| Modify any organization | ✗ | ✓ (with audit) |
| Access system logs | Limited | Full |
| Override business rules | ✗ | ✓ (with justification) |
| Bypass API rate limits | ✗ | ✓ |
| Emergency system shutdown | ✗ | ✓ |

---

## 3. User Registration Flow

### 3.1 Registration Types

#### 3.1.1 Restaurant Registration

**Entry Points**:

- Public website registration page
- Partner referral links
- Sales team invitation

**Required Information**:

```
Step 1: Basic Information (30 seconds)
- Restaurant Name*
- Business Registration Number*
- Primary Contact Email*
- Mobile Phone Number*
- Password* (with strength indicator)

Step 2: Business Details (60 seconds)
- Restaurant Type (select from list)
- Number of Locations (1, 2-5, 6-10, 10+)
- Average Monthly Purchase Volume (range selector)
- Current Suppliers Count (approximate)
- Industry Segment (Fine Dining, Fast Casual, QSR, etc.)

Step 3: Verification (90 seconds)
- Email OTP verification
- SMS verification code
- Business license upload (optional, can complete later)
- Terms of Service acceptance
- Privacy Policy consent
```

#### 3.1.2 Supplier Registration

**Entry Points**:

- Supplier portal registration
- Platform invitation
- API-based registration

**Required Information**:

```
Step 1: Company Information (30 seconds)
- Company Name*
- Business Registration Number*
- Tax ID Number*
- Primary Contact Email*
- Mobile Phone Number*
- Password* (with strength indicator)

Step 2: Business Profile (90 seconds)
- Product Categories (multi-select)
- Service Areas (city/region selection)
- Minimum Order Requirements
- Delivery Capabilities
- Payment Terms Offered
- Current Customer Count (range)

Step 3: Verification (120 seconds)
- Email OTP verification
- SMS verification code
- Business license upload*
- Food safety certification (if applicable)
- Bank account verification (for payments)
- Terms of Service acceptance
- Supplier Agreement consent
```

### 3.2 Registration Validation Rules

#### Email Validation

- Format: RFC 5322 compliant
- Domain: Must not be from disposable email services
- Uniqueness: Check across all organizations
- Verification: 6-digit OTP valid for 10 minutes

#### Password Requirements

- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character
- Not in common password database
- Not similar to email or organization name
- Password history check (cannot reuse last 5 passwords)

#### Business Validation

- Business Registration Number: Format validation + government API check
- Tax ID: Checksum validation
- Phone Number: E.164 format + SMS deliverability check

### 3.3 Registration User Stories

**Story 1**: As a restaurant owner, I want to register quickly using my business information so that I can start ordering from suppliers immediately.

**Acceptance Criteria**:

- Registration completes in under 5 minutes
- Business verification happens asynchronously
- Can browse suppliers before full verification
- Receive welcome email with next steps

**Story 2**: As a supplier, I want to provide detailed business information during registration so that restaurants can find and trust my services.

**Acceptance Criteria**:

- All product categories are selectable
- Can upload multiple certifications
- Bank verification completes within 24 hours
- Profile preview before submission

---

## 4. Login Flow

### 4.1 Standard Login Process

```
1. User enters email/username
2. System checks if MFA is required
3. User enters password
4. If MFA enabled:
   - Send OTP to registered device
   - User enters OTP
5. System validates credentials
6. Generate JWT tokens (access + refresh)
7. Log authentication event
8. Redirect to dashboard
```

### 4.2 Multi-Factor Authentication (MFA)

#### MFA Requirements by Role

| Role                | MFA Requirement | Methods Allowed  |
| ------------------- | --------------- | ---------------- |
| restaurant_operator | Optional        | SMS, Email       |
| restaurant_manager  | Recommended     | SMS, Email, TOTP |
| restaurant_admin    | Recommended     | SMS, TOTP        |
| supplier_manager    | Recommended     | SMS, Email, TOTP |
| supplier_admin      | Mandatory       | SMS, TOTP        |
| platform_admin      | Mandatory       | TOTP only        |
| super_user          | Mandatory       | TOTP + Biometric |

#### MFA Methods

1. **SMS OTP**: 6-digit code, 5-minute validity
2. **Email OTP**: 6-digit code, 10-minute validity
3. **TOTP (Time-based OTP)**: Google Authenticator, Authy
4. **Biometric**: FaceID, TouchID (mobile apps)

### 4.3 Login Security Features

#### Rate Limiting

- 5 failed attempts: 5-minute lockout
- 10 failed attempts: 30-minute lockout
- 15 failed attempts: Account locked, admin intervention required

#### Session Management

- Access token: 15 minutes (sliding window)
- Refresh token: 7 days (rotated on use)
- Maximum 5 concurrent sessions per user
- Session binding to IP + User Agent

#### Suspicious Activity Detection

- Login from new location: Email alert
- Login from new device: MFA required
- Multiple failed attempts: CAPTCHA required
- Unusual time patterns: Additional verification

### 4.4 Login User Stories

**Story 3**: As a returning user, I want to login quickly with remember me functionality so that I don't have to enter credentials repeatedly.

**Acceptance Criteria**:

- "Remember me" extends refresh token to 30 days
- Biometric login available on mobile devices
- Auto-fill supported for password managers
- Single sign-on for multiple restaurant locations

**Story 4**: As a platform admin, I want enhanced security during login so that administrative access is protected.

**Acceptance Criteria**:

- MFA always required
- Login notification to all admin emails
- Session recorded for audit
- Restricted IP ranges (configurable)

---

## 5. Password Recovery Flow

### 5.1 Recovery Process

```
1. User clicks "Forgot Password"
2. Enter email address
3. CAPTCHA verification
4. System sends recovery email
5. User clicks secure link (valid 1 hour)
6. Identity verification:
   - Answer security question, OR
   - Enter SMS OTP, OR
   - Confirm recent transaction
7. Set new password
8. Force logout all sessions
9. Send confirmation email
10. Require MFA on next login
```

### 5.2 Recovery Security Measures

- **Link Security**: One-time use, cryptographically secure token
- **Time Limit**: 1-hour validity for recovery links
- **Rate Limiting**: Maximum 3 recovery attempts per day
- **Notification**: Email sent for both request and completion
- **Audit Trail**: All recovery attempts logged

### 5.3 Account Recovery User Stories

**Story 5**: As a user who forgot my password, I want multiple recovery options so that I can regain access even if I lose access to my primary email.

**Acceptance Criteria**:

- Can recover via email or SMS
- Security questions as backup option
- Admin-assisted recovery available
- Clear instructions at each step

---

## 6. Account Verification Process

### 6.1 Verification Levels

#### Level 1: Email Verified (Immediate)

- Can browse platform
- View supplier catalogs
- Save favorites
- Limited to 3 test orders

#### Level 2: Phone Verified (5 minutes)

- Create real orders (with limits)
- Access basic analytics
- Join supplier networks
- Payment COD only

#### Level 3: Business Verified (24-48 hours)

- Full platform access
- Unlimited orders
- All payment methods
- API access
- Contract pricing

### 6.2 Verification Methods

#### Automated Verification

- Email domain validation
- Phone carrier verification
- Business registry API check
- Bank account micro-deposit
- Social media presence check

#### Manual Verification

- Document review by operations team
- Video call verification for high-value accounts
- On-site verification for enterprise accounts
- Reference checks with existing partners

### 6.3 Verification User Stories

**Story 6**: As a platform operator, I want automated business verification so that legitimate businesses can start using the platform quickly.

**Acceptance Criteria**:

- 80% of verifications complete automatically
- Clear status indicators for users
- Automated retry for failed verifications
- Manual review queue for edge cases

---

## 7. Security Requirements

### 7.1 Authentication Security

#### Encryption Requirements

- Passwords: Argon2id hashing (memory: 64MB, iterations: 3, parallelism: 1)
- Data in transit: TLS 1.3 minimum
- Data at rest: AES-256 encryption
- JWT signing: RS256 algorithm
- Session tokens: Cryptographically secure random generation

#### Token Management

- Access tokens: Short-lived (15 minutes)
- Refresh tokens: Encrypted in database
- Token rotation on refresh
- Blacklist for revoked tokens
- JWT claims include: user_id, org_id, role, permissions, issued_at, expires_at

### 7.2 Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

### 7.3 Audit Requirements

#### Authentication Events to Log

- Successful login: timestamp, IP, user agent, location
- Failed login: timestamp, IP, reason, attempted username
- Password change: timestamp, IP, method (user/admin/recovery)
- MFA events: enablement, disablement, failed attempts
- Session events: creation, refresh, revocation
- Super user activation: who, when, why, duration

#### Audit Retention

- Authentication logs: 90 days hot storage, 2 years cold storage
- Super user logs: 7 years (compliance requirement)
- Failed attempts: 30 days
- Session data: 30 days after expiry

### 7.4 Compliance Requirements

#### Data Privacy (GDPR/PDPA)

- Explicit consent for data collection
- Right to erasure implementation
- Data portability API
- Privacy policy acceptance tracking
- Cookie consent management

#### Industry Standards

- SOC 2 Type II compliance
- ISO 27001 alignment
- OWASP Top 10 mitigation
- PCI DSS for payment data (future)

---

## 8. Integration Requirements

### 8.1 API Gateway Integration

#### Authentication Endpoints

```typescript
POST / api / auth / register
POST / api / auth / login
POST / api / auth / logout
POST / api / auth / refresh
POST / api / auth / verify - email
POST / api / auth / verify - phone
POST / api / auth / forgot - password
POST / api / auth / reset - password
PUT / api / auth / change - password
POST / api / auth / mfa / enable
POST / api / auth / mfa / disable
POST / api / auth / mfa / verify
GET / api / auth / session
DELETE / api / auth / sessions
```

### 8.2 Service Integration

#### User Service

- User profile management
- Organization management
- Role assignment
- Permission checking

#### Notification Service

- Welcome emails
- Verification codes
- Security alerts
- Password reset emails

#### Audit Service

- Authentication event logging
- Security incident tracking
- Compliance reporting

### 8.3 External Integrations

#### Government APIs

- Business registration verification (Taiwan)
- Tax ID validation
- Corporate registry lookup

#### Third-party Services

- SendGrid/AWS SES for emails
- Twilio for SMS
- Google Authenticator for TOTP
- MaxMind for geolocation

---

## 9. User Experience Requirements

### 9.1 Design Principles

#### Simplicity First

- Single-page registration when possible
- Auto-fill from business registry
- Progressive disclosure of optional fields
- Clear error messages with solutions

#### Mobile Optimization

- Responsive design for all screens
- Touch-friendly inputs (44px minimum)
- Biometric authentication support
- App-specific optimizations

### 9.2 Accessibility Requirements

- WCAG 2.1 AA compliance
- Screen reader compatibility
- Keyboard navigation support
- High contrast mode
- Multi-language support (Traditional Chinese, English)

### 9.3 Performance Requirements

- Page load: < 2 seconds
- Form submission: < 1 second
- API response: < 500ms
- Error recovery: Immediate
- Auto-save: Every 30 seconds

---

## 10. Success Metrics & KPIs

### 10.1 Primary Metrics

#### Conversion Metrics

| Metric                        | Target | Alert Threshold |
| ----------------------------- | ------ | --------------- |
| Registration Start → Complete | > 85%  | < 70%           |
| Email Verification Rate       | > 95%  | < 85%           |
| Business Verification Rate    | > 80%  | < 60%           |
| First Login Success           | > 90%  | < 80%           |

#### Security Metrics

| Metric                    | Target | Alert Threshold |
| ------------------------- | ------ | --------------- |
| Failed Login Rate         | < 5%   | > 10%           |
| Account Takeover Attempts | 0      | Any detected    |
| MFA Adoption (Admins)     | 100%   | < 100%          |
| Password Reset Success    | > 90%  | < 80%           |

#### Performance Metrics

| Metric                        | Target | Alert Threshold |
| ----------------------------- | ------ | --------------- |
| Authentication Service Uptime | 99.99% | < 99.9%         |
| Average Login Time            | < 2s   | > 5s            |
| Token Refresh Success         | > 99%  | < 95%           |
| Session Consistency           | 100%   | < 99.9%         |

### 10.2 Secondary Metrics

#### User Behavior

- Average sessions per user per day
- Session duration distribution
- Device type breakdown
- Login method preferences
- Password reset frequency

#### Business Impact

- Time to first transaction after registration
- User retention after registration (D1, D7, D30)
- Support tickets related to authentication
- Registration source attribution
- Referral program effectiveness

---

## 11. Implementation Roadmap

### 11.1 Phase 1: Foundation (Week 1-2)

- [ ] Database schema updates for super_user flag
- [ ] Basic registration API endpoints
- [ ] Password hashing implementation
- [ ] JWT token generation and validation
- [ ] Email verification flow

### 11.2 Phase 2: Core Features (Week 3-4)

- [ ] Complete registration flows (restaurant & supplier)
- [ ] Login with rate limiting
- [ ] Password recovery flow
- [ ] Session management
- [ ] Basic audit logging

### 11.3 Phase 3: Security Enhancement (Week 5-6)

- [ ] MFA implementation (SMS, TOTP)
- [ ] Super user permission system
- [ ] Advanced threat detection
- [ ] Security headers and CSP
- [ ] Penetration testing

### 11.4 Phase 4: Business Verification (Week 7-8)

- [ ] Government API integration
- [ ] Document upload and storage
- [ ] Manual verification queue
- [ ] Verification status management
- [ ] Progressive access control

### 11.5 Phase 5: Polish & Optimization (Week 9-10)

- [ ] Performance optimization
- [ ] Mobile app integration
- [ ] Analytics implementation
- [ ] A/B testing setup
- [ ] Documentation and training

---

## 12. Risk Analysis & Mitigation

### 12.1 Technical Risks

| Risk                            | Probability | Impact   | Mitigation                                |
| ------------------------------- | ----------- | -------- | ----------------------------------------- |
| Authentication service downtime | Low         | Critical | Multi-region deployment, circuit breakers |
| Token theft/replay attacks      | Medium      | High     | Short-lived tokens, binding to IP/UA      |
| Password database breach        | Low         | Critical | Argon2id hashing, encryption at rest      |
| MFA bypass vulnerability        | Low         | High     | Regular security audits, bug bounty       |
| Session hijacking               | Medium      | High     | Secure cookies, session binding           |

### 12.2 Business Risks

| Risk                               | Probability | Impact   | Mitigation                                 |
| ---------------------------------- | ----------- | -------- | ------------------------------------------ |
| Low registration completion        | Medium      | High     | Simplify flow, provide assistance          |
| Fake business registrations        | High        | Medium   | Verification requirements, fraud detection |
| User abandonment due to complexity | Medium      | High     | Progressive disclosure, save progress      |
| Compliance violations              | Low         | Critical | Regular audits, automated checks           |

### 12.3 Operational Risks

| Risk                        | Probability | Impact   | Mitigation                                   |
| --------------------------- | ----------- | -------- | -------------------------------------------- |
| Verification backlog        | Medium      | Medium   | Automation, scaling team                     |
| Customer support overload   | High        | Medium   | Self-service options, clear documentation    |
| Third-party service failure | Medium      | High     | Multiple providers, fallback options         |
| Super user abuse            | Low         | Critical | Time limits, audit trails, approval workflow |

---

## 13. Testing Strategy

### 13.1 Test Scenarios

#### Functional Testing

- Happy path registration (all user types)
- Login with various MFA combinations
- Password recovery edge cases
- Session management across devices
- Permission verification for all roles
- Super user activation/deactivation

#### Security Testing

- SQL injection attempts
- XSS vulnerability scanning
- CSRF token validation
- Rate limiting effectiveness
- Token expiration handling
- Privilege escalation attempts

#### Performance Testing

- 10,000 concurrent login attempts
- Registration under load
- Token refresh storms
- Database connection pooling
- Cache effectiveness
- API gateway throughput

### 13.2 User Acceptance Criteria

All flows must pass the following criteria:

- Complete in specified time limits
- Work on all supported browsers/devices
- Provide clear feedback at each step
- Gracefully handle errors
- Maintain security standards
- Meet accessibility requirements

---

## 14. Dependencies

### 14.1 Technical Dependencies

- PostgreSQL database with SQLAlchemy ORM + Alembic
- Redis for session storage
- API Gateway for routing
- Notification service for emails/SMS
- Object storage for document uploads
- Government APIs for verification

### 14.2 Organizational Dependencies

- Legal review of terms of service
- Compliance team approval
- Security team penetration testing
- Operations team for manual verification
- Customer success for onboarding materials
- Marketing for communication templates

---

## 15. Open Questions & Decisions Needed

1. **Business Verification**: Should we require business verification before allowing real transactions, or allow limited transactions while pending?
   - **Recommendation**: Allow limited transactions (e.g., NT$50,000/month) while pending verification

2. **MFA Enforcement**: Should we enforce MFA for all users or make it optional for operators?
   - **Recommendation**: Mandatory for admins, optional but incentivized for others (e.g., 0.1% discount)

3. **Super User Approval**: Should super user activation require approval from multiple platform admins?
   - **Recommendation**: Yes, require 2 platform admins for activation lasting >1 hour

4. **Password Policy**: Should we enforce password rotation every 90 days?
   - **Recommendation**: No forced rotation, but prompt users with weak passwords

5. **Session Timeout**: What should be the idle timeout for different user roles?
   - **Recommendation**: 30 minutes for operators, 15 minutes for admins, 5 minutes for super users

---

## 16. Appendices

### Appendix A: API Request/Response Examples

#### Registration Request

```json
POST /api/auth/register
{
  "organizationType": "restaurant",
  "organizationName": "Happy Kitchen",
  "businessRegistration": "12345678",
  "email": "admin@happykitchen.com",
  "phone": "+886912345678",
  "password": "SecureP@ssw0rd123!",
  "acceptTerms": true,
  "marketingConsent": false
}
```

#### Login Response

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "2a0e8f3d-5c71-4b8a-9e4f-8b5c6d7e8f9g",
    "expiresIn": 900,
    "user": {
      "id": "usr_abc123",
      "email": "admin@happykitchen.com",
      "role": "restaurant_admin",
      "organizationId": "org_xyz789",
      "mfaEnabled": true,
      "verificationLevel": 3
    }
  }
}
```

### Appendix B: Database Schema Changes

```sql
-- Add super_user flag to users table
ALTER TABLE users
ADD COLUMN is_super_user BOOLEAN DEFAULT FALSE,
ADD COLUMN super_user_expires_at TIMESTAMP NULL,
ADD COLUMN super_user_activated_by VARCHAR(255) NULL,
ADD COLUMN super_user_reason TEXT NULL;

-- Add MFA settings
ALTER TABLE users
ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN mfa_method VARCHAR(20) NULL,
ADD COLUMN mfa_secret TEXT NULL,
ADD COLUMN mfa_backup_codes TEXT[] NULL;

-- Add verification fields
ALTER TABLE organizations
ADD COLUMN verification_level INTEGER DEFAULT 1,
ADD COLUMN verified_at TIMESTAMP NULL,
ADD COLUMN verification_documents JSONB DEFAULT '[]';

-- Create password history table
CREATE TABLE password_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create login attempts table
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_created (email, created_at),
  INDEX idx_ip_created (ip_address, created_at)
);
```

### Appendix C: Security Checklist

- [ ] All passwords hashed with Argon2id
- [ ] HTTPS enforced on all endpoints
- [ ] CSRF tokens implemented
- [ ] Rate limiting configured
- [ ] Session fixation prevention
- [ ] Secure cookie flags set
- [ ] Content Security Policy configured
- [ ] Input validation on all fields
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] Audit logging enabled
- [ ] Encryption at rest configured
- [ ] Backup and recovery tested
- [ ] Incident response plan documented
- [ ] Security training completed

---

## Document History

| Version | Date       | Author       | Changes                   |
| ------- | ---------- | ------------ | ------------------------- |
| 1.0     | 2025-09-19 | Product Team | Initial comprehensive PRD |

---

## Approval

| Role                 | Name | Signature | Date |
| -------------------- | ---- | --------- | ---- |
| Product Manager      |      |           |      |
| Engineering Lead     |      |           |      |
| Security Lead        |      |           |      |
| Business Stakeholder |      |           |      |
