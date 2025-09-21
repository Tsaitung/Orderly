-- 完整品類資料匯入腳本
-- 基於 docs/product_categories_final.md
-- 注意：此腳本會保留現有品類，並新增缺失的品類

BEGIN;

-- 首先檢查現有產品使用的品類ID
-- 需要保留並映射現有的品類ID：
-- cmfqla3r60000akg7tpm9o6h6 (蔬菜) -> 保留
-- cmfqla3rg0006akg7uub0skf0 (食品原料) -> 保留並分類到雜貨類

-- 備份現有品類（如果需要的話）
CREATE TEMP TABLE temp_existing_categories AS 
SELECT * FROM product_categories;

-- 一級品類 (Level 1)
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") VALUES
-- 蔬菜
('cat_vegg_001', 'VEGG', '蔬菜', 'Vegetables', NULL, 1, 100, '新鮮蔬菜類', '{}', true, NOW(), NOW()),
-- 水果
('cat_frut_001', 'FRUT', '水果', 'Fruits', NULL, 1, 200, '新鮮水果類', '{}', true, NOW(), NOW()),
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
('cat_detf_001', 'DETF', '奶蛋豆製品', 'Dairy·Eggs·Tofu', NULL, 1, 800, '奶蛋豆製品類', '{}', true, NOW(), NOW()),
-- 雜貨
('cat_groc_001', 'GROC', '雜貨', 'Grocery', NULL, 1, 900, '雜貨類', '{}', true, NOW(), NOW());

-- 二級品類 (Level 2) - 蔬菜類
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") VALUES
('cat_vegg_101', 'LEAF', '葉菜類', 'Leafy Vegetables', 'cat_vegg_001', 2, 101, '菠菜、A菜', '{}', true, NOW(), NOW()),
('cat_vegg_102', 'LETC', '生菜', 'Lettuce & Salad Greens', 'cat_vegg_001', 2, 102, '羅曼、生菜沙拉', '{}', true, NOW(), NOW()),
('cat_vegg_103', 'ROOT', '根莖類', 'Root & Tuber', 'cat_vegg_001', 2, 103, '白蘿蔔、馬鈴薯', '{}', true, NOW(), NOW()),
('cat_vegg_104', 'GOUR', '瓜果類', 'Gourd & Fruiting Veg.', 'cat_vegg_001', 2, 104, '南瓜、番茄、青椒', '{}', true, NOW(), NOW()),
('cat_vegg_105', 'FLFV', '花果菜', 'Flowering Vegetables', 'cat_vegg_001', 2, 105, '青花椰、花椰菜', '{}', true, NOW(), NOW()),
('cat_vegg_106', 'BEAN', '豆莢類', 'Legume Vegetables', 'cat_vegg_001', 2, 106, '四季豆、毛豆', '{}', true, NOW(), NOW()),
('cat_vegg_107', 'MUSH', '菇蕈類', 'Mushrooms', 'cat_vegg_001', 2, 107, '香菇、金針菇', '{}', true, NOW(), NOW()),
('cat_vegg_108', 'ARSS', '蔥薑蒜／辛香料', 'Allium-Root Spices', 'cat_vegg_001', 2, 108, '青蔥、蒜頭、老薑、辣椒', '{}', true, NOW(), NOW()),
('cat_vegg_109', 'HERB', '香菜香料', 'Herbs & Aromatics', 'cat_vegg_001', 2, 109, '香菜、九層塔、羅勒', '{}', true, NOW(), NOW()),
('cat_vegg_110', 'STEM', '莖菜類', 'Stem Vegetables', 'cat_vegg_001', 2, 110, '蘆筍、芹菜', '{}', true, NOW(), NOW()),
('cat_vegg_111', 'HVGV', '大宗蔬菜', 'High-Volume Veg.', 'cat_vegg_001', 2, 111, '高麗菜、大白菜', '{}', true, NOW(), NOW()),
('cat_vegg_112', 'SPRO', '苗芽蔬菜', 'Sprouts', 'cat_vegg_001', 2, 112, '豆芽、苜蓿芽', '{}', true, NOW(), NOW()),
('cat_vegg_113', 'SEAW', '海菜類', 'Sea Vegetables', 'cat_vegg_001', 2, 113, '海帶芽、石花菜', '{}', true, NOW(), NOW()),
('cat_vegg_114', 'CUTV', '截切蔬菜', 'Cut Vegetables', 'cat_vegg_001', 2, 114, '切段芹菜、切片紅蘿蔔', '{}', true, NOW(), NOW()),
('cat_vegg_115', 'PRVG', '加工蔬菜', 'Processed Vegetables', 'cat_vegg_001', 2, 115, '冷凍蔬菜、醃漬菜', '{}', true, NOW(), NOW()),
('cat_vegg_116', 'VMSC', '其他蔬菜', 'Vegetable Misc.', 'cat_vegg_001', 2, 116, '', '{}', true, NOW(), NOW());

