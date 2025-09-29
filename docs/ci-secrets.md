# CI/CD Secrets Configuration

完整的GitHub Secrets設置指南，用於Orderly平台的CI/CD部署。

## 🔑 必要的GitHub Secrets

### 核心部署Secrets

部署工作流(.github/workflows/deploy.yml)所需的核心secrets：

| Secret名稱           | 描述                         | 必需程度 | 範例值                 |
| -------------------- | ---------------------------- | -------- | ---------------------- |
| `GCP_SA_KEY`         | GCP Service Account JSON密鑰 | **必需** | (JSON格式，見下方說明) |
| `GCP_PROJECT_ID`     | Google Cloud專案ID           | **必需** | `orderly-472413`       |
| `POSTGRES_PASSWORD`  | PostgreSQL資料庫密碼 (Secret Manager `postgres-password`) | **必需** | 強密碼或使用 Secret Manager |
| `JWT_SECRET`         | JWT簽名密鑰                  | **必需** | 至少32字符隨機字符串   |
| `JWT_REFRESH_SECRET` | JWT刷新令牌密鑰              | **必需** | 至少32字符隨機字符串   |

### 環境特定Secrets (可選)

| Secret名稱             | 描述                 | 預設值             |
| ---------------------- | -------------------- | ------------------ |
| `GOOGLE_CLOUD_PROJECT` | 備用GCP專案ID        | 使用GCP_PROJECT_ID |
| `STG_DB_USER`          | Staging資料庫用戶    | `orderly`          |
| `PROD_DB_USER`         | Production資料庫用戶 | `orderly`          |

## 🗄️ Cloud SQL 實例配置

井然 Orderly 使用多個 Cloud SQL 實例來支援不同環境的部署：

### 實例映射

| 環境       | Cloud SQL實例    | 使用時機                     | 說明                       |
| ---------- | ---------------- | --------------------------- | -------------------------- |
| Production | `orderly-db`     | main分支部署                | 生產環境主要資料庫         |
| Staging    | `orderly-db-v2`  | staging/develop分支部署     | 測試環境，與生產環境隔離   |
| Manual     | 用戶指定         | workflow_dispatch手動部署   | 通過db_instance_name參數  |

### 實例創建

如果需要創建新的 Cloud SQL 實例（如 `orderly-db-v2`）：

```bash
# 創建新的 Cloud SQL 實例
gcloud sql instances create orderly-db-v2 \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-east1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --project=orderly-472413

# 創建資料庫
gcloud sql databases create orderly --instance=orderly-db-v2 --project=orderly-472413

# 創建用戶（使用 Secret Manager 中的密碼）
POSTGRES_PASSWORD=$(gcloud secrets versions access latest --secret=postgres-password --project=orderly-472413)
gcloud sql users create orderly --instance=orderly-db-v2 --password="$POSTGRES_PASSWORD" --project=orderly-472413

# 驗證連接名稱
gcloud sql instances describe orderly-db-v2 --format='value(connectionName)' --project=orderly-472413
```

## 🎛️ 新版 Workflow Inputs

從 2025-09-24 開始，部署工作流支援以下新的手動輸入參數，用於靈活的多環境部署：

### 核心部署參數

| 參數名稱                 | 描述                           | 類型     | 預設值    | 範例值              |
| ----------------------- | ------------------------------ | -------- | --------- | ------------------ |
| `environment`           | 部署環境                       | choice   | staging   | staging/production  |
| `db_instance_name`      | Cloud SQL實例名稱覆蓋          | string   | 自動選擇  | orderly-db-v2      |
| `services`              | 要部署的服務（逗號分隔）       | string   | 全部      | user-service,order-service |
| `service_suffix`        | 服務名稱後綴                   | string   | 空        | -v2                |

### 高級配置參數

| 參數名稱                  | 描述                          | 類型     | 預設值  | 用途                    |
| ------------------------ | ----------------------------- | -------- | ------- | ---------------------- |
| `use_v2_backends`        | API Gateway設定USE_V2_BACKENDS | boolean  | false   | 切換到v2後端服務        |
| `use_service_accounts`   | 使用個別Service Account        | boolean  | false   | 提升安全性（最小權限）  |
| `force_backend_redeploy` | 強制重新部署所有後端服務       | boolean  | false   | 強制部署，忽略變更檢測  |
| `force_frontend_redeploy`| 強制重新部署前端               | boolean  | false   | 強制前端部署           |
| `ref_name`               | 部署的Git分支/標籤             | string   | 當前分支 | main, staging, v1.2.3  |
| `enable_smoke_correlation`| 捕獲煙霧測試的Correlation ID  | boolean  | false   | 便於調試和追蹤         |

