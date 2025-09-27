#!/usr/bin/env python3
"""
檢查 staging 和本地資料庫的資料表結構和資料
"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from tabulate import tabulate
import sys

# 設定環境變數
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = os.path.expanduser('~/.config/gcloud/application_default_credentials.json')

async def check_database(name, connection_string):
    """檢查資料庫的資料表和資料"""
    print(f"\n{'='*60}")
    print(f"檢查 {name} 資料庫")
    print('='*60)
    
    try:
        engine = create_async_engine(connection_string, echo=False)
        
        async with engine.connect() as conn:
            # 1. 列出所有資料表
            result = await conn.execute(text("""
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                ORDER BY tablename
            """))
            tables = [row[0] for row in result]
            
            print(f"\n找到 {len(tables)} 個資料表:")
            if tables:
                # 分組顯示
                product_tables = [t for t in tables if 'product' in t.lower()]
                user_tables = [t for t in tables if 'user' in t.lower() or 'auth' in t.lower()]
                order_tables = [t for t in tables if 'order' in t.lower()]
                other_tables = [t for t in tables if t not in product_tables + user_tables + order_tables]
                
                if product_tables:
                    print("\n產品相關資料表:")
                    for t in product_tables:
                        print(f"  - {t}")
                
                if user_tables:
                    print("\n用戶相關資料表:")
                    for t in user_tables:
                        print(f"  - {t}")
                
                if order_tables:
                    print("\n訂單相關資料表:")
                    for t in order_tables:
                        print(f"  - {t}")
                
                if other_tables:
                    print("\n其他資料表:")
                    for t in other_tables[:10]:  # 只顯示前10個
                        print(f"  - {t}")
                    if len(other_tables) > 10:
                        print(f"  ... 還有 {len(other_tables)-10} 個資料表")
            
            # 2. 檢查關鍵產品資料表的資料
            print("\n產品相關資料表的資料統計:")
            product_stats = []
            
            for table_name in ['product_categories', 'products', 'product_skus', 'supplier_product_skus']:
                if table_name in tables:
                    count_result = await conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                    count = count_result.scalar()
                    product_stats.append([table_name, '✅ 存在', count])
                else:
                    product_stats.append([table_name, '❌ 不存在', 0])
            
            print(tabulate(product_stats, headers=['資料表', '狀態', '資料筆數'], tablefmt='grid'))
            
            # 3. 檢查 Alembic 版本
            if 'alembic_version' in tables:
                result = await conn.execute(text("""
                    SELECT version_num 
                    FROM alembic_version 
                    ORDER BY version_num DESC 
                    LIMIT 1
                """))
                version = result.scalar()
                print(f"\nAlembic 版本: {version if version else '無'}")
            else:
                print("\n❌ 沒有 alembic_version 資料表")
            
            # 4. 如果有 product_categories，顯示前幾筆資料
            if 'product_categories' in tables:
                result = await conn.execute(text("""
                    SELECT id, code, name, level 
                    FROM product_categories 
                    ORDER BY level, code 
                    LIMIT 5
                """))
                categories = result.fetchall()
                if categories:
                    print("\n產品類別範例資料 (前5筆):")
                    cat_data = [[str(c[0])[:8]+'...', c[1], c[2], c[3]] for c in categories]
                    print(tabulate(cat_data, headers=['ID', 'Code', 'Name', 'Level'], tablefmt='grid'))
        
        await engine.dispose()
        return True
        
    except Exception as e:
        print(f"❌ 連線錯誤: {str(e)}")
        return False

async def main():
    """主函數"""
    print("開始檢查資料庫...")
    
    # 本地資料庫
    local_db = "postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly"
    
    # Staging 資料庫 (透過 Cloud SQL Proxy)
    # 需要先執行: ./cloud-sql-proxy --port=5433 orderly-472413:asia-east1:orderly-db-v2
    staging_db = "postgresql+asyncpg://orderly:orderly_secure_password_2024@localhost:5433/orderly"
    
    # 檢查本地資料庫
    local_ok = await check_database("本地 (localhost:5432)", local_db)
    
    # 檢查 staging 資料庫
    print("\n" + "="*60)
    print("注意：Staging 資料庫需要 Cloud SQL Proxy 在 5433 端口運行")
    print("如果連線失敗，請執行：")
    print("./cloud-sql-proxy --port=5433 orderly-472413:asia-east1:orderly-db-v2")
    print("="*60)
    
    staging_ok = await check_database("Staging (orderly-db-v2)", staging_db)
    
    # 總結
    print("\n" + "="*60)
    print("檢查結果總結")
    print("="*60)
    print(f"本地資料庫: {'✅ 正常' if local_ok else '❌ 無法連線'}")
    print(f"Staging 資料庫: {'✅ 正常' if staging_ok else '❌ 無法連線'}")
    
    if local_ok and staging_ok:
        print("\n💡 建議：如果 staging 缺少資料表，可執行以下命令同步：")
        print("1. 執行 Alembic 遷移：")
        print("   cd backend/product-service-fastapi")
        print("   DATABASE_URL=postgresql://orderly:orderly_secure_password_2024@localhost:5433/orderly alembic upgrade head")
        print("\n2. 匯入測試資料：")
        print("   python scripts/database/seed_from_real_data.py --target staging")

if __name__ == "__main__":
    asyncio.run(main())