-- 二級品類 (Level 2) - 水果類
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") VALUES
('cat_frut_201', 'CITR', '柑橘類', 'Citrus Fruits', 'cat_frut_001', 2, 201, '柳丁、檸檬', '{}', true, NOW(), NOW()),
('cat_frut_202', 'BERR', '漿果類', 'Berries', 'cat_frut_001', 2, 202, '草莓、藍莓', '{}', true, NOW(), NOW()),
('cat_frut_203', 'PSTF', '核仁果類', 'Pome & Stone Fruits', 'cat_frut_001', 2, 203, '蘋果、水蜜桃', '{}', true, NOW(), NOW()),
('cat_frut_204', 'TROP', '熱帶水果', 'Tropical Fruits', 'cat_frut_001', 2, 204, '芒果、香蕉', '{}', true, NOW(), NOW()),
('cat_frut_205', 'MELN', '瓜果類', 'Melons', 'cat_frut_001', 2, 205, '西瓜、哈密瓜', '{}', true, NOW(), NOW()),
('cat_frut_206', 'FRFR', '冷凍水果', 'Frozen Fruits', 'cat_frut_001', 2, 206, '冷凍莓果', '{}', true, NOW(), NOW()),
('cat_frut_207', 'PRFR', '加工水果', 'Processed Fruits', 'cat_frut_001', 2, 207, '果汁', '{}', true, NOW(), NOW()),
('cat_frut_208', 'FRMS', '其他水果', 'Fruit Misc.', 'cat_frut_001', 2, 208, '', '{}', true, NOW(), NOW());

-- 二級品類 (Level 2) - 牛肉類
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") VALUES
('cat_beef_301', 'CHUC', '肩胛部', 'Chuck', 'cat_beef_001', 2, 301, '板腱、肩胛心', '{}', true, NOW(), NOW()),
('cat_beef_302', 'RIBE', '肋眼／背脊', 'Rib & Prime', 'cat_beef_001', 2, 302, '肋眼、牛小排', '{}', true, NOW(), NOW()),
('cat_beef_303', 'BLON', '腰脊部', 'Beef Loin', 'cat_beef_001', 2, 303, '紐約客、西冷', '{}', true, NOW(), NOW()),
('cat_beef_304', 'BRIS', '前胸部', 'Brisket', 'cat_beef_001', 2, 304, '牛腩、胸肉', '{}', true, NOW(), NOW()),
('cat_beef_305', 'FLNK', '腹脇部', 'Flank', 'cat_beef_001', 2, 305, '側腹肉', '{}', true, NOW(), NOW()),
('cat_beef_306', 'ROUN', '後腿／腿腱', 'Round & Shank', 'cat_beef_001', 2, 306, '牛腱、臀肉', '{}', true, NOW(), NOW()),
('cat_beef_307', 'BGRD', '牛絞肉', 'Ground Beef', 'cat_beef_001', 2, 307, '牛絞肉', '{}', true, NOW(), NOW()),
('cat_beef_308', 'BOFF', '牛雜類', 'Beef Offal', 'cat_beef_001', 2, 308, '牛肚、牛肝', '{}', true, NOW(), NOW()),
('cat_beef_309', 'PRBF', '加工牛肉', 'Processed Beef', 'cat_beef_001', 2, 309, '滷牛腱、牛肉乾', '{}', true, NOW(), NOW()),
('cat_beef_310', 'BFMS', '其他牛肉', 'Beef Misc.', 'cat_beef_001', 2, 310, '', '{}', true, NOW(), NOW());

