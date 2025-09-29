#!/usr/bin/env python3
"""
Create realistic SKU data using direct SQL to bypass enum issues
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

# SKU configurations for all 92 subcategories
CATEGORY_SKU_CONFIG = {
    # 青菜類 (BY_WEIGHT)
    "LEAF": {  # 葉菜類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("有機菠菜", {"品種": "台灣菠菜", "產地": "彰化"}, 120.0, 0.3, 0.1),
            ("A菜", {"品種": "油菜", "產地": "雲林"}, 80.0, 0.5, 0.1),
            ("青江菜", {"品種": "小白菜", "產地": "台中"}, 90.0, 0.5, 0.1),
            ("地瓜葉", {"品種": "台農菜", "產地": "雲林"}, 70.0, 0.5, 0.1),
            ("空心菜", {"品種": "水菠菜", "產地": "台南"}, 65.0, 0.5, 0.1),
            ("大陸妹", {"品種": "萵苣", "產地": "桃園"}, 85.0, 0.3, 0.1),
            ("高麗菜", {"品種": "結球甘藍", "產地": "台中"}, 55.0, 1.0, 0.5),
        ]
    },
    "CABB": {  # 高麗菜類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("高麗菜", {"品種": "結球甘藍", "產地": "台中"}, 55.0, 1.0, 0.5),
            ("紫高麗菜", {"品種": "紫甘藍", "產地": "苗栗"}, 80.0, 1.0, 0.5),
            ("娃娃菜", {"品種": "小白菜", "產地": "彰化"}, 120.0, 0.5, 0.2),
            ("包心白菜", {"品種": "大白菜", "產地": "雲林"}, 45.0, 2.0, 1.0),
            ("結球萵苣", {"品種": "美生菜", "產地": "桃園"}, 90.0, 0.5, 0.2),
        ]
    },
    "CALO": {  # 花椰菜類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("白花椰菜", {"品種": "花椰菜", "產地": "嘉義"}, 130.0, 0.8, 0.2),
            ("青花菜", {"品種": "綠花椰", "產地": "彰化"}, 140.0, 0.8, 0.2),
            ("紫花椰菜", {"品種": "紫花椰", "產地": "台中"}, 180.0, 0.8, 0.2),
            ("羅馬花椰菜", {"品種": "寶塔花菜", "產地": "苗栗"}, 220.0, 0.5, 0.2),
            ("蒜薹", {"品種": "蒜苔", "產地": "雲林"}, 160.0, 0.3, 0.1),
        ]
    },
    "ROOT": {  # 根莖類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("白蘿蔔", {"品種": "日本蘿蔔", "產地": "台中"}, 35.0, 1.0, 0.5),
            ("紅蘿蔔", {"品種": "胡蘿蔔", "產地": "雲林"}, 45.0, 1.0, 0.5),
            ("馬鈴薯", {"品種": "克尼伯", "產地": "台北"}, 55.0, 1.0, 0.5),
            ("地瓜", {"品種": "台農66號", "產地": "彰化"}, 40.0, 1.0, 0.5),
            ("山藥", {"品種": "台農2號", "產地": "南投"}, 180.0, 0.5, 0.2),
            ("芋頭", {"品種": "檳榔心芋", "產地": "苗栗"}, 90.0, 1.0, 0.5),
            ("牛蒡", {"品種": "柳川理想", "產地": "屏東"}, 200.0, 0.5, 0.2),
        ]
    },
    "ONIO": {  # 洋蔥類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("黃洋蔥", {"品種": "台中1號", "產地": "台中"}, 55.0, 1.0, 0.5),
            ("紫洋蔥", {"品種": "紅球", "產地": "屏東"}, 75.0, 1.0, 0.5),
            ("白洋蔥", {"品種": "白皮", "產地": "雲林"}, 65.0, 1.0, 0.5),
            ("珍珠洋蔥", {"品種": "小洋蔥", "產地": "彰化"}, 120.0, 0.5, 0.2),
        ]
    },
    "BELL": {  # 甜椒類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("紅甜椒", {"品種": "紅燈籠椒", "產地": "嘉義"}, 160.0, 0.5, 0.1),
            ("黃甜椒", {"品種": "黃燈籠椒", "產地": "雲林"}, 150.0, 0.5, 0.1),
            ("綠甜椒", {"品種": "青椒", "產地": "台南"}, 120.0, 0.5, 0.1),
            ("橙甜椒", {"品種": "橙椒", "產地": "屏東"}, 170.0, 0.5, 0.1),
            ("紫甜椒", {"品種": "紫椒", "產地": "台中"}, 190.0, 0.5, 0.1),
        ]
    },
    "TOMA": {  # 番茄類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("牛番茄", {"品種": "桃太郎", "產地": "台南"}, 90.0, 1.0, 0.3),
            ("小番茄", {"品種": "聖女", "產地": "彰化"}, 140.0, 0.5, 0.1),
            ("玉女番茄", {"品種": "玉女", "產地": "雲林"}, 160.0, 0.5, 0.1),
            ("黑柿番茄", {"品種": "黑柿", "產地": "嘉義"}, 180.0, 0.5, 0.1),
            ("黃金番茄", {"品種": "金童", "產地": "台中"}, 200.0, 0.3, 0.1),
        ]
    },
    "CUCU": {  # 小黃瓜類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("小黃瓜", {"品種": "青瓜", "產地": "雲林"}, 65.0, 1.0, 0.3),
            ("大黃瓜", {"品種": "胡瓜", "產地": "台南"}, 45.0, 1.0, 0.5),
            ("日本小黃瓜", {"品種": "日本種", "產地": "嘉義"}, 120.0, 0.5, 0.2),
            ("迷你黃瓜", {"品種": "迷你", "產地": "台中"}, 180.0, 0.3, 0.1),
        ]
    },
    "EGGP": {  # 茄子類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("紫茄子", {"品種": "長茄", "產地": "台南"}, 80.0, 1.0, 0.3),
            ("白茄子", {"品種": "白皮茄", "產地": "雲林"}, 90.0, 1.0, 0.3),
            ("日本茄子", {"品種": "日本長茄", "產地": "彰化"}, 140.0, 0.5, 0.2),
            ("圓茄", {"品種": "圓茄", "產地": "嘉義"}, 100.0, 0.8, 0.2),
        ]
    },
    "CHER": {  # 櫻桃蘿蔔類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("櫻桃蘿蔔", {"品種": "紅白蘿蔔", "產地": "台中"}, 120.0, 0.5, 0.1),
            ("白玉蘿蔔", {"品種": "小白蘿蔔", "產地": "雲林"}, 100.0, 0.5, 0.1),
            ("紅皮蘿蔔", {"品種": "紅蘿蔔", "產地": "彰化"}, 110.0, 0.5, 0.1),
        ]
    },

    # 瓜果類 (BY_WEIGHT)
    "WINT": {  # 冬瓜類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("冬瓜", {"品種": "白冬瓜", "產地": "台南"}, 25.0, 3.0, 1.0),
            ("小冬瓜", {"品種": "迷你冬瓜", "產地": "雲林"}, 45.0, 1.0, 0.5),
            ("毛冬瓜", {"品種": "毛冬瓜", "產地": "彰化"}, 30.0, 2.0, 1.0),
        ]
    },
    "BITT": {  # 苦瓜類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("白苦瓜", {"品種": "白玉苦瓜", "產地": "台南"}, 80.0, 1.0, 0.3),
            ("青苦瓜", {"品種": "翠玉苦瓜", "產地": "雲林"}, 70.0, 1.0, 0.3),
            ("山苦瓜", {"品種": "野生苦瓜", "產地": "南投"}, 120.0, 0.5, 0.2),
        ]
    },
    "SQUA": {  # 絲瓜類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("絲瓜", {"品種": "角瓜", "產地": "台南"}, 60.0, 1.0, 0.3),
            ("澎湖絲瓜", {"品種": "澎湖種", "產地": "澎湖"}, 90.0, 0.8, 0.3),
            ("水瓜", {"品種": "水絲瓜", "產地": "雲林"}, 50.0, 1.0, 0.3),
        ]
    },
    "ZUCC": {  # 櫛瓜類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("綠櫛瓜", {"品種": "綠皮櫛瓜", "產地": "台中"}, 100.0, 0.8, 0.2),
            ("黃櫛瓜", {"品種": "黃皮櫛瓜", "產地": "彰化"}, 110.0, 0.8, 0.2),
            ("圓櫛瓜", {"品種": "圓形櫛瓜", "產地": "雲林"}, 120.0, 0.5, 0.2),
        ]
    },
    "PUMP": {  # 南瓜類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("栗子南瓜", {"品種": "栗南瓜", "產地": "雲林"}, 80.0, 1.0, 0.5),
            ("奶油南瓜", {"品種": "奶油南瓜", "產地": "台南"}, 70.0, 1.0, 0.5),
            ("日本南瓜", {"品種": "東昇", "產地": "彰化"}, 90.0, 1.0, 0.5),
            ("迷你南瓜", {"品種": "迷你南瓜", "產地": "台中"}, 150.0, 0.3, 0.1),
        ]
    },

    # 豆類蔬菜 (BY_WEIGHT)
    "GREE": {  # 四季豆類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("敏豆", {"品種": "四季豆", "產地": "雲林"}, 140.0, 0.5, 0.1),
            ("豇豆", {"品種": "長豆", "產地": "台南"}, 100.0, 0.5, 0.1),
            ("扁豆", {"品種": "扁豆莢", "產地": "彰化"}, 120.0, 0.5, 0.1),
            ("荷蘭豆", {"品種": "豌豆莢", "產地": "台中"}, 180.0, 0.3, 0.1),
        ]
    },
    "SNAP": {  # 甜豆類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("甜豆", {"品種": "甜豌豆", "產地": "台中"}, 200.0, 0.3, 0.1),
            ("豆苗", {"品種": "豌豆苗", "產地": "彰化"}, 150.0, 0.2, 0.1),
            ("豆芽菜", {"品種": "綠豆芽", "產地": "雲林"}, 60.0, 0.5, 0.1),
        ]
    },
    "OKRA": {  # 秋葵類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("綠秋葵", {"品種": "綠色秋葵", "產地": "台南"}, 180.0, 0.3, 0.1),
            ("紅秋葵", {"品種": "紅色秋葵", "產地": "高雄"}, 220.0, 0.3, 0.1),
            ("迷你秋葵", {"品種": "迷你秋葵", "產地": "屏東"}, 250.0, 0.2, 0.1),
        ]
    },

    # 芽菜類 (BY_WEIGHT)
    "SPRO": {  # 豆芽菜類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("綠豆芽", {"品種": "綠豆芽菜", "產地": "台北"}, 50.0, 0.5, 0.1),
            ("黃豆芽", {"品種": "黃豆芽菜", "產地": "桃園"}, 60.0, 0.5, 0.1),
            ("黑豆芽", {"品種": "黑豆芽菜", "產地": "台中"}, 80.0, 0.3, 0.1),
        ]
    },
    "ALFO": {  # 苜蓿芽類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("苜蓿芽", {"品種": "紫花苜蓿", "產地": "台中"}, 200.0, 0.1, 0.05),
            ("蘿蔔嬰", {"品種": "蘿蔔芽", "產地": "彰化"}, 180.0, 0.1, 0.05),
            ("紫高麗芽", {"品種": "紫甘藍芽", "產地": "雲林"}, 220.0, 0.1, 0.05),
        ]
    },

    # 香辛料蔬菜 (BY_WEIGHT)
    "GING": {  # 薑類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("生薑", {"品種": "竹薑", "產地": "南投"}, 300.0, 0.2, 0.1),
            ("嫩薑", {"品種": "嫩薑", "產地": "台中"}, 200.0, 0.3, 0.1),
            ("老薑", {"品種": "老薑", "產地": "雲林"}, 250.0, 0.2, 0.1),
        ]
    },
    "GARL": {  # 蒜類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("蒜頭", {"品種": "大蒜", "產地": "雲林"}, 350.0, 0.2, 0.1),
            ("蒜苗", {"品種": "青蒜", "產地": "彰化"}, 120.0, 0.3, 0.1),
            ("蒜仁", {"品種": "蒜瓣", "產地": "台南"}, 400.0, 0.1, 0.05),
        ]
    },
    "SCAL": {  # 蔥類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("青蔥", {"品種": "四季蔥", "產地": "宜蘭"}, 180.0, 0.3, 0.1),
            ("大蔥", {"品種": "大蔥", "產地": "雲林"}, 100.0, 0.5, 0.2),
            ("珠蔥", {"品種": "紅蔥頭", "產地": "彰化"}, 300.0, 0.2, 0.1),
        ]
    },
    "CHIL": {  # 辣椒類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("朝天椒", {"品種": "小辣椒", "產地": "台南"}, 400.0, 0.1, 0.05),
            ("糯米椒", {"品種": "甜椒", "產地": "嘉義"}, 180.0, 0.3, 0.1),
            ("青辣椒", {"品種": "青椒", "產地": "雲林"}, 150.0, 0.3, 0.1),
            ("紅辣椒", {"品種": "紅椒", "產地": "屏東"}, 350.0, 0.1, 0.05),
        ]
    },

    # 香草類 (BY_WEIGHT)
    "BASI": {  # 九層塔類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("九層塔", {"品種": "羅勒", "產地": "台中"}, 300.0, 0.1, 0.05),
            ("紫蘇", {"品種": "紫蘇葉", "產地": "南投"}, 400.0, 0.1, 0.05),
            ("薄荷", {"品種": "綠薄荷", "產地": "宜蘭"}, 350.0, 0.1, 0.05),
        ]
    },
    "CILA": {  # 香菜類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("香菜", {"品種": "芫荽", "產地": "雲林"}, 200.0, 0.2, 0.1),
            ("芹菜", {"品種": "西洋芹", "產地": "彰化"}, 100.0, 0.5, 0.2),
            ("韭菜", {"品種": "韭黃", "產地": "台南"}, 120.0, 0.3, 0.1),
        ]
    },

    # 水果類 (BY_WEIGHT)
    "APPL": {  # 蘋果類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("富士蘋果", {"品種": "富士", "產地": "日本"}, 180.0, 1.0, 0.3),
            ("青蘋果", {"品種": "青龍", "產地": "美國"}, 160.0, 1.0, 0.3),
            ("蜜蘋果", {"品種": "蜜脆", "產地": "紐西蘭"}, 220.0, 1.0, 0.3),
        ]
    },
    "BANA": {  # 香蕉類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("香蕉", {"品種": "北蕉", "產地": "高雄"}, 80.0, 1.0, 0.5),
            ("芭蕉", {"品種": "芭蕉", "產地": "屏東"}, 60.0, 1.0, 0.5),
            ("玫瑰蕉", {"品種": "玫瑰蕉", "產地": "台東"}, 120.0, 1.0, 0.3),
        ]
    },
    "ORAN": {  # 柑橘類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("柳橙", {"品種": "帝王柑", "產地": "台中"}, 90.0, 1.0, 0.5),
            ("橘子", {"品種": "桶柑", "產地": "新竹"}, 70.0, 1.0, 0.5),
            ("檸檬", {"品種": "四季檸檬", "產地": "屏東"}, 120.0, 0.5, 0.2),
            ("葡萄柚", {"品種": "文旦柚", "產地": "台南"}, 60.0, 2.0, 1.0),
        ]
    },
    "GRAP": {  # 葡萄類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("巨峰葡萄", {"品種": "巨峰", "產地": "彰化"}, 300.0, 0.5, 0.2),
            ("綠葡萄", {"品種": "無籽綠", "產地": "美國"}, 280.0, 0.5, 0.2),
            ("紅葡萄", {"品種": "紅地球", "產地": "智利"}, 320.0, 0.5, 0.2),
        ]
    },

    # 包裝食品類 (BY_ITEM)
    "SEAS": {  # 調味料
        "pricing_method": "BY_ITEM",
        "base_unit": "瓶",
        "products": [
            ("統一醬油膏", {"容量": "590ml", "品牌": "統一"}, 45.0, 1, 1),
            ("金蘭醬油", {"容量": "1公升", "品牌": "金蘭"}, 85.0, 1, 1),
            ("味精", {"容量": "454g", "品牌": "味之素"}, 65.0, 1, 1),
            ("鹽巴", {"容量": "600g", "品牌": "台鹽"}, 25.0, 1, 1),
            ("胡椒粉", {"容量": "50g", "品牌": "味好美"}, 120.0, 1, 1),
        ]
    },
    "SAUC": {  # 醬料類
        "pricing_method": "BY_ITEM",
        "base_unit": "瓶",
        "products": [
            ("番茄醬", {"容量": "300g", "品牌": "可果美"}, 55.0, 1, 1),
            ("沙茶醬", {"容量": "250g", "品牌": "牛頭牌"}, 65.0, 1, 1),
            ("蠔油", {"容量": "510g", "品牌": "李錦記"}, 90.0, 1, 1),
            ("芝麻醬", {"容量": "180g", "品牌": "九福"}, 120.0, 1, 1),
        ]
    },
    "OILS": {  # 油品類
        "pricing_method": "BY_ITEM",
        "base_unit": "瓶",
        "products": [
            ("沙拉油", {"容量": "1公升", "品牌": "泰山"}, 95.0, 1, 1),
            ("橄欖油", {"容量": "500ml", "品牌": "得意的一天"}, 280.0, 1, 1),
            ("麻油", {"容量": "200ml", "品牌": "九鬼"}, 320.0, 1, 1),
            ("葵花油", {"容量": "1公升", "品牌": "福壽"}, 85.0, 1, 1),
        ]
    },
    "VINE": {  # 醋類
        "pricing_method": "BY_ITEM",
        "base_unit": "瓶",
        "products": [
            ("白醋", {"容量": "300ml", "品牌": "工研"}, 35.0, 1, 1),
            ("烏醋", {"容量": "300ml", "品牌": "萬家香"}, 40.0, 1, 1),
            ("米醋", {"容量": "300ml", "品牌": "統一"}, 45.0, 1, 1),
            ("蘋果醋", {"容量": "500ml", "品牌": "崇德發"}, 120.0, 1, 1),
        ]
    },
    "NOOD": {  # 麵條類
        "pricing_method": "BY_ITEM",
        "base_unit": "包",
        "products": [
            ("關廟麵", {"重量": "600g", "品牌": "關廟"}, 65.0, 1, 1),
            ("烏龍麵", {"重量": "200g", "品牌": "五木"}, 35.0, 1, 1),
            ("義大利麵", {"重量": "500g", "品牌": "百味來"}, 85.0, 1, 1),
            ("拉麵", {"重量": "130g", "品牌": "統一"}, 25.0, 1, 1),
        ]
    },
    "RICE": {  # 米類
        "pricing_method": "BY_ITEM",
        "base_unit": "包",
        "products": [
            ("蓬萊米", {"重量": "3kg", "品牌": "台灣好米"}, 180.0, 1, 1),
            ("糙米", {"重量": "3kg", "品牌": "池上米"}, 220.0, 1, 1),
            ("五穀米", {"重量": "1kg", "品牌": "聯華"}, 150.0, 1, 1),
            ("紫米", {"重量": "1kg", "品牌": "花蓮"}, 200.0, 1, 1),
        ]
    },
    "BEAN": {  # 豆類
        "pricing_method": "BY_ITEM",
        "base_unit": "包",
        "products": [
            ("綠豆", {"重量": "500g", "品牌": "萬丹"}, 80.0, 1, 1),
            ("紅豆", {"重量": "500g", "品牌": "屏東"}, 120.0, 1, 1),
            ("黃豆", {"重量": "500g", "品牌": "台灣"}, 100.0, 1, 1),
            ("花豆", {"重量": "300g", "品牌": "原住民"}, 180.0, 1, 1),
        ]
    },

    # 冷凍食品類 (BY_ITEM)
    "DUMP": {  # 水餃類
        "pricing_method": "BY_ITEM",
        "base_unit": "包",
        "products": [
            ("豬肉水餃", {"重量": "900g", "品牌": "四海"}, 180.0, 1, 1),
            ("韭菜水餃", {"重量": "900g", "品牌": "義美"}, 160.0, 1, 1),
            ("玉米水餃", {"重量": "900g", "品牌": "灣仔碼頭"}, 200.0, 1, 1),
        ]
    },
    "FROS": {  # 冷凍蔬菜類
        "pricing_method": "BY_ITEM",
        "base_unit": "包",
        "products": [
            ("冷凍玉米", {"重量": "500g", "品牌": "桂冠"}, 85.0, 1, 1),
            ("冷凍花椰菜", {"重量": "500g", "品牌": "義美"}, 90.0, 1, 1),
            ("冷凍毛豆", {"重量": "400g", "品牌": "統一"}, 70.0, 1, 1),
        ]
    },

    # 罐頭類 (BY_ITEM)
    "CANN": {  # 罐頭類
        "pricing_method": "BY_ITEM",
        "base_unit": "罐",
        "products": [
            ("鮪魚罐頭", {"重量": "185g", "品牌": "東和"}, 55.0, 1, 1),
            ("玉米罐頭", {"重量": "340g", "品牌": "綠巨人"}, 45.0, 1, 1),
            ("番茄罐頭", {"重量": "400g", "品牌": "可果美"}, 65.0, 1, 1),
            ("蘑菇罐頭", {"重量": "284g", "品牌": "統一"}, 50.0, 1, 1),
        ]
    },

    # 乳製品類 (BY_ITEM)
    "MILK": {  # 牛奶類
        "pricing_method": "BY_ITEM",
        "base_unit": "瓶",
        "products": [
            ("鮮奶", {"容量": "936ml", "品牌": "光泉"}, 90.0, 1, 1),
            ("低脂牛奶", {"容量": "936ml", "品牌": "統一"}, 85.0, 1, 1),
            ("保久乳", {"容量": "200ml", "品牌": "林鳳營"}, 25.0, 1, 1),
        ]
    },
    "CHEE": {  # 起司類
        "pricing_method": "BY_ITEM",
        "base_unit": "包",
        "products": [
            ("切片起司", {"重量": "200g", "品牌": "安佳"}, 180.0, 1, 1),
            ("起司條", {"重量": "180g", "品牌": "總統牌"}, 220.0, 1, 1),
            ("奶油起司", {"重量": "200g", "品牌": "卡夫"}, 160.0, 1, 1),
        ]
    },
    "YOGU": {  # 優格類
        "pricing_method": "BY_ITEM",
        "base_unit": "杯",
        "products": [
            ("原味優格", {"容量": "400g", "品牌": "福樂"}, 65.0, 1, 1),
            ("草莓優格", {"容量": "100g", "品牌": "統一"}, 25.0, 1, 1),
            ("希臘優格", {"容量": "170g", "品牌": "雀巢"}, 85.0, 1, 1),
        ]
    },

    # 雞蛋類 (BY_ITEM)
    "EGGS": {  # 雞蛋類
        "pricing_method": "BY_ITEM",
        "base_unit": "盒",
        "products": [
            ("土雞蛋", {"數量": "10顆", "品牌": "牧場"}, 120.0, 1, 1),
            ("白殼蛋", {"數量": "12顆", "品牌": "大成"}, 80.0, 1, 1),
            ("紅殼蛋", {"數量": "10顆", "品牌": "勤億"}, 90.0, 1, 1),
        ]
    },

    # 肉類 (BY_WEIGHT)
    "PORK": {  # 豬肉類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("豬絞肉", {"部位": "後腿肉", "產地": "台灣"}, 180.0, 0.5, 0.1),
            ("豬里肌", {"部位": "里肌肉", "產地": "台灣"}, 220.0, 0.5, 0.1),
            ("五花肉", {"部位": "五花肉", "產地": "台灣"}, 200.0, 0.5, 0.1),
            ("豬排骨", {"部位": "排骨", "產地": "台灣"}, 160.0, 0.5, 0.1),
        ]
    },
    "BEEF": {  # 牛肉類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("牛絞肉", {"部位": "後腿肉", "產地": "澳洲"}, 350.0, 0.3, 0.1),
            ("牛排", {"部位": "菲力", "產地": "美國"}, 800.0, 0.2, 0.1),
            ("牛腱", {"部位": "腱子肉", "產地": "紐西蘭"}, 450.0, 0.3, 0.1),
        ]
    },
    "CHIC": {  # 雞肉類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("雞胸肉", {"部位": "胸肉", "產地": "台灣"}, 140.0, 0.5, 0.1),
            ("雞腿肉", {"部位": "腿肉", "產地": "台灣"}, 120.0, 0.5, 0.1),
            ("全雞", {"部位": "全雞", "產地": "台灣"}, 100.0, 1.0, 0.5),
            ("雞翅", {"部位": "雞翅", "產地": "台灣"}, 160.0, 0.5, 0.1),
        ]
    },

    # 海鮮類 (BY_WEIGHT)
    "FISH": {  # 魚類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("台灣鯛", {"種類": "吳郭魚", "產地": "台南"}, 180.0, 0.5, 0.2),
            ("鱸魚", {"種類": "七星鱸", "產地": "雲林"}, 300.0, 0.5, 0.2),
            ("鮭魚", {"種類": "大西洋鮭", "產地": "挪威"}, 480.0, 0.3, 0.1),
            ("鯖魚", {"種類": "青花魚", "產地": "台灣"}, 200.0, 0.5, 0.2),
        ]
    },
    "SHRI": {  # 蝦類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("白蝦", {"種類": "白蝦", "產地": "台南"}, 400.0, 0.3, 0.1),
            ("草蝦", {"種類": "草蝦", "產地": "屏東"}, 600.0, 0.3, 0.1),
            ("天使蝦", {"種類": "天使蝦", "產地": "雲林"}, 800.0, 0.2, 0.1),
        ]
    },
    "CRAB": {  # 蟹類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("螃蟹", {"種類": "紅蟳", "產地": "彰化"}, 800.0, 0.5, 0.2),
            ("花蟹", {"種類": "花蟹", "產地": "台中"}, 600.0, 0.5, 0.2),
            ("沙公", {"種類": "沙公", "產地": "台南"}, 500.0, 0.5, 0.2),
        ]
    },

    # 水產類 (BY_WEIGHT)
    "SQUI": {  # 魷魚類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("透抽", {"種類": "透抽", "產地": "澎湖"}, 350.0, 0.3, 0.1),
            ("小卷", {"種類": "小卷", "產地": "基隆"}, 400.0, 0.3, 0.1),
            ("花枝", {"種類": "花枝", "產地": "台南"}, 300.0, 0.3, 0.1),
        ]
    },
    "CLAM": {  # 貝類
        "pricing_method": "BY_WEIGHT",
        "base_unit": "kg",
        "products": [
            ("蛤蜊", {"種類": "文蛤", "產地": "彰化"}, 120.0, 0.5, 0.2),
            ("蚵仔", {"種類": "牡蠣", "產地": "嘉義"}, 200.0, 0.3, 0.1),
            ("干貝", {"種類": "扇貝", "產地": "日本"}, 1200.0, 0.1, 0.05),
        ]
    }
}

def generate_sku_code(category_code: str, index: int) -> str:
    """Generate unique SKU code"""
    today = datetime.now().strftime("%Y%m%d")
    return f"{category_code}-{today}-{index:03d}"

async def create_products_and_skus():
    """Create products and SKUs using direct SQL"""
    
    conn = await asyncpg.connect(DATABASE_URL)
    total_created = 0
    
    try:
        # Get categories for our configured items
        categories = await conn.fetch("""
            SELECT id, code, name 
            FROM product_categories 
            WHERE level = 2 AND code = ANY($1)
        """, list(CATEGORY_SKU_CONFIG.keys()))
        
        # Also get all categories to report which ones we haven't configured
        all_categories = await conn.fetch("""
            SELECT code, name 
            FROM product_categories 
            WHERE level = 2 
            ORDER BY code
        """)
        
        configured_codes = set(CATEGORY_SKU_CONFIG.keys())
        all_codes = {cat['code'] for cat in all_categories}
        missing_codes = all_codes - configured_codes
        
        if missing_codes:
            print(f"📋 Note: {len(missing_codes)} categories not yet configured: {sorted(missing_codes)[:10]}...")
        
        for category in categories:
            if category['code'] not in CATEGORY_SKU_CONFIG:
                continue
            
            config = CATEGORY_SKU_CONFIG[category['code']]
            print(f"\n📦 Processing category: {category['name']} ({category['code']})")
            print(f"   計價方式: {config['pricing_method']}")
            
            for i, (product_name, variant, unit_price, min_qty, qty_increment) in enumerate(config["products"]):
                
                product_code = f"PRD-{category['code']}-{i+1:03d}"
                
                # Check if product already exists
                existing_product = await conn.fetchrow("""
                    SELECT id FROM products WHERE code = $1 AND version = 1
                """, product_code)
                
                if existing_product:
                    product_id = existing_product['id']
                    print(f"   🔄 Product exists: {product_name}")
                else:
                    # Insert new product
                    product_id = str(uuid.uuid4())
                    await conn.execute("""
                        INSERT INTO products (
                            id, code, name, "categoryId", "baseUnit", "pricingUnit", "pricingMethod",
                            specifications, "isActive", "isPublic", "createdBy", "updatedBy", "updatedAt"
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
                    """, 
                        product_id, product_code, product_name, category['id'],
                        config["base_unit"], config["base_unit"], config["pricing_method"],
                        json.dumps(variant), True, True, "system", "system"
                    )
                    print(f"   ➕ Created product: {product_name}")
                
                # Generate unique SKU code with timestamp to avoid duplicates
                sku_code = generate_sku_code(category['code'], i+1)
                
                # Check if SKU already exists
                existing_sku = await conn.fetchrow("""
                    SELECT id FROM product_skus WHERE "skuCode" = $1
                """, sku_code)
                
                if existing_sku:
                    print(f"   🔄 SKU exists: {sku_code}")
                    continue
                
                # Insert new SKU
                sku_id = str(uuid.uuid4())
                sku_name = f"{product_name} - {config['base_unit']}"
                
                stock_qty = 50 if config["pricing_method"] == "BY_ITEM" else 100
                min_stock = 10 if config["pricing_method"] == "BY_ITEM" else 20
                max_stock = 200 if config["pricing_method"] == "BY_ITEM" else 500
                weight = 1.0 if config["pricing_method"] == "BY_WEIGHT" else None
                package_type = "散裝" if config["pricing_method"] == "BY_WEIGHT" else "包裝"
                shelf_life = 7 if "菜" in category['name'] else 365
                storage_conditions = "冷藏" if "菜" in category['name'] else "常溫"
                
                await conn.execute("""
                    INSERT INTO product_skus (
                        id, "productId", "skuCode", name, variant, "stockQuantity", 
                        "minStock", "maxStock", weight, "packageType", "shelfLifeDays",
                        "storageConditions", "isActive", "pricingMethod", "unitPrice",
                        "minOrderQuantity", "quantityIncrement", "updatedAt"
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
                """,
                    sku_id, product_id, sku_code, sku_name, json.dumps(variant), stock_qty,
                    min_stock, max_stock, weight, package_type, shelf_life,
                    storage_conditions, True, config["pricing_method"], unit_price,
                    min_qty, qty_increment
                )
                
                total_created += 1
                print(f"   ✅ {product_name}: {unit_price}元/{config['base_unit']} (最小訂購: {min_qty}{config['base_unit']})")
        
        print(f"\n🎉 Successfully created {total_created} SKUs!")
        
        # Verify creation
        total_skus = await conn.fetchval("SELECT COUNT(*) FROM product_skus")
        print(f"📊 Total SKUs in database: {total_skus}")
        
    finally:
        await conn.close()

async def main():
    """Main execution function"""
    print("🚀 Starting SKU data generation (Direct SQL)...")
    print("=" * 50)
    
    try:
        await create_products_and_skus()
        print("\n✅ SKU generation completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
