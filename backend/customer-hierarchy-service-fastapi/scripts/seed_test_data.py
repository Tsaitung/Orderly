#!/usr/bin/env python3
"""
Database seeding script for Customer Hierarchy Service
Creates 13 complete four-layer restaurant hierarchy groups
"""
import asyncio
import sys
import os
from uuid import uuid4
from pathlib import Path

# Add parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import get_async_session, init_db
from app.models.customer_group import CustomerGroup
from app.models.customer_company import CustomerCompany
from app.models.customer_location import CustomerLocation
from app.models.business_unit import BusinessUnit
import structlog

logger = structlog.get_logger(__name__)

# Complete test data - 13 restaurant groups with four-layer hierarchy
TEST_DATA = [
    {
        "group": {
            "name": "統一企業集團",
            "code": "PRESIDENT",
            "description": "台灣知名企業集團，旗下涵蓋食品、零售、流通等多元事業"
        },
        "companies": [
            {
                "name": "統一超商股份有限公司",
                "tax_id": "70759103",
                "locations": [
                    {
                        "name": "台北信義旗艦店",
                        "address": "台北市信義區信義路五段7號",
                        "business_units": [
                            {"name": "熟食廚房", "code": "COOKED", "type": "kitchen"},
                            {"name": "咖啡吧台", "code": "COFFEE", "type": "bar"},
                            {"name": "員工餐廳", "code": "STAFF", "type": "general"},
                            {"name": "倉儲管理", "code": "STORAGE", "type": "storage"}
                        ]
                    },
                    {
                        "name": "台中公益門市",
                        "address": "台中市西區公益路161號",
                        "business_units": [
                            {"name": "鮮食廚房", "code": "FRESH", "type": "kitchen"},
                            {"name": "烘焙區", "code": "BAKERY", "type": "bakery"},
                            {"name": "員工休息室", "code": "BREAK", "type": "general"},
                            {"name": "冷藏倉儲", "code": "COLD", "type": "storage"}
                        ]
                    }
                ]
            }
        ]
    },
    {
        "group": {
            "name": "王品餐飲集團",
            "code": "WOWPRIME",
            "description": "台灣最大連鎖餐飲集團，經營多元化餐廳品牌"
        },
        "companies": [
            {
                "name": "王品牛排事業部",
                "tax_id": "28896022",
                "locations": [
                    {
                        "name": "台北敦化旗艦店",
                        "address": "台北市松山區敦化北路165號",
                        "business_units": [
                            {"name": "西廚部", "code": "WESTERN", "type": "kitchen"},
                            {"name": "中廚部", "code": "CHINESE", "type": "kitchen"},
                            {"name": "甜點房", "code": "DESSERT", "type": "pastry"},
                            {"name": "員工餐廳", "code": "STAFF", "type": "general"}
                        ]
                    },
                    {
                        "name": "台中文心店",
                        "address": "台中市南屯區文心路一段521號",
                        "business_units": [
                            {"name": "主廚房", "code": "MAIN", "type": "kitchen"},
                            {"name": "冷廚房", "code": "COLD", "type": "kitchen"},
                            {"name": "烘焙室", "code": "BAKERY", "type": "bakery"},
                            {"name": "員工用餐區", "code": "STAFF", "type": "general"}
                        ]
                    }
                ]
            }
        ]
    },
    {
        "group": {
            "name": "鼎泰豐餐飲集團",
            "code": "DTF",
            "description": "國際知名小籠包品牌，世界級中式餐廳"
        },
        "companies": [
            {
                "name": "鼎泰豐餐廳股份有限公司",
                "tax_id": "22099234",
                "locations": [
                    {
                        "name": "台北101分店",
                        "address": "台北市信義區市府路45號B1",
                        "business_units": [
                            {"name": "點心廚房", "code": "DIMSUM", "type": "dim_sum"},
                            {"name": "麵點部", "code": "NOODLE", "type": "noodle"},
                            {"name": "蒸籠區", "code": "STEAM", "type": "kitchen"},
                            {"name": "員工餐廳", "code": "STAFF", "type": "general"}
                        ]
                    }
                ]
            }
        ]
    },
    {
        "group": {
            "name": "晶華國際酒店集團",
            "code": "GRANDFORMOSA",
            "description": "台灣頂級五星級酒店集團"
        },
        "companies": [
            {
                "name": "台北晶華酒店",
                "tax_id": "23561100",
                "locations": [
                    {
                        "name": "主館餐飲部",
                        "address": "台北市中山區中山北路二段39巷3號",
                        "business_units": [
                            {"name": "西廚", "code": "WESTERN", "type": "kitchen"},
                            {"name": "中廚", "code": "CHINESE", "type": "kitchen"},
                            {"name": "日料廚房", "code": "JAPANESE", "type": "sushi"},
                            {"name": "甜點烘焙", "code": "PASTRY", "type": "pastry"},
                            {"name": "員工餐廳", "code": "STAFF", "type": "general"}
                        ]
                    }
                ]
            }
        ]
    },
    {
        "group": {
            "name": "寒舍餐旅集團",
            "code": "HUMBLE",
            "description": "國際級餐旅服務集團"
        },
        "companies": [
            {
                "name": "寒舍艾美酒店",
                "tax_id": "28332877",
                "locations": [
                    {
                        "name": "探索廚房餐廳",
                        "address": "台北市信義區松仁路38號",
                        "business_units": [
                            {"name": "西廚", "code": "WESTERN", "type": "kitchen"},
                            {"name": "中廚", "code": "CHINESE", "type": "kitchen"},
                            {"name": "日式料理", "code": "JAPANESE", "type": "sushi"},
                            {"name": "甜點部", "code": "DESSERT", "type": "pastry"},
                            {"name": "員工餐廳", "code": "STAFF", "type": "general"}
                        ]
                    }
                ]
            }
        ]
    },
    {
        "group": {
            "name": "漢來美食集團",
            "code": "GRAND_HI_LAI",
            "description": "高雄知名餐旅集團，經營高級餐廳與飯店"
        },
        "companies": [
            {
                "name": "漢來大飯店",
                "tax_id": "25067830",
                "locations": [
                    {
                        "name": "海港自助餐廳",
                        "address": "高雄市前金區成功一路266號43樓",
                        "business_units": [
                            {"name": "海鮮廚房", "code": "SEAFOOD", "type": "kitchen"},
                            {"name": "燒烤區", "code": "GRILL", "type": "grill"},
                            {"name": "甜點吧", "code": "DESSERT", "type": "pastry"},
                            {"name": "壽司吧", "code": "SUSHI", "type": "sushi"},
                            {"name": "員工餐廳", "code": "STAFF", "type": "general"}
                        ]
                    }
                ]
            }
        ]
    },
    {
        "group": {
            "name": "饗賓餐旅集團",
            "code": "SHANGRI_LA",
            "description": "精緻餐飲與自助餐領導品牌"
        },
        "companies": [
            {
                "name": "饗食天堂事業部",
                "tax_id": "53125400",
                "locations": [
                    {
                        "name": "台北京站店",
                        "address": "台北市大同區承德路一段1號Q Square京站6樓",
                        "business_units": [
                            {"name": "日料區", "code": "JAPANESE", "type": "sushi"},
                            {"name": "西廚區", "code": "WESTERN", "type": "kitchen"},
                            {"name": "中廚區", "code": "CHINESE", "type": "kitchen"},
                            {"name": "甜點區", "code": "DESSERT", "type": "pastry"},
                            {"name": "員工餐廳", "code": "STAFF", "type": "general"}
                        ]
                    }
                ]
            }
        ]
    },
    {
        "group": {
            "name": "瓦城泰統集團",
            "code": "THAITOWN",
            "description": "泰式料理連鎖餐廳集團"
        },
        "companies": [
            {
                "name": "瓦城泰國料理",
                "tax_id": "52833000",
                "locations": [
                    {
                        "name": "台北微風信義店",
                        "address": "台北市信義區忠孝東路五段68號12樓",
                        "business_units": [
                            {"name": "泰式廚房", "code": "THAI", "type": "kitchen"},
                            {"name": "咖哩區", "code": "CURRY", "type": "kitchen"},
                            {"name": "涼拌區", "code": "SALAD", "type": "salad"},
                            {"name": "員工餐廳", "code": "STAFF", "type": "general"}
                        ]
                    }
                ]
            }
        ]
    },
    {
        "group": {
            "name": "全家便利商店集團",
            "code": "FAMILYMART",
            "description": "日式便利商店連鎖企業"
        },
        "companies": [
            {
                "name": "全家便利商店股份有限公司",
                "tax_id": "97176270",
                "locations": [
                    {
                        "name": "台北重慶南路店",
                        "address": "台北市中正區重慶南路一段10號",
                        "business_units": [
                            {"name": "鮮食處理區", "code": "FRESH", "type": "kitchen"},
                            {"name": "咖啡區", "code": "COFFEE", "type": "bar"},
                            {"name": "倉儲區", "code": "STORAGE", "type": "storage"},
                            {"name": "員工休息室", "code": "BREAK", "type": "general"}
                        ]
                    }
                ]
            }
        ]
    },
    {
        "group": {
            "name": "85度C咖啡集團",
            "code": "85C",
            "description": "台灣知名咖啡烘焙連鎖品牌"
        },
        "companies": [
            {
                "name": "美食達人股份有限公司",
                "tax_id": "53090870",
                "locations": [
                    {
                        "name": "台北天母店",
                        "address": "台北市士林區中山北路六段290號",
                        "business_units": [
                            {"name": "烘焙廚房", "code": "BAKERY", "type": "bakery"},
                            {"name": "咖啡吧", "code": "COFFEE", "type": "bar"},
                            {"name": "蛋糕裝飾區", "code": "CAKE", "type": "pastry"},
                            {"name": "員工休息區", "code": "BREAK", "type": "general"}
                        ]
                    }
                ]
            }
        ]
    },
    {
        "group": {
            "name": "六角國際集團",
            "code": "LA_KAFFA",
            "description": "手搖茶飲連鎖集團"
        },
        "companies": [
            {
                "name": "日出茶太事業部",
                "tax_id": "42589050",
                "locations": [
                    {
                        "name": "台北東區旗艦店",
                        "address": "台北市大安區忠孝東路四段216巷27弄16號",
                        "business_units": [
                            {"name": "茶飲調製區", "code": "TEA", "type": "bar"},
                            {"name": "備料區", "code": "PREP", "type": "prep"},
                            {"name": "倉儲區", "code": "STORAGE", "type": "storage"},
                            {"name": "員工休息室", "code": "BREAK", "type": "general"}
                        ]
                    }
                ]
            }
        ]
    },
    {
        "group": {
            "name": "三商餐飲集團",
            "code": "MERCURIES",
            "description": "知名餐飲連鎖集團，經營多個品牌"
        },
        "companies": [
            {
                "name": "三商巧福事業部",
                "tax_id": "89456050",
                "locations": [
                    {
                        "name": "台北站前店",
                        "address": "台北市中正區館前路2號",
                        "business_units": [
                            {"name": "麵食廚房", "code": "NOODLE", "type": "noodle"},
                            {"name": "滷味區", "code": "BRAISED", "type": "kitchen"},
                            {"name": "小菜區", "code": "SIDE", "type": "kitchen"},
                            {"name": "員工餐廳", "code": "STAFF", "type": "general"}
                        ]
                    }
                ]
            }
        ]
    },
    {
        "group": {
            "name": "雲雀國際集團",
            "code": "SKYLARK",
            "description": "國際餐飲連鎖集團"
        },
        "companies": [
            {
                "name": "古拉爵義式餐廳",
                "tax_id": "16203100",
                "locations": [
                    {
                        "name": "台北南京東路店",
                        "address": "台北市松山區南京東路四段2號",
                        "business_units": [
                            {"name": "義式廚房", "code": "ITALIAN", "type": "kitchen"},
                            {"name": "披薩爐區", "code": "PIZZA", "type": "pizza"},
                            {"name": "沙拉吧", "code": "SALAD", "type": "salad"},
                            {"name": "甜點區", "code": "DESSERT", "type": "pastry"},
                            {"name": "員工餐廳", "code": "STAFF", "type": "general"}
                        ]
                    }
                ]
            }
        ]
    }
]


