#!/usr/bin/env python3
"""
複製本地產品資料到 staging 資料庫
"""
import asyncio
import json
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

async def copy_data():
    # 本地資料庫
    local_url = "postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly"
    # Staging 資料庫
    staging_url = "postgresql+asyncpg://orderly:OtAEG5/1h78R+EGHStvtabQjOhjKtXNq/Pse3d6ZTDs=@localhost:5433/orderly"
    
    # 創建引擎
    local_engine = create_async_engine(local_url, echo=False)
    staging_engine = create_async_engine(staging_url, echo=False)
    
    # 創建會話
    LocalSession = sessionmaker(local_engine, class_=AsyncSession, expire_on_commit=False)
    StagingSession = sessionmaker(staging_engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        print("📋 開始複製資料從本地到 staging...")
        
        # 1. 複製 products
        print("\n1️⃣ 複製 products 表...")
        async with LocalSession() as local_session:
            result = await local_session.execute(text("""
                SELECT id, "categoryId", code, name, "nameEn", description, "descriptionEn",
                       images::text, tags::text, "unitOfMeasure", "isActive", "createdAt", "updatedAt",
                       "supplierId", "supplierProductId", "originCountry", "originRegion",
                       "minStock", "maxStock", "leadTimeDays", status, 
                       allergens::text, "nutritionalInfo"::text, certifications::text, metadata::text
                FROM products
            """))
            products = result.fetchall()
            print(f"  找到 {len(products)} 筆產品資料")
        
        if products:
            async with StagingSession() as staging_session:
                for product in products:
                    # 處理 JSON 欄位
                    images = product[7] if product[7] else '[]'
                    tags = product[8] if product[8] else '[]'
                    allergens = product[21] if product[21] else '[]'
                    nutritional = product[22] if product[22] else '{}'
                    certifications = product[23] if product[23] else '[]'
                    metadata = product[24] if product[24] else '{}'
                    
                    await staging_session.execute(text("""
                        INSERT INTO products (
                            id, "categoryId", code, name, "nameEn", description, "descriptionEn",
                            images, tags, "unitOfMeasure", "isActive", "createdAt", "updatedAt",
                            "supplierId", "supplierProductId", "originCountry", "originRegion",
                            "minStock", "maxStock", "leadTimeDays", status,
                            allergens, "nutritionalInfo", certifications, metadata
                        ) VALUES (
                            :id, :categoryId, :code, :name, :nameEn, :description, :descriptionEn,
                            :images::json, :tags::json, :unitOfMeasure, :isActive, :createdAt, :updatedAt,
                            :supplierId, :supplierProductId, :originCountry, :originRegion,
                            :minStock, :maxStock, :leadTimeDays, :status,
                            :allergens::json, :nutritionalInfo::json, :certifications::json, :metadata::json
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            "updatedAt" = EXCLUDED."updatedAt"
                    """), {
                        'id': product[0], 'categoryId': product[1], 'code': product[2],
                        'name': product[3], 'nameEn': product[4], 'description': product[5],
                        'descriptionEn': product[6], 'images': images, 'tags': tags,
                        'unitOfMeasure': product[9], 'isActive': product[10],
                        'createdAt': product[11], 'updatedAt': product[12],
                        'supplierId': product[13], 'supplierProductId': product[14],
                        'originCountry': product[15], 'originRegion': product[16],
                        'minStock': product[17], 'maxStock': product[18],
                        'leadTimeDays': product[19], 'status': product[20],
                        'allergens': allergens, 'nutritionalInfo': nutritional,
                        'certifications': certifications, 'metadata': metadata
                    })
                await staging_session.commit()
                print(f"  ✅ 成功複製 {len(products)} 筆產品")
        
        # 2. 複製 product_skus
        print("\n2️⃣ 複製 product_skus 表...")
        async with LocalSession() as local_session:
            result = await local_session.execute(text("""
                SELECT id, "productId", "skuCode", name, variant::text,
                       "stockQuantity", "reservedQuantity", "minStock", "maxStock",
                       weight, dimensions::text, "packageType", "shelfLifeDays",
                       "storageConditions", "batchTrackingEnabled", "isActive",
                       "createdAt", "updatedAt", "pricingUnit",
                       "originCountry", "originRegion", "pricingMethod",
                       "unitPrice", "minOrderQuantity", "quantityIncrement",
                       type, creator_type, creator_id, standard_info::text,
                       approval_status, approved_by, approved_at, version
                FROM product_skus
            """))
            skus = result.fetchall()
            print(f"  找到 {len(skus)} 筆 SKU 資料")
        
        if skus:
            async with StagingSession() as staging_session:
                for sku in skus:
                    # 處理 JSON 欄位和 ENUM 類型
                    variant = sku[4] if sku[4] else '{}'
                    dimensions = sku[10] if sku[10] else 'null'
                    standard_info = sku[28] if sku[28] else 'null'
                    
                    # 處理可能為 None 的 ENUM 欄位
                    sku_type = sku[25] if sku[25] else 'STANDARD'
                    creator_type = sku[26] if sku[26] else 'SYSTEM'
                    approval_status = sku[29] if sku[29] else 'DRAFT'
                    pricing_method = sku[21] if sku[21] else None
                    
                    await staging_session.execute(text("""
                        INSERT INTO product_skus (
                            id, "productId", "skuCode", name, variant,
                            "stockQuantity", "reservedQuantity", "minStock", "maxStock",
                            weight, dimensions, "packageType", "shelfLifeDays",
                            "storageConditions", "batchTrackingEnabled", "isActive",
                            "createdAt", "updatedAt", "pricingUnit",
                            "originCountry", "originRegion", "pricingMethod",
                            "unitPrice", "minOrderQuantity", "quantityIncrement",
                            type, creator_type, creator_id, standard_info,
                            approval_status, approved_by, approved_at, version
                        ) VALUES (
                            :id, :productId, :skuCode, :name, :variant::json,
                            :stockQuantity, :reservedQuantity, :minStock, :maxStock,
                            :weight, :dimensions::json, :packageType, :shelfLifeDays,
                            :storageConditions, :batchTrackingEnabled, :isActive,
                            :createdAt, :updatedAt, :pricingUnit,
                            :originCountry, :originRegion, :pricingMethod::pricingmethod,
                            :unitPrice, :minOrderQuantity, :quantityIncrement,
                            :type::skutype, :creator_type::creatortype, :creator_id, :standard_info::json,
                            :approval_status::approvalstatus, :approved_by, :approved_at, :version
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            "updatedAt" = EXCLUDED."updatedAt"
                    """), {
                        'id': sku[0], 'productId': sku[1], 'skuCode': sku[2], 'name': sku[3],
                        'variant': variant, 'stockQuantity': sku[5], 'reservedQuantity': sku[6],
                        'minStock': sku[7], 'maxStock': sku[8], 'weight': sku[9],
                        'dimensions': dimensions if dimensions != 'null' else None,
                        'packageType': sku[11], 'shelfLifeDays': sku[12],
                        'storageConditions': sku[13], 'batchTrackingEnabled': sku[14],
                        'isActive': sku[15], 'createdAt': sku[16], 'updatedAt': sku[17],
                        'pricingUnit': sku[18], 'originCountry': sku[19], 'originRegion': sku[20],
                        'pricingMethod': pricing_method, 'unitPrice': sku[22],
                        'minOrderQuantity': sku[23], 'quantityIncrement': sku[24],
                        'type': sku_type, 'creator_type': creator_type, 'creator_id': sku[27],
                        'standard_info': standard_info if standard_info != 'null' else None,
                        'approval_status': approval_status, 'approved_by': sku[30],
                        'approved_at': sku[31], 'version': sku[32] if sku[32] else 1
                    })
                await staging_session.commit()
                print(f"  ✅ 成功複製 {len(skus)} 筆 SKU")
        
        # 3. 驗證複製結果
        print("\n3️⃣ 驗證 staging 資料庫...")
        async with StagingSession() as staging_session:
            result = await staging_session.execute(text("""
                SELECT 
                    'product_categories' as table_name, COUNT(*) as count 
                FROM product_categories
                UNION ALL
                SELECT 'products', COUNT(*) FROM products
                UNION ALL
                SELECT 'product_skus', COUNT(*) FROM product_skus
                ORDER BY table_name
            """))
            counts = result.fetchall()
            
            print("\n📊 Staging 資料庫統計：")
            for row in counts:
                print(f"  {row[0]}: {row[1]} 筆")
        
        print("\n✅ 資料複製完成！")
        
    except Exception as e:
        print(f"\n❌ 錯誤: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await local_engine.dispose()
        await staging_engine.dispose()

if __name__ == "__main__":
    asyncio.run(copy_data())