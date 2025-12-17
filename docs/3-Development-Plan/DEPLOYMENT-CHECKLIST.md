# 部署檢查清單（Cloud Run）

> **提示**：本檢查清單與 `Infra-Runbook.md` 搭配使用，內含 Cloud Build / Cloud Run Job 的遷移與導數流程。若與舊版文件衝突，以本文件與 Runbook 為準。

完整的井然 Orderly 平台部署檢查清單，涵蓋前端 Next.js 和後端 FastAPI 微服務在 Cloud Run 的部署驗證。

## 📋 部署前檢查

> 💡 建議先執行 `ENV=<env> SERVICE_SUFFIX=<suffix> ./scripts/db/diag.sh`，一次取得所有 Cloud Run 服務的健康狀態、Cloud SQL 綁定與 Service Account 設定，再針對異常項目逐一核對下列清單。

### GitHub Secrets 驗證

- [ ] `GCP_SA_KEY` - GCP Service Account JSON 密鑰已設置
- [ ] `GCP_PROJECT_ID` - 專案ID為 `orderly-472413`
- [ ] `POSTGRES_PASSWORD` - 資料庫密碼已在 Secret Manager 中
- [ ] `JWT_SECRET` 和 `JWT_REFRESH_SECRET` - JWT 密鑰已設置

### Cloud SQL 實例檢查

- [ ] **生產環境**: `orderly-db` 實例可用（main 分支部署）
- [ ] **測試環境**: `orderly-db-v2` 實例可用（staging 分支部署）
- [ ] 資料庫連接字符串格式：`/cloudsql/orderly-472413:asia-east1:<instance-name>`
- [ ] 資料庫用戶 `orderly` 已創建並有適當權限
- [ ] Secret Manager 中存在 `postgres-password`（by default，在 Cloud Run / Job / Build 中使用）
- [ ] `orderly-migration@orderly-472413.iam.gserviceaccount.com` Service Account 已存在，並具備 `cloudsql.client`、`secretmanager.secretAccessor`、`logging.logWriter`

### 工作流參數配置

根據部署需求配置以下參數（`ci-secrets.md` 查看完整說明）：

- [ ] `environment`: staging 或 production
- [ ] `db_instance_name`: 指定 Cloud SQL 實例（可選）
- [ ] `service_suffix`: 服務名稱後綴（如 `-v2`）
- [ ] `use_v2_backends`: 是否使用 v2 後端服務
- [ ] `services`: 指定要部署的服務（可選）

## 🎯 前端部署驗證

### 環境變數與優先順序

- 伺服端 `backendUrl` 解析優先序：
  - 1) `ORDERLY_BACKEND_URL`
  - 2) `BACKEND_URL`
  - 3) 自 `NEXT_PUBLIC_API_BASE_URL` 推導（取其 Origin，例如 `https://gateway.run.app`）
  - 4) 回退 `http://localhost:8000`
- 推薦：部署時以 gcloud CLI 在執行期注入三者（至少前兩者），避免依賴 build-time 的 publicRuntimeConfig。

### gcloud 部署前端（示例）

```bash
ENVIRONMENT=staging
PROJECT="<your-gcp-project>"
REGION="asia-east1"
IMAGE="asia-east1-docker.pkg.dev/$PROJECT/orderly/orderly-frontend:$ENVIRONMENT-<sha>"
BACKEND_URL="https://orderly-api-gateway-fastapi-$ENVIRONMENT-xxxxx.run.app"

# 部署前端，於執行時注入環境變數
 gcloud run deploy "orderly-frontend-$ENVIRONMENT" \
  --image="$IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=$ENVIRONMENT,ORDERLY_BACKEND_URL=$BACKEND_URL,BACKEND_URL=$BACKEND_URL,NEXT_PUBLIC_API_BASE_URL=$BACKEND_URL/api" \
  --memory=1Gi --cpu=1 --min-instances=0 --max-instances=10 --concurrency=100 --port=8080
```

說明：
- `ORDERLY_BACKEND_URL` 與 `BACKEND_URL` 供伺服端於執行時讀取。
- `NEXT_PUBLIC_API_BASE_URL` 提供瀏覽器端使用，且伺服端可在缺省時據此推導（保險機制）。

### 本地開發 .env.local 建議

