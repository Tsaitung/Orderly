#!/bin/bash
set -e

# 設置 Python 路徑
export PYTHONPATH=/app:/app/libs

# 構建資料庫 URL
export DATABASE_URL="postgresql://${DATABASE_USER}:${POSTGRES_PASSWORD}@/${DATABASE_NAME}?host=${DATABASE_HOST}"

echo "Checking database connection..."
psql "$DATABASE_URL" -c "SELECT version();" || exit 1

echo "Current tables:"
psql "$DATABASE_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

# 執行各服務的遷移
echo "Running User Service migrations..."
cd /app/user-service
alembic upgrade head || echo "User service migration completed or no changes needed"

echo "Running Product Service migrations..."
cd /app/product-service
alembic upgrade head || echo "Product service migration completed or no changes needed"

echo "Running Order Service migrations..."
cd /app/order-service
alembic upgrade head || echo "Order service migration completed or no changes needed"

echo "Final table list:"
psql "$DATABASE_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

echo "Checking critical tables:"
psql "$DATABASE_URL" -c "SELECT to_regclass('public.products') as products_table;"
psql "$DATABASE_URL" -c "SELECT to_regclass('public.product_categories') as categories_table;"
psql "$DATABASE_URL" -c "SELECT to_regclass('public.users') as users_table;"
psql "$DATABASE_URL" -c "SELECT to_regclass('public.orders') as orders_table;"

echo "Table counts:"
psql "$DATABASE_URL" -c "SELECT 'product_categories' as table_name, COUNT(*) as count FROM product_categories;" || echo "product_categories does not exist"
psql "$DATABASE_URL" -c "SELECT 'products' as table_name, COUNT(*) as count FROM products;" || echo "products does not exist"
psql "$DATABASE_URL" -c "SELECT 'users' as table_name, COUNT(*) as count FROM users;" || echo "users does not exist"

echo "All migrations completed!"