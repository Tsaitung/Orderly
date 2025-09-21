#!/usr/bin/env python3
"""
建立20個測試客戶資料
- 15個公司（統編）
- 5個自然人（身分證字號）
- 只有公司層級，無集團層級
- 每個公司1個地點、1個業務單位
"""
import asyncio
import sys
import os
from datetime import datetime
from decimal import Decimal
import json
import uuid

# 添加 backend 路径
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend/customer-hierarchy-service-fastapi'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.customer_company import CustomerCompany
from app.models.customer_location import CustomerLocation
from app.models.business_unit import BusinessUnit

# 資料庫連接設定
DATABASE_URL = "postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly"

# 測試客戶資料
TEST_COMPANIES = [
    # 15個公司（統編）
    {
        "name": "老王餐廳股份有限公司",
        "tax_id": "12345678",
        "tax_id_type": "company",
        "billing_address": {
            "street": "台北市大安區信義路四段123號",
            "city": "台北市",
            "district": "大安區", 
            "postal_code": "10650"
        },
        "billing_contact": {
            "name": "王老闆",
            "phone": "02-12345678",
            "email": "boss@laowang.com"
        },
        "location": {
            "name": "老王餐廳大安店",
            "code": "LAOWANG_DA",
            "address": {
                "street": "台北市大安區信義路四段123號1樓",
                "city": "台北市",
                "district": "大安區",
                "postal_code": "10650"
            },
            "delivery_contact": {
                "name": "店長小李",
                "phone": "02-12345679"
            }
        },
        "business_unit": {
            "name": "主廚房",
            "code": "KITCHEN",
            "type": "kitchen",
            "budget_monthly": Decimal("50000")
        }
    },
    {
        "name": "美味小館有限公司", 
        "tax_id": "23456789",
        "tax_id_type": "company",
        "billing_address": {
            "street": "台中市西屯區台灣大道三段99號",
            "city": "台中市",
            "district": "西屯區",
            "postal_code": "40756"
        },
        "billing_contact": {
            "name": "林經理",
            "phone": "04-23456789",
            "email": "manager@meiwei.com"
        },
        "location": {
            "name": "美味小館台中店",
            "code": "MEIWEI_TC",
            "address": {
                "street": "台中市西屯區台灣大道三段99號1樓",
                "city": "台中市", 
                "district": "西屯區",
                "postal_code": "40756"
            },
            "delivery_contact": {
                "name": "廚師長張師傅",
                "phone": "04-23456790"
            }
        },
        "business_unit": {
            "name": "中餐廚房",
            "code": "CHINESE",
            "type": "kitchen",
            "budget_monthly": Decimal("40000")
        }
    },
    {
        "name": "海鮮大排檔股份有限公司",
        "tax_id": "34567890", 
        "tax_id_type": "company",
        "billing_address": {
            "street": "高雄市前金區中正四路151號",
            "city": "高雄市",
            "district": "前金區",
            "postal_code": "80144"
        },
        "billing_contact": {
            "name": "陳老板",
            "phone": "07-34567890",
            "email": "boss@seafood.com"
        },
        "location": {
            "name": "海鮮大排檔前金店",
            "code": "SEAFOOD_QJ",
            "address": {
                "street": "高雄市前金區中正四路151號",
                "city": "高雄市",
                "district": "前金區", 
                "postal_code": "80144"
            },
            "delivery_contact": {
                "name": "廚房主管阿明",
                "phone": "07-34567891"
            }
        },
        "business_unit": {
            "name": "海鮮處理區",
            "code": "SEAFOOD",
            "type": "kitchen",
            "budget_monthly": Decimal("80000")
        }
    },
    {
        "name": "義式風情餐廳有限公司",
        "tax_id": "45678901",
        "tax_id_type": "company", 
        "billing_address": {
            "street": "台北市信義區松高路19號",
            "city": "台北市",
            "district": "信義區",
            "postal_code": "11049"
        },
        "billing_contact": {
            "name": "義大利主廚 Marco",
            "phone": "02-45678901", 
            "email": "marco@italian.com"
        },
        "location": {
            "name": "義式風情信義店",
            "code": "ITALIAN_XY",
            "address": {
                "street": "台北市信義區松高路19號2樓",
                "city": "台北市",
                "district": "信義區",
                "postal_code": "11049"
            },
            "delivery_contact": {
                "name": "助理廚師 Anna",
                "phone": "02-45678902"
            }
        },
        "business_unit": {
            "name": "義式廚房",
            "code": "PASTA",
            "type": "kitchen",
            "budget_monthly": Decimal("60000")
        }
    },
    {
        "name": "炸雞王國企業股份有限公司",
        "tax_id": "56789012",
        "tax_id_type": "company",
        "billing_address": {
            "street": "桃園市桃園區中正路100號",
            "city": "桃園市",
            "district": "桃園區", 
            "postal_code": "33041"
        },
        "billing_contact": {
            "name": "雞王老闆",
            "phone": "03-56789012",
            "email": "king@chicken.com"
        },
        "location": {
            "name": "炸雞王國桃園店",
            "code": "CHICKEN_TY",
            "address": {
                "street": "桃園市桃園區中正路100號1樓",
                "city": "桃園市",
                "district": "桃園區",
                "postal_code": "33041" 
            },
            "delivery_contact": {
                "name": "炸雞師傅阿德",
                "phone": "03-56789013"
            }
        },
        "business_unit": {
            "name": "炸物區",
            "code": "FRY",
            "type": "kitchen", 
            "budget_monthly": Decimal("35000")
        }
    },
    {
        "name": "麵條工坊有限公司",
        "tax_id": "67890123",
        "tax_id_type": "company",
        "billing_address": {
            "street": "台南市東區勝利路75號",
            "city": "台南市",
            "district": "東區",
            "postal_code": "70101"
        },
        "billing_contact": {
            "name": "麵條師傅",
            "phone": "06-67890123",
            "email": "noodle@master.com"
        },
        "location": {
            "name": "麵條工坊東區店",
            "code": "NOODLE_EAST",
            "address": {
                "street": "台南市東區勝利路75號",
                "city": "台南市",
                "district": "東區",
                "postal_code": "70101"
            },
            "delivery_contact": {
                "name": "麵條助手小王",
                "phone": "06-67890124"
            }
        },
        "business_unit": {
            "name": "製麵區",
            "code": "NOODLE",
            "type": "prep",
            "budget_monthly": Decimal("30000")
        }
    },
    {
        "name": "咖啡香氛股份有限公司",
        "tax_id": "78901234", 
        "tax_id_type": "company",
        "billing_address": {
            "street": "新竹市東區光復路二段101號",
            "city": "新竹市",
            "district": "東區",
            "postal_code": "30072"
        },
        "billing_contact": {
            "name": "咖啡師 Kevin",
            "phone": "03-78901234",
            "email": "kevin@coffee.com"
        },
        "location": {
            "name": "咖啡香氛光復店",
            "code": "COFFEE_GF",
            "address": {
                "street": "新竹市東區光復路二段101號1樓",
                "city": "新竹市",
                "district": "東區", 
                "postal_code": "30072"
            },
            "delivery_contact": {
                "name": "吧台手 Lisa",
                "phone": "03-78901235"
            }
        },
        "business_unit": {
            "name": "咖啡吧台",
            "code": "BAR",
            "type": "bar",
            "budget_monthly": Decimal("25000")
        }
    },
    {
        "name": "烘焙坊企業有限公司",
        "tax_id": "89012345",
        "tax_id_type": "company",
        "billing_address": {
            "street": "彰化市中山路二段88號",
            "city": "彰化市",
            "district": "",
            "postal_code": "50042"
        },
        "billing_contact": {
            "name": "烘焙師父阿福",
            "phone": "04-89012345",
            "email": "baker@bread.com"
        },
        "location": {
            "name": "烘焙坊彰化店",
            "code": "BAKERY_CH",
            "address": {
                "street": "彰化市中山路二段88號",
                "city": "彰化市",
                "district": "",
                "postal_code": "50042"
            },
            "delivery_contact": {
                "name": "麵包助手小美",
                "phone": "04-89012346"
            }
        },
        "business_unit": {
            "name": "烘焙廚房",
            "code": "BAKERY",
            "type": "bakery",
            "budget_monthly": Decimal("45000")
        }
    },
    {
        "name": "壽司職人股份有限公司",
        "tax_id": "90123456",
        "tax_id_type": "company",
        "billing_address": {
            "street": "基隆市仁愛區愛一路25號",
            "city": "基隆市",
            "district": "仁愛區",
            "postal_code": "20041"
        },
        "billing_contact": {
            "name": "壽司師父田中",
            "phone": "02-90123456",
            "email": "tanaka@sushi.com"
        },
        "location": {
            "name": "壽司職人基隆店", 
            "code": "SUSHI_KL",
            "address": {
                "street": "基隆市仁愛區愛一路25號1樓",
                "city": "基隆市",
                "district": "仁愛區",
                "postal_code": "20041"
            },
            "delivery_contact": {
                "name": "壽司助手小田",
                "phone": "02-90123457"
            }
        },
        "business_unit": {
            "name": "壽司吧台",
            "code": "SUSHI",
            "type": "sushi",
            "budget_monthly": Decimal("70000")
        }
    },
    {
        "name": "熱炒100股份有限公司",
        "tax_id": "01234567",
        "tax_id_type": "company",
        "billing_address": {
            "street": "宜蘭縣宜蘭市中山路三段168號",
            "city": "宜蘭縣",
            "district": "宜蘭市",
            "postal_code": "26044"
        },
        "billing_contact": {
            "name": "熱炒老闆阿忠",
            "phone": "03-01234567",
            "email": "achung@hotcook.com"
        },
        "location": {
            "name": "熱炒100宜蘭店",
            "code": "HOTCOOK_YL",
            "address": {
                "street": "宜蘭縣宜蘭市中山路三段168號",
                "city": "宜蘭縣",
                "district": "宜蘭市", 
                "postal_code": "26044"
            },
            "delivery_contact": {
                "name": "炒菜師傅阿豪",
                "phone": "03-01234568"
            }
        },
        "business_unit": {
            "name": "熱炒區",
            "code": "STIRFRY",
            "type": "kitchen",
            "budget_monthly": Decimal("55000")
        }
    },
    {
        "name": "甜點夢工廠有限公司",
        "tax_id": "11111111",
        "tax_id_type": "company",
        "billing_address": {
            "street": "花蓮縣花蓮市中正路500號",
            "city": "花蓮縣",
            "district": "花蓮市",
            "postal_code": "97048"
        },
        "billing_contact": {
            "name": "甜點師 Patty",
            "phone": "03-11111111",
            "email": "patty@dessert.com"
        },
        "location": {
            "name": "甜點夢工廠花蓮店",
            "code": "DESSERT_HL",
            "address": {
                "street": "花蓮縣花蓮市中正路500號2樓",
                "city": "花蓮縣",
                "district": "花蓮市",
                "postal_code": "97048"
            },
            "delivery_contact": {
                "name": "糕點助手小雅",
                "phone": "03-11111112"
            }
        },
        "business_unit": {
            "name": "甜點廚房",
            "code": "PASTRY",
            "type": "pastry",
            "budget_monthly": Decimal("38000")
        }
    },
    {
        "name": "燒烤達人企業股份有限公司",
        "tax_id": "22222222",
        "tax_id_type": "company",
        "billing_address": {
            "street": "台東縣台東市中華路一段350號",
            "city": "台東縣",
            "district": "台東市",
            "postal_code": "95041"
        },
        "billing_contact": {
            "name": "燒烤大師阿達",
            "phone": "089-22222222",
            "email": "ada@bbq.com"
        },
        "location": {
            "name": "燒烤達人台東店",
            "code": "BBQ_TT",
            "address": {
                "street": "台東縣台東市中華路一段350號1樓",
                "city": "台東縣",
                "district": "台東市",
                "postal_code": "95041"
            },
            "delivery_contact": {
                "name": "燒烤助手小強",
                "phone": "089-22222223"
            }
        },
        "business_unit": {
            "name": "燒烤區",
            "code": "GRILL",
            "type": "grill",
            "budget_monthly": Decimal("42000")
        }
    },
    {
        "name": "火鍋世界股份有限公司",
        "tax_id": "33333333",
        "tax_id_type": "company",
        "billing_address": {
            "street": "屏東縣屏東市民生路200號",
            "city": "屏東縣", 
            "district": "屏東市",
            "postal_code": "90047"
        },
        "billing_contact": {
            "name": "火鍋老闆娘",
            "phone": "08-33333333",
            "email": "boss@hotpot.com"
        },
        "location": {
            "name": "火鍋世界屏東店",
            "code": "HOTPOT_PT",
            "address": {
                "street": "屏東縣屏東市民生路200號1樓",
                "city": "屏東縣",
                "district": "屏東市",
                "postal_code": "90047"
            },
            "delivery_contact": {
                "name": "火鍋師傅老王",
                "phone": "08-33333334"
            }
        },
        "business_unit": {
            "name": "火鍋廚房",
            "code": "HOTPOT",
            "type": "hot_pot",
            "budget_monthly": Decimal("65000")
        }
    },
    {
        "name": "素食天地有限公司",
        "tax_id": "44444444",
        "tax_id_type": "company",
        "billing_address": {
            "street": "雲林縣斗六市雲林路123號",
            "city": "雲林縣",
            "district": "斗六市",
            "postal_code": "64044"
        },
        "billing_contact": {
            "name": "素食達人阿蓮",
            "phone": "05-44444444",
            "email": "lian@vegetarian.com"
        },
        "location": {
            "name": "素食天地斗六店",
            "code": "VEG_DL",
            "address": {
                "street": "雲林縣斗六市雲林路123號",
                "city": "雲林縣",
                "district": "斗六市", 
                "postal_code": "64044"
            },
            "delivery_contact": {
                "name": "素食廚師小慧",
                "phone": "05-44444445"
            }
        },
        "business_unit": {
            "name": "素食廚房",
            "code": "VEGETARIAN",
            "type": "kitchen",
            "budget_monthly": Decimal("28000")
        }
    },
    {
        "name": "早餐王國股份有限公司",
        "tax_id": "55555555",
        "tax_id_type": "company",
        "billing_address": {
            "street": "嘉義市西區中山路88號",
            "city": "嘉義市",
            "district": "西區",
            "postal_code": "60045"
        },
        "billing_contact": {
            "name": "早餐店長阿明",
            "phone": "05-55555555",
            "email": "ming@breakfast.com"
        },
        "location": {
            "name": "早餐王國嘉義店",
            "code": "BREAKFAST_CY",
            "address": {
                "street": "嘉義市西區中山路88號1樓",
                "city": "嘉義市", 
                "district": "西區",
                "postal_code": "60045"
            },
            "delivery_contact": {
                "name": "早餐師傅小華",
                "phone": "05-55555556"
            }
        },
        "business_unit": {
            "name": "早餐廚房", 
            "code": "BREAKFAST",
            "type": "kitchen",
            "budget_monthly": Decimal("20000")
        }
    }
]

