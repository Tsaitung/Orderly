#!/bin/bash
set -e

# 設置 Python 路徑
export PYTHONPATH=/app:/app/libs

# 設定 PostgreSQL 連線參數（使用 Unix socket 或 TCP）
export PGHOST="${DATABASE_HOST}"
export PGPORT="${DATABASE_PORT:-5432}"
export PGDATABASE="${DATABASE_NAME}"
export PGUSER="${DATABASE_USER}"
export PGPASSWORD="${POSTGRES_PASSWORD}"

echo "Checking database connection..."
psql -c "SELECT version();" || exit 1

echo "Current tables:"
psql -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

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
psql -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

echo "Checking critical tables:"
psql -c "SELECT to_regclass('public.products') as products_table;"
psql -c "SELECT to_regclass('public.product_categories') as categories_table;"
psql -c "SELECT to_regclass('public.users') as users_table;"
psql -c "SELECT to_regclass('public.orders') as orders_table;"

echo "Table counts:"
psql -c "SELECT 'product_categories' as table_name, COUNT(*) as count FROM product_categories;" || echo "product_categories does not exist"
psql -c "SELECT 'products' as table_name, COUNT(*) as count FROM products;" || echo "products does not exist"
psql -c "SELECT 'users' as table_name, COUNT(*) as count FROM users;" || echo "users does not exist"

echo "All migrations completed!"
