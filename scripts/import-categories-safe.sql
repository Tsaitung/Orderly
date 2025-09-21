-- 安全的品類資料匯入腳本
-- 基於 docs/product_categories_final.md
-- 注意：此腳本會保留現有品類引用，並新增缺失的品類

BEGIN;

-- 首先檢查現有的品類使用情況
-- SELECT c.id, c.code, c.name, COUNT(p.id) as product_count 
-- FROM product_categories c 
-- LEFT JOIN products p ON c.id = p."categoryId" 
-- GROUP BY c.id, c.code, c.name;

-- 保留現有的品類ID，但需要更新為符合新結構的資料

-- 首先，新增缺失的一級品類（不與現有衝突）
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") 
VALUES
-- 牛肉
('cat_beef_001', 'BEEF', '牛肉', 'Beef', NULL, 1, 300, '牛肉類', '{}', true, NOW(), NOW()),
-- 豬肉
('cat_pork_001', 'PORK', '豬肉', 'Pork', NULL, 1, 400, '豬肉類', '{}', true, NOW(), NOW()),
-- 雞肉
('cat_chkn_001', 'CHKN', '雞肉', 'Chicken', NULL, 1, 500, '雞肉類', '{}', true, NOW(), NOW()),
-- 其他肉品
('cat_otme_001', 'OTME', '其他肉品', 'Other Meats', NULL, 1, 600, '其他肉類', '{}', true, NOW(), NOW()),
-- 水產
('cat_seaf_001', 'SEAF', '水產', 'Seafood', NULL, 1, 700, '水產類', '{}', true, NOW(), NOW()),
-- 奶蛋豆製品
('cat_detf_001', 'DETF', '奶蛋豆製品', 'Dairy·Eggs·Tofu', NULL, 1, 800, '奶蛋豆製品類', '{}', true, NOW(), NOW())
-- 排除已存在的：蔬菜(VEGG), 水果(FRUT), 雜貨類別等
ON CONFLICT (code) DO NOTHING;

-- 新增蔬菜類的二級品類（以現有蔬菜類別為父類）
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") 
SELECT 
    'cat_vegg_' || lpad((row_number() over (order by vals.code))::text, 3, '0'),
    vals.code,
    vals.name,
    vals.nameEn,
    (SELECT id FROM product_categories WHERE code = 'VEGG' LIMIT 1), -- 使用現有的蔬菜類別作為父類
    2,
    100 + row_number() over (order by vals.code),
    vals.description,
    '{}',
    true,
    NOW(),
    NOW()
FROM (
    VALUES
    ('LETC', '生菜', 'Lettuce & Salad Greens', '羅曼、生菜沙拉'),
    ('ROOT', '根莖類', 'Root & Tuber', '白蘿蔔、馬鈴薯'),
    ('GOUR', '瓜果類', 'Gourd & Fruiting Veg.', '南瓜、番茄、青椒'),
    ('FLFV', '花果菜', 'Flowering Vegetables', '青花椰、花椰菜'),
    ('BEAN', '豆莢類', 'Legume Vegetables', '四季豆、毛豆'),
    ('MUSH', '菇蕈類', 'Mushrooms', '香菇、金針菇'),
    ('ARSS', '蔥薑蒜／辛香料', 'Allium-Root Spices', '青蔥、蒜頭、老薑、辣椒'),
    ('HERB', '香菜香料', 'Herbs & Aromatics', '香菜、九層塔、羅勒'),
    ('STEM', '莖菜類', 'Stem Vegetables', '蘆筍、芹菜'),
    ('HVGV', '大宗蔬菜', 'High-Volume Veg.', '高麗菜、大白菜'),
    ('SPRO', '苗芽蔬菜', 'Sprouts', '豆芽、苜蓿芽'),
    ('SEAW', '海菜類', 'Sea Vegetables', '海帶芽、石花菜'),
    ('CUTV', '截切蔬菜', 'Cut Vegetables', '切段芹菜、切片紅蘿蔔'),
    ('PRVG', '加工蔬菜', 'Processed Vegetables', '冷凍蔬菜、醃漬菜'),
    ('VMSC', '其他蔬菜', 'Vegetable Misc.', '')
) AS vals(code, name, nameEn, description)
WHERE NOT EXISTS (
    SELECT 1 FROM product_categories WHERE code = vals.code
);

