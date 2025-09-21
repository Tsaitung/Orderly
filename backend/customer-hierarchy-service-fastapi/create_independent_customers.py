#!/usr/bin/env python3
"""
創建 20 間獨立客戶 - 無上層集團，每間公司有單一地點和單一業務單位
"""

import asyncio
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import json

# 資料庫連接設定
DATABASE_URL = "postgresql+asyncpg://postgres:password@localhost:5432/orderly"

# 獨立客戶資料
INDEPENDENT_CUSTOMERS = [
    {
        "company_name": "阿明的小吃店",
        "tax_id": "12345001",
        "location_name": "總店",
        "address": "台北市大安區復興南路一段101號",
        "city": "台北市",
        "business_unit_name": "廚房",
        "business_unit_type": "kitchen",
        "cost_center": "KITCHEN001"
    },
    {
        "company_name": "美味鮮食餐廳",
        "tax_id": "12345002", 
        "location_name": "本店",
        "address": "新北市板橋區文化路二段205號",
        "city": "新北市",
        "business_unit_name": "主廚房",
        "business_unit_type": "kitchen",
        "cost_center": "MAIN_KITCHEN"
    },
    {
        "company_name": "老王牛肉麵",
        "tax_id": "12345003",
        "location_name": "創始店",
        "address": "台中市西區精誠路88號",
        "city": "台中市", 
        "business_unit_name": "麵食部",
        "business_unit_type": "kitchen",
        "cost_center": "NOODLE_DEPT"
    },
    {
        "company_name": "星光咖啡廳",
        "tax_id": "12345004",
        "location_name": "旗艦店",
        "address": "高雄市前鎮區一心路99號",
        "city": "高雄市",
        "business_unit_name": "咖啡吧台",
        "business_unit_type": "beverage",
        "cost_center": "COFFEE_BAR"
    },
    {
        "company_name": "家常味小館", 
        "tax_id": "12345005",
        "location_name": "總店",
        "address": "桃園市中壢區中正路333號",
        "city": "桃園市",
        "business_unit_name": "熱炒區",
        "business_unit_type": "kitchen",
        "cost_center": "STIRFRY_AREA"
    },
    {
        "company_name": "海鮮大排檔",
        "tax_id": "12345006",
        "location_name": "漁港店",
        "address": "基隆市仁愛區愛三路77號",
        "city": "基隆市",
        "business_unit_name": "海鮮部",
        "business_unit_type": "kitchen",
        "cost_center": "SEAFOOD_DEPT"
    },
    {
        "company_name": "義式廚房",
        "tax_id": "12345007",
        "location_name": "本館",
        "address": "新竹市東區光復路二段156號",
        "city": "新竹市",
        "business_unit_name": "義大利麵區",
        "business_unit_type": "kitchen", 
        "cost_center": "PASTA_SECTION"
    },
    {
        "company_name": "燒烤世家",
        "tax_id": "12345008",
        "location_name": "總店",
        "address": "彰化市中山路一段888號",
        "city": "彰化市",
        "business_unit_name": "燒烤爐台",
        "business_unit_type": "grill",
        "cost_center": "BBQ_STATION"
    },
    {
        "company_name": "港式茶餐廳",
        "tax_id": "12345009",
        "location_name": "創始店",
        "address": "台南市中西區民權路二段234號",
        "city": "台南市",
        "business_unit_name": "港式廚房",
        "business_unit_type": "kitchen",
        "cost_center": "HK_KITCHEN"
    },
    {
        "company_name": "鐵板燒料理",
        "tax_id": "12345010",
        "location_name": "旗艦店",
        "address": "嘉義市西區中正路567號",
        "city": "嘉義市", 
        "business_unit_name": "鐵板區",
        "business_unit_type": "teppanyaki",
        "cost_center": "TEPPAN_AREA"
    },
    {
        "company_name": "日式拉麵屋",
        "tax_id": "12345011",
        "location_name": "本店",
        "address": "宜蘭市中山路三段111號",
        "city": "宜蘭市",
        "business_unit_name": "拉麵工房",
        "business_unit_type": "kitchen",
        "cost_center": "RAMEN_SHOP"
    },
    {
        "company_name": "韓式烤肉館",
        "tax_id": "12345012",
        "location_name": "總店",
        "address": "花蓮市中華路456號",
        "city": "花蓮市",
        "business_unit_name": "烤肉區",
        "business_unit_type": "grill",
        "cost_center": "KOREAN_BBQ"
    },
    {
        "company_name": "泰式料理坊",
        "tax_id": "12345013",
        "location_name": "創始店",
        "address": "台東市中正路789號",
        "city": "台東市",
        "business_unit_name": "泰式廚房",
        "business_unit_type": "kitchen",
        "cost_center": "THAI_KITCHEN"
    },
    {
        "company_name": "素食養生館",
        "tax_id": "12345014",
        "location_name": "本館",
        "address": "南投市中興路123號",
        "city": "南投市",
        "business_unit_name": "素食區",
        "business_unit_type": "kitchen",
        "cost_center": "VEGETARIAN"
    },
    {
        "company_name": "西式牛排館",
        "tax_id": "12345015",
        "location_name": "旗艦店",
        "address": "雲林縣斗六市中山路345號",
        "city": "斗六市",
        "business_unit_name": "牛排廚房",
        "business_unit_type": "kitchen",
        "cost_center": "STEAK_KITCHEN"
    },
    {
        "company_name": "火鍋專門店",
        "tax_id": "12345016",
        "location_name": "總店",
        "address": "屏東市中正路678號",
        "city": "屏東市",
        "business_unit_name": "火鍋區",
        "business_unit_type": "hotpot",
        "cost_center": "HOTPOT_AREA"
    },
    {
        "company_name": "手工包子鋪",
        "tax_id": "12345017",
        "location_name": "本舖",
        "address": "澎湖縣馬公市中正路901號",
        "city": "馬公市",
        "business_unit_name": "包子工坊",
        "business_unit_type": "bakery",
        "cost_center": "BAOZI_SHOP"
    },
    {
        "company_name": "歐式麵包坊",
        "tax_id": "12345018",
        "location_name": "創始店", 
        "address": "金門縣金城鎮民族路234號",
        "city": "金城鎮",
        "business_unit_name": "烘焙房",
        "business_unit_type": "bakery",
        "cost_center": "BAKERY_ROOM"
    },
    {
        "company_name": "傳統豆花店",
        "tax_id": "12345019",
        "location_name": "老店",
        "address": "連江縣南竿鄉復興路567號",
        "city": "南竿鄉",
        "business_unit_name": "豆花工坊",
        "business_unit_type": "dessert",
        "cost_center": "TOFU_SHOP"
    },
    {
        "company_name": "現做蛋糕屋",
        "tax_id": "12345020",
        "location_name": "旗艦店",
        "address": "苗栗市中正路890號",
        "city": "苗栗市",
        "business_unit_name": "蛋糕工房",
        "business_unit_type": "bakery",
        "cost_center": "CAKE_STUDIO"
    }
]

