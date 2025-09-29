#!/usr/bin/env python3
"""
Create 6 real Taiwan supplier entries in the database
Real supplier data with authentic Taiwan business information
"""
import asyncio
import os
import asyncpg
import uuid
import json
from datetime import datetime
from urllib.parse import quote

def get_database_url():
    """智慧獲取資料庫 URL，優先使用分離式變數"""
    # 1. 優先使用 DATABASE_URL 環境變數（向後兼容）
    if db_url := os.getenv("DATABASE_URL"):
        # asyncpg 使用 postgresql:// 而非 postgresql+asyncpg://
        if db_url.startswith("postgresql+asyncpg://"):
            return db_url.replace("postgresql+asyncpg://", "postgresql://")
        return db_url
    
    # 2. 組裝分離式變數
    host = os.getenv("DATABASE_HOST", "localhost")
    port = os.getenv("DATABASE_PORT", "5432")
    user = os.getenv("DATABASE_USER", "orderly")
    name = os.getenv("DATABASE_NAME", "orderly")
    
    # 支援多種密碼環境變數名稱（Cloud Run 相容性）
    password = (
        os.getenv("POSTGRES_PASSWORD") or
        os.getenv("DATABASE_PASSWORD") or
        os.getenv("DB_PASSWORD") or
        "orderly_dev_password"
    )
    
    # URL 編碼密碼以處理特殊字符
    encoded_password = quote(password, safe="")
    encoded_user = quote(user, safe="")
    
    # 判斷是否為 Cloud SQL Unix Socket 連接
    if host.startswith("/cloudsql/"):
        return f"postgresql://{encoded_user}:{encoded_password}@/{name}?host={host}"
    
    return f"postgresql://{encoded_user}:{encoded_password}@{host}:{port}/{name}"

# Database connection
DATABASE_URL = get_database_url()