-- 二級品類 (Level 2) - 豬肉類
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") VALUES
('cat_pork_401', 'PHED', '頭部肉', 'Head Cuts', 'cat_pork_001', 2, 401, '豬頰、豬耳', '{}', true, NOW(), NOW()),
('cat_pork_402', 'BUTT', '肩胛梅花', 'Shoulder', 'cat_pork_001', 2, 402, '梅花肉、松阪肉', '{}', true, NOW(), NOW()),
('cat_pork_403', 'PLON', '背脊部', 'Pork Loin', 'cat_pork_001', 2, 403, '里肌、腰內', '{}', true, NOW(), NOW()),
('cat_pork_404', 'BELI', '五花／肋排', 'Belly & Rib', 'cat_pork_001', 2, 404, '五花肉、肋排', '{}', true, NOW(), NOW()),
('cat_pork_405', 'FRNT', '前腿部', 'Front Leg', 'cat_pork_001', 2, 405, '前腿肉', '{}', true, NOW(), NOW()),
('cat_pork_406', 'HLEG', '後腿部', 'Hind Leg', 'cat_pork_001', 2, 406, '後腿肉', '{}', true, NOW(), NOW()),
('cat_pork_407', 'TROT', '蹄膀／豬腳', 'Trotters', 'cat_pork_001', 2, 407, '蹄膀、豬腳', '{}', true, NOW(), NOW()),
('cat_pork_408', 'PGRD', '豬絞肉', 'Ground Pork', 'cat_pork_001', 2, 408, '豬絞肉', '{}', true, NOW(), NOW()),
('cat_pork_409', 'POFF', '豬雜類', 'Pork Offal', 'cat_pork_001', 2, 409, '豬肝、豬大腸', '{}', true, NOW(), NOW()),
('cat_pork_410', 'PRPK', '加工豬肉', 'Processed Pork', 'cat_pork_001', 2, 410, '培根、火腿', '{}', true, NOW(), NOW()),
('cat_pork_411', 'PKMS', '其他豬肉', 'Pork Misc.', 'cat_pork_001', 2, 411, '', '{}', true, NOW(), NOW());

-- 二級品類 (Level 2) - 雞肉類
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") VALUES
('cat_chkn_501', 'WHOL', '全雞', 'Whole Chicken', 'cat_chkn_001', 2, 501, '全雞', '{}', true, NOW(), NOW()),
('cat_chkn_502', 'BRST', '雞胸', 'Breast', 'cat_chkn_001', 2, 502, '去骨雞胸', '{}', true, NOW(), NOW()),
('cat_chkn_503', 'THGH', '雞腿／腿排', 'Thigh & Drumstick', 'cat_chkn_001', 2, 503, '雞腿排', '{}', true, NOW(), NOW()),
('cat_chkn_504', 'WING', '雞翅', 'Wing', 'cat_chkn_001', 2, 504, '全翅、翅中', '{}', true, NOW(), NOW()),
('cat_chkn_505', 'FEET', '雞腳', 'Chicken Feet', 'cat_chkn_001', 2, 505, '鳳爪', '{}', true, NOW(), NOW()),
('cat_chkn_506', 'COFF', '雞雜類', 'Chicken Offal', 'cat_chkn_001', 2, 506, '雞肝、雞胗', '{}', true, NOW(), NOW()),
('cat_chkn_507', 'CGRD', '雞絞肉', 'Ground Chicken', 'cat_chkn_001', 2, 507, '雞絞肉', '{}', true, NOW(), NOW()),
('cat_chkn_508', 'PRCK', '加工雞肉', 'Processed Chicken', 'cat_chkn_001', 2, 508, '煙燻雞腿', '{}', true, NOW(), NOW()),
('cat_chkn_509', 'CKMS', '其他雞肉', 'Chicken Misc.', 'cat_chkn_001', 2, 509, '', '{}', true, NOW(), NOW());