```env
ORDERLY_BACKEND_URL=http://localhost:8000
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

### 前端部署後驗證

- 呼叫前端服務的 `GET /api/env-check`，檢查：
  - `raw_environment_variables.ORDERLY_BACKEND_URL` 與 `BACKEND_URL` 應等於 Cloud Run API Gateway 根網址
  - `computed_config.backendUrl` 應與上列相同
  - `validation.backend_url_resolved = true`

### 注意事項（Next.js App Router + Standalone）

- 不使用 `publicRuntimeConfig` 作為執行時變數來源；僅使用 `process.env`（伺服端）與 `NEXT_PUBLIC_*`（瀏覽器端）。
- Standalone 輸出模式下，環境變數必須由 Cloud Run 執行時注入，而非建置時硬編碼。

## ⚙️ 後端服務部署驗證

### 8個核心微服務檢查

所有後端服務都應該完成以下檢查：

#### API Gateway (api-gateway-fastapi)
- [ ] 服務已部署：`orderly-api-gateway-fastapi-{environment}{suffix}`
- [ ] 健康檢查：`GET /health` 返回 200
- [ ] 服務映射：`GET /service-map` 顯示所有服務URL配置
- [ ] 就緒檢查：`GET /ready` 驗證下游服務連接
- [ ] 環境變數配置：
  - [ ] `USER_SERVICE_URL`
  - [ ] `ORDER_SERVICE_URL`
  - [ ] `PRODUCT_SERVICE_URL`
  - [ ] `ACCEPTANCE_SERVICE_URL`
  - [ ] `NOTIFICATION_SERVICE_URL`
  - [ ] `CUSTOMER_HIERARCHY_SERVICE_URL`
  - [ ] `SUPPLIER_SERVICE_URL`
  - [ ] `USE_V2_BACKENDS`

#### 用戶服務 (user-service-fastapi)
- [ ] 服務已部署：`orderly-user-service-fastapi-{environment}{suffix}`
- [ ] 健康檢查：`GET /health` 返回 200
- [ ] 資料庫健康：`GET /db/health` 返回 healthy
- [ ] 資料庫連接配置：
  - [ ] `DATABASE_HOST`: `/cloudsql/orderly-472413:asia-east1:{instance}`
  - [ ] `DATABASE_NAME`: `orderly`
  - [ ] `DATABASE_USER`: `orderly`
  - [ ] `POSTGRES_PASSWORD`: 來自 Secret Manager

#### 訂單服務 (order-service-fastapi)
- [ ] 服務已部署：`orderly-order-service-fastapi-{environment}{suffix}`
- [ ] 健康檢查：`GET /health` 返回 200
- [ ] 資料庫健康：`GET /db/health` 返回 healthy
- [ ] 資料庫連接配置：同用戶服務

#### 產品服務 (product-service-fastapi)
- [ ] 服務已部署：`orderly-product-service-fastapi-{environment}{suffix}`
- [ ] 健康檢查：`GET /health`（若未實作，請以 `diag.sh` 輸出為準）
- [ ] 資料庫健康：`GET /db/health` 返回 healthy
- [ ] 資料庫連接配置：同用戶服務

#### 驗收服務 (acceptance-service-fastapi)
- [ ] 服務已部署：`orderly-acceptance-service-fastapi-{environment}{suffix}`
- [ ] 健康檢查：`GET /acceptance/health` 返回 200
- [ ] 資料庫健康：`GET /acceptance/db/health` 返回 healthy
- [ ] 資料庫連接配置：同用戶服務

#### 通知服務 (notification-service-fastapi)
- [ ] 服務已部署：`orderly-notification-service-fastapi-{environment}{suffix}`
- [ ] 健康檢查：`GET /health` 返回 200
- [ ] 資料庫健康：`GET /db/health` 返回 healthy
- [ ] 資料庫連接配置：同用戶服務

#### 客戶層級服務 (customer-hierarchy-staging)
- [ ] 服務已部署：`orderly-customer-hierarchy-{environment}{suffix}`（`staging-v2` 例外：請確認 `orderly-custhier-staging-v2`）
- [ ] 健康檢查：`GET /health` 返回 200
- [ ] 資料庫健康：`GET /db/health` 返回 healthy
- [ ] API v2健康：`GET /api/v2/health` 返回 200
- [ ] 資料庫連接配置：同用戶服務

#### 供應商服務 (supplier-service-fastapi)
- [ ] 服務已部署：`orderly-supplier-service-fastapi-{environment}{suffix}`
- [ ] 健康檢查：`GET /health` 返回 200
- [ ] 資料庫健康：`GET /db/health` 返回 healthy
- [ ] 資料庫連接配置：同用戶服務

### 統一診斷腳本

使用 `scripts/db/diag.sh` 批量檢查所有服務狀態：

```bash
# 檢查 staging-v2 環境
ENV=staging SERVICE_SUFFIX=-v2 ./scripts/db/diag.sh