### 使用範例

```bash
# 部署v2測試環境
gh workflow run "Deploy to Cloud Run" --ref staging \
  -f environment=staging \
  -f db_instance_name=orderly-db-v2 \
  -f service_suffix=-v2 \
  -f use_v2_backends=true \
  -f use_service_accounts=true

# 部署特定服務到生產環境
gh workflow run "Deploy to Cloud Run" --ref main \
  -f environment=production \
  -f services="user-service-fastapi,order-service-fastapi"

# 強制完整重新部署
gh workflow run "Deploy to Cloud Run" --ref staging \
  -f environment=staging \
  -f force_backend_redeploy=true \
  -f force_frontend_redeploy=true
```

## 🚀 設置步驟

### 1. 在GitHub倉庫中設置Secrets

1. 打開GitHub倉庫 → Settings → Secrets and variables → Actions
2. 點擊 "New repository secret"
3. 添加每個必需的secret

### 2. GCP Service Account設置

#### 創建Service Account

```bash
PROJECT_ID="orderly-472413"
SERVICE_ACCOUNT="orderly-cicd"

# 創建Service Account
gcloud iam service-accounts create $SERVICE_ACCOUNT \
  --description="CI/CD deployment service account" \
  --display-name="Orderly CI/CD"

# 生成密鑰文件
gcloud iam service-accounts keys create key.json \
  --iam-account="$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com"
```

#### 必需的GCP權限

為Service Account添加以下IAM角色：

```bash
SERVICE_ACCOUNT_EMAIL="orderly-cicd@$PROJECT_ID.iam.gserviceaccount.com"

# 核心權限
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/serviceusage.serviceUsageAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/cloudsql.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/redis.admin"

# 個別Service Account權限（如果使用use_service_accounts=true）
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/iam.serviceAccountAdmin"
```

#### 啟用必要的GCP APIs

```bash
# 啟用部署所需的APIs
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable compute.googleapis.com
```

### 3. 將Service Account密鑰添加到GitHub

```bash
# 將key.json內容轉換為base64並添加到GitHub Secrets
cat key.json | base64 | pbcopy
# 在GitHub中創建GCP_SA_KEY secret並貼上內容
```

### 4. 個別服務Service Account設置（可選）

如果啟用 `use_service_accounts=true`，系統會為每個服務創建獨立的 Service Account：

```bash
# 創建個別服務的Service Accounts
./scripts/iam/bootstrap-service-accounts.sh

# 手動創建範例
SERVICES=(
  api-gateway-fastapi
  user-service-fastapi
  order-service-fastapi
  product-service-fastapi
  acceptance-service-fastapi
  notification-service-fastapi
  customer-hierarchy-service-fastapi
  supplier-service-fastapi
)

for svc in "${SERVICES[@]}"; do
  sa_id="orderly-${svc}"
  gcloud iam service-accounts create "$sa_id" \
    --display-name="Orderly SA for $svc" \
    --project="$PROJECT_ID"
  
  # 最小權限：只能訪問Cloud SQL和Secret Manager
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${sa_id}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"
  
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${sa_id}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

## 🔒 安全最佳實踐

### 密鑰生成建議

```bash
# 生成強JWT密鑰
openssl rand -base64 32

# 生成資料庫密碼
openssl rand -base64 24
```

### 定期輪換

- **Service Account密鑰**: 每3個月輪換
- **JWT密鑰**: 每6個月輪換
- **資料庫密碼**: 每年輪換

### 權限最小化

Service Account只應具有部署所需的最小權限集。

## 🚨 故障排除

### 常見問題

**問題**: Permission denied to enable service [run.googleapis.com]
**解決**: 確保Service Account具有`roles/serviceusage.serviceUsageAdmin`權限

**問題**: Artifact Registry repository creation failed
**解決**: 確保已啟用artifactregistry.googleapis.com API

**問題**: JWT authentication failed
**解決**: 檢查JWT_SECRET和JWT_REFRESH_SECRET是否設置正確

### 驗證設置

```bash
# 檢查Service Account權限
gcloud projects get-iam-policy $PROJECT_ID \
  --filter="bindings.members:serviceAccount:orderly-cicd@$PROJECT_ID.iam.gserviceaccount.com"

