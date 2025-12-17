# Super Admin Guide - Orderly Platform

## Overview

The Orderly platform includes a comprehensive super admin system that provides elevated privileges for developers and platform administrators. This system includes automatic expiration, security logging, and production safeguards.

## Features

### 🔑 Core Capabilities

- **Temporary Elevated Access**: Time-limited super admin privileges (default: 24 hours)
- **Automatic Expiration**: Privileges automatically revoke when expired
- **Security Logging**: All super admin actions are logged for audit purposes
- **Production Safeguards**: Restricted creation in production environments
- **Role-Based Access**: Integrates with existing user role system

### 🛡️ Security Features

- **Environment Protection**: Blocked in production unless explicitly enabled
- **Reason Tracking**: All super admin access requires justification
- **Audit Trail**: Complete logging of creation, usage, and revocation
- **Automatic Cleanup**: Expired privileges are automatically removed

## Database Schema

The super admin system leverages existing schema fields in the `users` table:

```sql
-- Super admin fields in users table
isSuperUser         Boolean   @default(false)
superUserExpiresAt  DateTime?
superUserReason     String?

-- User role includes platform_admin
role                UserRole  -- includes 'platform_admin'
```

## API Endpoints

### Create Super Admin

```
POST /auth/super-admin
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecurePassword123!",
  "name": "Admin Name",
  "reason": "Development access for feature implementation",
  "duration": 24  // hours (optional, default: 24)
}
```

**Response:**

```json
{
  "success": true,
  "message": "Super admin created successfully",
  "data": {
    "user": {
      "id": "user_123",
      "email": "admin@example.com",
      "role": "platform_admin",
      "isSuperUser": true,
      "superUserExpiresAt": "2025-09-20T01:56:00.000Z",
      "superUserReason": "Development access for feature implementation"
    }
  }
}
```

### List Super Admins

```
GET /auth/super-admins
```

**Response:**

```json
{
  "success": true,
  "data": {
    "superAdmins": [
      {
        "id": "user_123",
        "email": "admin@example.com",
        "role": "platform_admin",
        "isSuperUser": true,
        "superUserExpiresAt": "2025-09-20T01:56:00.000Z",
        "superUserReason": "Development access",
        "lastLoginAt": "2025-09-19T01:56:00.000Z",
        "createdAt": "2025-09-19T01:56:00.000Z",
        "organization": {
          "id": "org_123",
          "name": "Platform Administration",
          "type": "restaurant"
        }
      }
    ],
    "total": 1,
    "expiredCount": 0
  }
}
```

### Revoke Super Admin

```
DELETE /auth/super-admin/:userId
Content-Type: application/json

{
  "reason": "Access no longer needed"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Super admin privileges revoked successfully",
  "data": {
    "user": {
      "id": "user_123",
      "email": "admin@example.com",
      "role": "platform_admin",
      "isSuperUser": false
    }
  }
}
```

## CLI Scripts

### Interactive Creation Script

```bash
# Run interactive super admin creation
./scripts/create-super-admin.sh

# Or directly with Node.js
node scripts/create-super-admin.js
```

The script will prompt for:

- Email address
- Password (minimum 8 characters)
- Full name
- Reason for access
- Duration in hours (optional)

### Environment Variables

```bash
# Required for database connection
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=orderly
DATABASE_USER=orderly
POSTGRES_PASSWORD=orderly_dev_password

# Required to allow creation in production
ALLOW_SUPER_ADMIN_CREATION=true  # Only set in production if needed

# JWT secret for token generation
JWT_SECRET="your-jwt-secret"
```

## Usage Examples

### Development Setup

```bash
# 1. Ensure database is running
docker-compose up -d postgres

# 2. 建立超級管理員（透過 FastAPI User Service）
curl -X POST http://localhost:3001/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
        "email":"admin@orderly.com",
        "password":"ChangeMe123!",
        "organizationName":"Orderly Platform",
        "organizationType":"supplier"
      }'
```

### API Usage

```javascript
// Create super admin via API
const response = await fetch('/auth/super-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'dev@orderly.com',
    password: 'DevPassword123!',
    name: 'Developer Admin',
    reason: 'Initial platform setup',
    duration: 48,
  }),
})

const data = await response.json()
console.log('Super admin created:', data.data.user.id)
```

