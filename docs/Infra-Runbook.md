# Orderly Infra Runbook (Staging v2 → Production)

This runbook summarizes day-2 ops for the parallel Cloud SQL + Cloud Run staging-v2 environment and the cutover.

## 0) Prereqs
- gcloud auth login; set `GOOGLE_CLOUD_PROJECT`.
- Ensure Artifact Registry repository `orderly` in `asia-east1` exists (workflows can create it).

## 1) Cloud SQL + Secrets
- Create or confirm `orderly-db-v2` (Postgres 15, `asia-east1`).
- Rotate DB password: `./scripts/secrets/rotate-postgres-password.sh '<new-password>'`.
- Required Secret: `postgres-password` (stored in Secret Manager; referenced by all Cloud Run services、Cloud Run Jobs、Cloud Build migrations)。

## 2) Service Accounts (least-privilege)
```
export GOOGLE_CLOUD_PROJECT=<project>
./scripts/iam/bootstrap-service-accounts.sh
```
Grants: `roles/cloudsql.client`, `roles/secretmanager.secretAccessor`。腳本會建立縮寫的 Service Account（例如 `orderly-apigw-fastapi@<project>.iam.gserviceaccount.com`）；請確認部署者（例如 `yl@tsaitung.com`）擁有 `roles/iam.serviceAccountUser`，才能 `actAs` 這些帳戶。

### 2.1) 遷移 Runner Service Account
資料庫遷移與種子資料導入採 Cloud Run Job/Cloud Build，統一使用 `orderly-migration@<project>.iam.gserviceaccount.com`：

```bash
gcloud iam service-accounts create orderly-migration \
  --display-name "Orderly Migration Runner"

for role in cloudsql.client secretmanager.secretAccessor logging.logWriter; do
  gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
    --member="serviceAccount:orderly-migration@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com" \
    --role="roles/$role"
done
```

此帳號供 Cloud Build / Cloud Run Job 使用。若透過 `gcloud builds submit`，需傳入 `--substitutions=_MIGRATION_SA=orderly-migration@...`（參見下文）。

## 3) (Optional) Serverless VPC Connector (for Memorystore)
```
./scripts/vpc/setup-serverless-connector.sh asia-east1 default orderly-svpc-connector 10.8.0.0/28
```

## 4) CI/CD Deployment (staging-v2)
Trigger GitHub Action: Deploy to Cloud Run（工作流程會使用前一步建立的專用 Service Account，避免回到預設 compute SA）
- environment: `staging`
- db_instance_name: `orderly-db-v2`
- service_suffix: `-staging-v2`
- use_v2_backends: `true`
- use_service_accounts: `true`

The workflow builds/pushes images, deploys services with Cloud SQL binding and Secrets, updates the API Gateway routing, deploys frontend, then runs health + smoke checks.

### 4.1) Database Migration & Seed via Cloud Build / Cloud Run Job

除部署外，資料庫遷移與測試資料種子透過專用 Cloud Build/Run Job 條件化執行：

- Cloud Build 檔案：`scripts/cloudbuild/migration-job.yaml`
  - 以 `orderly-migration` Service Account 跑 `alembic upgrade head`
  - 需傳參數：
    ```bash
    gcloud builds submit \
      --config=scripts/cloudbuild/migration-job.yaml \
      --substitutions=_REGION=asia-east1,_INSTANCE=orderly-472413:asia-east1:orderly-db-v2,_SERVICE_ACCOUNT=orderly-migration@orderly-472413.iam.gserviceaccount.com,_SECRET_NAME=postgres-password
    ```

- Cloud Run Job（種子資料）：`gcloud run jobs create orderly-seed-data ...`
  - Image 可使用 `asia-east1-docker.pkg.dev/orderly-472413/orderly/orderly-seeder:latest`（Dockerfile 存於 `scripts/database/Dockerfile.seed`）
  - 必要參數：
    ```bash
    gcloud run jobs create orderly-seed-data \
      --image=asia-east1-docker.pkg.dev/orderly-472413/orderly/orderly-seeder:latest \
      --region=asia-east1 \
      --service-account=orderly-migration@orderly-472413.iam.gserviceaccount.com \
      --add-cloudsql-instances=orderly-472413:asia-east1:orderly-db-v2 \
      --set-env-vars=DATABASE_HOST=/cloudsql/orderly-472413:asia-east1:orderly-db-v2,DATABASE_PORT=5432,DATABASE_NAME=orderly,DATABASE_USER=orderly \
      --set-secrets=POSTGRES_PASSWORD=postgres-password:latest
    gcloud run jobs execute orderly-seed-data --region=asia-east1
    ```

上述 Job 預設會呼叫 `python scripts/database/seed_from_real_data.py --force`。

### 4.2) Service Routing & Health Endpoints

- API Gateway `service_map`
  - `users` → `${USER_SERVICE_URL}` (`orderly-user-service-fastapi-<env><suffix>`)
  - `orders` → `${ORDER_SERVICE_URL}`
  - `products` → `${PRODUCT_SERVICE_URL}`
  - `acceptance` → `${ACCEPTANCE_SERVICE_URL}`（注意：需附 `/acceptance` 路徑）
  - `notifications` → `${NOTIFICATION_SERVICE_URL}`
  - `customer_hierarchy_v2` → `${CUSTOMER_HIERARCHY_SERVICE_URL}`
  - `suppliers` → `${SUPPLIER_SERVICE_URL}`
  - 以上 URL 必須為 Cloud Run HTTPS Endpoint，不得保留 `http://localhost`。