-- 新增水果類的二級品類（以現有水果類別為父類）
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") 
SELECT 
    'cat_frut_' || lpad((200 + row_number() over (order by vals.code))::text, 3, '0'),
    vals.code,
    vals.name,
    vals.nameEn,
    (SELECT id FROM product_categories WHERE code = 'FRUT' LIMIT 1), -- 使用現有的水果類別作為父類
    2,
    200 + row_number() over (order by vals.code),
    vals.description,
    '{}',
    true,
    NOW(),
    NOW()
FROM (
    VALUES
    ('BERR', '漿果類', 'Berries', '草莓、藍莓'),
    ('PSTF', '核仁果類', 'Pome & Stone Fruits', '蘋果、水蜜桃'),
    ('TROP', '熱帶水果', 'Tropical Fruits', '芒果、香蕉'),
    ('MELN', '瓜果類', 'Melons', '西瓜、哈密瓜'),
    ('FRFR', '冷凍水果', 'Frozen Fruits', '冷凍莓果'),
    ('PRFR', '加工水果', 'Processed Fruits', '果汁'),
    ('FRMS', '其他水果', 'Fruit Misc.', '')
) AS vals(code, name, nameEn, description)
WHERE NOT EXISTS (
    SELECT 1 FROM product_categories WHERE code = vals.code
);

-- 新增牛肉類的二級品類
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") 
SELECT 
    'cat_beef_' || lpad((300 + row_number() over (order by vals.code))::text, 3, '0'),
    vals.code,
    vals.name,
    vals.nameEn,
    'cat_beef_001',
    2,
    300 + row_number() over (order by vals.code),
    vals.description,
    '{}',
    true,
    NOW(),
    NOW()
FROM (
    VALUES
    ('CHUC', '肩胛部', 'Chuck', '板腱、肩胛心'),
    ('RIBE', '肋眼／背脊', 'Rib & Prime', '肋眼、牛小排'),
    ('BLON', '腰脊部', 'Beef Loin', '紐約客、西冷'),
    ('BRIS', '前胸部', 'Brisket', '牛腩、胸肉'),
    ('FLNK', '腹脇部', 'Flank', '側腹肉'),
    ('ROUN', '後腿／腿腱', 'Round & Shank', '牛腱、臀肉'),
    ('BGRD', '牛絞肉', 'Ground Beef', '牛絞肉'),
    ('BOFF', '牛雜類', 'Beef Offal', '牛肚、牛肝'),
    ('PRBF', '加工牛肉', 'Processed Beef', '滷牛腱、牛肉乾'),
    ('BFMS', '其他牛肉', 'Beef Misc.', '')
) AS vals(code, name, nameEn, description)
WHERE NOT EXISTS (
    SELECT 1 FROM product_categories WHERE code = vals.code
);

-- 新增豬肉類的二級品類
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") 
SELECT 
    'cat_pork_' || lpad((400 + row_number() over (order by vals.code))::text, 3, '0'),
    vals.code,
    vals.name,
    vals.nameEn,
    'cat_pork_001',
    2,
    400 + row_number() over (order by vals.code),
    vals.description,
    '{}',
    true,
    NOW(),
    NOW()
FROM (
    VALUES
    ('PHED', '頭部肉', 'Head Cuts', '豬頰、豬耳'),
    ('BUTT', '肩胛梅花', 'Shoulder', '梅花肉、松阪肉'),
    ('PLON', '背脊部', 'Pork Loin', '里肌、腰內'),
    ('BELI', '五花／肋排', 'Belly & Rib', '五花肉、肋排'),
    ('FRNT', '前腿部', 'Front Leg', '前腿肉'),
    ('HLEG', '後腿部', 'Hind Leg', '後腿肉'),
    ('TROT', '蹄膀／豬腳', 'Trotters', '蹄膀、豬腳'),
    ('PGRD', '豬絞肉', 'Ground Pork', '豬絞肉'),
    ('POFF', '豬雜類', 'Pork Offal', '豬肝、豬大腸'),
    ('PRPK', '加工豬肉', 'Processed Pork', '培根、火腿'),
    ('PKMS', '其他豬肉', 'Pork Misc.', '')
) AS vals(code, name, nameEn, description)
WHERE NOT EXISTS (
    SELECT 1 FROM product_categories WHERE code = vals.code
);