## Security Best Practices

### 🔒 Production Safety

1. **Never enable** `ALLOW_SUPER_ADMIN_CREATION=true` in production without strong justification
2. **Always use** strong passwords (minimum 12 characters, mixed case, numbers, symbols)
3. **Set short durations** for super admin access (24-48 hours maximum)
4. **Document reasons** clearly for audit purposes
5. **Revoke immediately** when access is no longer needed

### 🔍 Monitoring & Auditing

- All super admin actions are logged with user ID, timestamp, and IP address
- Regular audit of super admin access logs
- Monitor for expired accounts that haven't been cleaned up
- Alert on super admin creation in production environments

### 🚨 Emergency Procedures

If unauthorized super admin access is detected:

1. **Immediate Response**:

   ```bash
   # List all super admins
   curl -X GET http://localhost:3001/auth/super-admins

   # Revoke specific super admin
   curl -X DELETE http://localhost:3001/auth/super-admin/USER_ID \
     -H "Content-Type: application/json" \
     -d '{"reason":"Security incident - unauthorized access"}'
   ```

2. **Investigation**:
   - Check audit logs for super admin creation and usage
   - Verify all super admin accounts are legitimate
   - Review recent platform administrative actions

3. **Recovery**:
   - Change passwords for all super admin accounts
   - Review and rotate JWT secrets if necessary
   - Implement additional monitoring if required

## Technical Implementation

### Automatic Expiration

The system automatically checks for expired super admin accounts when listing super admins:

```typescript
// Check and update expired super admins
const now = new Date()
const expiredAdmins = superAdmins.filter(
  admin => admin.superUserExpiresAt && admin.superUserExpiresAt < now
)

if (expiredAdmins.length > 0) {
  await prisma.user.updateMany({
    where: { id: { in: expiredAdmins.map(admin => admin.id) } },
    data: {
      isSuperUser: false,
      superUserExpiresAt: null,
      superUserReason: null,
    },
  })
}
```

### Organization Management

Super admin users are automatically assigned to a "Platform Administration" organization:

```typescript
// Create platform organization if it doesn't exist
let platformOrg = await prisma.organization.findFirst({
  where: { name: 'Platform Administration' },
})

if (!platformOrg) {
  platformOrg = await prisma.organization.create({
    data: {
      name: 'Platform Administration',
      type: 'restaurant',
      settings: { description: 'Platform administration and developer access' },
    },
  })
}
```

## Troubleshooting

### Common Issues

1. **"Super admin creation not allowed in production"**
   - Set `ALLOW_SUPER_ADMIN_CREATION=true` environment variable
   - Only do this if absolutely necessary in production

2. **User service not reachable**
   - Ensure FastAPI user-service is running on port 3001 and DB is migrated (alembic upgrade head)
   - Ensure `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `POSTGRES_PASSWORD` 已正確設定

3. **"Database connection failed"**
   - Verify PostgreSQL is running
   - 系統使用分離式環境變數：`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `POSTGRES_PASSWORD`
   - 如需手動連線測試，可臨時組裝 DSN：`postgresql://user:password@host:port/database`
   - Ensure database exists and is accessible

4. **"User already exists" when creating**
   - The system will upgrade existing users to super admin status
   - Check the response to see if upgrade was successful

### Debug Mode

For troubleshooting, you can enable debug logging:

```bash
DEBUG=* node scripts/create-super-admin.js
```

## Migration Guide

If upgrading from a system without super admin functionality:

1. **Database Migration**: The schema already includes required fields
2. **Existing Admins**: Use the upgrade functionality to convert existing platform admins
3. **Scripts**: Place the creation scripts in your `scripts/` directory
4. **Environment**: Add required environment variables
5. **Testing**: Use the test script to verify functionality

---

## Summary

The super admin system provides secure, auditable, time-limited elevated access to the Orderly platform. It includes comprehensive safety features for production use while remaining developer-friendly for local development and testing.

For additional support or questions, refer to the main project documentation or contact the development team.
