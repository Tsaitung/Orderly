# Staging 環境永久化部署指南

## 概述

本文檔描述井然 Orderly 專案 staging 環境的完整部署流程、配置管理和運維指南。所有配置已實現永久化，支援可重複部署和故障恢復。

## 環境資訊

- **專案 ID**: orderly-472413
- **區域**: asia-east1
- **資料庫**: orderly-db-v2 (Cloud SQL PostgreSQL)
- **容器註冊**: asia-east1-docker.pkg.dev/orderly-472413/orderly

## 服務架構

### 部署的服務清單

| 服務名稱 | Cloud Run URL | 健康檢查 | 備註 |
|---------|--------------|----------|------|
| API Gateway | https://orderly-api-gateway-fastapi-staging-usg6y7o2ba-de.a.run.app | ✅ `/health` | 統一入口 |
| Product Service | https://orderly-product-service-fastapi-staging-655602747430.asia-east1.run.app | ✅ `/health`, `/db/health` | 商品管理 |
| User Service | https://orderly-user-service-fastapi-staging-usg6y7o2ba-de.a.run.app | ✅ `/health`, `/db/health` | 用戶管理 |
| Order Service | https://orderly-order-service-fastapi-staging-usg6y7o2ba-de.a.run.app | ✅ `/health`, `/db/health` | 訂單處理 |
| Acceptance Service | https://orderly-acceptance-service-fastapi-staging-usg6y7o2ba-de.a.run.app | ✅ `/health`, `/db/health` | 驗收管理 |
| Notification Service | https://orderly-notification-service-fastapi-staging-usg6y7o2ba-de.a.run.app | ✅ `/health`, `/db/health` | 通知服務 |
| Customer Hierarchy Service | https://orderly-customer-hierarchy-service-fastapi-stagin-usg6y7o2ba-de.a.run.app | ✅ `/health`, `/db/health` | 客戶層級 |
| Supplier Service | https://orderly-supplier-service-fastapi-staging-usg6y7o2ba-de.a.run.app | ✅ `/health`, `/db/health` | 供應商管理 |
| Frontend | https://orderly-frontend-staging-usg6y7o2ba-de.a.run.app | ✅ | Next.js 應用 |

## 部署配置

### 永久化配置檔案

所有 Cloud Run 服務配置已導出至 `configs/staging/` 目錄：

```
configs/staging/
├── api-gateway-fastapi.yaml           # API Gateway 配置
├── product-service-fastapi.yaml       # Product Service 配置
├── user-service-fastapi.yaml          # User Service 配置
├── order-service-fastapi.yaml         # Order Service 配置
├── acceptance-service-fastapi.yaml    # Acceptance Service 配置
├── notification-service-fastapi.yaml  # Notification Service 配置
├── customer-hierarchy-service-fastapi.yaml # Customer Hierarchy Service 配置
└── supplier-service-fastapi.yaml      # Supplier Service 配置
```

### 環境變數標準化

所有服務使用統一的環境變數配置：

```yaml
# 資料庫連接（所有服務統一使用 orderly-db-v2）
DATABASE_HOST: /cloudsql/orderly-472413:asia-east1:orderly-db-v2
DATABASE_NAME: orderly
DATABASE_USER: orderly
DATABASE_URL: postgresql+asyncpg://orderly:PASSWORD@/orderly?host=/cloudsql/orderly-472413:asia-east1:orderly-db-v2

# Service Account（每個服務都有專用 SA）
- orderly-apigw-fastapi@orderly-472413.iam.gserviceaccount.com     # API Gateway
- orderly-product-fastapi@orderly-472413.iam.gserviceaccount.com   # Product Service
- orderly-user-fastapi@orderly-472413.iam.gserviceaccount.com      # User Service
# ... 其他服務類推

# Cloud SQL 連接（自動注入）
--add-cloudsql-instances=orderly-472413:asia-east1:orderly-db-v2
```

## 部署腳本

### 統一部署腳本

`scripts/deploy-staging-permanent.sh` - 一鍵部署所有 staging 服務：