-- 二級品類 (Level 2) - 其他肉品類
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") VALUES
('cat_otme_601', 'LAMB', '羊肉', 'Lamb/Mutton', 'cat_otme_001', 2, 601, '羊小排', '{}', true, NOW(), NOW()),
('cat_otme_602', 'DUCK', '鴨肉', 'Duck', 'cat_otme_001', 2, 602, '鴨胸', '{}', true, NOW(), NOW()),
('cat_otme_603', 'GOOS', '鵝肉', 'Goose', 'cat_otme_001', 2, 603, '鵝腿', '{}', true, NOW(), NOW()),
('cat_otme_604', 'PROT', '加工其他肉品', 'Processed OT Meat', 'cat_otme_001', 2, 604, '鴨賞、羊肉乾', '{}', true, NOW(), NOW()),
('cat_otme_605', 'OTMS', '其他', 'OT Meat Misc.', 'cat_otme_001', 2, 605, '', '{}', true, NOW(), NOW());

-- 二級品類 (Level 2) - 水產類
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") VALUES
('cat_seaf_701', 'FISH', '魚類', 'Fish', 'cat_seaf_001', 2, 701, '鮭魚、鯛魚', '{}', true, NOW(), NOW()),
('cat_seaf_702', 'CRUS', '甲殼類', 'Crustaceans', 'cat_seaf_001', 2, 702, '蝦、螃蟹', '{}', true, NOW(), NOW()),
('cat_seaf_703', 'SHEL', '貝類', 'Shellfish', 'cat_seaf_001', 2, 703, '蛤蜊、生蠔', '{}', true, NOW(), NOW()),
('cat_seaf_704', 'CEPH', '頭足類', 'Cephalopods', 'cat_seaf_001', 2, 704, '章魚、魷魚', '{}', true, NOW(), NOW()),
('cat_seaf_705', 'PRSF', '加工水產', 'Processed Seafood', 'cat_seaf_001', 2, 705, '魚丸、蝦餃', '{}', true, NOW(), NOW()),
('cat_seaf_706', 'DRSF', '乾貨', 'Dried Seafoods', 'cat_seaf_001', 2, 706, '魚乾、海苔乾', '{}', true, NOW(), NOW()),
('cat_seaf_707', 'SFMS', '其他水產', 'Seafood Misc.', 'cat_seaf_001', 2, 707, '', '{}', true, NOW(), NOW());

-- 二級品類 (Level 2) - 奶蛋豆製品類
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") VALUES
('cat_detf_801', 'EGGS', '蛋類', 'Eggs', 'cat_detf_001', 2, 801, '雞蛋、鴨蛋', '{}', true, NOW(), NOW()),
('cat_detf_802', 'MILK', '奶類', 'Milk', 'cat_detf_001', 2, 802, '鮮奶', '{}', true, NOW(), NOW()),
('cat_detf_803', 'DAIR', '乳製品', 'Dairy Products', 'cat_detf_001', 2, 803, '起司、優格', '{}', true, NOW(), NOW()),
('cat_detf_804', 'SOYP', '豆製品', 'Soy Products', 'cat_detf_001', 2, 804, '豆腐、百頁豆腐', '{}', true, NOW(), NOW()),
('cat_detf_805', 'PRDT', '加工奶蛋豆', 'Processed DETF', 'cat_detf_001', 2, 805, '調味乳、豆漿布丁', '{}', true, NOW(), NOW()),
('cat_detf_806', 'DTMS', '其他奶蛋豆製品', 'DETF Misc.', 'cat_detf_001', 2, 806, '', '{}', true, NOW(), NOW());

