-- SKU Database Performance Optimizations
-- Add missing indexes for frequently queried columns

-- Index for SKU code lookups (unique constraint already provides index)
CREATE INDEX IF NOT EXISTS idx_product_skus_sku_code_active 
ON product_skus(sku_code, is_active) 
WHERE is_active = true;

-- Index for product-based queries  
CREATE INDEX IF NOT EXISTS idx_product_skus_product_id_active
ON product_skus(product_id) 
WHERE is_active = true;

-- Index for packaging type searches
CREATE INDEX IF NOT EXISTS idx_product_skus_packaging_type 
ON product_skus(packaging_type) 
WHERE is_active = true;

-- Index for quality grade searches
CREATE INDEX IF NOT EXISTS idx_product_skus_quality_grade 
ON product_skus(quality_grade) 
WHERE is_active = true;

-- Index for price range queries
CREATE INDEX IF NOT EXISTS idx_product_skus_price_range 
ON product_skus(base_price) 
WHERE is_active = true;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_product_skus_composite_filters 
ON product_skus(is_active, packaging_type, quality_grade, base_price) 
WHERE is_active = true;

-- Index for origin country searches
CREATE INDEX IF NOT EXISTS idx_product_skus_origin_country 
ON product_skus(origin_country) 
WHERE origin_country IS NOT NULL AND is_active = true;

-- Index for expiry date tracking
CREATE INDEX IF NOT EXISTS idx_product_skus_expiry_date 
ON product_skus(expiry_date) 
WHERE expiry_date IS NOT NULL;

-- Partial index for expiring items (next 30 days)
CREATE INDEX IF NOT EXISTS idx_product_skus_expiring_soon 
ON product_skus(expiry_date) 
WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days';

-- Index for supplier SKU relationships
CREATE INDEX IF NOT EXISTS idx_supplier_skus_supplier_id_active 
ON supplier_skus(supplier_id, sku_id) 
WHERE is_active = true;

-- Index for supplier price comparisons
CREATE INDEX IF NOT EXISTS idx_supplier_skus_price_comparison 
ON supplier_skus(sku_id, supplier_price, is_active) 
WHERE is_active = true;

-- Index for preferred suppliers
CREATE INDEX IF NOT EXISTS idx_supplier_skus_preferred 
ON supplier_skus(sku_id, is_preferred) 
WHERE is_preferred = true AND is_active = true;

-- Index for supplier performance metrics
CREATE INDEX IF NOT EXISTS idx_supplier_skus_quality_score 
ON supplier_skus(quality_score DESC) 
WHERE quality_score IS NOT NULL AND is_active = true;

-- Index for lead time queries
CREATE INDEX IF NOT EXISTS idx_supplier_skus_lead_time 
ON supplier_skus(lead_time_days) 
WHERE is_active = true;

-- Index for allergen queries
CREATE INDEX IF NOT EXISTS idx_product_allergens_sku_type 
ON product_allergens(sku_id, allergen_type) 
WHERE is_active = true;

-- Index for allergen risk level
CREATE INDEX IF NOT EXISTS idx_product_allergens_risk_level 
ON product_allergens(risk_level, allergen_type) 
WHERE is_active = true;

-- Index for cross-contamination risk
CREATE INDEX IF NOT EXISTS idx_product_allergens_cross_contamination 
ON product_allergens(cross_contamination_risk) 
WHERE cross_contamination_risk = true AND is_active = true;

-- Index for nutrition queries
CREATE INDEX IF NOT EXISTS idx_product_nutrition_product_verified 
ON product_nutrition(product_id, is_verified) 
WHERE is_verified = true;

-- Index for nutrition claims search
CREATE INDEX IF NOT EXISTS idx_product_nutrition_claims_gin 
ON product_nutrition USING gin(nutrition_claims);

-- Index for calorie range queries
CREATE INDEX IF NOT EXISTS idx_product_nutrition_calories 
ON product_nutrition(calories_per_100g) 
WHERE calories_per_100g IS NOT NULL;

-- Index for products
CREATE INDEX IF NOT EXISTS idx_products_category_active 
ON products(category_id, is_active) 
WHERE is_active = true;

-- Index for product search by brand
CREATE INDEX IF NOT EXISTS idx_products_brand_active 
ON products(brand) 
WHERE brand IS NOT NULL AND is_active = true;

