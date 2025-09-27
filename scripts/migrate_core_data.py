#!/usr/bin/env python3
"""
遷移核心業務資料到 staging 資料庫
"""
import asyncio
import json
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

async def migrate_data():
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
        print("📋 開始遷移核心業務資料到 staging...")
        
        # 1. 遷移 organizations 資料
        print("\n1️⃣ 遷移 organizations 資料...")
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
                success_count = 0
                for org in orgs:
                    try:
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
                        success_count += 1
                    except Exception as e:
                        print(f"  ⚠️ 組織 {org[1]} 遷移失敗: {e}")
                await staging_session.commit()
                print(f"  ✅ 成功遷移 {success_count}/{len(orgs)} 筆組織資料")
        
        # 2. 遷移 users 資料
        print("\n2️⃣ 遷移 users 資料...")
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
                success_count = 0
                for user in users:
                    try:
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
                        success_count += 1
                    except Exception as e:
                        print(f"  ⚠️ 用戶 {user[1]} 遷移失敗: {e}")
                await staging_session.commit()
                print(f"  ✅ 成功遷移 {success_count}/{len(users)} 筆用戶資料")
        
        # 3. 遷移 business_units 資料
        print("\n3️⃣ 遷移 business_units 資料...")
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
                success_count = 0
                for unit in units:
                    try:
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
                        success_count += 1
                    except Exception as e:
                        print(f"  ⚠️ 營業單位 {unit[3]} 遷移失敗: {e}")
                await staging_session.commit()
                print(f"  ✅ 成功遷移 {success_count}/{len(units)} 筆營業單位資料")
        
        # 4. 遷移 customer_companies 資料
        print("\n4️⃣ 遷移 customer_companies 資料...")
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
                success_count = 0
                for company in companies:
                    try:
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
                        success_count += 1
                    except Exception as e:
                        print(f"  ⚠️ 客戶公司 {company[2] or company[4]} 遷移失敗: {e}")
                await staging_session.commit()
                print(f"  ✅ 成功遷移 {success_count}/{len(companies)} 筆客戶公司資料")
        
        # 5. 遷移 customer_groups 資料
        print("\n5️⃣ 遷移 customer_groups 資料...")
        async with LocalSession() as local_session:
            result = await local_session.execute(text("""
                SELECT id, "groupType", name, description, "parentId", level, path,
                       "isActive", settings::text, "createdAt", "updatedAt",
                       "createdBy", "updatedBy"
                FROM customer_groups
                ORDER BY level, id
            """))
            groups = result.fetchall()
            print(f"  找到 {len(groups)} 筆客戶群組資料")
        
        if groups:
            async with StagingSession() as staging_session:
                success_count = 0
                for group in groups:
                    try:
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
                        success_count += 1
                    except Exception as e:
                        print(f"  ⚠️ 客戶群組 {group[2]} 遷移失敗: {e}")
                await staging_session.commit()
                print(f"  ✅ 成功遷移 {success_count}/{len(groups)} 筆客戶群組資料")
        
        # 6. 驗證遷移結果
        print("\n6️⃣ 驗證 staging 資料庫...")
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
                UNION ALL
                SELECT 'product_categories', COUNT(*) FROM product_categories
                UNION ALL
                SELECT 'products', COUNT(*) FROM products
                UNION ALL
                SELECT 'product_skus', COUNT(*) FROM product_skus
                ORDER BY table_name
            """))
            counts = result.fetchall()
            
            print("\n📊 Staging 資料庫統計：")
            print("="*45)
            print(f"{'表格名稱':<25} | {'資料筆數':>10}")
            print("-"*45)
            for row in counts:
                print(f"{row[0]:<25} | {row[1]:>10} 筆")
            print("="*45)
        
        # 7. 測試查詢
        print("\n7️⃣ 測試資料關聯...")
        async with StagingSession() as staging_session:
            # 測試用戶和組織關聯
            result = await staging_session.execute(text("""
                SELECT u.email, o.name as org_name, u.role::text
                FROM users u
                JOIN organizations o ON u."organizationId" = o.id
                LIMIT 3
            """))
            users = result.fetchall()
            
            print("\n👥 用戶-組織關聯：")
            for user in users:
                print(f"  - {user[0]} ({user[2]}) @ {user[1]}")
            
            # 測試營業單位關聯
            result = await staging_session.execute(text("""
                SELECT bu.name, o.name as org_name
                FROM business_units bu
                JOIN organizations o ON bu."organizationId" = o.id
                LIMIT 3
            """))
            units = result.fetchall()
            
            print("\n🏢 營業單位-組織關聯：")
            for unit in units:
                print(f"  - {unit[0]} @ {unit[1]}")
        
        print("\n✅ 核心業務資料遷移完成！")
        
    except Exception as e:
        print(f"\n❌ 錯誤: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await local_engine.dispose()
        await staging_engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate_data())