- 核心健康檢查端點
  - API Gateway: `/health`, `/ready`, `/service-map`
  - User / Order / Product / Supplier / Notification Service: `/health`, `/db/health`
  - Acceptance Service: `/acceptance/health`, `/acceptance/db/health`
  - Customer Hierarchy Service: `/health`, `/db/health`, `/api/v2/health`, `/api/v2/health/live`, `/api/v2/health/ready`

- 部署後請執行 `scripts/db/diag.sh` 驗證上述 URL、Service Account 及 Cloud SQL 綁定皆已生效；任何仍保留 `localhost` / 預設 SA 的服務需立即更新。

## 5) Validation
- Gateway readiness: `GET /ready` → `status=ready`, lists unhealthy services and errors.
- DB health: `GET /db/health` per service.
- Service map: `GET /service-map` for configured URLs.
- Diagnostics: `PROJECT_ID=<proj> ENV=staging SERVICE_SUFFIX=-staging-v2 ./scripts/db/diag.sh`

## 6) Cutover
- Update frontend env to point to new API Gateway URL (v2):
  - `ORDERLY_BACKEND_URL`, `BACKEND_URL`, `NEXT_PUBLIC_API_BASE_URL`
- Keep old gateway for 24–48 hours; rollback is just switching URLs back.

## 7) Cleanup
- After stable period, delete old Cloud Run services and (optionally) old SQL instance.

## 8) Monitoring & Alerting
- Cloud SQL 連線拒絕告警：
  - 指標：`logging.googleapis.com/user/cloudsql-proxy`（或 Cloud SQL `connections` 失敗計數）。
  - 條件：5 分鐘內出現 `connection refused` / `CannotConnectNow` 日誌 ≥ 3 次。
  - 動作：通知值班人員或 Slack `#orderly-infra`。
- 自動化腳本：`scripts/monitoring/setup-staging-v2-alerts.sh` 會一次性建立上述三個策略（需先設定 `GOOGLE_CLOUD_PROJECT`、`NOTIFICATION_CHANNEL`）。
- Serverless VPC Connector 監控：
  - 指標：`run.googleapis.com/instance/connectors/restarts`。
  - 條件：1 小時內重啟次數 > 0 即發出告警，並附上對應 Cloud Run 服務名稱。
- Redis（Memorystore）快取：
  - 指標：`redis.googleapis.com/memory_usage_percent`、`redis.googleapis.com/connected_clients`。
  - 門檻：記憶體使用率 > 80%，或連線數趨於 0（服務可能離線）。
  - 搭配 `scripts/test-redis-connection.sh` 自動化腳本，部署後驗證 `cache.state` 是否為 `ready`。

## 9) Retire “staging” Legacy Environment（詳細計畫）
### Phase 0 ─ Kickoff
- 指派 RACI（Infra：R、Backend/Frontend：A/C、Biz QA：I）。
- 建立追蹤表（gSheet/Notion），欄位：資源類型、名稱、用途、遷移狀態、回滾方案、Owner、ETA。

### Phase 1 ─ 資產盤點
- 指令：
  - `gcloud run services list --region=asia-east1 --filter="name~staging$"`
  - `gcloud secrets list --filter="staging"`
  - `gcloud scheduler jobs list --filter="staging"`
- 文件掃描：`rg "-staging" docs scripts`, `rg "staging-" docs scripts`。
- 產出：Cloud Run、Secret Manager、Scheduler、Artifact Registry、CI 工作流程、Terraform 變數的完整清單。

### Phase 2 ─ 遷移準備
- 更新程式碼/文件：改用 `staging-v2` 或參數化環境名稱，PR 需附驗證（健康檢查 / 關鍵 API 呼叫）。
- Secrets：✅ 已完成遷移至分離式變數架構（`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `POSTGRES_PASSWORD`）；清理遺留的 `DATABASE_URL_*` GitHub Secrets。
- CI/CD：
  - Workflow 預設 `service_suffix=-v2`。
  - 加入服務名稱長度與 `DATABASE_PORT` 靜態檢查。
- Terraform：更新變數、資源名稱，跑 `terraform plan` 確認僅有預期變更。

### Phase 3 ─ 切換與驗證
- 宣告凍結窗並通知團隊（Slack/Email）。
- 在 `staging-v2` 執行完整驗證：
  - `ENV=staging-v2 ./scripts/health-check-simple.sh`
  - `ENV=staging-v2 SERVICE_SUFFIX=-v2 ./scripts/run_plan_checks.sh`
  - 手動驗證主要 BFF / UI 流程。
- 監控確認：Cloud SQL、VPC、Redis 告警無觸發。
- 收到 Backend/Frontend/QA 三方書面 sign-off。

### Phase 4 ─ 執行退場
- 停止舊服務流量：`gcloud run services update-traffic <svc> --region=asia-east1 --to-revisions=<latest>=0`，保留 24h。
- 備份並刪除：舊 Cloud Run、Scheduler、Secrets、Artifact Registry 映像與自動化腳本；必要時另存 GCS。
- Terraform & Docs 清理：移除舊環境設定，更新 runbook 與 README。
- 最終驗證：再次跑健康檢查腳本、確認告警儀表；產出退場報告與回滾步驟（可重新部署舊映像並恢復 Secret 版本）。
