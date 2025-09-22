# 資料庫管理工具

井然 Orderly 平台的統一資料庫管理解決方案，整合所有資料操作功能。

## 📁 檔案結構

```
scripts/database/
├── README.md                # 本說明檔案
├── database_manager.py      # 🎯 統一資料庫管理工具
├── seed_from_real_data.py   # 基於真實資料的完整測試腳本
└── data/                    # 資料存放目錄
    ├── suppliers.json       # 供應商資料
    ├── customers.json       # 客戶階層資料
    ├── categories.json      # 品類資料
    ├── skus.json           # SKU 資料
    └── export_summary.json  # 導出摘要
```

## 🎯 統一管理工具 - database_manager.py

### 功能概覽

`database_manager.py` 是一個全功能的資料庫管理工具，整合了以下所有功能：

- 📤 **資料導出**: 從生產環境導出所有業務資料
- 📥 **資料導入**: 將資料導入到不同環境（開發/測試/生產）
- 👥 **測試資料創建**: 生成標準化的測試客戶資料
- 🗑️ **資料清理**: 清理測試資料和導出文件
- 🔄 **重複執行保護**: 自動檢測重複操作，避免資料衝突

### 基本使用方法

```bash
# 查看所有可用命令
python scripts/database/database_manager.py --help

# 查看特定命令的幫助
python scripts/database/database_manager.py export --help
```

## 🚀 詳細使用指南

### 1. 導出資料

從當前資料庫導出所有業務資料：

```bash
# 導出所有資料（預設連接本地資料庫）
python scripts/database/database_manager.py export

# 指定特定資料庫
python scripts/database/database_manager.py export --database-url "postgresql+asyncpg://user:pass@host:5432/db"
```

**導出內容：**
- 📦 供應商資料（organizations + supplier_profiles）
- 🏢 客戶階層資料（companies + locations + business_units）
- 📂 品類資料（product_categories）
- 🏷️ SKU 資料（product_skus）

**輸出文件：**
- `data/suppliers.json` - 供應商資料
- `data/customers.json` - 客戶階層資料
- `data/categories.json` - 品類資料
- `data/skus.json` - SKU 資料
- `data/export_summary.json` - 導出摘要與統計

### 2. 創建測試客戶

創建標準化的測試客戶資料：

```bash
# 創建 20 個標準測試客戶（15個公司 + 5個自然人）
python scripts/database/database_manager.py create-test-customers

# 自訂客戶數量
python scripts/database/database_manager.py create-test-customers --count 30

# 強制重新創建（會先清理現有測試資料）
python scripts/database/database_manager.py create-test-customers --force

# 指定目標資料庫
python scripts/database/database_manager.py create-test-customers --database-url "postgresql+asyncpg://..."
```

**測試客戶特點：**
- ✅ **公司客戶（75%）**: 使用8位統編，完整企業資訊
- ✅ **自然人客戶（25%）**: 使用身分證字號格式
- ✅ **完整階層**: 每個客戶都有1個地點和1個業務單位
- ✅ **真實資料**: 台灣真實地址、電話、Email格式
- ✅ **可重複**: 腳本有重複檢查，不會創建重複資料
- ✅ **可清理**: 支援完全清理，不影響真實資料

### 3. 導入資料

將導出的資料導入到目標環境：

```bash
# 導入所有資料到 Staging 環境
python scripts/database/database_manager.py import --target "postgresql+asyncpg://staging_user:pass@staging:5432/orderly"

# 只導入特定類型的資料
python scripts/database/database_manager.py import --target "..." --types suppliers customers

# 可選的資料類型
python scripts/database/database_manager.py import --target "..." --types suppliers
python scripts/database/database_manager.py import --target "..." --types customers
python scripts/database/database_manager.py import --target "..." --types categories  
python scripts/database/database_manager.py import --target "..." --types skus
```

**安全特性：**
- ✅ 自動檢測重複資料，跳過已存在的記錄
- ✅ 保持外鍵關係和資料完整性
- ✅ 交易式操作，失敗時自動回滾
- ✅ 詳細的進度報告和錯誤處理

### 4. 清理資料

清理測試資料或導出文件：

```bash
# 清理測試客戶資料
python scripts/database/database_manager.py clean --test-data

# 清理導出的 JSON 文件
python scripts/database/database_manager.py clean --export-files

# 同時清理測試資料和導出文件
python scripts/database/database_manager.py clean --test-data --export-files

# 指定資料庫
python scripts/database/database_manager.py clean --test-data --database-url "postgresql+asyncpg://..."
```

## 🏷️ 真實資料測試腳本 - seed_from_real_data.py

基於當前生產資料自動生成的完整測試資料腳本：

```bash
# 創建所有真實資料的測試副本
python scripts/database/seed_from_real_data.py

# 清理所有測試副本
python scripts/database/seed_from_real_data.py --clean

# 強制重新創建
python scripts/database/seed_from_real_data.py --force
```

**包含的資料：**
- 📦 9 個供應商（含檔案資訊）
- 🏢 20 個客戶公司（含完整階層）
- 📂 105 個品類（含層級關係）
- 🏷️ 52 個 SKU（含定價資訊）

**特色功能：**
- ✅ 基於真實生產資料，保證業務邏輯正確性
- ✅ 保持完整的外鍵關係和資料依賴
- ✅ 支援重複執行，智能跳過已存在資料
- ✅ 提供完整的清理功能

## ⚙️ 環境設定

### 資料庫連接

**開發環境（預設）：**
```
postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly
```

