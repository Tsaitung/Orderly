-- Check if tables exist in the database
SELECT 
    schemaname,
    tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check specific tables
SELECT to_regclass('public.products') as products_table;
SELECT to_regclass('public.product_categories') as categories_table;
SELECT to_regclass('public.product_skus') as skus_table;
SELECT to_regclass('public.supplier_product_skus') as supplier_skus_table;

-- Count records in key tables
SELECT 'product_categories' as table_name, COUNT(*) as row_count FROM product_categories
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'product_skus', COUNT(*) FROM product_skus;