-- Index for product origin
CREATE INDEX IF NOT EXISTS idx_products_origin_active 
ON products(origin) 
WHERE origin IS NOT NULL AND is_active = true;

-- Text search index for product names
CREATE INDEX IF NOT EXISTS idx_products_name_gin 
ON products USING gin(to_tsvector('english', name));

-- Text search index for product descriptions
CREATE INDEX IF NOT EXISTS idx_products_description_gin 
ON products USING gin(to_tsvector('english', description))
WHERE description IS NOT NULL;

-- Index for product categories
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_active 
ON product_categories(parent_id, is_active) 
WHERE is_active = true;

-- Index for category hierarchy level
CREATE INDEX IF NOT EXISTS idx_product_categories_level_sort 
ON product_categories(level, sort_order) 
WHERE is_active = true;

-- Analyze tables to update statistics
ANALYZE product_skus;
ANALYZE supplier_skus;
ANALYZE product_allergens;
ANALYZE product_nutrition;
ANALYZE products;
ANALYZE product_categories;

-- Create materialized view for SKU statistics
DROP MATERIALIZED VIEW IF EXISTS mv_sku_statistics;
CREATE MATERIALIZED VIEW mv_sku_statistics AS
SELECT 
    p.category_id,
    pc.name as category_name,
    COUNT(DISTINCT s.id) as total_skus,
    COUNT(DISTINCT CASE WHEN s.is_active = true THEN s.id END) as active_skus,
    ROUND(AVG(s.base_price), 2) as avg_price,
    ROUND(MIN(s.base_price), 2) as min_price,
    ROUND(MAX(s.base_price), 2) as max_price,
    COUNT(DISTINCT ss.supplier_id) as supplier_count,
    COUNT(DISTINCT CASE WHEN s.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN s.id END) as expiring_soon,
    COUNT(DISTINCT CASE WHEN s.expiry_date < CURRENT_DATE THEN s.id END) as expired
FROM product_skus s
LEFT JOIN products p ON s.product_id = p.id
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN supplier_skus ss ON s.id = ss.sku_id AND ss.is_active = true
GROUP BY p.category_id, pc.name;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_sku_statistics_category 
ON mv_sku_statistics(category_id);

-- Create materialized view for supplier performance
DROP MATERIALIZED VIEW IF EXISTS mv_supplier_performance;
CREATE MATERIALIZED VIEW mv_supplier_performance AS
SELECT 
    ss.supplier_id,
    COUNT(DISTINCT ss.sku_id) as total_skus,
    COUNT(DISTINCT CASE WHEN ss.is_active = true THEN ss.sku_id END) as active_skus,
    ROUND(AVG(ss.supplier_price), 2) as avg_price,
    ROUND(AVG(ss.quality_score), 2) as avg_quality_score,
    ROUND(AVG(ss.delivery_score), 2) as avg_delivery_score,
    ROUND(AVG(ss.service_score), 2) as avg_service_score,
    ROUND(AVG(ss.lead_time_days), 1) as avg_lead_time,
    COUNT(CASE WHEN ss.is_preferred = true THEN 1 END) as preferred_products
FROM supplier_skus ss
GROUP BY ss.supplier_id;

-- Create index on supplier performance view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_supplier_performance_supplier 
ON mv_supplier_performance(supplier_id);

-- Create materialized view for allergen summary
DROP MATERIALIZED VIEW IF EXISTS mv_allergen_summary;
CREATE MATERIALIZED VIEW mv_allergen_summary AS
SELECT 
    pa.allergen_type,
    COUNT(DISTINCT pa.sku_id) as affected_skus,
    COUNT(CASE WHEN pa.risk_level = 3 THEN 1 END) as high_risk_count,
    COUNT(CASE WHEN pa.risk_level = 2 THEN 1 END) as medium_risk_count,
    COUNT(CASE WHEN pa.risk_level = 1 THEN 1 END) as low_risk_count,
    COUNT(CASE WHEN pa.cross_contamination_risk = true THEN 1 END) as cross_contamination_count
FROM product_allergens pa
WHERE pa.is_active = true
GROUP BY pa.allergen_type;

-- Create index on allergen summary view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_allergen_summary_type 
ON mv_allergen_summary(allergen_type);

