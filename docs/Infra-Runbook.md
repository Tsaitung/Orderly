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
      --set-env-vars=DATABASE_HOST=/cloudsql/orderly-472413:asia-east1:orderly-db-v2,DATABASE_NAME=orderly,DATABASE_USER=orderly \
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
