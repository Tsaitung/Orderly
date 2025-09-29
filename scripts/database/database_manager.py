#!/usr/bin/env python3
"""
井然 Orderly 資料庫管理工具
整合所有資料庫操作：導出、導入、測試資料創建、清理等功能
"""
import asyncio
import sys
import os
import json
import uuid
import argparse
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Any, Optional

# 添加 backend 路径
sys.path.append(os.path.join(os.path.dirname(__file__), "../../backend/user-service-fastapi"))
sys.path.append(os.path.join(os.path.dirname(__file__), "../../backend/customer-hierarchy-service-fastapi"))
sys.path.append(os.path.join(os.path.dirname(__file__), "../../backend/product-service-fastapi"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from urllib.parse import quote

def get_database_url():
    """智慧獲取資料庫 URL，優先使用分離式變數"""
    # 1. 優先使用 DATABASE_URL 環境變數（向後兼容）
    if db_url := os.getenv("DATABASE_URL"):
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
        return f"postgresql+asyncpg://{encoded_user}:{encoded_password}@/{name}?host={host}"
    
    return f"postgresql+asyncpg://{encoded_user}:{encoded_password}@{host}:{port}/{name}"

# 預設資料庫設定（使用智慧函數）
DEFAULT_DATABASE_URL = get_database_url()
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

class DecimalEncoder(json.JSONEncoder):
    """自定義 JSON 編碼器處理 Decimal 類型"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

class DatabaseManager:
    """資料庫管理器"""
    
    def __init__(self, database_url: str = DEFAULT_DATABASE_URL):
        self.database_url = database_url
        self.data_dir = DATA_DIR
        os.makedirs(self.data_dir, exist_ok=True)
    
    async def get_session(self):
        """獲取資料庫會話"""
        engine = create_async_engine(self.database_url, echo=False)
        async_session = sessionmaker(engine, class_=AsyncSession)
        return async_session(), engine
    
    # ==================== 導出功能 ====================
    
    async def export_suppliers(self) -> List[Dict]:
        """導出供應商資料"""
        session, engine = await self.get_session()
        try:
            print("📦 導出供應商資料...")
            
            query = text("""
                SELECT 
                    o.id, o.name, o.type, o."businessType", o."taxId",
                    o."contactPerson", o."contactPhone", o."contactEmail", o.address,
                    sp."deliveryCapacity", sp."minimumOrderAmount", sp."paymentTermsDays"
                FROM organizations o
                LEFT JOIN supplier_profiles sp ON o.id = sp."organizationId"
                WHERE o.type = 'supplier'
                ORDER BY o."createdAt"
            """)
            
            result = await session.execute(query)
            rows = result.fetchall()
            
            suppliers = []
            for row in rows:
                supplier = {
                    "id": row.id,
                    "name": row.name,
                    "type": row.type,
                    "businessType": row.businessType,
                    "taxId": row.taxId,
                    "contactPerson": row.contactPerson,
                    "contactPhone": row.contactPhone,
                    "contactEmail": row.contactEmail,
                    "address": row.address
                }
                
                # 加入供應商檔案資訊
                if any([row.deliveryCapacity, row.minimumOrderAmount, row.paymentTermsDays]):
                    supplier["profile"] = {
                        "deliveryCapacity": row.deliveryCapacity,
                        "minimumOrderAmount": row.minimumOrderAmount,
                        "paymentTermsDays": row.paymentTermsDays
                    }
                
                suppliers.append(supplier)
            
            print(f"   ✅ 導出 {len(suppliers)} 個供應商")
            return suppliers
            
        finally:
            await session.close()
            await engine.dispose()
    
    async def export_customers(self) -> Dict[str, List]:
        """導出客戶階層資料"""
        session, engine = await self.get_session()
        try:
            print("🏢 導出客戶資料...")
            
            # 導出公司
            companies_query = text("""
                SELECT 
                    cc.id, cc.group_id, cc.name, cc.legal_name,
                    cc.tax_id, cc.tax_id_type, cc.billing_address,
                    cc.billing_contact, cc."createdAt", cc."updatedAt"
                FROM customer_companies cc
                ORDER BY cc."createdAt"
            """)
            
            result = await session.execute(companies_query)
            companies = [dict(row._mapping) for row in result.fetchall()]
            
            # 導出地點
            locations_query = text("""
                SELECT 
                    cl.id, cl.company_id, cl.name, cl.code,
                    cl.address, cl.delivery_contact, cl."createdAt", cl."updatedAt"
                FROM customer_locations cl
                ORDER BY cl."createdAt"
            """)
            
            result = await session.execute(locations_query)
            locations = [dict(row._mapping) for row in result.fetchall()]
            
            # 導出業務單位
            business_units_query = text("""
                SELECT 
                    bu.id, bu.location_id, bu.name, bu.code, bu.type,
                    bu.budget_monthly, bu."createdAt", bu."updatedAt"
                FROM business_units bu
                ORDER BY bu."createdAt"
            """)
            
            result = await session.execute(business_units_query)
            business_units = [dict(row._mapping) for row in result.fetchall()]
            
            print(f"   ✅ 導出 {len(companies)} 個公司, {len(locations)} 個地點, {len(business_units)} 個業務單位")
            
            return {
                "companies": companies,
                "locations": locations,
                "business_units": business_units
            }
            
        finally:
            await session.close()
            await engine.dispose()
    
    async def export_categories(self) -> Dict[str, List]:
        """導出品類資料"""
        session, engine = await self.get_session()
        try:
            print("📂 導出品類資料...")
            
            query = text("""
                SELECT 
                    pc.id, pc.code, pc.name, pc."nameEn", pc."parentId",
                    pc.level, pc."sortOrder", pc.description, pc.metadata,
                    pc."isActive", pc."createdAt", pc."updatedAt"
                FROM product_categories pc
                ORDER BY pc.level, pc."sortOrder", pc.name
            """)
            
            result = await session.execute(query)
            categories = [dict(row._mapping) for row in result.fetchall()]
            
            print(f"   ✅ 導出 {len(categories)} 個品類")
            return {"categories": categories}
            
        finally:
            await session.close()
            await engine.dispose()
    
    async def export_skus(self) -> Dict[str, List]:
        """導出 SKU 資料"""
        session, engine = await self.get_session()
        try:
            print("🏷️ 導出 SKU 資料...")
            
            query = text("""
                SELECT 
                    ps.id, ps."productId", ps."skuCode", ps.name,
                    ps."packageType", ps."pricingUnit", ps."unitPrice",
                    ps."minOrderQuantity", ps.weight, ps."originCountry",
                    ps."isActive", ps."createdAt", ps."updatedAt"
                FROM product_skus ps
                WHERE ps."isActive" = true
                ORDER BY ps."createdAt"
            """)
            
            result = await session.execute(query)
            skus = [dict(row._mapping) for row in result.fetchall()]
            
            print(f"   ✅ 導出 {len(skus)} 個 SKU")
            return {"skus": skus}
            
        finally:
            await session.close()
            await engine.dispose()
    
    async def export_all_data(self) -> Dict[str, Any]:
        """導出所有資料"""
        print("🚀 開始導出所有資料...")
        start_time = datetime.now()
        
        try:
            # 並行導出所有資料
            suppliers, customers, categories, skus = await asyncio.gather(
                self.export_suppliers(),
                self.export_customers(),
                self.export_categories(),
                self.export_skus()
            )
            
            # 保存到文件
            exports = {
                "suppliers.json": suppliers,
                "customers.json": customers,
                "categories.json": categories,
                "skus.json": skus
            }
            
            files_created = []
            for filename, data in exports.items():
                filepath = os.path.join(self.data_dir, filename)
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2, cls=DecimalEncoder)
                files_created.append(filepath)
            
            # 生成摘要
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            summary = {
                "export_timestamp": start_time.isoformat(),
                "export_duration_seconds": duration,
                "data_counts": {
                    "suppliers": len(suppliers),
                    "customers": len(customers.get("companies", [])),
                    "categories": len(categories.get("categories", [])),
                    "skus": len(skus.get("skus", []))
                },
                "files_created": files_created
            }
            
            summary_file = os.path.join(self.data_dir, "export_summary.json")
            with open(summary_file, "w", encoding="utf-8") as f:
                json.dump(summary, f, ensure_ascii=False, indent=2)
            
            print(f"✅ 導出完成，耗時 {duration:.2f} 秒")
            print(f"📄 摘要文件: {summary_file}")
            
            return summary
            
        except Exception as e:
            print(f"❌ 導出失敗: {e}")
            raise
    
    # ==================== 測試資料創建功能 ====================
    
    async def create_test_customers(self, count: int = 20, force: bool = False):
        """創建測試客戶資料"""
        session, engine = await self.get_session()
        try:
            from app.models.customer_company import CustomerCompany
            from app.models.customer_location import CustomerLocation
            from app.models.business_unit import BusinessUnit
            
            # 檢查現有測試客戶數量
            check_query = text("SELECT COUNT(*) as count FROM customer_companies WHERE created_by = 'test_script'")
            result = await session.execute(check_query)
            existing_count = result.fetchone().count
            
            if existing_count >= count and not force:
                print(f"⚠️  已存在 {existing_count} 個測試客戶，跳過創建")
                print("如需重新創建，請使用 --force 參數")
                return
            
            if force and existing_count > 0:
                print(f"🗑️ 清理現有的 {existing_count} 個測試客戶...")
                await self.clean_test_data()
            
            print(f"👥 創建 {count} 個測試客戶...")
            
            # 生成測試資料
            test_data = self._generate_test_customer_data(count)
            
            for i, customer_data in enumerate(test_data):
                company_data = customer_data["company"]
                location_data = customer_data["location"]
                unit_data = customer_data["business_unit"]
                
                # 創建公司
                company = CustomerCompany(
                    id=str(uuid.uuid4()),
                    name=company_data["name"],
                    tax_id=company_data["tax_id"],
                    tax_id_type=company_data["tax_id_type"],
                    billing_address=company_data["billing_address"],
                    billing_contact=company_data["billing_contact"],
                    created_by="test_script",
                    updated_by="test_script"
                )
                session.add(company)
                await session.flush()
                
                # 創建地點
                location = CustomerLocation(
                    id=str(uuid.uuid4()),
                    company_id=company.id,
                    name=location_data["name"],
                    code=location_data["code"],
                    address=location_data["address"],
                    delivery_contact=location_data["delivery_contact"],
                    created_by="test_script",
                    updated_by="test_script"
                )
                session.add(location)
                await session.flush()
                
                # 創建業務單位
                business_unit = BusinessUnit(
                    id=str(uuid.uuid4()),
                    location_id=location.id,
                    name=unit_data["name"],
                    code=unit_data["code"],
                    type=unit_data["type"],
                    budget_monthly=unit_data["budget_monthly"],
                    created_by="test_script",
                    updated_by="test_script"
                )
                session.add(business_unit)
                
                print(f"   ✅ 已創建測試客戶 {i+1}/{count}: {company_data['name']}")
            
            await session.commit()
            print(f"✅ 成功創建 {count} 個測試客戶")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ 創建測試客戶失敗: {e}")
            raise
        finally:
            await session.close()
            await engine.dispose()
    
    def _generate_test_customer_data(self, count: int) -> List[Dict]:
        """生成測試客戶資料"""
        companies = [
            "老王餐廳股份有限公司", "美味小館有限公司", "海鮮大排檔股份有限公司",
            "台式料理王國股份有限公司", "夜市美食城有限公司", "傳統小吃店股份有限公司",
            "精緻餐飲集團有限公司", "家常菜館股份有限公司", "火鍋世界有限公司",
            "烤肉專門店股份有限公司", "素食天堂有限公司", "甜點工坊股份有限公司",
            "咖啡文化有限公司", "茶飲專賣店股份有限公司", "早餐店王國有限公司"
        ]
        
        individuals = [
            "陳小明個人工作室", "林美美小吃店", "王大頭牛肉麵", "李阿姨便當店", "張師傅麵攤"
        ]
        
        addresses = [
            "台北市大安區復興南路一段", "台中市西屯區台灣大道三段", "高雄市前金區中正四路",
            "台南市東區東門路二段", "桃園市中壢區中央西路", "新竹市東區光復路二段"
        ]
        
        test_data = []
        
        # 生成公司客戶 (15個)
        for i in range(15):
            company_name = companies[i] if i < len(companies) else f"測試餐廳{i+1}股份有限公司"
            tax_id = str(10000000 + i * 1111).zfill(8)
            address = f"{addresses[i % len(addresses)]}{100 + i}號"
            
            customer_data = {
                "company": {
                    "name": company_name,
                    "tax_id": tax_id,
                    "tax_id_type": "company",
                    "billing_address": address,
                    "billing_contact": {
                        "name": f"財務主管{i+1}",
                        "phone": f"02-2{i+10:03d}-{1000+i:04d}",
                        "email": f"finance{i+1}@company{i+1}.com"
                    }
                },
                "location": {
                    "name": f"{company_name.replace('股份有限公司', '').replace('有限公司', '')}總店",
                    "code": f"L{i+1:03d}",
                    "address": address,
                    "delivery_contact": {
                        "name": f"店長{i+1}",
                        "phone": f"0912-{300+i:03d}-{100+i:03d}"
                    }
                },
                "business_unit": {
                    "name": "主廚房" if i % 3 == 0 else "外場服務區" if i % 3 == 1 else "倉儲區",
                    "code": f"BU{i+1:03d}",
                    "type": "kitchen" if i % 3 == 0 else "service" if i % 3 == 1 else "storage",
                    "budget_monthly": Decimal(str(30000 + i * 5000))
                }
            }
            test_data.append(customer_data)
        
        # 生成個人客戶 (5個)
        for i in range(5):
            individual_name = individuals[i] if i < len(individuals) else f"個人商戶{i+1}"
            # 台灣身分證字號格式：第一位字母 + 9位數字
            tax_id = f"{'ABCDEFGH'[i]}{123456789 + i}"
            address = f"{addresses[i % len(addresses)]}{200 + i}號"
            
            customer_data = {
                "company": {
                    "name": individual_name,
                    "tax_id": tax_id,
                    "tax_id_type": "individual",
                    "billing_address": address,
                    "billing_contact": {
                        "name": f"負責人{chr(65+i)}",
                        "phone": f"0987-{600+i:03d}-{200+i:03d}",
                        "email": f"owner{i+1}@individual{i+1}.com"
                    }
                },
                "location": {
                    "name": f"{individual_name}營業場所",
                    "code": f"I{i+1:03d}",
                    "address": address,
                    "delivery_contact": {
                        "name": f"負責人{chr(65+i)}",
                        "phone": f"0987-{600+i:03d}-{200+i:03d}"
                    }
                },
                "business_unit": {
                    "name": "營運部",
                    "code": f"IB{i+1:03d}",
                    "type": "operation",
                    "budget_monthly": Decimal(str(10000 + i * 2000))
                }
            }
            test_data.append(customer_data)
        
        return test_data
    
    # ==================== 清理功能 ====================
    
    async def clean_test_data(self):
        """清理測試資料"""
        session, engine = await self.get_session()
        try:
            print("🗑️ 清理測試資料...")
            
            # 按依賴關係順序清理
            delete_queries = [
                "DELETE FROM business_units WHERE created_by = 'test_script'",
                "DELETE FROM customer_locations WHERE created_by = 'test_script'",
                "DELETE FROM customer_companies WHERE created_by = 'test_script'"
            ]
            
            for query in delete_queries:
                await session.execute(text(query))
            
            await session.commit()
            print("✅ 測試資料清理完成")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ 清理失敗: {e}")
            raise
        finally:
            await session.close()
            await engine.dispose()
    
    async def clean_export_data(self):
        """清理導出的資料文件"""
        print("🗑️ 清理導出資料文件...")
        
        files_to_clean = [
            "suppliers.json", "customers.json", "categories.json", 
            "skus.json", "export_summary.json"
        ]
        
        cleaned_count = 0
        for filename in files_to_clean:
            filepath = os.path.join(self.data_dir, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
                cleaned_count += 1
                print(f"   ✅ 已刪除: {filename}")
        
        print(f"✅ 清理完成，刪除 {cleaned_count} 個文件")
    
    # ==================== 導入功能 ====================
    
    async def import_data(self, target_db_url: str, data_types: Optional[List[str]] = None):
        """導入資料到目標資料庫"""
        if not os.path.exists(self.data_dir):
            print("❌ 找不到導出資料目錄，請先執行導出操作")
            return
        
        if data_types is None:
            data_types = ["suppliers", "customers", "categories", "skus"]
        
        print(f"🚀 開始導入資料到目標資料庫...")
        print(f"   目標: {target_db_url}")
        print(f"   類型: {', '.join(data_types)}")
        
        # 創建目標資料庫連接
        target_engine = create_async_engine(target_db_url, echo=False)
        target_session_maker = sessionmaker(target_engine, class_=AsyncSession)
        
        try:
            async with target_session_maker() as session:
                for data_type in data_types:
                    await self._import_data_type(session, data_type)
                
                await session.commit()
                print("✅ 所有資料導入完成")
                
        except Exception as e:
            print(f"❌ 導入失敗: {e}")
            raise
        finally:
            await target_engine.dispose()
    
    async def _import_data_type(self, session: AsyncSession, data_type: str):
        """導入特定類型的資料"""
        filename = f"{data_type}.json"
        filepath = os.path.join(self.data_dir, filename)
        
        if not os.path.exists(filepath):
            print(f"⚠️  跳過 {data_type}: 文件不存在")
            return
        
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        if data_type == "suppliers":
            await self._import_suppliers(session, data)
        elif data_type == "customers":
            await self._import_customers(session, data)
        elif data_type == "categories":
            await self._import_categories(session, data.get("categories", []))
        elif data_type == "skus":
            await self._import_skus(session, data.get("skus", []))
    
    async def _import_suppliers(self, session: AsyncSession, suppliers: List[Dict]):
        """導入供應商資料"""
        print(f"📦 導入 {len(suppliers)} 個供應商...")
        
        for supplier in suppliers:
            # 檢查是否已存在
            check_query = text("SELECT id FROM organizations WHERE id = :id")
            result = await session.execute(check_query, {"id": supplier["id"]})
            if result.fetchone():
                continue
            
            # 插入組織資料
            org_insert = text("""
                INSERT INTO organizations (
                    id, name, type, "businessType", "taxId", "contactPerson",
                    "contactPhone", "contactEmail", address, "isActive",
                    "createdAt", "updatedAt", settings
                ) VALUES (
                    :id, :name, :type, :businessType, :taxId, :contactPerson,
                    :contactPhone, :contactEmail, :address, true,
                    NOW(), NOW(), '{}'::json
                )
            """)
            
            await session.execute(org_insert, {
                "id": supplier["id"],
                "name": supplier["name"],
                "type": supplier["type"],
                "businessType": supplier.get("businessType"),
                "taxId": supplier.get("taxId"),
                "contactPerson": supplier.get("contactPerson"),
                "contactPhone": supplier.get("contactPhone"),
                "contactEmail": supplier.get("contactEmail"),
                "address": supplier.get("address")
            })
        
        print(f"   ✅ 供應商導入完成")
    
    async def _import_customers(self, session: AsyncSession, customers_data: Dict):
        """導入客戶資料"""
        companies = customers_data.get("companies", [])
        locations = customers_data.get("locations", [])
        business_units = customers_data.get("business_units", [])
        
        print(f"🏢 導入客戶資料: {len(companies)} 公司, {len(locations)} 地點, {len(business_units)} 業務單位...")
        
        # 導入公司
        for company in companies:
            check_query = text("SELECT id FROM customer_companies WHERE id = :id")
            result = await session.execute(check_query, {"id": company["id"]})
            if result.fetchone():
                continue
            
            company_insert = text("""
                INSERT INTO customer_companies (
                    id, group_id, name, legal_name, tax_id, tax_id_type,
                    billing_address, billing_contact, settings, extra_data, is_active,
                    "createdAt", "updatedAt", created_by, updated_by
                ) VALUES (
                    :id, :group_id, :name, :legal_name, :tax_id, :tax_id_type,
                    :billing_address, :billing_contact, '{}'::jsonb, '{}'::jsonb, true,
                    :createdAt, :updatedAt, 'import_script', 'import_script'
                )
            """)
            
            # 處理 JSON 欄位和時間戳
            company_data = company.copy()
            if isinstance(company_data.get('billing_address'), dict):
                company_data['billing_address'] = json.dumps(company_data['billing_address'])
            if isinstance(company_data.get('billing_contact'), dict):
                company_data['billing_contact'] = json.dumps(company_data['billing_contact'])
            
            # 處理時間戳
            if isinstance(company_data.get('createdAt'), str):
                company_data['createdAt'] = datetime.fromisoformat(company_data['createdAt'].replace('Z', '+00:00'))
            if isinstance(company_data.get('updatedAt'), str):
                company_data['updatedAt'] = datetime.fromisoformat(company_data['updatedAt'].replace('Z', '+00:00'))
            
            await session.execute(company_insert, company_data)
        
        # 導入地點
        for location in locations:
            check_query = text("SELECT id FROM customer_locations WHERE id = :id")
            result = await session.execute(check_query, {"id": location["id"]})
            if result.fetchone():
                continue
            
            location_insert = text("""
                INSERT INTO customer_locations (
                    id, company_id, name, code, address, delivery_contact,
                    extra_data, is_active, "createdAt", "updatedAt",
                    created_by, updated_by
                ) VALUES (
                    :id, :company_id, :name, :code, :address, :delivery_contact,
                    '{}'::jsonb, true, :createdAt, :updatedAt,
                    'import_script', 'import_script'
                )
            """)
            
            location_data = location.copy()
            if isinstance(location_data.get('address'), dict):
                location_data['address'] = json.dumps(location_data['address'])
            if isinstance(location_data.get('delivery_contact'), dict):
                location_data['delivery_contact'] = json.dumps(location_data['delivery_contact'])
            if isinstance(location_data.get('createdAt'), str):
                location_data['createdAt'] = datetime.fromisoformat(location_data['createdAt'].replace('Z', '+00:00'))
            if isinstance(location_data.get('updatedAt'), str):
                location_data['updatedAt'] = datetime.fromisoformat(location_data['updatedAt'].replace('Z', '+00:00'))
                
            await session.execute(location_insert, location_data)
        
        # 導入業務單位
        for unit in business_units:
            check_query = text("SELECT id FROM business_units WHERE id = :id")
            result = await session.execute(check_query, {"id": unit["id"]})
            if result.fetchone():
                continue
            
            unit_insert = text("""
                INSERT INTO business_units (
                    id, location_id, name, code, type, budget_monthly,
                    ordering_permissions, extra_data, is_active, requires_approval,
                    "createdAt", "updatedAt", created_by, updated_by
                ) VALUES (
                    :id, :location_id, :name, :code, :type, :budget_monthly,
                    '{}'::jsonb, '{}'::jsonb, true, false,
                    :createdAt, :updatedAt, 'import_script', 'import_script'
                )
            """)
            
            unit_data = unit.copy()
            if isinstance(unit_data.get('createdAt'), str):
                unit_data['createdAt'] = datetime.fromisoformat(unit_data['createdAt'].replace('Z', '+00:00'))
            if isinstance(unit_data.get('updatedAt'), str):
                unit_data['updatedAt'] = datetime.fromisoformat(unit_data['updatedAt'].replace('Z', '+00:00'))
                
            await session.execute(unit_insert, unit_data)
        
        print(f"   ✅ 客戶資料導入完成")
    
    async def _import_categories(self, session: AsyncSession, categories: List[Dict]):
        """導入品類資料"""
        print(f"📂 導入 {len(categories)} 個品類...")
        
        for category in categories:
            check_query = text("SELECT id FROM product_categories WHERE id = :id")
            result = await session.execute(check_query, {"id": category["id"]})
            if result.fetchone():
                continue
            
            category_insert = text("""
                INSERT INTO product_categories (
                    id, code, name, "nameEn", "parentId", level, "sortOrder",
                    description, metadata, "isActive", "createdAt", "updatedAt"
                ) VALUES (
                    :id, :code, :name, :nameEn, :parentId, :level, :sortOrder,
                    :description, :metadata, :isActive, :createdAt, :updatedAt
                )
            """)
            
            category_data = category.copy()
            if isinstance(category_data.get('metadata'), dict):
                category_data['metadata'] = json.dumps(category_data['metadata'])
            if isinstance(category_data.get('createdAt'), str):
                category_data['createdAt'] = datetime.fromisoformat(category_data['createdAt'].replace('Z', '+00:00'))
            if isinstance(category_data.get('updatedAt'), str):
                category_data['updatedAt'] = datetime.fromisoformat(category_data['updatedAt'].replace('Z', '+00:00'))
                
            await session.execute(category_insert, category_data)
            
        print(f"   ✅ 品類導入完成")
    
    async def _import_skus(self, session: AsyncSession, skus: List[Dict]):
        """導入 SKU 資料"""
        print(f"🏷️ 導入 {len(skus)} 個 SKU...")
        
        # 先導入 products
        products_imported = set()
        for sku in skus:
            product_id = sku.get("productId")
            if product_id and product_id not in products_imported:
                check_query = text("SELECT id FROM products WHERE id = :id")
                result = await session.execute(check_query, {"id": product_id})
                if not result.fetchone():
                    # 創建基本的 product
                    product_insert = text("""
                        INSERT INTO products (
                            id, "categoryId", code, name, "unitOfMeasure",
                            "isActive", "createdAt", "updatedAt"
                        ) VALUES (
                            :id, :categoryId, :code, :name, 'unit',
                            true, NOW(), NOW()
                        )
                    """)
                    # 使用第一個可用的 categoryId
                    cat_query = text("SELECT id FROM product_categories LIMIT 1")
                    cat_result = await session.execute(cat_query)
                    category_row = cat_result.fetchone()
                    category_id = category_row.id if category_row else "cmfqla3r60000akg7tpm9o6h6"  # 預設使用蔬菜類
                    
                    await session.execute(product_insert, {
                        "id": product_id,
                        "categoryId": category_id,
                        "code": f"PROD-{product_id[:8]}",
                        "name": f"Product {product_id[:8]}"
                    })
                    products_imported.add(product_id)
        
        # 導入 SKUs
        for sku in skus:
            check_query = text("SELECT id FROM product_skus WHERE id = :id")
            result = await session.execute(check_query, {"id": sku["id"]})
            if result.fetchone():
                continue
            
            sku_insert = text("""
                INSERT INTO product_skus (
                    id, "productId", "skuCode", name, "packageType",
                    "pricingUnit", "unitPrice", "minOrderQuantity",
                    weight, "originCountry", "isActive",
                    "createdAt", "updatedAt"
                ) VALUES (
                    :id, :productId, :skuCode, :name, :packageType,
                    :pricingUnit, :unitPrice, :minOrderQuantity,
                    :weight, :originCountry, :isActive,
                    :createdAt, :updatedAt
                )
            """)
            
            sku_data = sku.copy()
            if isinstance(sku_data.get('createdAt'), str):
                sku_data['createdAt'] = datetime.fromisoformat(sku_data['createdAt'].replace('Z', '+00:00'))
            if isinstance(sku_data.get('updatedAt'), str):
                sku_data['updatedAt'] = datetime.fromisoformat(sku_data['updatedAt'].replace('Z', '+00:00'))
                
            await session.execute(sku_insert, sku_data)
            
        print(f"   ✅ SKU 導入完成")

# ==================== CLI 介面 ====================

async def main():
    """主程式入口"""
    parser = argparse.ArgumentParser(
        description="井然 Orderly 資料庫管理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用範例:
  # 導出所有資料
  python database_manager.py export
  
  # 創建測試客戶
  python database_manager.py create-test-customers
  
  # 導入到 Staging
  python database_manager.py import --target staging://connection/string
  
  # 清理測試資料
  python database_manager.py clean --test-data
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="可用命令")
    
    # 導出命令
    export_parser = subparsers.add_parser("export", help="導出資料")
    export_parser.add_argument("--database-url", default=DEFAULT_DATABASE_URL,
                              help="資料庫連接字串")
    
    # 創建測試客戶命令
    test_parser = subparsers.add_parser("create-test-customers", help="創建測試客戶")
    test_parser.add_argument("--count", type=int, default=20, help="客戶數量")
    test_parser.add_argument("--force", action="store_true", help="強制重新創建")
    test_parser.add_argument("--database-url", default=DEFAULT_DATABASE_URL,
                            help="資料庫連接字串")
    
    # 導入命令
    import_parser = subparsers.add_parser("import", help="導入資料")
    import_parser.add_argument("--target", required=True, help="目標資料庫連接字串")
    import_parser.add_argument("--types", nargs="+", 
                              choices=["suppliers", "customers", "categories", "skus"],
                              help="要導入的資料類型")
    
    # 清理命令
    clean_parser = subparsers.add_parser("clean", help="清理資料")
    clean_parser.add_argument("--test-data", action="store_true", help="清理測試資料")
    clean_parser.add_argument("--export-files", action="store_true", help="清理導出文件")
    clean_parser.add_argument("--database-url", default=DEFAULT_DATABASE_URL,
                             help="資料庫連接字串")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # 創建管理器實例
    if hasattr(args, 'database_url'):
        manager = DatabaseManager(args.database_url)
    else:
        manager = DatabaseManager()
    
    try:
        if args.command == "export":
            await manager.export_all_data()
            
        elif args.command == "create-test-customers":
            await manager.create_test_customers(args.count, args.force)
            
        elif args.command == "import":
            await manager.import_data(args.target, args.types)
            
        elif args.command == "clean":
            if args.test_data:
                await manager.clean_test_data()
            if args.export_files:
                await manager.clean_export_data()
            if not args.test_data and not args.export_files:
                print("請指定要清理的類型: --test-data 或 --export-files")
        
        print("✨ 操作完成！")
        
    except Exception as e:
        print(f"❌ 操作失敗: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())