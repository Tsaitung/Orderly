#!/usr/bin/env python3
"""
從真實資料生成的測試資料腳本
生成時間: 2025-09-22T07:10:44.594212
"""
import asyncio
import sys
import os
import json
import uuid
from datetime import datetime
from decimal import Decimal
import argparse

# 添加 backend 路径
sys.path.append(os.path.join(os.path.dirname(__file__), "../../backend/user-service-fastapi"))
sys.path.append(os.path.join(os.path.dirname(__file__), "../../backend/customer-hierarchy-service-fastapi"))
sys.path.append(os.path.join(os.path.dirname(__file__), "../../backend/product-service-fastapi"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# 資料庫連接設定
DATABASE_URL = "postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly"

# 供應商測試資料
SUPPLIERS_DATA = [
    {
        "id": "cmfql974d000l14cjyxqa0vru","
        "name": "新鮮食材供應商","
        "type": "supplier","
        "businessType": None,"
        "taxId": None,"
        "contactPerson": None,"
        "contactPhone": None,"
        "contactEmail": None,"
        "address": None,"
    },
    {
        "id": "test-org-123","
        "name": "Test Supplier Organization","
        "type": "supplier","
        "businessType": "company","
        "taxId": None,"
        "contactPerson": "Test Contact","
        "contactPhone": "0912345678","
        "contactEmail": "test@supplier.com","
        "address": "台北市大安區test","
        "profile": {
            "deliveryCapacity": "MEDIUM","
            "minimumOrderAmount": 1500.0,"
            "paymentTermsDays": 30,"
        },"
    },
    {
        "id": "9d768400-c23d-4045-b609-c6d32a4674b8","
        "name": "聯華食品工業股份有限公司","
        "type": "supplier","
        "businessType": "company","
        "taxId": "11328702","
        "contactPerson": "聯華食品工業股份有限公司 負責人","
        "contactPhone": "+886-2-2392-8899","
        "contactEmail": "contact@lianhua.com.tw","
        "address": "台北市中正區重慶南路一段122號","
    },
    {
        "id": "ac7b3add-839a-4678-9280-3b18719fbbbe","
        "name": "聯華食品工業股份有限公司","
        "type": "supplier","
        "businessType": "company","
        "taxId": "11328702","
        "contactPerson": "聯華食品工業股份有限公司 負責人","
        "contactPhone": "+886-2-2392-8899","
        "contactEmail": "contact@lianhua.com.tw","
        "address": "台北市中正區重慶南路一段122號","
        "profile": {
            "deliveryCapacity": "LARGE","
            "minimumOrderAmount": 50000.0,"
            "paymentTermsDays": 30,"
        },"
    },
    {
        "id": "826d3638-0d79-442f-adb4-2f01a30c98d3","
        "name": "統一企業股份有限公司","
        "type": "supplier","
        "businessType": "company","
        "taxId": "03410606","
        "contactPerson": "統一企業股份有限公司 負責人","
        "contactPhone": "+886-6-243-3261","
        "contactEmail": "service@uni-president.com.tw","
        "address": "台南市永康區鹽行里中正路301號","
        "profile": {
            "deliveryCapacity": "LARGE","
            "minimumOrderAmount": 30000.0,"
            "paymentTermsDays": 15,"
        },"
    },
    {
        "id": "61453615-8ea5-47a3-90ed-464d8eec3d83","
        "name": "裕毛屋企業股份有限公司","
        "type": "supplier","
        "businessType": "company","
        "taxId": "84149755","
        "contactPerson": "裕毛屋企業股份有限公司 負責人","
        "contactPhone": "+886-4-2358-8168","
        "contactEmail": "sales@yumao.com.tw","
        "address": "台中市西屯區工業區三十八路189號","
        "profile": {
            "deliveryCapacity": "LARGE","
            "minimumOrderAmount": 8000.0,"
            "paymentTermsDays": 15,"
        },"
    },
    {
        "id": "0fcd7708-0586-474f-9fe2-2e8a0a358017","
        "name": "大昌華嘉股份有限公司","
        "type": "supplier","
        "businessType": "company","
        "taxId": "22099146","
        "contactPerson": "大昌華嘉股份有限公司 負責人","
        "contactPhone": "+886-2-8752-6888","
        "contactEmail": "info@dch.com.tw","
        "address": "新北市汐止區新台五路一段79號30樓","
        "profile": {
            "deliveryCapacity": "LARGE","
            "minimumOrderAmount": 25000.0,"
            "paymentTermsDays": 15,"
        },"
    },
    {
        "id": "5b8bf840-2aef-48e2-b112-2cd3d7bd83f7","
        "name": "嘉義縣農會","
        "type": "supplier","
        "businessType": "company","
        "taxId": "78400965","
        "contactPerson": "嘉義縣農會 負責人","
        "contactPhone": "+886-5-362-4301","
        "contactEmail": "service@cyfa.org.tw","
        "address": "嘉義縣太保市祥和二路東段8號","
        "profile": {
            "deliveryCapacity": "LARGE","
            "minimumOrderAmount": 5000.0,"
            "paymentTermsDays": 15,"
        },"
    },
    {
        "id": "6b55de7e-19b8-406d-8f12-1b2820e6fbb7","
        "name": "豐年農場股份有限公司","
        "type": "supplier","
        "businessType": "company","
        "taxId": "53742891","
        "contactPerson": "豐年農場股份有限公司 負責人","
        "contactPhone": "+886-8-778-2345","
        "contactEmail": "orders@fengnian.com.tw","
        "address": "屏東縣內埔鄉豐田路168號","
        "profile": {
            "deliveryCapacity": "LARGE","
            "minimumOrderAmount": 3000.0,"
            "paymentTermsDays": 15,"
        },"
    },
]

# 客戶測試資料
CUSTOMERS_DATA = [
    {
        "company": {
            "name": "老王餐廳股份有限公司","
            "tax_id": "12345678","
            "tax_id_type": "company","
            "billing_address": {"city": "台北市", "street": "台北市大安區信義路四段123號", "district": "大安區", "postal_code": "10650"},"
            "billing_contact": {"name": "王老闆", "email": "boss@laowang.com", "phone": "02-12345678"},"
        },
        "location": {
            "name": "老王餐廳大安店","
            "code": "LAOWANG_DA","
            "address": {"city": "台北市", "street": "台北市大安區信義路四段123號1樓", "district": "大安區", "postal_code": "10650"},"
            "delivery_contact": {"name": "店長小李", "phone": "02-12345679"},"
        },
        "business_unit": {
            "name": "主廚房","
            "code": "KITCHEN","
            "type": "kitchen","
            "budget_monthly": Decimal("50000.0"),"
        },
    },
    {
        "company": {
            "name": "美味小館有限公司","
            "tax_id": "23456789","
            "tax_id_type": "company","
            "billing_address": {"city": "台中市", "street": "台中市西屯區台灣大道三段99號", "district": "西屯區", "postal_code": "40756"},"
            "billing_contact": {"name": "林經理", "email": "manager@meiwei.com", "phone": "04-23456789"},"
        },
        "location": {
            "name": "美味小館台中店","
            "code": "MEIWEI_TC","
            "address": {"city": "台中市", "street": "台中市西屯區台灣大道三段99號1樓", "district": "西屯區", "postal_code": "40756"},"
            "delivery_contact": {"name": "廚師長張師傅", "phone": "04-23456790"},"
        },
        "business_unit": {
            "name": "中餐廚房","
            "code": "CHINESE","
            "type": "kitchen","
            "budget_monthly": Decimal("40000.0"),"
        },
    },
    {
        "company": {
            "name": "海鮮大排檔股份有限公司","
            "tax_id": "34567890","
            "tax_id_type": "company","
            "billing_address": {"city": "高雄市", "street": "高雄市前金區中正四路151號", "district": "前金區", "postal_code": "80144"},"
            "billing_contact": {"name": "陳老板", "email": "boss@seafood.com", "phone": "07-34567890"},"
        },
        "location": {
            "name": "海鮮大排檔前金店","
            "code": "SEAFOOD_QJ","
            "address": {"city": "高雄市", "street": "高雄市前金區中正四路151號", "district": "前金區", "postal_code": "80144"},"
            "delivery_contact": {"name": "廚房主管阿明", "phone": "07-34567891"},"
        },
        "business_unit": {
            "name": "海鮮處理區","
            "code": "SEAFOOD","
            "type": "kitchen","
            "budget_monthly": Decimal("80000.0"),"
        },
    },
    {
        "company": {
            "name": "義式風情餐廳有限公司","
            "tax_id": "45678901","
            "tax_id_type": "company","
            "billing_address": {"city": "台北市", "street": "台北市信義區松高路19號", "district": "信義區", "postal_code": "11049"},"
            "billing_contact": {"name": "義大利主廚 Marco", "email": "marco@italian.com", "phone": "02-45678901"},"
        },
        "location": {
            "name": "義式風情信義店","
            "code": "ITALIAN_XY","
            "address": {"city": "台北市", "street": "台北市信義區松高路19號2樓", "district": "信義區", "postal_code": "11049"},"
            "delivery_contact": {"name": "助理廚師 Anna", "phone": "02-45678902"},"
        },
        "business_unit": {
            "name": "義式廚房","
            "code": "PASTA","
            "type": "kitchen","
            "budget_monthly": Decimal("60000.0"),"
        },
    },
    {
        "company": {
            "name": "炸雞王國企業股份有限公司","
            "tax_id": "56789012","
            "tax_id_type": "company","
            "billing_address": {"city": "桃園市", "street": "桃園市桃園區中正路100號", "district": "桃園區", "postal_code": "33041"},"
            "billing_contact": {"name": "雞王老闆", "email": "king@chicken.com", "phone": "03-56789012"},"
        },
        "location": {
            "name": "炸雞王國桃園店","
            "code": "CHICKEN_TY","
            "address": {"city": "桃園市", "street": "桃園市桃園區中正路100號1樓", "district": "桃園區", "postal_code": "33041"},"
            "delivery_contact": {"name": "炸雞師傅阿德", "phone": "03-56789013"},"
        },
        "business_unit": {
            "name": "炸物區","
            "code": "FRY","
            "type": "kitchen","
            "budget_monthly": Decimal("35000.0"),"
        },
    },
    {
        "company": {
            "name": "麵條工坊有限公司","
            "tax_id": "67890123","
            "tax_id_type": "company","
            "billing_address": {"city": "台南市", "street": "台南市東區勝利路75號", "district": "東區", "postal_code": "70101"},"
            "billing_contact": {"name": "麵條師傅", "email": "noodle@master.com", "phone": "06-67890123"},"
        },
        "location": {
            "name": "麵條工坊東區店","
            "code": "NOODLE_EAST","
            "address": {"city": "台南市", "street": "台南市東區勝利路75號", "district": "東區", "postal_code": "70101"},"
            "delivery_contact": {"name": "麵條助手小王", "phone": "06-67890124"},"
        },
        "business_unit": {
            "name": "製麵區","
            "code": "NOODLE","
            "type": "prep","
            "budget_monthly": Decimal("30000.0"),"
        },
    },
    {
        "company": {
            "name": "咖啡香氛股份有限公司","
            "tax_id": "78901234","
            "tax_id_type": "company","
            "billing_address": {"city": "新竹市", "street": "新竹市東區光復路二段101號", "district": "東區", "postal_code": "30072"},"
            "billing_contact": {"name": "咖啡師 Kevin", "email": "kevin@coffee.com", "phone": "03-78901234"},"
        },
        "location": {
            "name": "咖啡香氛光復店","
            "code": "COFFEE_GF","
            "address": {"city": "新竹市", "street": "新竹市東區光復路二段101號1樓", "district": "東區", "postal_code": "30072"},"
            "delivery_contact": {"name": "吧台手 Lisa", "phone": "03-78901235"},"
        },
        "business_unit": {
            "name": "咖啡吧台","
            "code": "BAR","
            "type": "bar","
            "budget_monthly": Decimal("25000.0"),"
        },
    },
    {
        "company": {
            "name": "烘焙坊企業有限公司","
            "tax_id": "89012345","
            "tax_id_type": "company","
            "billing_address": {"city": "彰化市", "street": "彰化市中山路二段88號", "district": "", "postal_code": "50042"},"
            "billing_contact": {"name": "烘焙師父阿福", "email": "baker@bread.com", "phone": "04-89012345"},"
        },
        "location": {
            "name": "烘焙坊彰化店","
            "code": "BAKERY_CH","
            "address": {"city": "彰化市", "street": "彰化市中山路二段88號", "district": "", "postal_code": "50042"},"
            "delivery_contact": {"name": "麵包助手小美", "phone": "04-89012346"},"
        },
        "business_unit": {
            "name": "烘焙廚房","
            "code": "BAKERY","
            "type": "bakery","
            "budget_monthly": Decimal("45000.0"),"
        },
    },
    {
        "company": {
            "name": "壽司職人股份有限公司","
            "tax_id": "90123456","
            "tax_id_type": "company","
            "billing_address": {"city": "基隆市", "street": "基隆市仁愛區愛一路25號", "district": "仁愛區", "postal_code": "20041"},"
            "billing_contact": {"name": "壽司師父田中", "email": "tanaka@sushi.com", "phone": "02-90123456"},"
        },
        "location": {
            "name": "壽司職人基隆店","
            "code": "SUSHI_KL","
            "address": {"city": "基隆市", "street": "基隆市仁愛區愛一路25號1樓", "district": "仁愛區", "postal_code": "20041"},"
            "delivery_contact": {"name": "壽司助手小田", "phone": "02-90123457"},"
        },
        "business_unit": {
            "name": "壽司吧台","
            "code": "SUSHI","
            "type": "sushi","
            "budget_monthly": Decimal("70000.0"),"
        },
    },
    {
        "company": {
            "name": "熱炒100股份有限公司","
            "tax_id": "01234567","
            "tax_id_type": "company","
            "billing_address": {"city": "宜蘭縣", "street": "宜蘭縣宜蘭市中山路三段168號", "district": "宜蘭市", "postal_code": "26044"},"
            "billing_contact": {"name": "熱炒老闆阿忠", "email": "achung@hotcook.com", "phone": "03-01234567"},"
        },
        "location": {
            "name": "熱炒100宜蘭店","
            "code": "HOTCOOK_YL","
            "address": {"city": "宜蘭縣", "street": "宜蘭縣宜蘭市中山路三段168號", "district": "宜蘭市", "postal_code": "26044"},"
            "delivery_contact": {"name": "炒菜師傅阿豪", "phone": "03-01234568"},"
        },
        "business_unit": {
            "name": "熱炒區","
            "code": "STIRFRY","
            "type": "kitchen","
            "budget_monthly": Decimal("55000.0"),"
        },
    },
    {
        "company": {
            "name": "甜點夢工廠有限公司","
            "tax_id": "11111111","
            "tax_id_type": "company","
            "billing_address": {"city": "花蓮縣", "street": "花蓮縣花蓮市中正路500號", "district": "花蓮市", "postal_code": "97048"},"
            "billing_contact": {"name": "甜點師 Patty", "email": "patty@dessert.com", "phone": "03-11111111"},"
        },
        "location": {
            "name": "甜點夢工廠花蓮店","
            "code": "DESSERT_HL","
            "address": {"city": "花蓮縣", "street": "花蓮縣花蓮市中正路500號2樓", "district": "花蓮市", "postal_code": "97048"},"
            "delivery_contact": {"name": "糕點助手小雅", "phone": "03-11111112"},"
        },
        "business_unit": {
            "name": "甜點廚房","
            "code": "PASTRY","
            "type": "pastry","
            "budget_monthly": Decimal("38000.0"),"
        },
    },
    {
        "company": {
            "name": "燒烤達人企業股份有限公司","
            "tax_id": "22222222","
            "tax_id_type": "company","
            "billing_address": {"city": "台東縣", "street": "台東縣台東市中華路一段350號", "district": "台東市", "postal_code": "95041"},"
            "billing_contact": {"name": "燒烤大師阿達", "email": "ada@bbq.com", "phone": "089-22222222"},"
        },
        "location": {
            "name": "燒烤達人台東店","
            "code": "BBQ_TT","
            "address": {"city": "台東縣", "street": "台東縣台東市中華路一段350號1樓", "district": "台東市", "postal_code": "95041"},"
            "delivery_contact": {"name": "燒烤助手小強", "phone": "089-22222223"},"
        },
        "business_unit": {
            "name": "燒烤區","
            "code": "GRILL","
            "type": "grill","
            "budget_monthly": Decimal("42000.0"),"
        },
    },
    {
        "company": {
            "name": "火鍋世界股份有限公司","
            "tax_id": "33333333","
            "tax_id_type": "company","
            "billing_address": {"city": "屏東縣", "street": "屏東縣屏東市民生路200號", "district": "屏東市", "postal_code": "90047"},"
            "billing_contact": {"name": "火鍋老闆娘", "email": "boss@hotpot.com", "phone": "08-33333333"},"
        },
        "location": {
            "name": "火鍋世界屏東店","
            "code": "HOTPOT_PT","
            "address": {"city": "屏東縣", "street": "屏東縣屏東市民生路200號1樓", "district": "屏東市", "postal_code": "90047"},"
            "delivery_contact": {"name": "火鍋師傅老王", "phone": "08-33333334"},"
        },
        "business_unit": {
            "name": "火鍋廚房","
            "code": "HOTPOT","
            "type": "hot_pot","
            "budget_monthly": Decimal("65000.0"),"
        },
    },
    {
        "company": {
            "name": "素食天地有限公司","
            "tax_id": "44444444","
            "tax_id_type": "company","
            "billing_address": {"city": "雲林縣", "street": "雲林縣斗六市雲林路123號", "district": "斗六市", "postal_code": "64044"},"
            "billing_contact": {"name": "素食達人阿蓮", "email": "lian@vegetarian.com", "phone": "05-44444444"},"
        },
        "location": {
            "name": "素食天地斗六店","
            "code": "VEG_DL","
            "address": {"city": "雲林縣", "street": "雲林縣斗六市雲林路123號", "district": "斗六市", "postal_code": "64044"},"
            "delivery_contact": {"name": "素食廚師小慧", "phone": "05-44444445"},"
        },
        "business_unit": {
            "name": "素食廚房","
            "code": "VEGETARIAN","
            "type": "kitchen","
            "budget_monthly": Decimal("28000.0"),"
        },
    },
    {
        "company": {
            "name": "早餐王國股份有限公司","
            "tax_id": "55555555","
            "tax_id_type": "company","
            "billing_address": {"city": "嘉義市", "street": "嘉義市西區中山路88號", "district": "西區", "postal_code": "60045"},"
            "billing_contact": {"name": "早餐店長阿明", "email": "ming@breakfast.com", "phone": "05-55555555"},"
        },
        "location": {
            "name": "早餐王國嘉義店","
            "code": "BREAKFAST_CY","
            "address": {"city": "嘉義市", "street": "嘉義市西區中山路88號1樓", "district": "西區", "postal_code": "60045"},"
            "delivery_contact": {"name": "早餐師傅小華", "phone": "05-55555556"},"
        },
        "business_unit": {
            "name": "早餐廚房","
            "code": "BREAKFAST","
            "type": "kitchen","
            "budget_monthly": Decimal("20000.0"),"
        },
    },
    {
        "company": {
            "name": "陳小明個人工作室","
            "tax_id": "A123456789","
            "tax_id_type": "individual","
            "billing_address": {"city": "台北市", "street": "台北市中正區羅斯福路一段4號", "district": "中正區", "postal_code": "10048"},"
            "billing_contact": {"name": "陳小明", "email": "ming@personal.com", "phone": "0912345678"},"
        },
        "location": {
            "name": "小明咖啡攤","
            "code": "MING_COFFEE","
            "address": {"city": "台北市", "street": "台北市中正區羅斯福路一段4號B1", "district": "中正區", "postal_code": "10048"},"
            "delivery_contact": {"name": "陳小明", "phone": "0912345678"},"
        },
        "business_unit": {
            "name": "咖啡製作區","
            "code": "COFFEE","
            "type": "bar","
            "budget_monthly": Decimal("15000.0"),"
        },
    },
    {
        "company": {
            "name": "林美美小吃店","
            "tax_id": "B234567890","
            "tax_id_type": "individual","
            "billing_address": {"city": "台中市", "street": "台中市北區三民路三段67號", "district": "北區", "postal_code": "40444"},"
            "billing_contact": {"name": "林美美", "email": "meimei@snack.com", "phone": "0923456789"},"
        },
        "location": {
            "name": "美美小吃攤","
            "code": "MEIMEI_SNACK","
            "address": {"city": "台中市", "street": "台中市北區三民路三段67號1樓", "district": "北區", "postal_code": "40444"},"
            "delivery_contact": {"name": "林美美", "phone": "0923456789"},"
        },
        "business_unit": {
            "name": "小吃廚房","
            "code": "SNACK","
            "type": "kitchen","
            "budget_monthly": Decimal("12000.0"),"
        },
    },
    {
        "company": {
            "name": "王大頭牛肉麵","
            "tax_id": "C345678901","
            "tax_id_type": "individual","
            "billing_address": {"city": "高雄市", "street": "高雄市左營區博愛二路99號", "district": "左營區", "postal_code": "81342"},"
            "billing_contact": {"name": "王大頭", "email": "datou@beef.com", "phone": "0934567890"},"
        },
        "location": {
            "name": "大頭牛肉麵店","
            "code": "DATOU_BEEF","
            "address": {"city": "高雄市", "street": "高雄市左營區博愛二路99號", "district": "左營區", "postal_code": "81342"},"
            "delivery_contact": {"name": "王大頭", "phone": "0934567890"},"
        },
        "business_unit": {
            "name": "麵食區","
            "code": "NOODLE","
            "type": "noodle","
            "budget_monthly": Decimal("18000.0"),"
        },
    },
    {
        "company": {
            "name": "張阿姨便當店","
            "tax_id": "D456789012","
            "tax_id_type": "individual","
            "billing_address": {"city": "桃園市", "street": "桃園市中壢區中大路300號", "district": "中壢區", "postal_code": "32041"},"
            "billing_contact": {"name": "張阿姨", "email": "aunt@lunch.com", "phone": "0945678901"},"
        },
        "location": {
            "name": "阿姨便當店","
            "code": "AUNT_LUNCH","
            "address": {"city": "桃園市", "street": "桃園市中壢區中大路300號1樓", "district": "中壢區", "postal_code": "32041"},"
            "delivery_contact": {"name": "張阿姨", "phone": "0945678901"},"
        },
        "business_unit": {
            "name": "便當廚房","
            "code": "LUNCHBOX","
            "type": "kitchen","
            "budget_monthly": Decimal("22000.0"),"
        },
    },
    {
        "company": {
            "name": "李師傅燒餅店","
            "tax_id": "E567890123","
            "tax_id_type": "individual","
            "billing_address": {"city": "台南市", "street": "台南市中西區民權路一段158號", "district": "中西區", "postal_code": "70041"},"
            "billing_contact": {"name": "李師傅", "email": "master@bread.com", "phone": "0956789012"},"
        },
        "location": {
            "name": "師傅燒餅攤","
            "code": "MASTER_BREAD","
            "address": {"city": "台南市", "street": "台南市中西區民權路一段158號", "district": "中西區", "postal_code": "70041"},"
            "delivery_contact": {"name": "李師傅", "phone": "0956789012"},"
        },
        "business_unit": {
            "name": "燒餅製作區","
            "code": "BREAD","
            "type": "bakery","
            "budget_monthly": Decimal("10000.0"),"
        },
    },
]

# 品類測試資料
CATEGORIES_DATA = [
    {
        "code": "VEGG","
        "name": "蔬菜","
        "nameEn": "Vegetables","
        "parentId": None,"
        "level": 1,"
        "sortOrder": 1,"
        "description": "蔬菜類別","
    },
    {
        "code": "FRUT","
        "name": "水果","
        "nameEn": "Fruits","
        "parentId": None,"
        "level": 1,"
        "sortOrder": 2,"
        "description": "水果類別","
    },
    {
        "code": "SUPP","
        "name": "餐具耗材","
        "nameEn": "Supplies","
        "parentId": None,"
        "level": 1,"
        "sortOrder": 3,"
        "description": "餐具耗材類別","
    },
    {
        "code": "EQUP","
        "name": "廚房設備","
        "nameEn": "Equipment","
        "parentId": None,"
        "level": 1,"
        "sortOrder": 4,"
        "description": "廚房設備類別","
    },
    {
        "code": "CLEN","
        "name": "清潔用品","
        "nameEn": "Cleaning","
        "parentId": None,"
        "level": 1,"
        "sortOrder": 5,"
        "description": "清潔用品類別","
    },
    {
        "code": "BEVG","
        "name": "飲料","
        "nameEn": "Beverages","
        "parentId": None,"
        "level": 1,"
        "sortOrder": 6,"
        "description": "飲料類別","
    },
    {
        "code": "INGR","
        "name": "食品原料","
        "nameEn": "Food Ingredients","
        "parentId": None,"
        "level": 1,"
        "sortOrder": 7,"
        "description": "食品原料類別","
    },
    {
        "code": "BEEF","
        "name": "牛肉","
        "nameEn": "Beef","
        "parentId": None,"
        "level": 1,"
        "sortOrder": 300,"
        "description": "牛肉類","
    },
    {
        "code": "PORK","
        "name": "豬肉","
        "nameEn": "Pork","
        "parentId": None,"
        "level": 1,"
        "sortOrder": 400,"
        "description": "豬肉類","
    },
    {
        "code": "CHKN","
        "name": "雞肉","
        "nameEn": "Chicken","
        "parentId": None,"
        "level": 1,"
        "sortOrder": 500,"
        "description": "雞肉類","
    },
    {
        "code": "OTME","
        "name": "其他肉品","
        "nameEn": "Other Meats","
        "parentId": None,"
        "level": 1,"
        "sortOrder": 600,"
        "description": "其他肉類","
    },
    {
        "code": "SEAF","
        "name": "水產","
        "nameEn": "Seafood","
        "parentId": None,"
        "level": 1,"
        "sortOrder": 700,"
        "description": "水產類","
    },
    {
        "code": "DETF","
        "name": "奶蛋豆製品","
        "nameEn": "Dairy·Eggs·Tofu","
        "parentId": None,"
        "level": 1,"
        "sortOrder": 800,"
        "description": "奶蛋豆製品類","
    },
    {
        "code": "FLOR","
        "name": "地面清潔","
        "nameEn": "Floor Cleaning","
        "parentId": "cmfqla3rf0004akg74fb17ixs","
        "level": 2,"
        "sortOrder": 1,"
        "description": "地面清潔 - 拖把、掃帚、地板清潔劑","
    },
    {
        "code": "CITR","
        "name": "柑橘類","
        "nameEn": "Citrus Fruits","
        "parentId": "cmfqla3rc0001akg7k1b5nibu","
        "level": 2,"
        "sortOrder": 1,"
        "description": "柑橘類 - 柳丁、檸檬","
    },
    {
        "code": "COOK","
        "name": "烹飪設備","
        "nameEn": "Cooking Equipment","
        "parentId": "cmfqla3re0003akg7a2b6kqex","
        "level": 2,"
        "sortOrder": 1,"
        "description": "烹飪設備 - 炒鍋、湯鍋、平底鍋","
    },
    {
        "code": "TEAS","
        "name": "茶類飲品","
        "nameEn": "Tea Beverages","
        "parentId": "cmfqla3rf0005akg72u8mlsym","
        "level": 2,"
        "sortOrder": 1,"
        "description": "茶類飲品 - 茶葉、茶包、調味茶","
    },
    {
        "code": "LEAF","
        "name": "葉菜類","
        "nameEn": "Leafy Vegetables","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 1,"
        "description": "葉菜類 - 菠菜、A菜","
    },
    {
        "code": "SEAS","
        "name": "調味料","
        "nameEn": "Seasonings","
        "parentId": "cmfqla3rg0006akg7uub0skf0","
        "level": 2,"
        "sortOrder": 1,"
        "description": "調味料 - 鹽、糖、胡椒、醬油","
    },
    {
        "code": "DSHW","
        "name": "餐具用品","
        "nameEn": "Dishware","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 1,"
        "description": "餐具用品 - 盤子、碗、杯子","
    },
    {
        "code": "ARSS","
        "name": "蔥薑蒜／辛香料","
        "nameEn": "Allium-Root Spices","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 101,"
        "description": "青蔥、蒜頭、老薑、辣椒","
    },
    {
        "code": "BEAN","
        "name": "豆莢類","
        "nameEn": "Legume Vegetables","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 102,"
        "description": "四季豆、毛豆","
    },
    {
        "code": "CUTV","
        "name": "截切蔬菜","
        "nameEn": "Cut Vegetables","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 103,"
        "description": "切段芹菜、切片紅蘿蔔","
    },
    {
        "code": "FLFV","
        "name": "花果菜","
        "nameEn": "Flowering Vegetables","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 104,"
        "description": "青花椰、花椰菜","
    },
    {
        "code": "GOUR","
        "name": "瓜果類","
        "nameEn": "Gourd & Fruiting Veg.","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 105,"
        "description": "南瓜、番茄、青椒","
    },
    {
        "code": "HERB","
        "name": "香菜香料","
        "nameEn": "Herbs & Aromatics","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 106,"
        "description": "香菜、九層塔、羅勒","
    },
    {
        "code": "HVGV","
        "name": "大宗蔬菜","
        "nameEn": "High-Volume Veg.","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 107,"
        "description": "高麗菜、大白菜","
    },
    {
        "code": "LETC","
        "name": "生菜","
        "nameEn": "Lettuce & Salad Greens","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 108,"
        "description": "羅曼、生菜沙拉","
    },
    {
        "code": "MUSH","
        "name": "菇蕈類","
        "nameEn": "Mushrooms","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 109,"
        "description": "香菇、金針菇","
    },
    {
        "code": "PRVG","
        "name": "加工蔬菜","
        "nameEn": "Processed Vegetables","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 110,"
        "description": "冷凍蔬菜、醃漬菜","
    },
    {
        "code": "ROOT","
        "name": "根莖類","
        "nameEn": "Root & Tuber","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 111,"
        "description": "白蘿蔔、馬鈴薯","
    },
    {
        "code": "SEAW","
        "name": "海菜類","
        "nameEn": "Sea Vegetables","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 112,"
        "description": "海帶芽、石花菜","
    },
    {
        "code": "SPRO","
        "name": "苗芽蔬菜","
        "nameEn": "Sprouts","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 113,"
        "description": "豆芽、苜蓿芽","
    },
    {
        "code": "STEM","
        "name": "莖菜類","
        "nameEn": "Stem Vegetables","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 114,"
        "description": "蘆筍、芹菜","
    },
    {
        "code": "VMSC","
        "name": "其他蔬菜","
        "nameEn": "Vegetable Misc.","
        "parentId": "cmfqla3r60000akg7tpm9o6h6","
        "level": 2,"
        "sortOrder": 115,"
        "description": "","
    },
    {
        "code": "BERR","
        "name": "漿果類","
        "nameEn": "Berries","
        "parentId": "cmfqla3rc0001akg7k1b5nibu","
        "level": 2,"
        "sortOrder": 201,"
        "description": "草莓、藍莓","
    },
    {
        "code": "FRFR","
        "name": "冷凍水果","
        "nameEn": "Frozen Fruits","
        "parentId": "cmfqla3rc0001akg7k1b5nibu","
        "level": 2,"
        "sortOrder": 202,"
        "description": "冷凍莓果","
    },
    {
        "code": "FRMS","
        "name": "其他水果","
        "nameEn": "Fruit Misc.","
        "parentId": "cmfqla3rc0001akg7k1b5nibu","
        "level": 2,"
        "sortOrder": 203,"
        "description": "","
    },
    {
        "code": "MELN","
        "name": "瓜果類","
        "nameEn": "Melons","
        "parentId": "cmfqla3rc0001akg7k1b5nibu","
        "level": 2,"
        "sortOrder": 204,"
        "description": "西瓜、哈密瓜","
    },
    {
        "code": "PRFR","
        "name": "加工水果","
        "nameEn": "Processed Fruits","
        "parentId": "cmfqla3rc0001akg7k1b5nibu","
        "level": 2,"
        "sortOrder": 205,"
        "description": "果汁","
    },
    {
        "code": "PSTF","
        "name": "核仁果類","
        "nameEn": "Pome & Stone Fruits","
        "parentId": "cmfqla3rc0001akg7k1b5nibu","
        "level": 2,"
        "sortOrder": 206,"
        "description": "蘋果、水蜜桃","
    },
    {
        "code": "TROP","
        "name": "熱帶水果","
        "nameEn": "Tropical Fruits","
        "parentId": "cmfqla3rc0001akg7k1b5nibu","
        "level": 2,"
        "sortOrder": 207,"
        "description": "芒果、香蕉","
    },
    {
        "code": "BFMS","
        "name": "其他牛肉","
        "nameEn": "Beef Misc.","
        "parentId": "cat_beef_001","
        "level": 2,"
        "sortOrder": 301,"
        "description": "","
    },
    {
        "code": "BGRD","
        "name": "牛絞肉","
        "nameEn": "Ground Beef","
        "parentId": "cat_beef_001","
        "level": 2,"
        "sortOrder": 302,"
        "description": "牛絞肉","
    },
    {
        "code": "BLON","
        "name": "腰脊部","
        "nameEn": "Beef Loin","
        "parentId": "cat_beef_001","
        "level": 2,"
        "sortOrder": 303,"
        "description": "紐約客、西冷","
    },
    {
        "code": "BOFF","
        "name": "牛雜類","
        "nameEn": "Beef Offal","
        "parentId": "cat_beef_001","
        "level": 2,"
        "sortOrder": 304,"
        "description": "牛肚、牛肝","
    },
    {
        "code": "BRIS","
        "name": "前胸部","
        "nameEn": "Brisket","
        "parentId": "cat_beef_001","
        "level": 2,"
        "sortOrder": 305,"
        "description": "牛腩、胸肉","
    },
    {
        "code": "CHUC","
        "name": "肩胛部","
        "nameEn": "Chuck","
        "parentId": "cat_beef_001","
        "level": 2,"
        "sortOrder": 306,"
        "description": "板腱、肩胛心","
    },
    {
        "code": "FLNK","
        "name": "腹脇部","
        "nameEn": "Flank","
        "parentId": "cat_beef_001","
        "level": 2,"
        "sortOrder": 307,"
        "description": "側腹肉","
    },
    {
        "code": "PRBF","
        "name": "加工牛肉","
        "nameEn": "Processed Beef","
        "parentId": "cat_beef_001","
        "level": 2,"
        "sortOrder": 308,"
        "description": "滷牛腱、牛肉乾","
    },
    {
        "code": "RIBE","
        "name": "肋眼／背脊","
        "nameEn": "Rib & Prime","
        "parentId": "cat_beef_001","
        "level": 2,"
        "sortOrder": 309,"
        "description": "肋眼、牛小排","
    },
    {
        "code": "ROUN","
        "name": "後腿／腿腱","
        "nameEn": "Round & Shank","
        "parentId": "cat_beef_001","
        "level": 2,"
        "sortOrder": 310,"
        "description": "牛腱、臀肉","
    },
    {
        "code": "BELI","
        "name": "五花／肋排","
        "nameEn": "Belly & Rib","
        "parentId": "cat_pork_001","
        "level": 2,"
        "sortOrder": 401,"
        "description": "五花肉、肋排","
    },
    {
        "code": "BUTT","
        "name": "肩胛梅花","
        "nameEn": "Shoulder","
        "parentId": "cat_pork_001","
        "level": 2,"
        "sortOrder": 402,"
        "description": "梅花肉、松阪肉","
    },
    {
        "code": "FRNT","
        "name": "前腿部","
        "nameEn": "Front Leg","
        "parentId": "cat_pork_001","
        "level": 2,"
        "sortOrder": 403,"
        "description": "前腿肉","
    },
    {
        "code": "HLEG","
        "name": "後腿部","
        "nameEn": "Hind Leg","
        "parentId": "cat_pork_001","
        "level": 2,"
        "sortOrder": 404,"
        "description": "後腿肉","
    },
    {
        "code": "PGRD","
        "name": "豬絞肉","
        "nameEn": "Ground Pork","
        "parentId": "cat_pork_001","
        "level": 2,"
        "sortOrder": 405,"
        "description": "豬絞肉","
    },
    {
        "code": "PHED","
        "name": "頭部肉","
        "nameEn": "Head Cuts","
        "parentId": "cat_pork_001","
        "level": 2,"
        "sortOrder": 406,"
        "description": "豬頰、豬耳","
    },
    {
        "code": "PKMS","
        "name": "其他豬肉","
        "nameEn": "Pork Misc.","
        "parentId": "cat_pork_001","
        "level": 2,"
        "sortOrder": 407,"
        "description": "","
    },
    {
        "code": "PLON","
        "name": "背脊部","
        "nameEn": "Pork Loin","
        "parentId": "cat_pork_001","
        "level": 2,"
        "sortOrder": 408,"
        "description": "里肌、腰內","
    },
    {
        "code": "POFF","
        "name": "豬雜類","
        "nameEn": "Pork Offal","
        "parentId": "cat_pork_001","
        "level": 2,"
        "sortOrder": 409,"
        "description": "豬肝、豬大腸","
    },
    {
        "code": "PRPK","
        "name": "加工豬肉","
        "nameEn": "Processed Pork","
        "parentId": "cat_pork_001","
        "level": 2,"
        "sortOrder": 410,"
        "description": "培根、火腿","
    },
    {
        "code": "TROT","
        "name": "蹄膀／豬腳","
        "nameEn": "Trotters","
        "parentId": "cat_pork_001","
        "level": 2,"
        "sortOrder": 411,"
        "description": "蹄膀、豬腳","
    },
    {
        "code": "BRST","
        "name": "雞胸","
        "nameEn": "Breast","
        "parentId": "cat_chkn_001","
        "level": 2,"
        "sortOrder": 501,"
        "description": "去骨雞胸","
    },
    {
        "code": "CGRD","
        "name": "雞絞肉","
        "nameEn": "Ground Chicken","
        "parentId": "cat_chkn_001","
        "level": 2,"
        "sortOrder": 502,"
        "description": "雞絞肉","
    },
    {
        "code": "CKMS","
        "name": "其他雞肉","
        "nameEn": "Chicken Misc.","
        "parentId": "cat_chkn_001","
        "level": 2,"
        "sortOrder": 503,"
        "description": "","
    },
    {
        "code": "COFF","
        "name": "雞雜類","
        "nameEn": "Chicken Offal","
        "parentId": "cat_chkn_001","
        "level": 2,"
        "sortOrder": 504,"
        "description": "雞肝、雞胗","
    },
    {
        "code": "FEET","
        "name": "雞腳","
        "nameEn": "Chicken Feet","
        "parentId": "cat_chkn_001","
        "level": 2,"
        "sortOrder": 505,"
        "description": "鳳爪","
    },
    {
        "code": "PRCK","
        "name": "加工雞肉","
        "nameEn": "Processed Chicken","
        "parentId": "cat_chkn_001","
        "level": 2,"
        "sortOrder": 506,"
        "description": "煙燻雞腿","
    },
    {
        "code": "THGH","
        "name": "雞腿／腿排","
        "nameEn": "Thigh & Drumstick","
        "parentId": "cat_chkn_001","
        "level": 2,"
        "sortOrder": 507,"
        "description": "雞腿排","
    },
    {
        "code": "WHOL","
        "name": "全雞","
        "nameEn": "Whole Chicken","
        "parentId": "cat_chkn_001","
        "level": 2,"
        "sortOrder": 508,"
        "description": "全雞","
    },
    {
        "code": "WING","
        "name": "雞翅","
        "nameEn": "Wing","
        "parentId": "cat_chkn_001","
        "level": 2,"
        "sortOrder": 509,"
        "description": "全翅、翅中","
    },
    {
        "code": "DUCK","
        "name": "鴨肉","
        "nameEn": "Duck","
        "parentId": "cat_otme_001","
        "level": 2,"
        "sortOrder": 601,"
        "description": "鴨胸","
    },
    {
        "code": "GOOS","
        "name": "鵝肉","
        "nameEn": "Goose","
        "parentId": "cat_otme_001","
        "level": 2,"
        "sortOrder": 602,"
        "description": "鵝腿","
    },
    {
        "code": "LAMB","
        "name": "羊肉","
        "nameEn": "Lamb/Mutton","
        "parentId": "cat_otme_001","
        "level": 2,"
        "sortOrder": 603,"
        "description": "羊小排","
    },
    {
        "code": "OTMS","
        "name": "其他","
        "nameEn": "OT Meat Misc.","
        "parentId": "cat_otme_001","
        "level": 2,"
        "sortOrder": 604,"
        "description": "","
    },
    {
        "code": "PROT","
        "name": "加工其他肉品","
        "nameEn": "Processed OT Meat","
        "parentId": "cat_otme_001","
        "level": 2,"
        "sortOrder": 605,"
        "description": "鴨賞、羊肉乾","
    },
    {
        "code": "CEPH","
        "name": "頭足類","
        "nameEn": "Cephalopods","
        "parentId": "cat_seaf_001","
        "level": 2,"
        "sortOrder": 701,"
        "description": "章魚、魷魚","
    },
    {
        "code": "CRUS","
        "name": "甲殼類","
        "nameEn": "Crustaceans","
        "parentId": "cat_seaf_001","
        "level": 2,"
        "sortOrder": 702,"
        "description": "蝦、螃蟹","
    },
    {
        "code": "DRSF","
        "name": "乾貨","
        "nameEn": "Dried Seafoods","
        "parentId": "cat_seaf_001","
        "level": 2,"
        "sortOrder": 703,"
        "description": "魚乾、海苔乾","
    },
    {
        "code": "FISH","
        "name": "魚類","
        "nameEn": "Fish","
        "parentId": "cat_seaf_001","
        "level": 2,"
        "sortOrder": 704,"
        "description": "鮭魚、鯛魚","
    },
    {
        "code": "PRSF","
        "name": "加工水產","
        "nameEn": "Processed Seafood","
        "parentId": "cat_seaf_001","
        "level": 2,"
        "sortOrder": 705,"
        "description": "魚丸、蝦餃","
    },
    {
        "code": "SFMS","
        "name": "其他水產","
        "nameEn": "Seafood Misc.","
        "parentId": "cat_seaf_001","
        "level": 2,"
        "sortOrder": 706,"
        "description": "","
    },
    {
        "code": "SHEL","
        "name": "貝類","
        "nameEn": "Shellfish","
        "parentId": "cat_seaf_001","
        "level": 2,"
        "sortOrder": 707,"
        "description": "蛤蜊、生蠔","
    },
    {
        "code": "DAIR","
        "name": "乳製品","
        "nameEn": "Dairy Products","
        "parentId": "cat_detf_001","
        "level": 2,"
        "sortOrder": 801,"
        "description": "起司、優格","
    },
    {
        "code": "DTMS","
        "name": "其他奶蛋豆製品","
        "nameEn": "DETF Misc.","
        "parentId": "cat_detf_001","
        "level": 2,"
        "sortOrder": 802,"
        "description": "","
    },
    {
        "code": "EGGS","
        "name": "蛋類","
        "nameEn": "Eggs","
        "parentId": "cat_detf_001","
        "level": 2,"
        "sortOrder": 803,"
        "description": "雞蛋、鴨蛋","
    },
    {
        "code": "MILK","
        "name": "奶類","
        "nameEn": "Milk","
        "parentId": "cat_detf_001","
        "level": 2,"
        "sortOrder": 804,"
        "description": "鮮奶","
    },
    {
        "code": "PRDT","
        "name": "加工奶蛋豆","
        "nameEn": "Processed DETF","
        "parentId": "cat_detf_001","
        "level": 2,"
        "sortOrder": 805,"
        "description": "調味乳、豆漿布丁","
    },
    {
        "code": "SOYP","
        "name": "豆製品","
        "nameEn": "Soy Products","
        "parentId": "cat_detf_001","
        "level": 2,"
        "sortOrder": 806,"
        "description": "豆腐、百頁豆腐","
    },
    {
        "code": "ALCO","
        "name": "酒精飲料","
        "nameEn": "Alcoholic Beverages","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 901,"
        "description": "啤酒、紅酒","
    },
    {
        "code": "CANN","
        "name": "罐頭","
        "nameEn": "Canned Goods","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 902,"
        "description": "鮪魚罐頭","
    },
    {
        "code": "DRYD","
        "name": "乾貨","
        "nameEn": "Dried Goods","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 903,"
        "description": "紫菜、木耳","
    },
    {
        "code": "GCMS","
        "name": "其他雜貨","
        "nameEn": "Grocery Misc.","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 904,"
        "description": "","
    },
    {
        "code": "GRAI","
        "name": "穀物豆類","
        "nameEn": "Grains & Legumes","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 905,"
        "description": "白米、紅豆","
    },
    {
        "code": "JAMS","
        "name": "果醬","
        "nameEn": "Jams & Spreads","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 906,"
        "description": "草莓果醬、柚子醬","
    },
    {
        "code": "NFSC","
        "name": "非食品耗材","
        "nameEn": "NonFood Supplies","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 907,"
        "description": "包材、清潔劑","
    },
    {
        "code": "NOOD","
        "name": "麵類","
        "nameEn": "Noodles & Pasta","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 908,"
        "description": "烏龍麵、義大利麵","
    },
    {
        "code": "NUTS","
        "name": "堅果","
        "nameEn": "Nuts & Seeds","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 909,"
        "description": "杏仁、核桃、南瓜子","
    },
    {
        "code": "OILS","
        "name": "油脂","
        "nameEn": "Cooking Oils","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 910,"
        "description": "橄欖油、沙拉油","
    },
    {
        "code": "POWD","
        "name": "粉類原料","
        "nameEn": "Powdered Ingredients","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 911,"
        "description": "中筋麵粉、玉米粉","
    },
    {
        "code": "PRGC","
        "name": "加工雜貨","
        "nameEn": "Processed Grocery","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 912,"
        "description": "速食麵、即食湯包","
    },
    {
        "code": "RTEF","
        "name": "即食食品","
        "nameEn": "Ready-to-Eat Foods","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 913,"
        "description": "便當、即食沙拉","
    },
    {
        "code": "SAUC","
        "name": "醬料","
        "nameEn": "Sauces","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 914,"
        "description": "醬油、蠔油","
    },
    {
        "code": "VGTN","
        "name": "素食","
        "nameEn": "Vegetarian (Plant Foods)","
        "parentId": "cmfqla3rd0002akg7ijjpxwjy","
        "level": 2,"
        "sortOrder": 915,"
        "description": "素肉、素料包","
    },
]

# SKU 測試資料
SKUS_DATA = [
    {
        "skuCode": "BEAN-20250920-001","
        "productId": "62b06f4c-a368-4591-8a5d-d64ec084b8ca","
        "name": "綠豆 - 包","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 80.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "BEAN-20250920-002","
        "productId": "18cc89f7-1912-4e34-b896-27b76e4b396c","
        "name": "紅豆 - 包","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 120.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "BEAN-20250920-003","
        "productId": "55519dc8-78ca-47ff-b7e5-d2c94b52555d","
        "name": "黃豆 - 包","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 100.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "BEAN-20250920-004","
        "productId": "dfdc2ae8-981c-4570-a17b-329554119032","
        "name": "花豆 - 包","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 180.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "CANN-20250920-001","
        "productId": "2d6826e5-97f1-46fd-9623-f1e41c34ed71","
        "name": "鮪魚罐頭 - 罐","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 55.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "CANN-20250920-002","
        "productId": "31ba50a9-30e3-44a6-9e92-b9abd48f5985","
        "name": "玉米罐頭 - 罐","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 45.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "CANN-20250920-003","
        "productId": "924ad1ce-0180-41ca-a7c0-cf47115b83b4","
        "name": "番茄罐頭 - 罐","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 65.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "CANN-20250920-004","
        "productId": "94c5b790-e03b-43ba-a4ad-6b69104d3b2d","
        "name": "蘑菇罐頭 - 罐","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 50.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "EGGS-20250920-001","
        "productId": "6791484c-7042-4be5-ace7-8f041e5ebed3","
        "name": "土雞蛋 - 盒","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 120.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "EGGS-20250920-002","
        "productId": "af96c330-824a-4b2c-bd08-7d4acc9333a7","
        "name": "白殼蛋 - 盒","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 80.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "EGGS-20250920-003","
        "productId": "5ed39e04-62cd-40a5-9003-b01a9af9404e","
        "name": "紅殼蛋 - 盒","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 90.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "FISH-20250920-001","
        "productId": "09229640-88ed-401f-8331-813e33f471be","
        "name": "台灣鯛 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 180.0,"
        "minOrderQuantity": 0.5,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "FISH-20250920-002","
        "productId": "982ed07b-b8d7-4472-9f1b-4cf623642a23","
        "name": "鱸魚 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 300.0,"
        "minOrderQuantity": 0.5,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "FISH-20250920-003","
        "productId": "b753aed1-a7d9-46d0-85f1-17d2f801cf80","
        "name": "鮭魚 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 480.0,"
        "minOrderQuantity": 0.3,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "FISH-20250920-004","
        "productId": "fa3e84d1-fd11-419e-ab88-4215d6081fb8","
        "name": "鯖魚 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 200.0,"
        "minOrderQuantity": 0.5,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "LEAF-20250920-001","
        "productId": "742c75cb-c73a-4e33-8964-9d340f09518b","
        "name": "有機菠菜 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 120.0,"
        "minOrderQuantity": 0.3,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "LEAF-20250920-002","
        "productId": "fb39bf74-671a-44d6-88e6-e4750a1aceeb","
        "name": "A菜 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 80.0,"
        "minOrderQuantity": 0.5,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "LEAF-20250920-003","
        "productId": "74538b0b-0b9d-45b3-8a37-ff0150a0ad81","
        "name": "青江菜 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 90.0,"
        "minOrderQuantity": 0.5,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "LEAF-20250920-004","
        "productId": "2bcfd7ee-0088-43b5-a6dc-7dc626eaa67b","
        "name": "地瓜葉 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 70.0,"
        "minOrderQuantity": 0.5,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "LEAF-20250920-005","
        "productId": "d9f487a7-55db-4953-9492-dbcafb05ac7e","
        "name": "空心菜 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 65.0,"
        "minOrderQuantity": 0.5,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "LEAF-20250920-006","
        "productId": "8646e379-bd9b-4cef-9f00-1c9e57806c58","
        "name": "大陸妹 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 85.0,"
        "minOrderQuantity": 0.3,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "LEAF-20250920-007","
        "productId": "d2398099-4899-42b3-920c-3eb68e9db154","
        "name": "高麗菜 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 55.0,"
        "minOrderQuantity": 1.0,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "MILK-20250920-001","
        "productId": "6a430b55-b8ac-48b1-8fcc-35922278b04a","
        "name": "鮮奶 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 90.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "MILK-20250920-002","
        "productId": "9fac52e8-16c4-4805-acb0-08d77200a401","
        "name": "低脂牛奶 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 85.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "MILK-20250920-003","
        "productId": "e7d98253-ca62-42b8-9a89-27c21c1a37e9","
        "name": "保久乳 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 25.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "NOOD-20250920-001","
        "productId": "270984b0-8bff-414a-9c96-7d640748b769","
        "name": "關廟麵 - 包","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 65.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "NOOD-20250920-002","
        "productId": "4074ee1a-6a8b-4bd7-bcc2-fb04ac8a7c4d","
        "name": "烏龍麵 - 包","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 35.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "NOOD-20250920-003","
        "productId": "3113f31f-f256-429b-8662-4c4c7d4eaa49","
        "name": "義大利麵 - 包","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 85.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "NOOD-20250920-004","
        "productId": "db845cb4-c4b6-4ef3-b2db-862a84e2031d","
        "name": "拉麵 - 包","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 25.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "OILS-20250920-001","
        "productId": "d180a697-8392-442d-926d-dad0496c2071","
        "name": "沙拉油 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 95.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "OILS-20250920-002","
        "productId": "ad4c9694-0fc7-4792-b5dd-8da292cb09e7","
        "name": "橄欖油 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 280.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "OILS-20250920-003","
        "productId": "8c5733b9-cdfb-4382-8496-9d7f7c5c7494","
        "name": "麻油 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 320.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "OILS-20250920-004","
        "productId": "8d8df79a-0d0c-46c9-a67d-ef4489e76289","
        "name": "葵花油 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 85.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "ROOT-20250920-001","
        "productId": "d97fb505-04ae-432a-8830-e992f82a1b32","
        "name": "白蘿蔔 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 35.0,"
        "minOrderQuantity": 1.0,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "ROOT-20250920-002","
        "productId": "afedaaa6-b50a-4357-bc46-cc3abbc0607e","
        "name": "紅蘿蔔 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 45.0,"
        "minOrderQuantity": 1.0,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "ROOT-20250920-003","
        "productId": "858dc78d-bb84-4e9e-9f78-8d9c10cf7eb7","
        "name": "馬鈴薯 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 55.0,"
        "minOrderQuantity": 1.0,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "ROOT-20250920-004","
        "productId": "f91a69a2-6a6a-4d71-8020-ec766473ddc9","
        "name": "地瓜 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 40.0,"
        "minOrderQuantity": 1.0,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "ROOT-20250920-005","
        "productId": "59ee4877-00ff-4385-b3d1-d98c77dc994f","
        "name": "山藥 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 180.0,"
        "minOrderQuantity": 0.5,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "ROOT-20250920-006","
        "productId": "ed85bcca-2273-43f9-ad7e-02502f344c55","
        "name": "芋頭 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 90.0,"
        "minOrderQuantity": 1.0,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "ROOT-20250920-007","
        "productId": "93a9dd2f-7279-4a5f-bafc-40e10d74c6c4","
        "name": "牛蒡 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 200.0,"
        "minOrderQuantity": 0.5,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "SAUC-20250920-001","
        "productId": "be54f304-e9b9-4f57-a915-f1e69a47adc6","
        "name": "番茄醬 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 55.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "SAUC-20250920-002","
        "productId": "d6872d39-9398-406c-8d8c-80e284b999d1","
        "name": "沙茶醬 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 65.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "SAUC-20250920-003","
        "productId": "ac61d04a-7b37-4eba-9ec9-a8b4d66b2e1e","
        "name": "蠔油 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 90.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "SAUC-20250920-004","
        "productId": "97f436db-feaa-4b62-b476-ca6e39af3a12","
        "name": "芝麻醬 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 120.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "SEAS-20250920-001","
        "productId": "25527ab6-ade0-46d4-b7cd-4916c0399bba","
        "name": "統一醬油膏 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 45.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "SEAS-20250920-002","
        "productId": "9d476e80-abd2-4221-ac1d-a31203fda190","
        "name": "金蘭醬油 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 85.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "SEAS-20250920-003","
        "productId": "df454d6e-4825-4414-8f2f-0d36f258e74b","
        "name": "味精 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 65.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "SEAS-20250920-004","
        "productId": "d0e92d21-5b7b-4c06-8b4c-cac43cd85ea7","
        "name": "鹽巴 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 25.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "SEAS-20250920-005","
        "productId": "6871d826-7862-4dc1-9323-7a147ddeb0ae","
        "name": "胡椒粉 - 瓶","
        "packageType": "包裝","
        "pricingUnit": "kg","
        "unitPrice": 120.0,"
        "minOrderQuantity": 1.0,"
        "weight": None,"
        "originCountry": None,"
    },
    {
        "skuCode": "SPRO-20250920-001","
        "productId": "382b2e9f-f0a5-4e93-a82e-36d9aae96a8d","
        "name": "綠豆芽 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 50.0,"
        "minOrderQuantity": 0.5,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "SPRO-20250920-002","
        "productId": "2fb4c130-5c7e-4e5b-af88-7db3dd6aadbc","
        "name": "黃豆芽 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 60.0,"
        "minOrderQuantity": 0.5,"
        "weight": 1.0,"
        "originCountry": None,"
    },
    {
        "skuCode": "SPRO-20250920-003","
        "productId": "9606b743-c916-44dc-8062-c52c8e4957e5","
        "name": "黑豆芽 - kg","
        "packageType": "散裝","
        "pricingUnit": "kg","
        "unitPrice": 80.0,"
        "minOrderQuantity": 0.3,"
        "weight": 1.0,"
        "originCountry": None,"
    },
]


async def create_suppliers(session):
    """創建供應商資料"""
    print("📦 創建供應商資料...")
    
    for supplier_data in SUPPLIERS_DATA:
        # 檢查是否已存在
        check_query = text("SELECT id FROM organizations WHERE id = :id")
        result = await session.execute(check_query, {"id": supplier_data["id"]})
        if result.fetchone():
            continue
        
        # 插入組織資料
        org_insert = text("""
            INSERT INTO organizations (
                id, name, type, "businessType", "taxId", "contactPerson",
                "contactPhone", "contactEmail", address, "isActive",
                "createdAt", "updatedAt"
            ) VALUES (
                :id, :name, :type, :businessType, :taxId, :contactPerson,
                :contactPhone, :contactEmail, :address, true,
                NOW(), NOW()
            )
        """)
        
        await session.execute(org_insert, {
            "id": supplier_data["id"],
            "name": supplier_data["name"],
            "type": supplier_data["type"],
            "businessType": supplier_data.get("businessType"),
            "taxId": supplier_data.get("taxId"),
            "contactPerson": supplier_data.get("contactPerson"),
            "contactPhone": supplier_data.get("contactPhone"),
            "contactEmail": supplier_data.get("contactEmail"),
            "address": supplier_data.get("address")
        })
        
        print(f"   ✅ 已創建供應商: {supplier_data['name']}")


async def create_customers(session):
    """創建客戶資料"""
    print("🏢 創建客戶資料...")
    
    from app.models.customer_company import CustomerCompany
    from app.models.customer_location import CustomerLocation
    from app.models.business_unit import BusinessUnit
    
    for customer_data in CUSTOMERS_DATA:
        company_data = customer_data["company"]
        location_data = customer_data.get("location", {})
        unit_data = customer_data.get("business_unit", {})
        
        # 檢查公司是否已存在
        check_query = text("SELECT tax_id FROM customer_companies WHERE tax_id = :tax_id")
        result = await session.execute(check_query, {"tax_id": company_data["tax_id"]})
        if result.fetchone():
            continue
        
        # 創建公司
        company = CustomerCompany(
            id=str(uuid.uuid4()),
            name=company_data["name"],
            tax_id=company_data["tax_id"],
            tax_id_type=company_data["tax_id_type"],
            billing_address=company_data["billing_address"],
            billing_contact=company_data["billing_contact"],
            created_by="seed_script",
            updated_by="seed_script"
        )
        session.add(company)
        await session.flush()
        
        # 創建地點
        if location_data:
            location = CustomerLocation(
                id=str(uuid.uuid4()),
                company_id=company.id,
                name=location_data["name"],
                code=location_data["code"],
                address=location_data["address"],
                delivery_contact=location_data.get("delivery_contact", {}),
                created_by="seed_script",
                updated_by="seed_script"
            )
            session.add(location)
            await session.flush()
            
            # 創建業務單位
            if unit_data:
                business_unit = BusinessUnit(
                    id=str(uuid.uuid4()),
                    location_id=location.id,
                    name=unit_data["name"],
                    code=unit_data["code"],
                    type=unit_data.get("type"),
                    budget_monthly=unit_data.get("budget_monthly"),
                    created_by="seed_script",
                    updated_by="seed_script"
                )
                session.add(business_unit)
        
        print(f"   ✅ 已創建客戶: {company_data['name']}")


async def create_categories(session):
    """創建品類資料"""
    print("📂 創建品類資料...")
    
    for category_data in CATEGORIES_DATA:
        # 檢查是否已存在
        check_query = text("SELECT code FROM product_categories WHERE code = :code")
        result = await session.execute(check_query, {"code": category_data["code"]})
        if result.fetchone():
            continue
        
        # 插入品類
        category_insert = text("""
            INSERT INTO product_categories (
                id, code, name, "nameEn", "parentId", level, "sortOrder",
                description, metadata, "isActive", "createdAt", "updatedAt"
            ) VALUES (
                :id, :code, :name, :nameEn, :parentId, :level, :sortOrder,
                :description, '{}', true, NOW(), NOW()
            )
        """)
        
        await session.execute(category_insert, {
            "id": str(uuid.uuid4()),
            "code": category_data["code"],
            "name": category_data["name"],
            "nameEn": category_data.get("nameEn"),
            "parentId": category_data.get("parentId"),
            "level": category_data["level"],
            "sortOrder": category_data["sortOrder"],
            "description": category_data.get("description")
        })
        
        print(f"   ✅ 已創建品類: {category_data['name']}")


async def create_skus(session):
    """創建 SKU 資料"""
    print("🏷️ 創建 SKU 資料...")
    
    for sku_data in SKUS_DATA:
        # 檢查是否已存在
        check_query = text('SELECT "skuCode" FROM product_skus WHERE "skuCode" = :skuCode')
        result = await session.execute(check_query, {"skuCode": sku_data["skuCode"]})
        if result.fetchone():
            continue
        
        # 插入 SKU
        sku_insert = text("""
            INSERT INTO product_skus (
                id, "productId", "skuCode", name, "packageType", "pricingUnit",
                "unitPrice", "minOrderQuantity", weight, "originCountry",
                "isActive", "createdAt", "updatedAt"
            ) VALUES (
                :id, :productId, :skuCode, :name, :packageType, :pricingUnit,
                :unitPrice, :minOrderQuantity, :weight, :originCountry,
                true, NOW(), NOW()
            )
        """)
        
        await session.execute(sku_insert, {
            "id": str(uuid.uuid4()),
            "productId": sku_data.get("productId"),
            "skuCode": sku_data["skuCode"],
            "name": sku_data["name"],
            "packageType": sku_data.get("packageType"),
            "pricingUnit": sku_data.get("pricingUnit"),
            "unitPrice": sku_data.get("unitPrice"),
            "minOrderQuantity": sku_data.get("minOrderQuantity"),
            "weight": sku_data.get("weight"),
            "originCountry": sku_data.get("originCountry")
        })
        
        print(f"   ✅ 已創建 SKU: {sku_data['name']}")


async def clean_all_data():
    """清理所有測試資料"""
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as session:
        try:
            print("🗑️ 清理所有測試資料...")
            
            # 按依賴關係順序清理
            delete_queries = [
                "DELETE FROM business_units WHERE created_by = 'seed_script'",
                "DELETE FROM customer_locations WHERE created_by = 'seed_script'", 
                "DELETE FROM customer_companies WHERE created_by = 'seed_script'",
                "DELETE FROM product_skus WHERE "createdAt" > NOW() - INTERVAL '1 hour'",
                "DELETE FROM product_categories WHERE "createdAt" > NOW() - INTERVAL '1 hour'",
                "DELETE FROM supplier_profiles WHERE "createdAt" > NOW() - INTERVAL '1 hour'",
                "DELETE FROM organizations WHERE type = 'supplier' AND "createdAt" > NOW() - INTERVAL '1 hour'"
            ]
            
            for query in delete_queries:
                await session.execute(text(query))
            
            await session.commit()
            print("✅ 清理完成")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ 清理失敗: {e}")
        finally:
            await engine.dispose()


async def create_all_data(force=False):
    """創建所有測試資料"""
    if force:
        await clean_all_data()
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as session:
        try:
            print("🚀 開始創建真實測試資料...")
            
            await create_suppliers(session)
            await create_categories(session)
            await create_skus(session)
            await create_customers(session)
            
            await session.commit()
            print("✅ 所有測試資料創建完成！")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ 創建失敗: {e}")
            raise
        finally:
            await engine.dispose()


def main():
    """主程式入口"""
    parser = argparse.ArgumentParser(description="管理真實測試資料")
    parser.add_argument("--clean", action="store_true", help="清理現有的測試資料")
    parser.add_argument("--force", action="store_true", help="強制重新創建測試資料")
    
    args = parser.parse_args()
    
    if args.clean:
        print("🗑️ 開始清理測試資料...")
        asyncio.run(clean_all_data())
    else:
        print("🚀 開始創建測試資料...")
        asyncio.run(create_all_data(force=args.force))
        print("✨ 完成！")


if __name__ == "__main__":
    main()
