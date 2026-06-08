-- Cross-module FK orphan audit for the monolith migration.
-- Each check returns one row `check_name | orphan_count`; the CD preflight gate
-- sums orphan_count across all checks and FAILS the deploy if the sum > 0
-- (those orphans would otherwise abort the 0002/0003 cross-module FK migration).
--
-- DEFENSIVE / FIRST-RUN SAFE (BLOCKER #3 fix):
-- The monolith tables (orders, order_items, products, supplier_skus,
-- acceptances, organizations, product_skus) are CREATED by the `migrate` job,
-- which runs AFTER this preflight gate. On a first-run target (e.g. orderly-db-v2
-- before the monolith migration), those tables do NOT exist yet. A plain
-- `FROM orders ...` would raise `relation "orders" does not exist`, and under
-- `psql -v ON_ERROR_STOP=1` that aborts preflight BEFORE migrate can ever run
-- (chicken-and-egg deadlock). To avoid that, every check is evaluated through a
-- helper that only counts orphans when BOTH the child and parent tables exist
-- (checked via to_regclass); when either is absent it returns 0 — which is the
-- correct answer, since a table that does not exist cannot hold orphan rows.
-- This is purely an ABSENCE guard: when the tables DO exist (re-deploy, or after
-- migrate on the same DB), the real orphan count is computed and enforced.

CREATE OR REPLACE FUNCTION pg_temp.monolith_orphan_count(
    child       text,
    child_col   text,
    parent      text,
    parent_col  text,
    child_nullable boolean
) RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE
    n bigint;
    null_guard text := '';
BEGIN
    -- Absence guard: if either relation is missing, there can be no orphans yet.
    IF to_regclass('public.' || child) IS NULL
       OR to_regclass('public.' || parent) IS NULL THEN
        RETURN 0;
    END IF;

    IF child_nullable THEN
        null_guard := format('AND c.%I IS NOT NULL', child_col);
    END IF;

    EXECUTE format(
        'SELECT count(*) FROM %I c LEFT JOIN %I p ON c.%I = p.%I WHERE p.%I IS NULL %s',
        child, parent, child_col, parent_col, parent_col, null_guard
    ) INTO n;

    RETURN n;
END;
$$;

SELECT 'orders.restaurant_id -> organizations.id' AS check_name,
       pg_temp.monolith_orphan_count('orders', 'restaurant_id', 'organizations', 'id', false) AS orphan_count;

SELECT 'orders.supplier_id -> organizations.id' AS check_name,
       pg_temp.monolith_orphan_count('orders', 'supplier_id', 'organizations', 'id', false) AS orphan_count;

SELECT 'order_items.product_id -> products.id' AS check_name,
       pg_temp.monolith_orphan_count('order_items', 'product_id', 'products', 'id', false) AS orphan_count;

SELECT 'order_items.sku_id -> product_skus.id' AS check_name,
       pg_temp.monolith_orphan_count('order_items', 'sku_id', 'product_skus', 'id', true) AS orphan_count;

SELECT 'products.supplierId -> organizations.id' AS check_name,
       pg_temp.monolith_orphan_count('products', 'supplierId', 'organizations', 'id', true) AS orphan_count;

SELECT 'supplier_skus.supplier_id -> organizations.id' AS check_name,
       pg_temp.monolith_orphan_count('supplier_skus', 'supplier_id', 'organizations', 'id', false) AS orphan_count;

SELECT 'acceptances.orderId -> orders.id' AS check_name,
       pg_temp.monolith_orphan_count('acceptances', 'orderId', 'orders', 'id', false) AS orphan_count;