async def create_independent_customers():
    """創建獨立客戶資料"""
    
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        for i, customer_data in enumerate(INDEPENDENT_CUSTOMERS, 1):
            try:
                # 1. 創建公司 (無集團)
                company_id = str(uuid.uuid4())
                company_insert = text("""
                INSERT INTO customer_companies (
                    id, group_id, name, legal_name, tax_id, tax_id_type, 
                    billing_address, billing_contact, billing_email,
                    payment_terms, credit_limit, settings,
                    "createdAt", "updatedAt", created_by, updated_by, is_active
                ) VALUES (
                    :id, NULL, :name, :legal_name, :tax_id, :tax_id_type,
                    :billing_address, :billing_contact, :billing_email,
                    :payment_terms, :credit_limit, :settings,
                    :created_at, :updated_at, :created_by, :updated_by, :is_active
                )
                """)
                
                billing_address = {
                    "street": customer_data["address"],
                    "city": customer_data["city"],
                    "country": "台灣"
                }
                
                billing_contact = {
                    "name": "財務部",
                    "title": "財務經理",
                    "phone": f"02-2345-{i:04d}",
                    "email": f"finance{i:02d}@example.com"
                }
                
                company_params = {
                    "id": company_id,
                    "name": customer_data["company_name"],
                    "legal_name": customer_data["company_name"],
                    "tax_id": customer_data["tax_id"],
                    "tax_id_type": "company",
                    "billing_address": json.dumps(billing_address),
                    "billing_contact": json.dumps(billing_contact),
                    "billing_email": f"billing{i:02d}@example.com",
                    "payment_terms": "NET30",
                    "credit_limit": 50000.00,
                    "settings": json.dumps({"auto_approval": False, "preferred_delivery_time": "morning"}),
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "created_by": "system",
                    "updated_by": "system", 
                    "is_active": True
                }
                
                await session.execute(company_insert, company_params)
                
                # 2. 創建地點
                location_id = str(uuid.uuid4())
                location_insert = text("""
                INSERT INTO customer_locations (
                    id, company_id, name, code, address, city,
                    delivery_contact, delivery_phone, delivery_instructions,
                    operating_hours, coordinates, timezone,
                    "createdAt", "updatedAt", created_by, updated_by, is_active
                ) VALUES (
                    :id, :company_id, :name, :code, :address, :city,
                    :delivery_contact, :delivery_phone, :delivery_instructions,
                    :operating_hours, :coordinates, :timezone,
                    :created_at, :updated_at, :created_by, :updated_by, :is_active
                )
                """)
                
                location_address = {
                    "street": customer_data["address"],
                    "city": customer_data["city"],
                    "country": "台灣"
                }
                
                delivery_contact = {
                    "name": "收貨人員",
                    "title": "收貨負責人",
                    "phone": f"02-2345-{i:04d}",
                    "email": f"delivery{i:02d}@example.com"
                }
                
                location_params = {
                    "id": location_id,
                    "company_id": company_id,
                    "name": customer_data["location_name"],
                    "code": f"LOC{i:02d}",
                    "address": json.dumps(location_address),
                    "city": customer_data["city"],
                    "delivery_contact": json.dumps(delivery_contact),
                    "delivery_phone": f"02-2345-{i:04d}",
                    "delivery_instructions": "請於營業時間送達",
                    "operating_hours": json.dumps({"weekdays": "09:00-21:00", "weekends": "10:00-22:00"}),
                    "coordinates": None,
                    "timezone": "Asia/Taipei",
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "created_by": "system",
                    "updated_by": "system",
                    "is_active": True
                }
                
                await session.execute(location_insert, location_params)
                
                # 3. 創建業務單位
                business_unit_id = str(uuid.uuid4())
                business_unit_insert = text("""
                INSERT INTO business_units (
                    id, location_id, name, code, type, cost_center_code,
                    budget_monthly, budget_alert_threshold, manager_contact,
                    ordering_permissions, allowed_suppliers, blocked_categories,
                    max_order_value, requires_approval, approval_threshold,
                    "createdAt", "updatedAt", created_by, updated_by, is_active
                ) VALUES (
                    :id, :location_id, :name, :code, :type, :cost_center_code,
                    :budget_monthly, :budget_alert_threshold, :manager_contact,
                    :ordering_permissions, :allowed_suppliers, :blocked_categories,
                    :max_order_value, :requires_approval, :approval_threshold,
                    :created_at, :updated_at, :created_by, :updated_by, :is_active
                )
                """)
                
                manager_contact = {
                    "name": "部門主管",
                    "title": "主管",
                    "phone": f"02-2345-{i:04d}",
                    "email": f"manager{i:02d}@example.com"
                }
                
                business_unit_params = {
                    "id": business_unit_id,
                    "location_id": location_id,
                    "name": customer_data["business_unit_name"],
                    "code": f"BU{i:02d}",
                    "type": customer_data["business_unit_type"],
                    "cost_center_code": customer_data["cost_center"],
                    "budget_monthly": 30000.00,
                    "budget_alert_threshold": 80.0,
                    "manager_contact": json.dumps(manager_contact),
                    "ordering_permissions": json.dumps({"can_order": True, "approval_required": False}),
                    "allowed_suppliers": json.dumps([]),
                    "blocked_categories": json.dumps([]),
                    "max_order_value": 10000.00,
                    "requires_approval": False,
                    "approval_threshold": 5000.00,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "created_by": "system",
                    "updated_by": "system",
                    "is_active": True
                }
                
                await session.execute(business_unit_insert, business_unit_params)
                
                print(f"✅ 已創建第 {i} 間客戶: {customer_data['company_name']}")
                
            except Exception as e:
                print(f"❌ 創建第 {i} 間客戶失敗: {e}")
                continue
        
        # 提交所有變更
        await session.commit()
        print(f"\n🎉 成功創建 {len(INDEPENDENT_CUSTOMERS)} 間獨立客戶！")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_independent_customers())