**自訂連接：**
所有命令都支援 `--database-url` 參數來指定自訂資料庫連接。

### 環境變數

也可以透過環境變數設定：

```bash
export DATABASE_URL="postgresql+asyncpg://user:pass@host:port/database"
python scripts/database/database_manager.py export
```

## 📊 資料詳情

### 標準測試客戶結構

| 客戶類型 | 數量 | 識別號類型 | 階層結構 | 預算範圍 |
|---------|------|-----------|----------|----------|
| 公司客戶 | 15個 | 8位統編 | 公司→地點→業務單位 | 30K-100K/月 |
| 自然人客戶 | 5個 | 身分證字號 | 個人→營業場所→營運部 | 10K-20K/月 |

### 資料完整性檢查

```sql
-- 檢查測試客戶層級結構
SELECT 
    cc.name AS company_name,
    cc.tax_id,
    cc.tax_id_type,
    cl.name AS location_name,
    bu.name AS unit_name,
    bu.budget_monthly
FROM customer_companies cc
JOIN customer_locations cl ON cc.id = cl.company_id
JOIN business_units bu ON cl.id = bu.location_id
WHERE cc.created_by = 'test_script'
ORDER BY cc.created_at;

-- 檢查資料計數
SELECT 
    'companies' as type, COUNT(*) as count 
FROM customer_companies WHERE created_by = 'test_script'
UNION ALL
SELECT 
    'locations' as type, COUNT(*) as count 
FROM customer_locations WHERE created_by = 'test_script'
UNION ALL
SELECT 
    'business_units' as type, COUNT(*) as count 
FROM business_units WHERE created_by = 'test_script';
```

## 🔧 工作流程範例

### 完整的開發→測試→生產流程

```bash
# 1. 從生產環境導出最新資料
python scripts/database/database_manager.py export --database-url "postgresql+asyncpg://prod_user:pass@prod:5432/orderly"

# 2. 在開發環境創建測試客戶
python scripts/database/database_manager.py create-test-customers

# 3. 將生產資料導入到測試環境
python scripts/database/database_manager.py import --target "postgresql+asyncpg://test_user:pass@test:5432/orderly"

# 4. 在測試環境創建測試客戶
python scripts/database/database_manager.py create-test-customers --database-url "postgresql+asyncpg://test_user:pass@test:5432/orderly"

# 5. 清理開發環境
python scripts/database/database_manager.py clean --test-data --export-files
```

### 快速重置開發環境

```bash
# 一鍵重置：清理舊資料 + 創建新測試資料
python scripts/database/database_manager.py clean --test-data && \
python scripts/database/database_manager.py create-test-customers --force
```

## 🚨 注意事項

### 安全性
- 🔒 **權限控制**: 確保資料庫用戶有適當的讀寫權限
- 🔒 **連接安全**: 生產環境連接字串請使用環境變數
- 🔒 **資料隔離**: 測試資料使用特殊標記，不會影響生產資料

### 效能最佳化
- ⚡ **平行處理**: 導出/導入操作使用 asyncio 平行處理
- ⚡ **批次操作**: 大量資料插入使用批次處理
- ⚡ **重複檢查**: 智能跳過已存在資料，提升執行效率

### 資料一致性
- ✅ **外鍵保護**: 嚴格維護表間關係
- ✅ **交易安全**: 失敗時自動回滾，保證資料一致性
- ✅ **版本相容**: 支援不同版本間的資料遷移

## 🔧 故障排除

### 常見問題

**1. 資料庫連接失敗**
```bash
# 檢查資料庫服務狀態
docker-compose ps

# 測試連接
psql "postgresql://orderly:orderly_dev_password@localhost:5432/orderly" -c "SELECT 1;"
```

**2. 權限不足錯誤**
```sql
-- 檢查用戶權限
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name IN ('customer_companies', 'organizations');

-- 授予必要權限
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO orderly;
```

**3. 資料重複錯誤**
```bash
# 清理重複資料
python scripts/database/database_manager.py clean --test-data

# 強制重新創建
python scripts/database/database_manager.py create-test-customers --force
```

**4. 導入失敗**
```bash
# 檢查導出文件
ls -la scripts/database/data/

# 驗證 JSON 格式
python -m json.tool scripts/database/data/suppliers.json > /dev/null
```

### 調試模式

環境變數 `DEBUG=1` 可以啟用詳細日誌：

```bash
DEBUG=1 python scripts/database/database_manager.py export
```

## 📝 擴展開發

### 添加新的資料類型

1. 在 `DatabaseManager` 類中添加新的導出方法：
```python
async def export_new_data_type(self) -> List[Dict]:
    # 實現導出邏輯
    pass
```

2. 在 `export_all_data` 中加入新類型
3. 實現對應的導入方法 `_import_new_data_type`
4. 更新 CLI 參數選項

### 自訂測試資料

修改 `_generate_test_customer_data` 方法來客製化測試客戶資料結構。

## 📈 效能指標

- **導出速度**: ~1000 記錄/秒
- **導入速度**: ~800 記錄/秒  
- **記憶體使用**: <100MB（1萬筆記錄）
- **並行度**: 4個資料類型同時處理

## 🎯 最佳實踐

1. **定期備份**: 在重大操作前先備份資料庫
2. **漸進導入**: 大量資料建議分批次導入
3. **監控日誌**: 注意錯誤日誌和執行時間
4. **測試優先**: 在測試環境驗證後再執行生產操作
5. **版本控制**: 重要的資料導出請打上版本標籤