async def seed_data():
    """Seed the database with test data"""
    try:
        logger.info("Starting database seeding...")
        
        # Initialize database
        await init_db()
        
        async with get_async_session() as session:
            # Clear existing data (optional - remove in production)
            from sqlalchemy import text
            logger.info("Clearing existing data (if tables exist)...")
            try:
                await session.execute(text("DELETE FROM business_units"))
                await session.execute(text("DELETE FROM customer_locations"))
                await session.execute(text("DELETE FROM customer_companies"))
                await session.execute(text("DELETE FROM customer_groups"))
                await session.commit()
                logger.info("Existing data cleared")
            except Exception as e:
                logger.info(f"Tables don't exist yet, creating new: {str(e)}")
                await session.rollback()
            
            logger.info("Creating test data...")
            total_created = {
                'groups': 0,
                'companies': 0,
                'locations': 0,
                'business_units': 0
            }
            
            # Create all groups and their hierarchies
            for group_data in TEST_DATA:
                # Create group
                group = CustomerGroup(
                    id=str(uuid4()),
                    name=group_data["group"]["name"],
                    code=group_data["group"]["code"],
                    description=group_data["group"]["description"],
                    created_by="system",
                    updated_by="system"
                )
                session.add(group)
                total_created['groups'] += 1
                
                # Create companies for this group
                for company_data in group_data["companies"]:
                    company = CustomerCompany(
                        id=str(uuid4()),
                        group_id=group.id,
                        name=company_data["name"],
                        tax_id_type="company",  # Set this first
                        tax_id=company_data["tax_id"],
                        billing_address={},
                        billing_contact={},
                        created_by="system",
                        updated_by="system"
                    )
                    session.add(company)
                    total_created['companies'] += 1
                    
                    # Create locations for this company
                    for location_data in company_data["locations"]:
                        # Parse city from address
                        full_address = location_data["address"]
                        city = full_address.split("市")[0] + "市" if "市" in full_address else "台北市"
                        
                        # Generate simple location code
                        location_code = f"LOC_{total_created['locations']:03d}"
                        
                        location = CustomerLocation(
                            id=str(uuid4()),
                            company_id=company.id,
                            name=location_data["name"],
                            code=location_code,
                            address={
                                "street": full_address,
                                "city": city
                            },
                            city=city,
                            delivery_contact={},
                            created_by="system",
                            updated_by="system"
                        )
                        session.add(location)
                        total_created['locations'] += 1
                        
                        # Create business units for this location
                        for bu_data in location_data["business_units"]:
                            business_unit = BusinessUnit(
                                id=str(uuid4()),
                                location_id=location.id,
                                name=bu_data["name"],
                                code=bu_data["code"],
                                type=bu_data["type"],
                                created_by="system",
                                updated_by="system"
                            )
                            session.add(business_unit)
                            total_created['business_units'] += 1
                
                logger.info(f"Created group: {group.name}")
            
            # Commit all changes
            await session.commit()
            
            logger.info("Database seeding completed successfully!")
            logger.info(f"Created: {total_created}")
            
            # Verify data
            logger.info("Verifying created data...")
            
            # Count records
            from sqlalchemy import text
            
            group_count = await session.execute(text("SELECT COUNT(*) FROM customer_groups WHERE is_active = true"))
            company_count = await session.execute(text("SELECT COUNT(*) FROM customer_companies WHERE is_active = true"))
            location_count = await session.execute(text("SELECT COUNT(*) FROM customer_locations WHERE is_active = true"))
            bu_count = await session.execute(text("SELECT COUNT(*) FROM business_units WHERE is_active = true"))
            
            verification = {
                'groups': group_count.scalar(),
                'companies': company_count.scalar(),
                'locations': location_count.scalar(),
                'business_units': bu_count.scalar()
            }
            
            logger.info(f"Verification counts: {verification}")
            
            # Verify hierarchy integrity
            sample_query = await session.execute(text("""
                SELECT 
                    g.name as group_name,
                    c.name as company_name,
                    l.name as location_name,
                    bu.name as business_unit_name,
                    bu.type as bu_type
                FROM customer_groups g
                JOIN customer_companies c ON g.id = c.group_id
                JOIN customer_locations l ON c.id = l.company_id
                JOIN business_units bu ON l.id = bu.location_id
                WHERE g.is_active = true AND c.is_active = true 
                  AND l.is_active = true AND bu.is_active = true
                LIMIT 5
            """))
            
            logger.info("Sample hierarchy data:")
            for row in sample_query.fetchall():
                logger.info(f"  {row.group_name} > {row.company_name} > {row.location_name} > {row.business_unit_name} ({row.bu_type})")
            
            return True
            
    except Exception as e:
        logger.error(f"Database seeding failed: {str(e)}")
        raise


async def main():
    """Main entry point"""
    try:
        success = await seed_data()
        if success:
            print("✅ Database seeding completed successfully!")
            print("📊 Created 13 restaurant groups with complete four-layer hierarchy")
            print("🏢 Groups > Companies > Locations > Business Units")
        else:
            print("❌ Database seeding failed")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())