# 5個自然人客戶（身分證字號）
INDIVIDUAL_CUSTOMERS = [
    {
        "name": "陳小明個人工作室",
        "tax_id": "A123456789",
        "tax_id_type": "individual",
        "billing_address": {
            "street": "台北市中正區羅斯福路一段4號",
            "city": "台北市",
            "district": "中正區",
            "postal_code": "10048"
        },
        "billing_contact": {
            "name": "陳小明",
            "phone": "0912345678",
            "email": "ming@personal.com"
        },
        "location": {
            "name": "小明咖啡攤",
            "code": "MING_COFFEE",
            "address": {
                "street": "台北市中正區羅斯福路一段4號B1",
                "city": "台北市",
                "district": "中正區",
                "postal_code": "10048"
            },
            "delivery_contact": {
                "name": "陳小明",
                "phone": "0912345678"
            }
        },
        "business_unit": {
            "name": "咖啡製作區",
            "code": "COFFEE", 
            "type": "bar",
            "budget_monthly": Decimal("15000")
        }
    },
    {
        "name": "林美美小吃店",
        "tax_id": "B234567890",
        "tax_id_type": "individual",
        "billing_address": {
            "street": "台中市北區三民路三段67號",
            "city": "台中市",
            "district": "北區",
            "postal_code": "40444"
        },
        "billing_contact": {
            "name": "林美美",
            "phone": "0923456789", 
            "email": "meimei@snack.com"
        },
        "location": {
            "name": "美美小吃攤",
            "code": "MEIMEI_SNACK",
            "address": {
                "street": "台中市北區三民路三段67號1樓",
                "city": "台中市",
                "district": "北區",
                "postal_code": "40444"
            },
            "delivery_contact": {
                "name": "林美美",
                "phone": "0923456789"
            }
        },
        "business_unit": {
            "name": "小吃廚房",
            "code": "SNACK",
            "type": "kitchen",
            "budget_monthly": Decimal("12000")
        }
    },
    {
        "name": "王大頭牛肉麵",
        "tax_id": "C345678901",
        "tax_id_type": "individual",
        "billing_address": {
            "street": "高雄市左營區博愛二路99號",
            "city": "高雄市",
            "district": "左營區",
            "postal_code": "81342"
        },
        "billing_contact": {
            "name": "王大頭",
            "phone": "0934567890",
            "email": "datou@beef.com"
        },
        "location": {
            "name": "大頭牛肉麵店",
            "code": "DATOU_BEEF",
            "address": {
                "street": "高雄市左營區博愛二路99號",
                "city": "高雄市",
                "district": "左營區",
                "postal_code": "81342"
            },
            "delivery_contact": {
                "name": "王大頭",
                "phone": "0934567890"
            }
        },
        "business_unit": {
            "name": "麵食區",
            "code": "NOODLE",
            "type": "noodle",
            "budget_monthly": Decimal("18000")
        }
    },
    {
        "name": "張阿姨便當店",
        "tax_id": "D456789012", 
        "tax_id_type": "individual",
        "billing_address": {
            "street": "桃園市中壢區中大路300號",
            "city": "桃園市",
            "district": "中壢區",
            "postal_code": "32041"
        },
        "billing_contact": {
            "name": "張阿姨",
            "phone": "0945678901",
            "email": "aunt@lunch.com"
        },
        "location": {
            "name": "阿姨便當店",
            "code": "AUNT_LUNCH",
            "address": {
                "street": "桃園市中壢區中大路300號1樓",
                "city": "桃園市",
                "district": "中壢區",
                "postal_code": "32041"
            },
            "delivery_contact": {
                "name": "張阿姨",
                "phone": "0945678901"
            }
        },
        "business_unit": {
            "name": "便當廚房",
            "code": "LUNCHBOX",
            "type": "kitchen",
            "budget_monthly": Decimal("22000")
        }
    },
    {
        "name": "李師傅燒餅店",
        "tax_id": "E567890123",
        "tax_id_type": "individual",
        "billing_address": {
            "street": "台南市中西區民權路一段158號",
            "city": "台南市",
            "district": "中西區",
            "postal_code": "70041"
        },
        "billing_contact": {
            "name": "李師傅",
            "phone": "0956789012",
            "email": "master@bread.com"
        },
        "location": {
            "name": "師傅燒餅攤",
            "code": "MASTER_BREAD",
            "address": {
                "street": "台南市中西區民權路一段158號",
                "city": "台南市",
                "district": "中西區",
                "postal_code": "70041"
            },
            "delivery_contact": {
                "name": "李師傅",
                "phone": "0956789012"
            }
        },
        "business_unit": {
            "name": "燒餅製作區",
            "code": "BREAD",
            "type": "bakery",
            "budget_monthly": Decimal("10000")
        }
    }
]

