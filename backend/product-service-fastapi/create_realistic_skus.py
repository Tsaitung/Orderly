#!/usr/bin/env python3
"""
Create realistic SKU data for all sub-categories
Support both weight-based and item-based pricing
"""
import asyncio
import sys
import os
import uuid
from datetime import datetime
from typing import Dict, List, Tuple
import httpx

# Add app directory to path
sys.path.append(os.path.dirname(__file__))

from app.core.database import get_async_session, async_engine
from app.models.product import Product, PricingMethod
from app.models.sku_simple import ProductSKU
from app.models.category import ProductCategory
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload


# Category-specific SKU configurations
CATEGORY_SKU_CONFIG = {
    # 蔬菜類 - 重量計價
    "LEAF": {  # 葉菜類
        "pricing_method": PricingMethod.BY_WEIGHT,
        "base_unit": "kg",
        "products": [
            ("有機菠菜", {"品種": "台灣菠菜", "產地": "彰化"}, 120.0, 0.3, 0.1),
            ("A菜", {"品種": "油菜", "產地": "雲林"}, 80.0, 0.5, 0.1),
            ("青江菜", {"品種": "小白菜", "產地": "台中"}, 90.0, 0.5, 0.1),
            ("大陸妹", {"品種": "萵苣", "產地": "台南"}, 85.0, 0.3, 0.1),
            ("高麗菜", {"品種": "圓白菜", "產地": "台中"}, 50.0, 1.0, 0.5),
            ("白菜", {"品種": "小白菜", "產地": "嘉義"}, 60.0, 0.5, 0.1),
            ("芥菜", {"品種": "芥藍菜", "產地": "屏東"}, 75.0, 0.5, 0.1),
        ]
    },
    "ARSS": {  # 蔥薑蒜／辛香料
        "pricing_method": PricingMethod.BY_WEIGHT,
        "base_unit": "kg",
        "products": [
            ("青蔥", {"品種": "三星蔥", "產地": "宜蘭"}, 150.0, 0.2, 0.1),
            ("老薑", {"品種": "竹薑", "產地": "南投"}, 180.0, 0.3, 0.1),
            ("蒜頭", {"品種": "大蒜", "產地": "雲林"}, 200.0, 0.2, 0.1),
            ("辣椒", {"品種": "朝天椒", "產地": "台南"}, 300.0, 0.1, 0.05),
            ("洋蔥", {"品種": "黃洋蔥", "產地": "屏東"}, 45.0, 1.0, 0.5),
            ("紅蔥頭", {"品種": "小洋蔥", "產地": "彰化"}, 220.0, 0.3, 0.1),
        ]
    },
    "ROOT": {  # 根莖類
        "pricing_method": PricingMethod.BY_WEIGHT,
        "base_unit": "kg",
        "products": [
            ("白蘿蔔", {"品種": "日本蘿蔔", "產地": "台中"}, 35.0, 1.0, 0.5),
            ("紅蘿蔔", {"品種": "胡蘿蔔", "產地": "雲林"}, 45.0, 1.0, 0.5),
            ("馬鈴薯", {"品種": "克尼伯", "產地": "台北"}, 55.0, 1.0, 0.5),
            ("地瓜", {"品種": "台農66號", "產地": "台南"}, 65.0, 1.0, 0.5),
            ("芋頭", {"品種": "檳榔心芋", "產地": "台中"}, 90.0, 1.0, 0.5),
            ("山藥", {"品種": "台灣山藥", "產地": "南投"}, 280.0, 0.5, 0.1),
        ]
    },
    
    # 肉品類 - 重量計價
    "BLON": {  # 牛-腰脊部
        "pricing_method": PricingMethod.BY_WEIGHT,
        "base_unit": "kg",
        "products": [
            ("紐約客牛排", {"部位": "腰脊", "等級": "Prime"}, 1200.0, 0.5, 0.1),
            ("西冷牛排", {"部位": "腰脊", "等級": "Choice"}, 980.0, 0.5, 0.1),
            ("肋眼牛排", {"部位": "肋脊", "等級": "Prime"}, 1300.0, 0.5, 0.1),
            ("菲力牛排", {"部位": "腰內肉", "等級": "Prime"}, 1800.0, 0.3, 0.1),
            ("T骨牛排", {"部位": "腰脊", "等級": "Choice"}, 1100.0, 0.5, 0.1),
        ]
    },
    "THGH": {  # 雞腿／腿排
        "pricing_method": PricingMethod.BY_WEIGHT,
        "base_unit": "kg",
        "products": [
            ("去骨雞腿排", {"部位": "大腿", "處理": "去骨"}, 180.0, 1.0, 0.5),
            ("帶骨雞腿", {"部位": "大腿", "處理": "帶骨"}, 120.0, 1.0, 0.5),
            ("雞腿肉丁", {"部位": "大腿", "處理": "切丁"}, 190.0, 0.5, 0.2),
            ("雞腿絞肉", {"部位": "大腿", "處理": "絞肉"}, 160.0, 0.5, 0.2),
            ("棒棒腿", {"部位": "小腿", "處理": "帶骨"}, 95.0, 1.0, 0.5),
        ]
    },
    
    # 調味料類 - 個數計價
    "SEAS": {  # 調味料
        "pricing_method": PricingMethod.BY_ITEM,
        "base_unit": "瓶",
        "products": [
            ("統一醬油膏", {"容量": "590ml", "品牌": "統一"}, 45.0, 1, 1),
            ("金蘭醬油", {"容量": "1公升", "品牌": "金蘭"}, 85.0, 1, 1),
            ("味精", {"容量": "454g", "品牌": "味之素"}, 65.0, 1, 1),
            ("白胡椒粉", {"容量": "100g", "品牌": "胡椒先生"}, 120.0, 1, 1),
            ("香油", {"容量": "200ml", "品牌": "大統"}, 95.0, 1, 1),
            ("米酒", {"容量": "600ml", "品牌": "台酒"}, 25.0, 6, 6),
            ("白醋", {"容量": "600ml", "品牌": "統一"}, 35.0, 1, 1),
            ("糖", {"容量": "1kg", "品牌": "台糖"}, 45.0, 1, 1),
            ("鹽", {"容量": "1kg", "品牌": "台鹽"}, 30.0, 1, 1),
        ]
    },
    
    # 餐具用品類 - 個數計價
    "DSHW": {  # 餐具用品
        "pricing_method": PricingMethod.BY_ITEM,
        "base_unit": "包",
        "products": [
            ("免洗筷", {"數量": "100雙", "材質": "竹筷"}, 35.0, 10, 10),
            ("紙碗", {"數量": "50個", "容量": "500ml"}, 85.0, 1, 1),
            ("紙盤", {"數量": "50個", "尺寸": "9吋"}, 75.0, 1, 1),
            ("塑膠湯匙", {"數量": "100支", "材質": "PP"}, 45.0, 1, 1),
            ("餐具組", {"數量": "50套", "內容": "叉+匙+刀"}, 120.0, 1, 1),
            ("外帶盒", {"數量": "50個", "尺寸": "便當盒"}, 180.0, 1, 1),
        ]
    },
    
    # 清潔用品類 - 個數計價
    "FLOR": {  # 地面清潔
        "pricing_method": PricingMethod.BY_ITEM,
        "base_unit": "瓶",
        "products": [
            ("地板清潔劑", {"容量": "2公升", "品牌": "花王"}, 180.0, 1, 1),
            ("漂白水", {"容量": "2公升", "品牌": "白蘭"}, 120.0, 1, 1),
            ("拖把", {"類型": "平板拖", "材質": "超細纖維"}, 350.0, 1, 1),
            ("掃帚", {"類型": "軟毛掃把", "材質": "塑膠"}, 180.0, 1, 1),
            ("垃圾袋", {"數量": "100個", "尺寸": "大"}, 220.0, 1, 1),
        ]
    },
    
    # 飲料類 - 個數計價
    "TEAS": {  # 茶類飲品
        "pricing_method": PricingMethod.BY_ITEM,
        "base_unit": "包",
        "products": [
            ("烏龍茶包", {"數量": "100包", "品牌": "天仁"}, 280.0, 1, 1),
            ("綠茶茶葉", {"重量": "300g", "品牌": "天福"}, 450.0, 1, 1),
            ("紅茶茶包", {"數量": "100包", "品牌": "立頓"}, 320.0, 1, 1),
            ("茉莉花茶", {"重量": "150g", "品牌": "張一元"}, 380.0, 1, 1),
            ("普洱茶餅", {"重量": "357g", "年份": "2020年"}, 680.0, 1, 1),
        ]
    },
}