-- Create stored function for refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sku_statistics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_supplier_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_allergen_summary;
END;
$$ LANGUAGE plpgsql;

-- Create stored function for SKU search optimization
CREATE OR REPLACE FUNCTION search_skus_optimized(
    search_term text DEFAULT NULL,
    category_filter text DEFAULT NULL,
    packaging_filter text DEFAULT NULL,
    quality_filter text DEFAULT NULL,
    price_min numeric DEFAULT NULL,
    price_max numeric DEFAULT NULL,
    origin_filter text DEFAULT NULL,
    active_only boolean DEFAULT true,
    limit_count integer DEFAULT 50,
    offset_count integer DEFAULT 0
)
RETURNS TABLE (
    id text,
    sku_code text,
    product_id text,
    product_name text,
    packaging_type text,
    quality_grade text,
    base_price numeric,
    origin_country text,
    is_active boolean,
    supplier_count bigint,
    min_supplier_price numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.sku_code,
        s.product_id,
        p.name as product_name,
        s.packaging_type::text,
        s.quality_grade::text,
        s.base_price,
        s.origin_country,
        s.is_active,
        COUNT(DISTINCT ss.supplier_id) as supplier_count,
        MIN(ss.supplier_price) as min_supplier_price
    FROM product_skus s
    LEFT JOIN products p ON s.product_id = p.id
    LEFT JOIN supplier_skus ss ON s.id = ss.sku_id AND ss.is_active = true
    WHERE 
        (NOT active_only OR s.is_active = true)
        AND (search_term IS NULL OR 
             s.sku_code ILIKE '%' || search_term || '%' OR
             p.name ILIKE '%' || search_term || '%')
        AND (category_filter IS NULL OR p.category_id = category_filter)
        AND (packaging_filter IS NULL OR s.packaging_type::text = packaging_filter)
        AND (quality_filter IS NULL OR s.quality_grade::text = quality_filter)
        AND (price_min IS NULL OR s.base_price >= price_min)
        AND (price_max IS NULL OR s.base_price <= price_max)
        AND (origin_filter IS NULL OR s.origin_country = origin_filter)
    GROUP BY s.id, s.sku_code, s.product_id, p.name, s.packaging_type, 
             s.quality_grade, s.base_price, s.origin_country, s.is_active
    ORDER BY s.sku_code
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for supplier comparison
CREATE OR REPLACE FUNCTION compare_suppliers_for_sku(sku_id_param text)
RETURNS TABLE (
    supplier_id text,
    supplier_sku_code text,
    supplier_price numeric,
    quality_score numeric,
    delivery_score numeric,
    service_score numeric,
    overall_score numeric,
    lead_time_days integer,
    minimum_order_quantity integer,
    is_preferred boolean,
    bulk_discount_rate numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.supplier_id,
        ss.supplier_sku_code,
        ss.supplier_price,
        ss.quality_score,
        ss.delivery_score,
        ss.service_score,
        ROUND((COALESCE(ss.quality_score, 0) + COALESCE(ss.delivery_score, 0) + COALESCE(ss.service_score, 0)) / 3, 2) as overall_score,
        ss.lead_time_days,
        ss.minimum_order_quantity,
        ss.is_preferred,
        ss.bulk_discount_rate
    FROM supplier_skus ss
    WHERE ss.sku_id = sku_id_param 
      AND ss.is_active = true
    ORDER BY 
        ss.is_preferred DESC,
        overall_score DESC,
        ss.supplier_price ASC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON MATERIALIZED VIEW mv_sku_statistics IS 'SKU statistics by category, refreshed periodically';
COMMENT ON MATERIALIZED VIEW mv_supplier_performance IS 'Supplier performance metrics, refreshed periodically';
COMMENT ON MATERIALIZED VIEW mv_allergen_summary IS 'Allergen distribution summary, refreshed periodically';
COMMENT ON FUNCTION refresh_all_mv() IS 'Refresh all materialized views concurrently';
COMMENT ON FUNCTION search_skus_optimized IS 'Optimized SKU search with filters and pagination';
COMMENT ON FUNCTION compare_suppliers_for_sku IS 'Compare suppliers for a specific SKU with performance metrics';

-- Final analyze to update all statistics
ANALYZE;