# 檢查已啟用的APIs
gcloud services list --enabled

# 測試GitHub Secrets (在GitHub Actions中)
echo "GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}"
```

## 🚀 永久部署工作流 (deploy-staging-permanent.yml)

新增的永久部署工作流使用預配置的YAML文件進行部署，確保配置的一致性和可重現性。

### 使用方式

```bash
# 自動觸發（推送到staging分支）
git push origin staging

# 手動觸發
gh workflow run "Deploy Staging (Permanent)" --ref staging -f force_deploy=false
```

### 配置文件位置

永久部署使用 `configs/staging/` 目錄中的YAML配置文件：

- `configs/staging/api-gateway.yaml` - API閘道配置
- `configs/staging/user.yaml` - 用戶服務配置
- `configs/staging/product.yaml` - 產品服務配置
- 等等...

### 故障排除

**認證問題**: 確保已正確設置 `GCP_SA_KEY` 和 `GCP_PROJECT_ID` secrets
**配置缺失**: 檢查 `configs/staging/` 目錄中是否存在所有必需的YAML文件
**權限不足**: 確保Service Account具有Cloud Run Admin權限

## 📚 相關文檔

- [deploy.yml工作流](.github/workflows/deploy.yml) - 主要部署工作流
- [deploy-staging-permanent.yml工作流](.github/workflows/deploy-staging-permanent.yml) - 永久配置部署工作流
- [GCP部署腳本](scripts/deploy-cloud-run.sh) - Cloud Run部署腳本
- [永久部署腳本](scripts/deploy-staging-permanent.sh) - 永久配置部署腳本
- [Docker配置](docs/docker-containerization-summary.md) - 容器化文檔

---

## ⚙️ 服務路由配置

API Gateway 需要以下環境變數來路由請求到各微服務：

### 必需的環境變數

| 環境變數                     | 描述                        | 範例值                                    |
| --------------------------- | --------------------------- | ---------------------------------------- |
| `USER_SERVICE_URL`          | 用戶服務URL                 | https://orderly-user-service-fastapi-staging-v2-xxx.run.app |
| `ORDER_SERVICE_URL`         | 訂單服務URL                 | https://orderly-order-service-fastapi-staging-v2-xxx.run.app |
| `PRODUCT_SERVICE_URL`       | 產品服務URL                 | https://orderly-product-service-fastapi-staging-v2-xxx.run.app |
| `ACCEPTANCE_SERVICE_URL`    | 驗收服務URL（含/acceptance） | https://orderly-acceptance-service-fastapi-staging-v2-xxx.run.app/acceptance |
| `NOTIFICATION_SERVICE_URL`  | 通知服務URL                 | https://orderly-notification-service-fastapi-staging-v2-xxx.run.app |
| `CUSTOMER_HIERARCHY_SERVICE_URL` | 客戶層級服務URL        | https://orderly-custhier-staging-v2-xxx.run.app |
| `SUPPLIER_SERVICE_URL`      | 供應商服務URL               | https://orderly-supplier-service-fastapi-staging-v2-xxx.run.app |
| `USE_V2_BACKENDS`           | 是否使用v2後端服務           | true/false                               |

### 自動配置

這些環境變數由工作流的 "Configure Service Routing" 步驟自動設置：

```bash
# 工作流會自動執行以下邏輯
for service in api-gateway-fastapi user-service-fastapi order-service-fastapi ...; do
  url=$(gcloud run services describe "orderly-$service-$ENVIRONMENT${SERVICE_SUFFIX}" \
    --region="$GOOGLE_CLOUD_REGION" --format="value(status.url)")
  # 設置對應的環境變數
done

# 特例：customer-hierarchy-service-fastapi 搭配 ENV=staging、SERVICE_SUFFIX=-v2 時
# 服務實際名稱為 orderly-custhier-staging-v2，需改用短名稱查詢。
```

### 故障排除

如果發現 URL 配置有轉義問題（額外的反斜線），檢查工作流中的字符串處理：

```bash
# 錯誤的配置可能導致：
# "https://service.run.app\\"
# 應該是：
# "https://service.run.app"
```

---

**最後更新**: 2025-09-24  
**狀態**: ✅ 已整合v2環境和新版workflow inputs配置