-- 新增雞肉類的二級品類
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") 
SELECT 
    'cat_chkn_' || lpad((500 + row_number() over (order by vals.code))::text, 3, '0'),
    vals.code,
    vals.name,
    vals.nameEn,
    'cat_chkn_001',
    2,
    500 + row_number() over (order by vals.code),
    vals.description,
    '{}',
    true,
    NOW(),
    NOW()
FROM (
    VALUES
    ('WHOL', '全雞', 'Whole Chicken', '全雞'),
    ('BRST', '雞胸', 'Breast', '去骨雞胸'),
    ('THGH', '雞腿／腿排', 'Thigh & Drumstick', '雞腿排'),
    ('WING', '雞翅', 'Wing', '全翅、翅中'),
    ('FEET', '雞腳', 'Chicken Feet', '鳳爪'),
    ('COFF', '雞雜類', 'Chicken Offal', '雞肝、雞胗'),
    ('CGRD', '雞絞肉', 'Ground Chicken', '雞絞肉'),
    ('PRCK', '加工雞肉', 'Processed Chicken', '煙燻雞腿'),
    ('CKMS', '其他雞肉', 'Chicken Misc.', '')
) AS vals(code, name, nameEn, description)
WHERE NOT EXISTS (
    SELECT 1 FROM product_categories WHERE code = vals.code
);

-- 新增其他肉品類的二級品類
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") 
SELECT 
    'cat_otme_' || lpad((600 + row_number() over (order by vals.code))::text, 3, '0'),
    vals.code,
    vals.name,
    vals.nameEn,
    'cat_otme_001',
    2,
    600 + row_number() over (order by vals.code),
    vals.description,
    '{}',
    true,
    NOW(),
    NOW()
FROM (
    VALUES
    ('LAMB', '羊肉', 'Lamb/Mutton', '羊小排'),
    ('DUCK', '鴨肉', 'Duck', '鴨胸'),
    ('GOOS', '鵝肉', 'Goose', '鵝腿'),
    ('PROT', '加工其他肉品', 'Processed OT Meat', '鴨賞、羊肉乾'),
    ('OTMS', '其他', 'OT Meat Misc.', '')
) AS vals(code, name, nameEn, description)
WHERE NOT EXISTS (
    SELECT 1 FROM product_categories WHERE code = vals.code
);

-- 新增水產類的二級品類
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") 
SELECT 
    'cat_seaf_' || lpad((700 + row_number() over (order by vals.code))::text, 3, '0'),
    vals.code,
    vals.name,
    vals.nameEn,
    'cat_seaf_001',
    2,
    700 + row_number() over (order by vals.code),
    vals.description,
    '{}',
    true,
    NOW(),
    NOW()
FROM (
    VALUES
    ('FISH', '魚類', 'Fish', '鮭魚、鯛魚'),
    ('CRUS', '甲殼類', 'Crustaceans', '蝦、螃蟹'),
    ('SHEL', '貝類', 'Shellfish', '蛤蜊、生蠔'),
    ('CEPH', '頭足類', 'Cephalopods', '章魚、魷魚'),
    ('PRSF', '加工水產', 'Processed Seafood', '魚丸、蝦餃'),
    ('DRSF', '乾貨', 'Dried Seafoods', '魚乾、海苔乾'),
    ('SFMS', '其他水產', 'Seafood Misc.', '')
) AS vals(code, name, nameEn, description)
WHERE NOT EXISTS (
    SELECT 1 FROM product_categories WHERE code = vals.code
);