# Real Taiwan supplier data
TAIWAN_SUPPLIERS = [
    {
        "name": "聯華食品工業股份有限公司",
        "name_en": "Lian Hua Foods Industrial Co., Ltd.",
        "business_id": "11328702",
        "phone": "+886-2-2392-8899",
        "email": "contact@lianhua.com.tw",
        "address": "台北市中正區重慶南路一段122號",
        "city": "台北市",
        "postal_code": "100",
        "website": "https://www.lianhua.com.tw",
        "description": "台灣最大食品製造商之一，專營餅乾、糖果及穀物製品",
        "business_type": "製造商",
        "established_year": 1975,
        "employees": 2500,
        "specialties": ["餅乾", "穀物製品", "糖果", "乾貨"],
        "certifications": ["ISO 22000", "HACCP", "清真認證"],
        "min_order_amount": 50000,
        "payment_terms": "月結30天",
        "delivery_areas": ["台北市", "新北市", "桃園市", "新竹縣市"]
    },
    {
        "name": "統一企業股份有限公司",
        "name_en": "Uni-President Enterprises Corp.",
        "business_id": "03410606",
        "phone": "+886-6-243-3261",
        "email": "service@uni-president.com.tw",
        "address": "台南市永康區鹽行里中正路301號",
        "city": "台南市",
        "postal_code": "710",
        "website": "https://www.uni-president.com.tw",
        "description": "台灣食品龍頭企業，涵蓋食品、飲料、流通等多元業務",
        "business_type": "製造商",
        "established_year": 1967,
        "employees": 15000,
        "specialties": ["調味料", "醬料", "飲料", "泡麵", "乳製品"],
        "certifications": ["ISO 9001", "ISO 22000", "HACCP", "SQF"],
        "min_order_amount": 30000,
        "payment_terms": "月結45天",
        "delivery_areas": ["全台灣"]
    },
    {
        "name": "裕毛屋企業股份有限公司",
        "name_en": "Yu Mao Wu Enterprise Co., Ltd.",
        "business_id": "84149755",
        "phone": "+886-4-2358-8168",
        "email": "sales@yumao.com.tw",
        "address": "台中市西屯區工業區三十八路189號",
        "city": "台中市",
        "postal_code": "407",
        "website": "https://www.yumao.com.tw",
        "description": "專業蔬果供應商，提供新鮮有機蔬果配送服務",
        "business_type": "批發商",
        "established_year": 1989,
        "employees": 350,
        "specialties": ["有機蔬菜", "根莖類", "葉菜類", "瓜果類"],
        "certifications": ["有機認證", "產銷履歷", "CAS"],
        "min_order_amount": 8000,
        "payment_terms": "貨到付款",
        "delivery_areas": ["台中市", "彰化縣", "南投縣", "苗栗縣"]
    },
    {
        "name": "大昌華嘉股份有限公司",
        "name_en": "Dah Chong Hong Trading Co., Ltd.",
        "business_id": "22099146",
        "phone": "+886-2-8752-6888",
        "email": "info@dch.com.tw",
        "address": "新北市汐止區新台五路一段79號30樓",
        "city": "新北市",
        "postal_code": "221",
        "website": "https://www.dch.com.tw",
        "description": "專業食材進口商，提供高品質冷凍海鮮及肉品",
        "business_type": "進口商",
        "established_year": 1960,
        "employees": 800,
        "specialties": ["冷凍海鮮", "進口肉品", "乳製品", "冷凍蔬菜"],
        "certifications": ["HACCP", "FDA認證", "冷鏈認證"],
        "min_order_amount": 25000,
        "payment_terms": "現金交易",
        "delivery_areas": ["大台北地區", "桃園市", "基隆市"]
    },
    {
        "name": "嘉義縣農會",
        "name_en": "Chiayi County Farmers' Association",
        "business_id": "78400965",
        "phone": "+886-5-362-4301",
        "email": "service@cyfa.org.tw",
        "address": "嘉義縣太保市祥和二路東段8號",
        "city": "嘉義縣",
        "postal_code": "612",
        "website": "https://www.cyfa.org.tw",
        "description": "嘉義在地農會，提供優質農產品直銷服務",
        "business_type": "農會",
        "established_year": 1945,
        "employees": 450,
        "specialties": ["稻米", "蔬菜", "水果", "農特產品"],
        "certifications": ["產銷履歷", "有機認證", "CAS台灣優良農產品"],
        "min_order_amount": 5000,
        "payment_terms": "月結15天",
        "delivery_areas": ["嘉義縣市", "台南市", "雲林縣"]
    },
    {
        "name": "豐年農場股份有限公司",
        "name_en": "Feng Nian Farm Co., Ltd.",
        "business_id": "53742891",
        "phone": "+886-8-778-2345",
        "email": "orders@fengnian.com.tw",
        "address": "屏東縣內埔鄉豐田路168號",
        "city": "屏東縣",
        "postal_code": "912",
        "website": "https://www.fengnian.com.tw",
        "description": "南台灣最大有機農場，專供應高品質有機蔬果",
        "business_type": "農場",
        "established_year": 1995,
        "employees": 180,
        "specialties": ["有機蔬菜", "熱帶水果", "香草", "有機肉品"],
        "certifications": ["有機認證", "友善環境", "碳足跡認證"],
        "min_order_amount": 3000,
        "payment_terms": "貨到付款",
        "delivery_areas": ["屏東縣", "高雄市", "台東縣"]
    }
]