```bash
#!/bin/bash
# 部署所有 staging 服務
for config in configs/staging/*.yaml; do
    service_name=$(basename "$config" .yaml)
    echo "部署 $service_name..."
    gcloud run services replace "$config" \
        --region=asia-east1 \
        --project=orderly-472413
done
```

### 資料庫管理

#### 遷移腳本
`scripts/database/run-migrations.sh` - 執行所有服務的資料庫遷移：

```bash
# 支援的服務: product, user, supplier, customer-hierarchy, order, acceptance, notification
./scripts/database/run-migrations.sh product user supplier
```

#### 資料完整性檢查
`scripts/database/data-integrity-check.sh` - 驗證核心資料：

```bash
# 檢查核心表的資料完整性
./scripts/database/data-integrity-check.sh
```

輸出範例：
```
users: 3 records ✓
customer_groups: 13 records ✓
product_categories: 105 records ✓
products: 52 records ✓
supplier_product_skus: 52 records ✓
supplier_profiles: 2 records ✓
```

#### 資料同步
`scripts/database/sync_missing_staging_tables.py` - 同步缺失資料：

```bash
# 從本地同步核心資料到 staging
python3 scripts/database/sync_missing_staging_tables.py
```

## 監控與健康檢查

### 統一健康檢查

`scripts/health-check-simple.sh` - 快速檢查所有服務狀態：

```bash
ENV=staging SERVICE_SUFFIX="" ./scripts/health-check-simple.sh
```

輸出範例：
```
✅ orderly-api-gateway-fastapi-staging: healthy
✅ orderly-product-service-fastapi-staging: healthy (DB: healthy)
✅ orderly-user-service-fastapi-staging: healthy (DB: healthy)
```

### 診斷工具

`scripts/db/diag.sh` - 深度診斷服務配置：

```bash
ENV=staging SERVICE_SUFFIX="" ./scripts/db/diag.sh
```

提供詳細資訊：
- Service Account 配置
- Cloud SQL 連接狀態
- 環境變數配置
- 健康檢查結果

## API 端點文檔

### 核心 API 端點

#### API Gateway
- **服務地圖**: `GET /service-map` - 獲取所有後端服務 URL
- **健康檢查**: `GET /health` - 基本健康狀態
- **資料庫健康**: `GET /db/health` - 檢查所有後端服務資料庫連接

#### Product Service
- **產品分類**: `GET /api/products/categories` - 獲取所有分類（105 個）
- **產品列表**: `GET /api/products/products` - 獲取產品列表（52 個）
- **SKU 搜尋**: `GET /api/products/skus/search` - SKU 搜尋功能
- **SKU 統計**: `GET /api/products/skus/stats` - SKU 統計資訊

#### User Service
- **用戶管理**: `GET /api/users` - 用戶列表
- **客戶群組**: `GET /api/customer-groups` - 客戶群組管理

### API 已知問題與修復

#### 已修復問題
1. **產品 API 路徑**: 正確端點為 `/api/products/products`（非 `/api/products`）
2. **SKU Enum 類型**: 已修復 STANDARD/VARIANT/BUNDLE/CUSTOM 與 PUBLIC/PRIVATE 不匹配問題
3. **供應商資料**: 已添加測試供應商資料到 supplier_profiles 表

#### 待修復問題
1. **供應商 API**: 質量認證欄位格式需要調整（期望字典格式）
2. **BFF 端點**: 部分前端調用的 BFF 端點尚未實現

## 資料庫架構

### 核心表結構

#### 產品相關
- `product_categories`: 產品分類（105 筆）
- `products`: 產品資料（52 筆）
- `product_skus`: SKU 資料（使用正確的 enum 類型）

#### 用戶與組織
- `users`: 系統用戶（3 筆）
- `organizations`: 組織資料（包含供應商）
- `customer_groups`: 客戶群組（13 筆）

#### 供應商相關
- `supplier_profiles`: 供應商詳細資訊（2 筆測試資料）
- `supplier_product_skus`: 供應商 SKU 關聯（52 筆）