-- 二級品類 (Level 2) - 雜貨類
INSERT INTO product_categories (id, code, name, "nameEn", "parentId", level, "sortOrder", description, metadata, "isActive", "createdAt", "updatedAt") VALUES
('cat_groc_901', 'SEAS', '調味料', 'Seasonings', 'cat_groc_001', 2, 901, '食鹽、胡椒粉', '{}', true, NOW(), NOW()),
('cat_groc_902', 'SAUC', '醬料', 'Sauces', 'cat_groc_001', 2, 902, '醬油、蠔油', '{}', true, NOW(), NOW()),
('cat_groc_903', 'OILS', '油脂', 'Cooking Oils', 'cat_groc_001', 2, 903, '橄欖油、沙拉油', '{}', true, NOW(), NOW()),
('cat_groc_904', 'DRYD', '乾貨', 'Dried Goods', 'cat_groc_001', 2, 904, '紫菜、木耳', '{}', true, NOW(), NOW()),
('cat_groc_905', 'GRAI', '穀物豆類', 'Grains & Legumes', 'cat_groc_001', 2, 905, '白米、紅豆', '{}', true, NOW(), NOW()),
('cat_groc_906', 'CANN', '罐頭', 'Canned Goods', 'cat_groc_001', 2, 906, '鮪魚罐頭', '{}', true, NOW(), NOW()),
('cat_groc_907', 'PRGC', '加工雜貨', 'Processed Grocery', 'cat_groc_001', 2, 907, '速食麵、即食湯包', '{}', true, NOW(), NOW()),
('cat_groc_908', 'RTEF', '即食食品', 'Ready-to-Eat Foods', 'cat_groc_001', 2, 908, '便當、即食沙拉', '{}', true, NOW(), NOW()),
('cat_groc_909', 'JAMS', '果醬', 'Jams & Spreads', 'cat_groc_001', 2, 909, '草莓果醬、柚子醬', '{}', true, NOW(), NOW()),
('cat_groc_910', 'NFSC', '非食品耗材', 'NonFood Supplies', 'cat_groc_001', 2, 910, '包材、清潔劑', '{}', true, NOW(), NOW()),
('cat_groc_911', 'POWD', '粉類原料', 'Powdered Ingredients', 'cat_groc_001', 2, 911, '中筋麵粉、玉米粉', '{}', true, NOW(), NOW()),
('cat_groc_912', 'VGTN', '素食', 'Vegetarian (Plant Foods)', 'cat_groc_001', 2, 912, '素肉、素料包', '{}', true, NOW(), NOW()),
('cat_groc_913', 'ALCO', '酒精飲料', 'Alcoholic Beverages', 'cat_groc_001', 2, 913, '啤酒、紅酒', '{}', true, NOW(), NOW()),
('cat_groc_914', 'NUTS', '堅果', 'Nuts & Seeds', 'cat_groc_001', 2, 914, '杏仁、核桃、南瓜子', '{}', true, NOW(), NOW()),
('cat_groc_915', 'NOOD', '麵類', 'Noodles & Pasta', 'cat_groc_001', 2, 915, '烏龍麵、義大利麵', '{}', true, NOW(), NOW()),
('cat_groc_916', 'GCMS', '其他雜貨', 'Grocery Misc.', 'cat_groc_001', 2, 916, '', '{}', true, NOW(), NOW());

-- 更新現有產品的 categoryId 引用（如果需要）
-- 注意：現有的 cmfqla3r60000akg7tpm9o6h6 (蔬菜) 對應到 cat_vegg_001
-- 現有的 cmfqla3rg0006akg7uub0skf0 (食品原料) 對應到 cat_groc_901 (調味料)

-- 驗證資料
SELECT 
    level,
    COUNT(*) as count
FROM product_categories 
GROUP BY level 
ORDER BY level;

SELECT 
    c1.name as "一級類別",
    COUNT(c2.id) as "子類別數量"
FROM product_categories c1
LEFT JOIN product_categories c2 ON c1.id = c2."parentId"
WHERE c1.level = 1
GROUP BY c1.id, c1.name
ORDER BY c1."sortOrder";

COMMIT;