async def create_test_data():
    """建立測試客戶資料"""
    # 創建資料庫引擎
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    # 創建 session
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as session:
        try:
            created_customers = []
            
            # 建立公司客戶
            print("🏢 建立公司客戶資料...")
            for i, company_data in enumerate(TEST_COMPANIES):
                print(f"建立公司 {i+1}/15: {company_data['name']}")
                
                # 建立公司
                company = CustomerCompany(
                    id=str(uuid.uuid4()),
                    name=company_data["name"],
                    tax_id=company_data["tax_id"],
                    tax_id_type=company_data["tax_id_type"],
                    billing_address=company_data["billing_address"],
                    billing_contact=company_data["billing_contact"],
                    created_by="system",
                    updated_by="system"
                )
                session.add(company)
                await session.flush()  # 取得 ID
                
                # 建立地點
                location = CustomerLocation(
                    id=str(uuid.uuid4()),
                    company_id=company.id,
                    name=company_data["location"]["name"],
                    code=company_data["location"]["code"],
                    address=company_data["location"]["address"],
                    delivery_contact=company_data["location"]["delivery_contact"],
                    created_by="system",
                    updated_by="system"
                )
                session.add(location)
                await session.flush()
                
                # 建立業務單位
                business_unit = BusinessUnit(
                    id=str(uuid.uuid4()),
                    location_id=location.id,
                    name=company_data["business_unit"]["name"],
                    code=company_data["business_unit"]["code"],
                    type=company_data["business_unit"]["type"],
                    budget_monthly=company_data["business_unit"]["budget_monthly"],
                    created_by="system",
                    updated_by="system"
                )
                session.add(business_unit)
                
                created_customers.append({
                    "company": company,
                    "location": location,
                    "business_unit": business_unit
                })
            
            # 建立自然人客戶
            print("\n👤 建立自然人客戶資料...")
            for i, individual_data in enumerate(INDIVIDUAL_CUSTOMERS):
                print(f"建立自然人 {i+1}/5: {individual_data['name']}")
                
                # 建立公司（自然人）
                company = CustomerCompany(
                    id=str(uuid.uuid4()),
                    name=individual_data["name"],
                    tax_id=individual_data["tax_id"],
                    tax_id_type=individual_data["tax_id_type"],
                    billing_address=individual_data["billing_address"],
                    billing_contact=individual_data["billing_contact"],
                    created_by="system",
                    updated_by="system"
                )
                session.add(company)
                await session.flush()
                
                # 建立地點
                location = CustomerLocation(
                    id=str(uuid.uuid4()),
                    company_id=company.id,
                    name=individual_data["location"]["name"],
                    code=individual_data["location"]["code"],
                    address=individual_data["location"]["address"],
                    delivery_contact=individual_data["location"]["delivery_contact"],
                    created_by="system",
                    updated_by="system"
                )
                session.add(location)
                await session.flush()
                
                # 建立業務單位
                business_unit = BusinessUnit(
                    id=str(uuid.uuid4()),
                    location_id=location.id,
                    name=individual_data["business_unit"]["name"],
                    code=individual_data["business_unit"]["code"],
                    type=individual_data["business_unit"]["type"],
                    budget_monthly=individual_data["business_unit"]["budget_monthly"],
                    created_by="system",
                    updated_by="system"
                )
                session.add(business_unit)
                
                created_customers.append({
                    "company": company,
                    "location": location,
                    "business_unit": business_unit
                })
            
            # 提交所有變更
            await session.commit()
            
            print(f"\n✅ 成功建立 {len(created_customers)} 個測試客戶")
            print(f"   - 公司客戶: 15 個")
            print(f"   - 自然人客戶: 5 個")
            print(f"   - 總地點數: {len(created_customers)}")
            print(f"   - 總業務單位數: {len(created_customers)}")
            
            # 儲存客戶 ID 列表到檔案
            customer_ids = [c["company"].id for c in created_customers]
            with open("scripts/database/data/test_customer_ids.json", "w", encoding="utf-8") as f:
                json.dump(customer_ids, f, ensure_ascii=False, indent=2)
            
            print(f"\n📄 客戶 ID 列表已儲存到: scripts/database/data/test_customer_ids.json")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ 建立測試資料失敗: {e}")
            raise
        finally:
            await engine.dispose()

if __name__ == "__main__":
    print("🚀 開始建立測試客戶資料...")
    asyncio.run(create_test_data())
    print("✨ 完成！")