def generate_sku_code(category_code: str, index: int) -> str:
    """Generate unique SKU code"""
    today = datetime.now().strftime("%Y%m%d")
    return f"{category_code}-{today}-{index:03d}"


async def create_products_and_skus():
    """Create products and SKUs for all configured categories"""
    
    # Create a session for database operations
    async with AsyncSession(async_engine) as session:
        # Get all categories
        result = await session.execute(
            select(ProductCategory)
            .where(ProductCategory.level == 2)
        )
        categories = result.scalars().all()
        total_created = 0
        
        for category in categories:
            if category.code not in CATEGORY_SKU_CONFIG:
                print(f"⚠️  No config for category: {category.code} ({category.name})")
                continue
            
            config = CATEGORY_SKU_CONFIG[category.code]
            print(f"\n📦 Processing category: {category.name} ({category.code})")
            print(f"   計價方式: {config['pricing_method'].value}")
            
            for i, (product_name, variant, unit_price, min_qty, qty_increment) in enumerate(config["products"]):
                # Create product
                product = Product(
                    id=str(uuid.uuid4()),
                    code=f"PRD-{category.code}-{i+1:03d}",
                    name=product_name,
                    category_id=category.id,
                    base_unit=config["base_unit"],
                    pricing_unit=config["base_unit"],
                    pricing_method=config["pricing_method"],
                    is_active=True,
                    is_public=True,
                    specifications=variant,
                    created_by="system",
                    updated_by="system"
                )
                session.add(product)
                
                # Create SKU
                sku_code = generate_sku_code(category.code, i+1)
                sku = ProductSKU(
                    id=str(uuid.uuid4()),
                    product_id=product.id,
                    sku_code=sku_code,
                    name=f"{product_name} - {config['base_unit']}",
                    variant=variant,
                    stock_quantity=50 if config["pricing_method"] == PricingMethod.BY_ITEM else 100,
                    min_stock=10 if config["pricing_method"] == PricingMethod.BY_ITEM else 20,
                    max_stock=200 if config["pricing_method"] == PricingMethod.BY_ITEM else 500,
                    weight=1.0 if config["pricing_method"] == PricingMethod.BY_WEIGHT else None,
                    package_type="散裝" if config["pricing_method"] == PricingMethod.BY_WEIGHT else "包裝",
                    shelf_life_days=7 if "蔬菜" in category.name or "肉" in category.name else 365,
                    storage_conditions="冷藏" if "蔬菜" in category.name or "肉" in category.name else "常溫",
                    is_active=True,
                    pricing_method=config["pricing_method"],
                    unit_price=unit_price,
                    min_order_quantity=min_qty,
                    quantity_increment=qty_increment,
                )
                session.add(sku)
                total_created += 1
                
                print(f"   ✅ {product_name}: {unit_price}元/{config['base_unit']} (最小訂購: {min_qty}{config['base_unit']})")
        
        # Commit all changes
        await session.commit()
        print(f"\n🎉 Successfully created {total_created} SKUs!")
        
        # Verify creation
        result = await session.execute(select(ProductSKU))
        total_skus = len(result.scalars().all())
        print(f"📊 Total SKUs in database: {total_skus}")


async def main():
    """Main execution function"""
    print("🚀 Starting SKU data generation...")
    print("=" * 50)
    
    try:
        await create_products_and_skus()
        print("\n✅ SKU generation completed successfully!")
        
        # Test API endpoint to verify
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get("http://localhost:8000/api/products/skus/search?page_size=5")
                if response.status_code == 200:
                    data = response.json()
                    print(f"\n🔍 API Test - Found {data.get('total', 0)} SKUs via API")
                    for sku in data.get('data', [])[:3]:
                        print(f"   - {sku['name']} ({sku['code']})")
                else:
                    print(f"⚠️  API Test failed: {response.status_code}")
            except Exception as e:
                print(f"⚠️  API Test error: {e}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())