# 檢查生產環境
ENV=production ./scripts/db/diag.sh
```

腳本會自動檢查：
- Cloud Run 服務部署狀態
- Cloud SQL 連接配置
- 資料庫環境變數設置
- Service Account 配置
- `/health` 和 `/db/health` 端點狀態
- Correlation ID 追蹤

## 🗄️ 資料庫遷移與測試資料導入

### Cloud Build：執行 Alembic 遷移

```bash
gcloud builds submit \
  --config=scripts/cloudbuild/migration-job.yaml \
  --substitutions=_REGION=asia-east1,_INSTANCE=orderly-472413:asia-east1:orderly-db-v2,_SERVICE_ACCOUNT=orderly-migration@orderly-472413.iam.gserviceaccount.com
```

說明：
- 建置 `migration-runner` 映像並更新 `migration-job` Cloud Run Job
- Job 以 `orderly-migration` 帳號執行 `alembic upgrade head`
- 若需要指定特定資料庫，可額外傳 `_DATABASE_NAME`、`_DATABASE_USER`、`_SECRET_NAME`

### Cloud Run Job：導入測試資料

```bash
gcloud run jobs create orderly-seed-data \
  --image=asia-east1-docker.pkg.dev/orderly-472413/orderly/orderly-seeder:latest \
  --region=asia-east1 \
  --service-account=orderly-migration@orderly-472413.iam.gserviceaccount.com \
  --add-cloudsql-instances=orderly-472413:asia-east1:orderly-db-v2 \
  --set-env-vars=DATABASE_HOST=/cloudsql/orderly-472413:asia-east1:orderly-db-v2,DATABASE_PORT=5432,DATABASE_NAME=orderly,DATABASE_USER=orderly \
  --set-secrets=POSTGRES_PASSWORD=postgres-password:latest

gcloud run jobs execute orderly-seed-data --region=asia-east1 --wait
```

容器會執行 `python scripts/database/seed_from_real_data.py --force`，將 suppliers/customers/categories/skus 等測試資料導入 Cloud SQL。請先確認 `scripts/database/data/*.json` 無語法錯誤。

## 🔍 故障排除檢查清單

### 常見資料庫連接問題

- [ ] **Connection refused [Errno 111]**
  - 檢查 `DATABASE_HOST` 是否使用 Unix socket 格式
  - 確認 Cloud SQL 實例狀態
  - 驗證 Service Account 有 `cloudsql.client` 權限

- [ ] **認證失敗**
  - 確認 `POSTGRES_PASSWORD` 指向正確的 Secret Manager 版本
  - 檢查資料庫用戶 `orderly` 是否存在

- [ ] **服務無法找到**
  - 確認服務名稱格式：`orderly-{service}-{environment}{suffix}`
  - 檢查 GitHub Actions workflow inputs 配置

### API Gateway 路由問題

- [ ] **服務 URL 轉義問題**
  - 檢查 `/service-map` 端點輸出
  - 確認環境變數中沒有額外反斜線
  - 驗證 workflow "Configure Service Routing" 步驟

- [ ] **下游服務不健康**
  - 使用 `/ready` 端點檢查所有服務狀態
  - 檢查個別服務的 `/health` 端點
  - 確認服務間網絡連接

## 📊 部署成功驗證

### 煙霧測試

部署完成後執行以下驗證：

1. **API Gateway**
   ```bash
   # 基礎健康檢查
   curl https://orderly-api-gateway-fastapi-staging-v2-xxx.run.app/health
   
   # 服務映射檢查
   curl https://orderly-api-gateway-fastapi-staging-v2-xxx.run.app/service-map
   
   # 就緒狀態檢查
   curl https://orderly-api-gateway-fastapi-staging-v2-xxx.run.app/ready
   ```

2. **個別服務**（使用診斷腳本或手動）
   ```bash
   # 用戶服務資料庫連接
   curl https://orderly-user-service-fastapi-staging-v2-xxx.run.app/db/health
   
   # 供應商服務 API
   curl https://orderly-supplier-service-fastapi-staging-v2-xxx.run.app/health
   ```

3. **前端服務**
   ```bash
   # 環境變數檢查
   curl https://orderly-frontend-staging-xxx.run.app/api/env-check
   ```

### 回滾準備

- [ ] 記錄部署前的服務版本
- [ ] 確認回滾策略（Blue-Green vs Canary）
- [ ] 準備回滾命令或 GitHub Actions workflow

---

## 📚 相關文檔

- [CI/CD Secrets 配置](ci-secrets.md) - 完整的 secrets 和環境變數設置
- [資料庫診斷腳本](../../scripts/db/diag.sh) - 批量服務狀態檢查
- [GitHub Actions 部署工作流](../../.github/workflows/deploy.yml) - 主要部署流程
- [Docker 容器化策略](../0-Design/docker-containerization-summary.md) - 容器構建和配置

---

**最後更新**: 2025-09-24  
**狀態**: ✅ 已整合前後端服務完整檢查清單