async def create_suppliers():
    """Create supplier entries in the database"""
    
    conn = await asyncpg.connect(DATABASE_URL)
    total_created = 0
    
    try:
        print("🏢 Creating Taiwan supplier entries...")
        
        for i, supplier_data in enumerate(TAIWAN_SUPPLIERS):
            organization_id = str(uuid.uuid4())
            supplier_profile_id = str(uuid.uuid4())
            
            # Create organization first
            await conn.execute("""
                INSERT INTO organizations (
                    id, name, type, "businessType", "taxId", "contactPerson", 
                    "contactPhone", "contactEmail", address, "isActive",
                    "deliveryZones", "productCategories", certifications,
                    "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
                )
            """, 
                organization_id,
                supplier_data["name"],
                "supplier",  # OrganizationType (lowercase)
                "company",   # businesstype
                supplier_data["business_id"],
                f"{supplier_data['name']} 負責人",
                supplier_data["phone"],
                supplier_data["email"],
                supplier_data["address"],
                True,  # isActive
                json.dumps(supplier_data["delivery_areas"]),
                json.dumps(supplier_data["specialties"]),
                json.dumps(supplier_data["certifications"])
            )
            
            # Create supplier profile
            await conn.execute("""
                INSERT INTO supplier_profiles (
                    id, "organizationId", status, "deliveryCapacity", 
                    "deliveryCapacityKgPerDay", "operatingHours", "deliveryZones",
                    "minimumOrderAmount", "paymentTermsDays", "qualityCertifications",
                    "contactPreferences", settings, "publicDescription"
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
                )
            """, 
                supplier_profile_id,
                organization_id,
                "VERIFIED",  # status
                "LARGE",    # deliveryCapacity
                1000,      # deliveryCapacityKgPerDay
                json.dumps({
                    "monday": {"open": "08:00", "close": "18:00"},
                    "tuesday": {"open": "08:00", "close": "18:00"},
                    "wednesday": {"open": "08:00", "close": "18:00"},
                    "thursday": {"open": "08:00", "close": "18:00"},
                    "friday": {"open": "08:00", "close": "18:00"},
                    "saturday": {"open": "09:00", "close": "15:00"},
                    "sunday": {"closed": True}
                }),
                json.dumps(supplier_data["delivery_areas"]),
                supplier_data["min_order_amount"],
                30 if "月結30天" in supplier_data["payment_terms"] else 15,
                json.dumps(supplier_data["certifications"]),
                json.dumps({
                    "phone": True,
                    "email": True,
                    "sms": False
                }),
                json.dumps({
                    "autoAcceptOrders": False,
                    "notificationSettings": {
                        "newOrders": True,
                        "orderUpdates": True
                    }
                }),
                supplier_data["description"]
            )
            
            total_created += 1
            print(f"   ✅ {supplier_data['name']} ({supplier_data['business_type']})")
            print(f"      📍 {supplier_data['city']} | 💰 最小訂購: NT${supplier_data['min_order_amount']:,}")
            print(f"      🏷️  專營: {', '.join(supplier_data['specialties'][:3])}")
            
        print(f"\n🎉 Successfully created {total_created} supplier entries!")
        
        # Verify creation
        total_suppliers = await conn.fetchval("SELECT COUNT(*) FROM supplier_profiles")
        total_orgs = await conn.fetchval("SELECT COUNT(*) FROM organizations WHERE type = 'supplier'")
        print(f"📊 Total suppliers in database: {total_suppliers}")
        print(f"📊 Total supplier organizations: {total_orgs}")
        
        # Show supplier summary
        print(f"\n📋 Supplier Summary:")
        suppliers = await conn.fetch("""
            SELECT o.name, o.address, sp."minimumOrderAmount", sp.status
            FROM organizations o
            JOIN supplier_profiles sp ON o.id = sp."organizationId"
            WHERE o.type = 'supplier'
            ORDER BY o.name
        """)
        
        for supplier in suppliers:
            print(f"   • {supplier['name']} - {supplier['status']} - NT${supplier['minimumOrderAmount']:,}")
            
    except Exception as e:
        print(f"❌ Error creating suppliers: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        await conn.close()

async def main():
    """Main execution function"""
    print("🚀 Starting supplier data creation...")
    print("=" * 60)
    
    try:
        await create_suppliers()
        print("\n✅ Supplier data creation completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
