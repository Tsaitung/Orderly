-- 從本地複製 products 資料到 staging
-- 執行前需要先將本地資料匯出

-- 先清空 staging 的 products 和 product_skus（如果有的話）
TRUNCATE TABLE product_skus CASCADE;
TRUNCATE TABLE products CASCADE;

-- 插入 products 資料（從本地匯出的資料）
INSERT INTO products (id, categoryId, code, name, nameEn, description, descriptionEn, images, tags, unitOfMeasure, isActive, createdAt, updatedAt, supplierId, supplierProductId, originCountry, originRegion, minStock, maxStock, leadTimeDays, status, allergens, nutritionalInfo, certifications, metadata)
SELECT id, categoryId, code, name, nameEn, description, descriptionEn, images, tags, unitOfMeasure, isActive, createdAt, updatedAt, supplierId, supplierProductId, originCountry, originRegion, minStock, maxStock, leadTimeDays, status, allergens, nutritionalInfo, certifications, metadata
FROM (VALUES
  -- 這裡會插入從本地資料庫導出的資料
  ('prod1', 'cmfqla3r60000akg7tpm9o6h6', 'PROD001', '測試產品1', 'Test Product 1', '測試描述', 'Test Description', '[]'::json, '[]'::json, 'kg', true, NOW(), NOW(), NULL, NULL, 'TW', '台灣', 10, 100, 3, 'active', '[]'::json, '{}'::json, '[]'::json, '{}'::json)
) AS data(id, categoryId, code, name, nameEn, description, descriptionEn, images, tags, unitOfMeasure, isActive, createdAt, updatedAt, supplierId, supplierProductId, originCountry, originRegion, minStock, maxStock, leadTimeDays, status, allergens, nutritionalInfo, certifications, metadata)
ON CONFLICT (id) DO NOTHING;