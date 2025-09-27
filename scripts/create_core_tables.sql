-- 創建核心業務表格到 staging 資料庫
-- 1. 創建 ENUM 類型

DO $$ BEGIN
    CREATE TYPE userrole AS ENUM ('super_admin', 'admin', 'user', 'viewer', 'restaurant', 'supplier');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE organizationtype AS ENUM ('restaurant', 'supplier', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE businesstype AS ENUM ('COMPANY', 'INDIVIDUAL', 'STANDARD', 'ENTERPRISE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE mfamethod AS ENUM ('none', 'totp', 'sms');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. 創建 organizations 表
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type organizationtype NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessType" businesstype,
    "taxId" VARCHAR(8),
    "personalId" VARCHAR(10),
    "businessLicenseNumber" VARCHAR,
    "contactPerson" VARCHAR,
    "contactPhone" VARCHAR,
    "contactEmail" VARCHAR,
    address VARCHAR,
    "invitedByOrganizationId" VARCHAR,
    "invitationAcceptedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);

-- 3. 創建 users 表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT,
    "organizationId" TEXT NOT NULL REFERENCES organizations(id),
    role userrole NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "isSuperUser" BOOLEAN NOT NULL DEFAULT false,
    "superUserExpiresAt" TIMESTAMP,
    "superUserReason" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP,
    "emailVerificationToken" TEXT,
    phone TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerifiedAt" TIMESTAMP,
    "businessVerified" BOOLEAN NOT NULL DEFAULT false,
    "businessVerifiedAt" TIMESTAMP,
    "businessDocuments" JSONB NOT NULL DEFAULT '[]',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "mfaBackupCodes" JSONB NOT NULL DEFAULT '[]',
    "mfaMethod" mfamethod NOT NULL DEFAULT 'none',
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    name VARCHAR,
    department VARCHAR,
    position VARCHAR
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_organizationId ON users("organizationId");

-- 4. 創建 business_units 表
CREATE TABLE IF NOT EXISTS business_units (
    id TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL REFERENCES organizations(id),
    code VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    type VARCHAR NOT NULL,
    address TEXT,
    phone VARCHAR,
    email VARCHAR,
    "contactPerson" VARCHAR,
    "parentId" TEXT REFERENCES business_units(id),
    level INTEGER NOT NULL DEFAULT 1,
    path TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    UNIQUE("organizationId", code)
);

CREATE INDEX IF NOT EXISTS idx_business_units_org ON business_units("organizationId");

-- 5. 創建 customer_companies 表  
CREATE TABLE IF NOT EXISTS customer_companies (
    id TEXT PRIMARY KEY,
    "companyType" VARCHAR NOT NULL,
    "companyName" VARCHAR,
    "unifiedNumber" VARCHAR,
    "individualName" VARCHAR,
    "individualId" VARCHAR,
    "contactPerson" VARCHAR,
    "contactPhone" VARCHAR NOT NULL,
    "contactEmail" VARCHAR,
    "billingAddress" TEXT,
    "shippingAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "creditLimit" DECIMAL(10,2) DEFAULT 0,
    "paymentTerms" VARCHAR DEFAULT 'NET30',
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_customer_companies_type ON customer_companies("companyType");

-- 6. 創建 customer_groups 表
CREATE TABLE IF NOT EXISTS customer_groups (
    id TEXT PRIMARY KEY,
    "groupType" VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    "parentId" TEXT REFERENCES customer_groups(id),
    level INTEGER NOT NULL DEFAULT 1,
    path TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    settings JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT
);

CREATE INDEX IF NOT EXISTS idx_customer_groups_type ON customer_groups("groupType");