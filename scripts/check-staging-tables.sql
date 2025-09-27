-- Check all tables in staging database
\echo '=== All tables in staging database ==='
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

\echo ''
\echo '=== Check product-related tables existence and row counts ==='
SELECT 
  'product_categories' as table_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_categories') as exists,
  (SELECT COUNT(*) FROM product_categories WHERE EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='product_categories')) as row_count;

SELECT 
  'products' as table_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') as exists,
  (SELECT COUNT(*) FROM products WHERE EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='products')) as row_count;

SELECT 
  'product_skus' as table_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_skus') as exists,
  (SELECT COUNT(*) FROM product_skus WHERE EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='product_skus')) as row_count;

SELECT 
  'supplier_product_skus' as table_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='supplier_product_skus') as exists,
  (SELECT COUNT(*) FROM supplier_product_skus WHERE EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='supplier_product_skus')) as row_count;

\echo ''
\echo '=== Alembic version history ==='
SELECT version_num, TO_CHAR(executed_at, 'YYYY-MM-DD HH24:MI:SS') as executed_at 
FROM alembic_version 
ORDER BY executed_at DESC 
LIMIT 10;