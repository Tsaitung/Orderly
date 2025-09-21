#!/usr/bin/env python3
"""
導出生產環境資料腳本
導出以下資料：
- 供應商資料 (organizations, supplier_profiles)
- 客戶階層資料 (customer_companies, customer_locations, business_units)
- 品類資料 (product_categories)
- SKU 資料 (product_skus)
"""
import asyncio
import sys
import os
import json
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Any

# 資料庫連接設定
DATABASE_URL = "postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly"

class DecimalEncoder(json.JSONEncoder):
    """自定義 JSON 編碼器處理 Decimal 類型"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

async def export_suppliers():
    """導出供應商資料"""
    print("📦 導出供應商資料...")
    
    # 添加 user-service 路径
    sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend/user-service-fastapi'))
    
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import text
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as session:
        try:
            # 查詢所有供應商組織
            suppliers_query = text("""
                SELECT 
                    o.id, o.name, o.type, o.settings, o."isActive",
                    o."businessType", o."taxId", o."personalId", 
                    o."businessLicenseNumber", o."contactPerson",
                    o."contactPhone", o."contactEmail", o.address,
                    o."invitedByOrganizationId", o."invitationAcceptedAt",
                    o."onboardingStatus", o."onboardingProgress",
                    o."onboardingCompletedAt", o."deliveryZones",
                    o."productCategories", o.certifications,
                    o."createdAt", o."updatedAt"
                FROM organizations o
                WHERE o.type = 'supplier' AND o."isActive" = true
                ORDER BY o."createdAt"
            """)
            
            result = await session.execute(suppliers_query)
            suppliers = [dict(row._mapping) for row in result]
            
            print(f"   找到 {len(suppliers)} 個供應商組織")
            
            # 查詢供應商詳細資訊
            if suppliers:
                supplier_ids = [s['id'] for s in suppliers]
                supplier_ids_str = "','".join(supplier_ids)
                
                profiles_query = text(f"""
                    SELECT 
                        sp."organizationId", sp.status, sp."verifiedAt", 
                        sp."verifiedBy", sp."deliveryCapacity",
                        sp."deliveryCapacityKgPerDay", sp."operatingHours",
                        sp."deliveryZones", sp."minimumOrderAmount",
                        sp."paymentTermsDays", sp."bankAccountInfo",
                        sp."qualityCertifications", sp."foodSafetyLicense",
                        sp."foodSafetyExpiresAt", sp."contactPreferences",
                        sp.settings, sp."internalNotes", sp."publicDescription",
                        sp."createdAt", sp."updatedAt"
                    FROM supplier_profiles sp
                    WHERE sp."organizationId" IN ('{supplier_ids_str}')
                """)
                
                result = await session.execute(profiles_query)
                profiles = [dict(row._mapping) for row in result]
                
                print(f"   找到 {len(profiles)} 個供應商檔案")
                
                # 合併供應商組織和檔案資料
                profile_dict = {p['organizationId']: p for p in profiles}
                for supplier in suppliers:
                    supplier['profile'] = profile_dict.get(supplier['id'])
            
            # 儲存到檔案
            with open("scripts/database/data/suppliers.json", "w", encoding="utf-8") as f:
                json.dump(suppliers, f, ensure_ascii=False, indent=2, cls=DecimalEncoder)
            
            print(f"   ✅ 供應商資料已導出到: scripts/database/data/suppliers.json")
            return len(suppliers)
            
        except Exception as e:
            print(f"   ❌ 導出供應商資料失敗: {e}")
            raise
        finally:
            await engine.dispose()

async def export_customers():
    """導出客戶階層資料"""
    print("🏢 導出客戶階層資料...")
    
    # 添加 customer-hierarchy-service 路径
    sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend/customer-hierarchy-service-fastapi'))
    
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import text
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as session:
        try:
            # 查詢所有客戶公司
            companies_query = text("""
                SELECT 
                    cc.id, cc."groupId", cc.name, cc."legalName",
                    cc."taxId", cc."taxIdType", cc."billingAddress",
                    cc."billingContact", cc."billingEmail",
                    cc."paymentTerms", cc."creditLimit",
                    cc."legacyOrganizationId", cc.settings,
                    cc."isActive", cc."createdAt", cc."updatedAt",
                    cc."createdBy", cc."updatedBy"
                FROM customer_companies cc
                WHERE cc."isActive" = true
                ORDER BY cc."createdAt"
            """)
            
            result = await session.execute(companies_query)
            companies = [dict(row._mapping) for row in result]
            
            print(f"   找到 {len(companies)} 個客戶公司")
            
            # 查詢所有地點
            locations_query = text("""
                SELECT 
                    cl.id, cl."companyId", cl.name, cl.code,
                    cl.address, cl.city, cl."deliveryContact",
                    cl."deliveryPhone", cl."deliveryInstructions",
                    cl."operatingHours", cl.coordinates, cl.timezone,
                    cl."isActive", cl."createdAt", cl."updatedAt",
                    cl."createdBy", cl."updatedBy"
                FROM customer_locations cl
                WHERE cl."isActive" = true
                ORDER BY cl."createdAt"
            """)
            
            result = await session.execute(locations_query)
            locations = [dict(row._mapping) for row in result]
            
            print(f"   找到 {len(locations)} 個客戶地點")
            
            # 查詢所有業務單位
            units_query = text("""
                SELECT 
                    bu.id, bu."locationId", bu.name, bu.code,
                    bu.type, bu."costCenterCode", bu."budgetMonthly",
                    bu."budgetAlertThreshold", bu."managerContact",
                    bu."orderingPermissions", bu."allowedSuppliers",
                    bu."blockedCategories", bu."maxOrderValue",
                    bu."requiresApproval", bu."approvalThreshold",
                    bu."isActive", bu."createdAt", bu."updatedAt",
                    bu."createdBy", bu."updatedBy"
                FROM business_units bu
                WHERE bu."isActive" = true
                ORDER BY bu."createdAt"
            """)
            
            result = await session.execute(units_query)
            business_units = [dict(row._mapping) for row in result]
            
            print(f"   找到 {len(business_units)} 個業務單位")
            
            # 組織階層資料
            customer_data = {
                "companies": companies,
                "locations": locations,
                "business_units": business_units,
                "export_timestamp": datetime.now().isoformat(),
                "summary": {
                    "total_companies": len(companies),
                    "total_locations": len(locations),
                    "total_business_units": len(business_units)
                }
            }
            
            # 儲存到檔案
            with open("scripts/database/data/customers.json", "w", encoding="utf-8") as f:
                json.dump(customer_data, f, ensure_ascii=False, indent=2, cls=DecimalEncoder)
            
            print(f"   ✅ 客戶階層資料已導出到: scripts/database/data/customers.json")
            return len(companies)
            
        except Exception as e:
            print(f"   ❌ 導出客戶階層資料失敗: {e}")
            raise
        finally:
            await engine.dispose()

async def export_categories():
    """導出品類資料"""
    print("📂 導出品類資料...")
    
    # 添加 product-service 路径
    sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend/product-service-fastapi'))
    
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import text
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as session:
        try:
            # 查詢所有品類
            categories_query = text("""
                SELECT 
                    pc.id, pc.code, pc.name, pc."nameEn",
                    pc."parentId", pc.level, pc."sortOrder",
                    pc.description, pc.metadata, pc."isActive",
                    pc."createdAt", pc."updatedAt"
                FROM product_categories pc
                WHERE pc."isActive" = true
                ORDER BY pc.level, pc."sortOrder", pc.name
            """)
            
            result = await session.execute(categories_query)
            categories = [dict(row._mapping) for row in result]
            
            print(f"   找到 {len(categories)} 個品類")
            
            # 統計各級別品類數量
            level_stats = {}
            for cat in categories:
                level = cat['level']
                level_stats[level] = level_stats.get(level, 0) + 1
            
            category_data = {
                "categories": categories,
                "export_timestamp": datetime.now().isoformat(),
                "summary": {
                    "total_categories": len(categories),
                    "level_breakdown": level_stats
                }
            }
            
            # 儲存到檔案
            with open("scripts/database/data/categories.json", "w", encoding="utf-8") as f:
                json.dump(category_data, f, ensure_ascii=False, indent=2, cls=DecimalEncoder)
            
            print(f"   ✅ 品類資料已導出到: scripts/database/data/categories.json")
            print(f"   📊 品類統計: {level_stats}")
            return len(categories)
            
        except Exception as e:
            print(f"   ❌ 導出品類資料失敗: {e}")
            raise
        finally:
            await engine.dispose()

async def export_skus():
    """導出 SKU 資料"""
    print("🏷️  導出 SKU 資料...")
    
    # 添加 product-service 路径
    sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend/product-service-fastapi'))
    
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import text
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as session:
        try:
            # 查詢所有 SKU
            skus_query = text("""
                SELECT 
                    ps."skuCode", ps."productId", ps."packagingType",
                    ps."packagingSize", ps."qualityGrade", ps."processingMethod",
                    ps."packagingMaterial", ps."basePrice", ps."pricingUnit",
                    ps."originCountry", ps."originRegion", ps."weightGrams",
                    ps.dimensions, ps."minimumOrderQuantity", ps."maxOrderQuantity",
                    ps."stockQuantity", ps."reorderPoint", ps."shelfLifeDays",
                    ps.allergens, ps."allergenRiskLevel", ps."nutritionalInfo",
                    ps."storageRequirements", ps."isOrganic", ps."isHalal",
                    ps."certifications", ps."supplierSku", ps."unitPerCase",
                    ps."isActive", ps."createdAt", ps."updatedAt",
                    ps."createdBy", ps."updatedBy"
                FROM product_skus ps
                WHERE ps."isActive" = true
                ORDER BY ps."skuCode"
            """)
            
            result = await session.execute(skus_query)
            skus = [dict(row._mapping) for row in result]
            
            print(f"   找到 {len(skus)} 個 SKU")
            
            # 統計 SKU 資料
            packaging_stats = {}
            quality_stats = {}
            for sku in skus:
                pkg_type = sku.get('packagingType')
                if pkg_type:
                    packaging_stats[pkg_type] = packaging_stats.get(pkg_type, 0) + 1
                
                quality = sku.get('qualityGrade')
                if quality:
                    quality_stats[quality] = quality_stats.get(quality, 0) + 1
            
            sku_data = {
                "skus": skus,
                "export_timestamp": datetime.now().isoformat(),
                "summary": {
                    "total_skus": len(skus),
                    "packaging_breakdown": packaging_stats,
                    "quality_breakdown": quality_stats
                }
            }
            
            # 儲存到檔案
            with open("scripts/database/data/skus.json", "w", encoding="utf-8") as f:
                json.dump(sku_data, f, ensure_ascii=False, indent=2, cls=DecimalEncoder)
            
            print(f"   ✅ SKU 資料已導出到: scripts/database/data/skus.json")
            print(f"   📦 包裝類型統計: {packaging_stats}")
            print(f"   ⭐ 品質等級統計: {quality_stats}")
            return len(skus)
            
        except Exception as e:
            print(f"   ❌ 導出 SKU 資料失敗: {e}")
            raise
        finally:
            await engine.dispose()

async def export_all_data():
    """導出所有資料"""
    print("🚀 開始導出所有生產環境資料...")
    print("=" * 50)
    
    start_time = datetime.now()
    
    try:
        # 依序導出各種資料
        supplier_count = await export_suppliers()
        customer_count = await export_customers()
        category_count = await export_categories()
        sku_count = await export_skus()
        
        end_time = datetime.now()
        duration = end_time - start_time
        
        # 建立導出摘要
        export_summary = {
            "export_timestamp": end_time.isoformat(),
            "export_duration_seconds": duration.total_seconds(),
            "data_counts": {
                "suppliers": supplier_count,
                "customers": customer_count,
                "categories": category_count,
                "skus": sku_count
            },
            "files_created": [
                "scripts/database/data/suppliers.json",
                "scripts/database/data/customers.json", 
                "scripts/database/data/categories.json",
                "scripts/database/data/skus.json"
            ]
        }
        
        with open("scripts/database/data/export_summary.json", "w", encoding="utf-8") as f:
            json.dump(export_summary, f, ensure_ascii=False, indent=2, cls=DecimalEncoder)
        
        print("\n" + "=" * 50)
        print("✅ 資料導出完成！")
        print(f"📊 總結：")
        print(f"   - 供應商: {supplier_count} 個")
        print(f"   - 客戶: {customer_count} 個")
        print(f"   - 品類: {category_count} 個") 
        print(f"   - SKU: {sku_count} 個")
        print(f"⏱️  耗時: {duration.total_seconds():.2f} 秒")
        print(f"📄 摘要檔案: scripts/database/data/export_summary.json")
        
    except Exception as e:
        print(f"\n❌ 資料導出失敗: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(export_all_data())