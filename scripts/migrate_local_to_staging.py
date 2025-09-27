#!/usr/bin/env python3
"""
將本地產品資料遷移到 staging 資料庫
處理 Prisma 生成的 schema 與 Alembic schema 之間的差異
"""
import asyncio
import json
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import uuid

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
        print("📋 開始從本地遷移資料到 staging...")
        
        # 1. 複製 products
        print("\n1️⃣ 遷移 products 表...")
        async with LocalSession() as local_session:
            # 讀取本地的 products 資料（Prisma schema）
            result = await local_session.execute(text("""
                SELECT 
                    id, "supplierId", "categoryId", code, name, "nameEn", 
                    description, brand, origin, "productState"::text, 
                    "taxStatus"::text, "allergenTrackingEnabled", 
                    "baseUnit", "pricingUnit", specifications::text,
                    version, "isActive", "isPublic", certifications::text, 
                    "safetyInfo"::text, "createdAt", "updatedAt", 
                    "createdBy", "updatedBy", "pricingMethod"::text
                FROM products
            """))
            products = result.fetchall()
            print(f"  找到 {len(products)} 筆產品資料")
        
        if products:
            async with StagingSession() as staging_session:
                success_count = 0
                for product in products:
                    try:
                        # 映射欄位
                        # productState -> status (只取狀態部分)
                        status = 'active' if product[16] else 'inactive'  # 使用 isActive
                        
                        # 準備 JSON 欄位
                        images = '[]'  # 本地沒有 images 欄位
                        tags = '[]'  # 本地沒有 tags 欄位
                        allergens = f'[{{"enabled": {str(product[11]).lower()}}}]' if product[11] else '[]'
                        nutritional = product[19] if product[19] else '{}'  # 從 safetyInfo 映射
                        certifications = product[18] if product[18] else '[]'
                        metadata = json.dumps({
                            "brand": product[7],
                            "taxStatus": product[10],
                            "baseUnit": product[12],
                            "pricingUnit": product[13],
                            "specifications": json.loads(product[14]) if product[14] else {},
                            "isPublic": product[17],
                            "createdBy": product[22],
                            "updatedBy": product[23],
                            "pricingMethod": product[24]
                        })
                        
                        # 轉換 origin 為 originCountry
                        origin_country = product[8] if product[8] else None
                        
                        await staging_session.execute(text("""
                            INSERT INTO products (
                                id, "categoryId", code, name, "nameEn", description, "descriptionEn",
                                images, tags, "unitOfMeasure", "isActive", "createdAt", "updatedAt",
                                "supplierId", "originCountry", status, allergens, 
                                "nutritionalInfo", certifications, metadata
                            ) VALUES (
                                :id, :categoryId, :code, :name, :nameEn, :description, :descriptionEn,
                                CAST(:images AS json), CAST(:tags AS json), :unitOfMeasure, :isActive, :createdAt, :updatedAt,
                                :supplierId, :originCountry, :status, CAST(:allergens AS json),
                                CAST(:nutritionalInfo AS json), CAST(:certifications AS json), CAST(:metadata AS json)
                            )
                            ON CONFLICT (id) DO UPDATE SET
                                name = EXCLUDED.name,
                                "updatedAt" = EXCLUDED."updatedAt"
                        """), {
                            'id': product[0],
                            'categoryId': product[2],
                            'code': product[3],
                            'name': product[4],
                            'nameEn': product[5],
                            'description': product[6],
                            'descriptionEn': None,  # 本地沒有 descriptionEn
                            'images': images,
                            'tags': tags,
                            'unitOfMeasure': product[13],  # 使用 pricingUnit
                            'isActive': product[16],
                            'createdAt': product[20],
                            'updatedAt': product[21],
                            'supplierId': product[1],
                            'originCountry': origin_country,
                            'status': status,
                            'allergens': allergens,
                            'nutritionalInfo': nutritional,
                            'certifications': certifications,
                            'metadata': metadata
                        })
                        success_count += 1
                    except Exception as e:
                        print(f"  ⚠️ 產品 {product[3]} 遷移失敗: {e}")
                        continue
                
                await staging_session.commit()
                print(f"  ✅ 成功遷移 {success_count}/{len(products)} 筆產品")
        
        # 2. 複製 product_skus
        print("\n2️⃣ 遷移 product_skus 表...")
        async with LocalSession() as local_session:
            # 讀取本地的 product_skus 資料
            result = await local_session.execute(text("""
                SELECT 
                    id, "productId", "skuCode", name, variant::text,
                    "stockQuantity", "reservedQuantity", "minStock", "maxStock",
                    weight, dimensions::text, "packageType", "shelfLifeDays",
                    "storageConditions", "batchTrackingEnabled", "isActive",
                    "createdAt", "updatedAt", "pricingUnit",
                    "originCountry", "originRegion", "pricingMethod",
                    "unitPrice", "minOrderQuantity", "quantityIncrement",
                    type, creator_type
                FROM product_skus
            """))
            skus = result.fetchall()
            print(f"  找到 {len(skus)} 筆 SKU 資料")
        
        if skus:
            async with StagingSession() as staging_session:
                success_count = 0
                for sku in skus:
                    try:
                        # SKU 資料順序對應到 SELECT 語句
                        # 0:id, 1:productId, 2:skuCode, 3:name, 4:variant,
                        # 5:stockQuantity, 6:reservedQuantity, 7:minStock, 8:maxStock,
                        # 9:weight, 10:dimensions, 11:packageType, 12:shelfLifeDays,
                        # 13:storageConditions, 14:batchTrackingEnabled, 15:isActive,
                        # 16:createdAt, 17:updatedAt, 18:pricingUnit,
                        # 19:originCountry, 20:originRegion, 21:pricingMethod,
                        # 22:unitPrice, 23:minOrderQuantity, 24:quantityIncrement,
                        # 25:type, 26:creator_type
                        
                        # 使用原有的 variant
                        variant = sku[4] if sku[4] else '{}'
                        
                        # 處理 dimensions
                        dimensions = sku[10] if sku[10] else None
                        
                        await staging_session.execute(text("""
                            INSERT INTO product_skus (
                                id, "productId", "skuCode", name, variant,
                                "stockQuantity", "reservedQuantity", "minStock", "maxStock",
                                weight, dimensions, "packageType", "shelfLifeDays",
                                "storageConditions", "batchTrackingEnabled", "isActive",
                                "createdAt", "updatedAt", "pricingUnit",
                                "minOrderQuantity", "quantityIncrement",
                                type, creator_type, version
                            ) VALUES (
                                :id, :productId, :skuCode, :name, CAST(:variant AS json),
                                :stockQuantity, :reservedQuantity, :minStock, :maxStock,
                                :weight, CAST(:dimensions AS json), :packageType, :shelfLifeDays,
                                :storageConditions, :batchTrackingEnabled, :isActive,
                                :createdAt, :updatedAt, :pricingUnit,
                                :minOrderQuantity, :quantityIncrement,
                                'STANDARD'::skutype, 'SYSTEM'::creatortype, 1
                            )
                            ON CONFLICT (id) DO UPDATE SET
                                name = EXCLUDED.name,
                                "updatedAt" = EXCLUDED."updatedAt"
                        """), {
                            'id': sku[0],
                            'productId': sku[1],
                            'skuCode': sku[2],
                            'name': sku[3],
                            'variant': variant,
                            'stockQuantity': sku[5],
                            'reservedQuantity': sku[6],
                            'minStock': sku[7],
                            'maxStock': sku[8],
                            'weight': sku[9],
                            'dimensions': dimensions,
                            'packageType': sku[11],
                            'shelfLifeDays': sku[12],
                            'storageConditions': sku[13],
                            'batchTrackingEnabled': sku[14],
                            'isActive': sku[15],
                            'createdAt': sku[16],
                            'updatedAt': sku[17],
                            'pricingUnit': sku[18],
                            'minOrderQuantity': sku[23],
                            'quantityIncrement': sku[24]
                        })
                        success_count += 1
                    except Exception as e:
                        print(f"  ⚠️ SKU {sku[2]} 遷移失敗: {e}")
                        continue
                
                await staging_session.commit()
                print(f"  ✅ 成功遷移 {success_count}/{len(skus)} 筆 SKU")
        
        # 3. 驗證遷移結果
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
        
        # 4. 測試 API endpoint
        print("\n4️⃣ 測試幾個產品...")
        async with StagingSession() as staging_session:
            result = await staging_session.execute(text("""
                SELECT p.id, p.code, p.name, c.name as category_name
                FROM products p
                JOIN product_categories c ON p."categoryId" = c.id
                LIMIT 5
            """))
            sample_products = result.fetchall()
            
            if sample_products:
                print("\n📦 產品樣本：")
                for prod in sample_products:
                    print(f"  - [{prod[1]}] {prod[2]} (分類: {prod[3]})")
        
        print("\n✅ 資料遷移完成！")
        
    except Exception as e:
        print(f"\n❌ 錯誤: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await local_engine.dispose()
        await staging_engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate_data())