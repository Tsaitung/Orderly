-- Cross-module FK orphan audit for the monolith migration.
-- Each query must return zero rows before enforcing the matching constraint.

SELECT 'orders.restaurant_id -> organizations.id' AS check_name, count(*) AS orphan_count
FROM orders c
LEFT JOIN organizations p ON c.restaurant_id = p.id
WHERE p.id IS NULL;

SELECT 'orders.supplier_id -> organizations.id' AS check_name, count(*) AS orphan_count
FROM orders c
LEFT JOIN organizations p ON c.supplier_id = p.id
WHERE p.id IS NULL;

SELECT 'order_items.product_id -> products.id' AS check_name, count(*) AS orphan_count
FROM order_items c
LEFT JOIN products p ON c.product_id = p.id
WHERE p.id IS NULL;

SELECT 'order_items.sku_id -> product_skus.id' AS check_name, count(*) AS orphan_count
FROM order_items c
LEFT JOIN product_skus p ON c.sku_id = p.id
WHERE c.sku_id IS NOT NULL AND p.id IS NULL;

SELECT 'products.supplierId -> organizations.id' AS check_name, count(*) AS orphan_count
FROM products c
LEFT JOIN organizations p ON c."supplierId" = p.id
WHERE c."supplierId" IS NOT NULL AND p.id IS NULL;

SELECT 'supplier_skus.supplier_id -> organizations.id' AS check_name, count(*) AS orphan_count
FROM supplier_skus c
LEFT JOIN organizations p ON c.supplier_id = p.id
WHERE p.id IS NULL;