-- 新增奶蛋豆製品類的二級品類
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") 
SELECT 
    'cat_detf_' || lpad((800 + row_number() over (order by vals.code))::text, 3, '0'),
    vals.code,
    vals.name,
    vals.nameEn,
    'cat_detf_001',
    2,
    800 + row_number() over (order by vals.code),
    vals.description,
    '{}',
    true,
    NOW(),
    NOW()
FROM (
    VALUES
    ('EGGS', '蛋類', 'Eggs', '雞蛋、鴨蛋'),
    ('MILK', '奶類', 'Milk', '鮮奶'),
    ('DAIR', '乳製品', 'Dairy Products', '起司、優格'),
    ('SOYP', '豆製品', 'Soy Products', '豆腐、百頁豆腐'),
    ('PRDT', '加工奶蛋豆', 'Processed DETF', '調味乳、豆漿布丁'),
    ('DTMS', '其他奶蛋豆製品', 'DETF Misc.', '')
) AS vals(code, name, nameEn, description)
WHERE NOT EXISTS (
    SELECT 1 FROM product_categories WHERE code = vals.code
);

-- 新增雜貨類的更多二級品類（以現有雜貨相關類別為父類）
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") 
SELECT 
    'cat_groc_' || lpad((900 + row_number() over (order by vals.code))::text, 3, '0'),
    vals.code,
    vals.name,
    vals.nameEn,
    COALESCE(
        (SELECT id FROM product_categories WHERE code = 'GROC' LIMIT 1),
        (SELECT id FROM product_categories WHERE name LIKE '%雜貨%' OR name LIKE '%食品%' OR code IN ('SUPP', 'EQUP', 'CLEN') LIMIT 1)
    ),
    2,
    900 + row_number() over (order by vals.code),
    vals.description,
    '{}',
    true,
    NOW(),
    NOW()
FROM (
    VALUES
    ('SAUC', '醬料', 'Sauces', '醬油、蠔油'),
    ('OILS', '油脂', 'Cooking Oils', '橄欖油、沙拉油'),
    ('DRYD', '乾貨', 'Dried Goods', '紫菜、木耳'),
    ('GRAI', '穀物豆類', 'Grains & Legumes', '白米、紅豆'),
    ('CANN', '罐頭', 'Canned Goods', '鮪魚罐頭'),
    ('PRGC', '加工雜貨', 'Processed Grocery', '速食麵、即食湯包'),
    ('RTEF', '即食食品', 'Ready-to-Eat Foods', '便當、即食沙拉'),
    ('JAMS', '果醬', 'Jams & Spreads', '草莓果醬、柚子醬'),
    ('NFSC', '非食品耗材', 'NonFood Supplies', '包材、清潔劑'),
    ('POWD', '粉類原料', 'Powdered Ingredients', '中筋麵粉、玉米粉'),
    ('VGTN', '素食', 'Vegetarian (Plant Foods)', '素肉、素料包'),
    ('ALCO', '酒精飲料', 'Alcoholic Beverages', '啤酒、紅酒'),
    ('NUTS', '堅果', 'Nuts & Seeds', '杏仁、核桃、南瓜子'),
    ('NOOD', '麵類', 'Noodles & Pasta', '烏龍麵、義大利麵'),
    ('GCMS', '其他雜貨', 'Grocery Misc.', '')
) AS vals(code, name, nameEn, description)
WHERE NOT EXISTS (
    SELECT 1 FROM product_categories WHERE code = vals.code
);

-- 驗證結果
SELECT 
    level,
    COUNT(*) as count,
    STRING_AGG(DISTINCT name, ', ') as categories
FROM product_categories 
GROUP BY level 
ORDER BY level;

SELECT 
    c1.name as "一級類別",
    c1.code as "代碼",
    COUNT(c2.id) as "子類別數量"
FROM product_categories c1
LEFT JOIN product_categories c2 ON c1.id = c2."parentId"
WHERE c1.level = 1
GROUP BY c1.id, c1.name, c1.code
ORDER BY c1."sortOrder";

COMMIT;