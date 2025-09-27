-- 轉換並插入產品資料
-- 從本地 products 表結構映射到 staging 的結構

-- 暫存插入語句
WITH local_products AS (
  -- 這裡包含從本地資料庫匯出的資料
  SELECT * FROM (VALUES
    ('cmfqla447000sakg7nt7lai02', 'cmfql974d000l14cjyxqa0vru', 'cmfqla3rg0006akg7uub0skf0', 'SEA-001', '海鮮拼盤', NULL, NULL, '台灣', true, 'raw', 'taxable'),
    ('cmfqla44d000uakg7rcdsehkx', 'cmfql974d000l14cjyxqa0vru', 'cmfqla3rg0006akg7uub0skf0', 'BEEF-001', '新鮮牛肉片 500g', NULL, NULL, '台灣', true, 'raw', 'taxable'),
    ('cmfqla43q000qakg7pvmrdrfl', 'cmfql974d000l14cjyxqa0vru', 'cmfqla3rc0001akg7k1b5nibu', 'VEG-001', '有機蔬菜包', NULL, NULL, '台灣', true, 'raw', 'taxable'),
    ('742c75cb-c73a-4e33-8964-9d340f09518b', NULL, 'cmfqla3rh0008akg794q79afa', 'PRD-LEAF-001', '有機菠菜', NULL, NULL, '台灣', true, 'raw', 'taxable'),
    ('fb39bf74-671a-44d6-88e6-e4750a1aceeb', NULL, 'cmfqla3rh0008akg794q79afa', 'PRD-LEAF-002', 'A菜', NULL, NULL, '台灣', true, 'raw', 'taxable'),
    ('74538b0b-0b9d-45b3-8a37-ff0150a0ad81', NULL, 'cmfqla3rh0008akg794q79afa', 'PRD-LEAF-003', '青江菜', NULL, NULL, '台灣', true, 'raw', 'taxable'),
    ('25527ab6-ade0-46d4-b7cd-4916c0399bba', NULL, 'cmfqla3rl000kakg70vv8d0nf', 'PRD-SEAS-001', '統一醬油膏', NULL, NULL, '台灣', true, 'raw', 'taxable'),
    ('9d476e80-abd2-4221-ac1d-a31203fda190', NULL, 'cmfqla3rl000kakg70vv8d0nf', 'PRD-SEAS-002', '金蘭醬油', NULL, NULL, '台灣', true, 'raw', 'taxable'),
    ('df454d6e-4825-4414-8f2f-0d36f258e74b', NULL, 'cmfqla3rl000kakg70vv8d0nf', 'PRD-SEAS-003', '味精', NULL, NULL, '台灣', true, 'raw', 'taxable')
  ) AS t(id, supplier_id, category_id, code, name, name_en, description, origin_country, is_active, product_state, tax_status)
)
INSERT INTO products (
  id, "categoryId", code, name, "nameEn", description, 
  "unitOfMeasure", "isActive", "supplierId", "originCountry",
  "createdAt", "updatedAt", status
)
SELECT 
  id, category_id, code, name, name_en, description,
  'unit', is_active, supplier_id, origin_country,
  NOW(), NOW(), 'active'
FROM local_products
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  "updatedAt" = NOW();