#!/usr/bin/env python3
"""
遷移核心業務表格到 staging 資料庫
包含: users, organizations, business_units, customer_companies, customer_groups
"""
import asyncio
import json
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

async def create_tables_and_migrate():
    # 本地資料庫
    local_url = "postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly"
    # Staging 資料庫 (透過 Cloud SQL Proxy)
    staging_url = "postgresql+asyncpg://orderly:OtAEG5/1h78R+EGHStvtabQjOhjKtXNq/Pse3d6ZTDs=@localhost:5433/orderly"
    
    # 創建引擎
    local_engine = create_async_engine(local_url, echo=False)
    staging_engine = create_async_engine(staging_url, echo=False)
    
    # 創建會話
    LocalSession = sessionmaker(local_engine, class_=AsyncSession, expire_on_commit=False)
    StagingSession = sessionmaker(staging_engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        print("🚀 開始遷移核心業務表格到 staging...")
        
        # 1. 創建 ENUM 類型
        print("\n1️⃣ 創建 ENUM 類型...")
        async with StagingSession() as session:
            # 創建所需的 ENUM 類型 - 分開執行每個命令
            # UserRole ENUM
            await session.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE userrole AS ENUM ('super_admin', 'admin', 'user', 'viewer', 'restaurant', 'supplier');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$
            """))
            
            # OrganizationType ENUM  
            await session.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE organizationtype AS ENUM ('restaurant', 'supplier', 'admin');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$
            """))
            
            # BusinessType ENUM
            await session.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE businesstype AS ENUM ('COMPANY', 'INDIVIDUAL', 'STANDARD', 'ENTERPRISE');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$
            """))
            
            # MFAMethod ENUM
            await session.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE mfamethod AS ENUM ('none', 'totp', 'sms');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$
            """))
            
            await session.commit()
            print("  ✅ ENUM 類型創建完成")
        
        # 2. 創建 organizations 表
        print("\n2️⃣ 創建 organizations 表...")
        async with StagingSession() as session:
            await session.execute(text("""
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
            """))
            await session.commit()
            print("  ✅ organizations 表創建完成")
        
        # 3. 創建 users 表
        print("\n3️⃣ 創建 users 表...")
        async with StagingSession() as session:
            await session.execute(text("""
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
            """))
            await session.commit()
            print("  ✅ users 表創建完成")
        
        # 4. 創建 business_units 表
        print("\n4️⃣ 創建 business_units 表...")
        async with StagingSession() as session:
            await session.execute(text("""
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
            """))
            await session.commit()
            print("  ✅ business_units 表創建完成")
        
        # 5. 創建 customer_companies 表
        print("\n5️⃣ 創建 customer_companies 表...")
        async with StagingSession() as session:
            await session.execute(text("""
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
            """))
            await session.commit()
            print("  ✅ customer_companies 表創建完成")
        
        # 6. 創建 customer_groups 表
        print("\n6️⃣ 創建 customer_groups 表...")
        async with StagingSession() as session:
            await session.execute(text("""
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
            """))
            await session.commit()
            print("  ✅ customer_groups 表創建完成")
        
        # 7. 遷移 organizations 資料
        print("\n7️⃣ 遷移 organizations 資料...")
        async with LocalSession() as local_session:
            result = await local_session.execute(text("""
                SELECT id, name, type::text, settings::text, "isActive", "createdAt", "updatedAt",
                       "businessType"::text, "taxId", "personalId", "businessLicenseNumber",
                       "contactPerson", "contactPhone", "contactEmail", address,
                       "invitedByOrganizationId", "invitationAcceptedAt"
                FROM organizations
            """))
            orgs = result.fetchall()
            print(f"  找到 {len(orgs)} 筆組織資料")
        
        if orgs:
            async with StagingSession() as staging_session:
                for org in orgs:
                    await staging_session.execute(text("""
                        INSERT INTO organizations (
                            id, name, type, settings, "isActive", "createdAt", "updatedAt",
                            "businessType", "taxId", "personalId", "businessLicenseNumber",
                            "contactPerson", "contactPhone", "contactEmail", address,
                            "invitedByOrganizationId", "invitationAcceptedAt"
                        ) VALUES (
                            :id, :name, :type::organizationtype, CAST(:settings AS jsonb), :isActive, :createdAt, :updatedAt,
                            :businessType::businesstype, :taxId, :personalId, :businessLicenseNumber,
                            :contactPerson, :contactPhone, :contactEmail, :address,
                            :invitedByOrganizationId, :invitationAcceptedAt
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            "updatedAt" = EXCLUDED."updatedAt"
                    """), {
                        'id': org[0], 'name': org[1], 'type': org[2], 
                        'settings': org[3] or '{}', 'isActive': org[4],
                        'createdAt': org[5], 'updatedAt': org[6],
                        'businessType': org[7], 'taxId': org[8], 'personalId': org[9],
                        'businessLicenseNumber': org[10], 'contactPerson': org[11],
                        'contactPhone': org[12], 'contactEmail': org[13],
                        'address': org[14], 'invitedByOrganizationId': org[15],
                        'invitationAcceptedAt': org[16]
                    })
                await staging_session.commit()
                print(f"  ✅ 成功遷移 {len(orgs)} 筆組織資料")
        
        # 8. 遷移 users 資料
        print("\n8️⃣ 遷移 users 資料...")
        async with LocalSession() as local_session:
            result = await local_session.execute(text("""
                SELECT id, email, "passwordHash", "organizationId", role::text, "isActive",
                       "lastLoginAt", metadata::text, "tokenVersion", "isSuperUser",
                       "superUserExpiresAt", "superUserReason", "emailVerified", "emailVerifiedAt",
                       "emailVerificationToken", phone, "phoneVerified", "phoneVerifiedAt",
                       "businessVerified", "businessVerifiedAt", "businessDocuments"::text,
                       "mfaEnabled", "mfaSecret", "mfaBackupCodes"::text, "mfaMethod"::text,
                       "failedLoginAttempts", "lockedUntil", "createdAt", "updatedAt", name
                FROM users
            """))
            users = result.fetchall()
            print(f"  找到 {len(users)} 筆用戶資料")
        
        if users:
            async with StagingSession() as staging_session:
                for user in users:
                    await staging_session.execute(text("""
                        INSERT INTO users (
                            id, email, "passwordHash", "organizationId", role, "isActive",
                            "lastLoginAt", metadata, "tokenVersion", "isSuperUser",
                            "superUserExpiresAt", "superUserReason", "emailVerified", "emailVerifiedAt",
                            "emailVerificationToken", phone, "phoneVerified", "phoneVerifiedAt",
                            "businessVerified", "businessVerifiedAt", "businessDocuments",
                            "mfaEnabled", "mfaSecret", "mfaBackupCodes", "mfaMethod",
                            "failedLoginAttempts", "lockedUntil", "createdAt", "updatedAt", name
                        ) VALUES (
                            :id, :email, :passwordHash, :organizationId, :role::userrole, :isActive,
                            :lastLoginAt, CAST(:metadata AS jsonb), :tokenVersion, :isSuperUser,
                            :superUserExpiresAt, :superUserReason, :emailVerified, :emailVerifiedAt,
                            :emailVerificationToken, :phone, :phoneVerified, :phoneVerifiedAt,
                            :businessVerified, :businessVerifiedAt, CAST(:businessDocuments AS jsonb),
                            :mfaEnabled, :mfaSecret, CAST(:mfaBackupCodes AS jsonb), :mfaMethod::mfamethod,
                            :failedLoginAttempts, :lockedUntil, :createdAt, :updatedAt, :name
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            email = EXCLUDED.email,
                            "updatedAt" = EXCLUDED."updatedAt"
                    """), {
                        'id': user[0], 'email': user[1], 'passwordHash': user[2],
                        'organizationId': user[3], 'role': user[4], 'isActive': user[5],
                        'lastLoginAt': user[6], 'metadata': user[7] or '{}',
                        'tokenVersion': user[8], 'isSuperUser': user[9],
                        'superUserExpiresAt': user[10], 'superUserReason': user[11],
                        'emailVerified': user[12], 'emailVerifiedAt': user[13],
                        'emailVerificationToken': user[14], 'phone': user[15],
                        'phoneVerified': user[16], 'phoneVerifiedAt': user[17],
                        'businessVerified': user[18], 'businessVerifiedAt': user[19],
                        'businessDocuments': user[20] or '[]', 'mfaEnabled': user[21],
                        'mfaSecret': user[22], 'mfaBackupCodes': user[23] or '[]',
                        'mfaMethod': user[24], 'failedLoginAttempts': user[25],
                        'lockedUntil': user[26], 'createdAt': user[27],
                        'updatedAt': user[28], 'name': user[29]
                    })
                await staging_session.commit()
                print(f"  ✅ 成功遷移 {len(users)} 筆用戶資料")
        
        # 9. 遷移 business_units 資料
        print("\n9️⃣ 遷移 business_units 資料...")
        async with LocalSession() as local_session:
            result = await local_session.execute(text("""
                SELECT id, "organizationId", code, name, type, address, phone, email,
                       "contactPerson", "parentId", level, path, "isActive", "isDefault",
                       metadata::text, "createdAt", "updatedAt", "createdBy", "updatedBy"
                FROM business_units
            """))
            units = result.fetchall()
            print(f"  找到 {len(units)} 筆營業單位資料")
        
        if units:
            async with StagingSession() as staging_session:
                for unit in units:
                    await staging_session.execute(text("""
                        INSERT INTO business_units (
                            id, "organizationId", code, name, type, address, phone, email,
                            "contactPerson", "parentId", level, path, "isActive", "isDefault",
                            metadata, "createdAt", "updatedAt", "createdBy", "updatedBy"
                        ) VALUES (
                            :id, :organizationId, :code, :name, :type, :address, :phone, :email,
                            :contactPerson, :parentId, :level, :path, :isActive, :isDefault,
                            CAST(:metadata AS jsonb), :createdAt, :updatedAt, :createdBy, :updatedBy
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            "updatedAt" = EXCLUDED."updatedAt"
                    """), {
                        'id': unit[0], 'organizationId': unit[1], 'code': unit[2],
                        'name': unit[3], 'type': unit[4], 'address': unit[5],
                        'phone': unit[6], 'email': unit[7], 'contactPerson': unit[8],
                        'parentId': unit[9], 'level': unit[10], 'path': unit[11],
                        'isActive': unit[12], 'isDefault': unit[13],
                        'metadata': unit[14] or '{}', 'createdAt': unit[15],
                        'updatedAt': unit[16], 'createdBy': unit[17], 'updatedBy': unit[18]
                    })
                await staging_session.commit()
                print(f"  ✅ 成功遷移 {len(units)} 筆營業單位資料")
        
        # 10. 遷移 customer_companies 資料
        print("\n🔟 遷移 customer_companies 資料...")
        async with LocalSession() as local_session:
            result = await local_session.execute(text("""
                SELECT id, "companyType", "companyName", "unifiedNumber", "individualName",
                       "individualId", "contactPerson", "contactPhone", "contactEmail",
                       "billingAddress", "shippingAddress", "isActive", "creditLimit",
                       "paymentTerms", "taxExempt", notes, "createdAt", "updatedAt",
                       "createdBy", "updatedBy", tags::text, metadata::text
                FROM customer_companies
            """))
            companies = result.fetchall()
            print(f"  找到 {len(companies)} 筆客戶公司資料")
        
        if companies:
            async with StagingSession() as staging_session:
                for company in companies:
                    await staging_session.execute(text("""
                        INSERT INTO customer_companies (
                            id, "companyType", "companyName", "unifiedNumber", "individualName",
                            "individualId", "contactPerson", "contactPhone", "contactEmail",
                            "billingAddress", "shippingAddress", "isActive", "creditLimit",
                            "paymentTerms", "taxExempt", notes, "createdAt", "updatedAt",
                            "createdBy", "updatedBy", tags, metadata
                        ) VALUES (
                            :id, :companyType, :companyName, :unifiedNumber, :individualName,
                            :individualId, :contactPerson, :contactPhone, :contactEmail,
                            :billingAddress, :shippingAddress, :isActive, :creditLimit,
                            :paymentTerms, :taxExempt, :notes, :createdAt, :updatedAt,
                            :createdBy, :updatedBy, CAST(:tags AS jsonb), CAST(:metadata AS jsonb)
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            "companyName" = EXCLUDED."companyName",
                            "updatedAt" = EXCLUDED."updatedAt"
                    """), {
                        'id': company[0], 'companyType': company[1], 'companyName': company[2],
                        'unifiedNumber': company[3], 'individualName': company[4],
                        'individualId': company[5], 'contactPerson': company[6],
                        'contactPhone': company[7], 'contactEmail': company[8],
                        'billingAddress': company[9], 'shippingAddress': company[10],
                        'isActive': company[11], 'creditLimit': company[12],
                        'paymentTerms': company[13], 'taxExempt': company[14],
                        'notes': company[15], 'createdAt': company[16],
                        'updatedAt': company[17], 'createdBy': company[18],
                        'updatedBy': company[19], 'tags': company[20] or '[]',
                        'metadata': company[21] or '{}'
                    })
                await staging_session.commit()
                print(f"  ✅ 成功遷移 {len(companies)} 筆客戶公司資料")
        
        # 11. 遷移 customer_groups 資料
        print("\n1️⃣1️⃣ 遷移 customer_groups 資料...")
        async with LocalSession() as local_session:
            result = await local_session.execute(text("""
                SELECT id, "groupType", name, description, "parentId", level, path,
                       "isActive", settings::text, "createdAt", "updatedAt",
                       "createdBy", "updatedBy"
                FROM customer_groups
            """))
            groups = result.fetchall()
            print(f"  找到 {len(groups)} 筆客戶群組資料")
        
        if groups:
            async with StagingSession() as staging_session:
                for group in groups:
                    await staging_session.execute(text("""
                        INSERT INTO customer_groups (
                            id, "groupType", name, description, "parentId", level, path,
                            "isActive", settings, "createdAt", "updatedAt",
                            "createdBy", "updatedBy"
                        ) VALUES (
                            :id, :groupType, :name, :description, :parentId, :level, :path,
                            :isActive, CAST(:settings AS jsonb), :createdAt, :updatedAt,
                            :createdBy, :updatedBy
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            "updatedAt" = EXCLUDED."updatedAt"
                    """), {
                        'id': group[0], 'groupType': group[1], 'name': group[2],
                        'description': group[3], 'parentId': group[4],
                        'level': group[5], 'path': group[6], 'isActive': group[7],
                        'settings': group[8] or '{}', 'createdAt': group[9],
                        'updatedAt': group[10], 'createdBy': group[11],
                        'updatedBy': group[12]
                    })
                await staging_session.commit()
                print(f"  ✅ 成功遷移 {len(groups)} 筆客戶群組資料")
        
        # 12. 驗證遷移結果
        print("\n1️⃣2️⃣ 驗證 staging 資料庫...")
        async with StagingSession() as staging_session:
            result = await staging_session.execute(text("""
                SELECT 
                    'users' as table_name, COUNT(*) as count 
                FROM users
                UNION ALL
                SELECT 'organizations', COUNT(*) FROM organizations
                UNION ALL
                SELECT 'business_units', COUNT(*) FROM business_units
                UNION ALL
                SELECT 'customer_companies', COUNT(*) FROM customer_companies
                UNION ALL
                SELECT 'customer_groups', COUNT(*) FROM customer_groups
                ORDER BY table_name
            """))
            counts = result.fetchall()
            
            print("\n📊 Staging 資料庫統計：")
            print("="*40)
            for row in counts:
                print(f"  {row[0]:20s}: {row[1]:5} 筆")
            print("="*40)
        
        print("\n✅ 核心業務表格遷移完成！")
        
    except Exception as e:
        print(f"\n❌ 錯誤: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await local_engine.dispose()
        await staging_engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_tables_and_migrate())