### 資料庫連接配置

所有服務統一連接到 `orderly-db-v2` 實例：
- **實例**: orderly-472413:asia-east1:orderly-db-v2
- **資料庫**: orderly
- **用戶**: orderly
- **密碼**: 存儲在 Secret Manager (`postgres-password`)

## CI/CD 集成

### 自動部署觸發器

staging 環境會在以下情況自動更新：
1. 推送到 `staging` 分支
2. 手動觸發 GitHub Actions 工作流

### 部署流程

1. **建置容器映像**: 使用 Cloud Build 建置各服務映像
2. **推送到 Artifact Registry**: asia-east1-docker.pkg.dev/orderly-472413/orderly
3. **更新 Cloud Run**: 使用永久化配置檔案部署
4. **健康檢查**: 自動驗證部署結果

## 故障排除

### 常見問題

#### 1. 服務返回 404
**症狀**: API 端點返回 "Not Found"
**檢查**:
1. 確認 API Gateway 服務地圖中的 URL
2. 檢查目標服務是否正常運行
3. 驗證路由配置

#### 2. 資料庫連接失敗
**症狀**: 服務啟動失敗或 `/db/health` 返回 503
**檢查**:
1. Cloud SQL 實例狀態: `gcloud sql instances describe orderly-db-v2`
2. Service Account 權限
3. Cloud SQL 連接字符串配置

#### 3. SKU API 500 錯誤
**症狀**: SKU 搜尋返回 enum 相關錯誤
**解決**: 確保 Product Service 使用最新的 enum 定義（已修復）

### 診斷命令

```bash
# 檢查所有服務狀態
ENV=staging SERVICE_SUFFIX="" ./scripts/db/diag.sh

# 快速健康檢查
./scripts/health-check-simple.sh

# 檢查資料完整性
./scripts/database/data-integrity-check.sh

# 查看 Cloud Run 服務日誌
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="orderly-product-service-fastapi-staging"' --limit=50
```

## 維護操作

### 定期維護任務

1. **每週**: 執行 `data-integrity-check.sh` 驗證資料完整性
2. **每月**: 檢查 Cloud SQL 實例效能和存儲使用量
3. **季度**: 檢閱 Service Account 權限和安全設定

### 備份策略

- **資料庫**: Cloud SQL 自動備份（每日）
- **配置**: 版本控制儲存在 `configs/staging/`
- **腳本**: 版本控制儲存在 `scripts/`

### 更新流程

1. 更新程式碼並推送到 `staging` 分支
2. 等待 CI/CD 自動部署完成
3. 執行健康檢查驗證部署
4. 必要時執行資料庫遷移

## 安全考量

### Service Account 權限

每個服務使用最小權限原則的專用 Service Account：
- Cloud SQL Client 權限（資料庫連接）
- Secret Manager Secret Accessor（密碼存取）
- Logging Writer（日誌寫入）

### 密鑰管理

所有敏感資料存儲在 Google Secret Manager：
- `postgres-password`: 資料庫密碼
- 其他 API 密鑰和憑證

### 網路安全

- Cloud Run 服務預設使用 HTTPS
- 內部服務通信通過 Cloud Run 內網
- 資料庫連接使用 Cloud SQL Proxy

## 效能監控

### 關鍵指標

- **回應時間**: API 端點平均回應時間 < 500ms
- **可用性**: 服務可用性 > 99.9%
- **錯誤率**: HTTP 5xx 錯誤率 < 0.1%

### 監控工具

- Cloud Monitoring: 自動監控 Cloud Run 指標
- Cloud Logging: 集中式日誌管理
- 健康檢查腳本: 主動監控服務狀態

---

## 更新歷史

- **2025-09-27**: 初始版本，記錄永久化部署配置
- **2025-09-27**: 修復 SKU enum 類型不匹配問題
- **2025-09-27**: 添加供應商測試資料和 API 端點文檔

---

*此文檔由 Claude Code 生成，基於實際部署配置和測試結果*