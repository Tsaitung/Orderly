#!/usr/bin/env python3
"""
創建示例共享 SKU 資料
用於展示 SKU 共享機制功能
"""
import asyncio
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, update

from app.core.database import get_async_session, async_engine
from app.models.sku_simple import ProductSKU
from app.models.product import Product


async def create_sample_shared_skus():
    """創建示例共享 SKU 資料"""
    print("🌱 開始創建示例共享 SKU 資料...")
    
    async with async_engine.begin() as conn:
        # 檢查並創建 ENUM 類型 (如果不存在)
        await conn.execute("""
            DO $$ BEGIN
                CREATE TYPE sku_type_product AS ENUM ('public', 'private');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """)
        
        await conn.execute("""
            DO $$ BEGIN
                CREATE TYPE creator_type_product AS ENUM ('platform', 'supplier');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """)
        
        await conn.execute("""
            DO $$ BEGIN
                CREATE TYPE approval_status_product AS ENUM ('draft', 'pending', 'approved', 'rejected');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """)
    
    async for session in get_async_session():
        try:
            # 查詢現有的 SKU
            query = select(ProductSKU).options(selectinload(ProductSKU.product)).limit(10)
            result = await session.execute(query)
            skus = result.scalars().all()
            
            if not skus:
                print("❌ 沒有找到現有的 SKU，請先創建一些基礎 SKU 資料")
                return
            
            print(f"📦 找到 {len(skus)} 個現有 SKU")
            
            # 將前 40% 的 SKU 設定為共享型
            shared_count = max(1, len(skus) // 2)  # 至少設定一個為共享型
            
            for i, sku in enumerate(skus[:shared_count]):
                print(f"🔄 更新 SKU {sku.sku_code} 為共享型...")
                
                # 更新 SKU 為共享型
                update_query = (
                    update(ProductSKU)
                    .where(ProductSKU.id == sku.id)
                    .values(
                        type='public',
                        creator_type='platform',
                        creator_id='platform-admin',
                        approval_status='approved',
                        approved_by='platform-admin',
                        approved_at=datetime.utcnow(),
                        version=1,
                        standard_info={
                            "description": f"標準化 {sku.name}",
                            "specifications": {
                                "packaging": sku.package_type or "標準包裝",
                                "quality_grade": "A級",
                                "origin": "台灣"
                            },
                            "standardized_at": datetime.utcnow().isoformat()
                        }
                    )
                )
                await session.execute(update_query)
                
                print(f"✅ SKU {sku.sku_code} 已設定為共享型")
            
            # 確保其餘 SKU 為私有型
            for sku in skus[shared_count:]:
                print(f"🔒 更新 SKU {sku.sku_code} 為私有型...")
                
                update_query = (
                    update(ProductSKU)
                    .where(ProductSKU.id == sku.id)
                    .values(
                        type='private',
                        creator_type='supplier',
                        creator_id=f'supplier-{uuid.uuid4().hex[:8]}',
                        approval_status='approved',
                        version=1
                    )
                )
                await session.execute(update_query)
                
                print(f"✅ SKU {sku.sku_code} 已設定為私有型")
            
            await session.commit()
            
            print(f"""
🎉 示例資料創建完成！
   - 共享型 SKU: {shared_count} 個
   - 私有型 SKU: {len(skus) - shared_count} 個
   - 總計: {len(skus)} 個 SKU
            """)
            
        except Exception as e:
            await session.rollback()
            print(f"❌ 創建示例資料時發生錯誤: {e}")
            raise
        finally:
            await session.close()


async def main():
    """主函數"""
    try:
        await create_sample_shared_skus()
        print("✅ 所有操作完成")
    except Exception as e:
        print(f"❌ 執行失敗: {e}")


if __name__ == "__main__":
    asyncio.run(main())