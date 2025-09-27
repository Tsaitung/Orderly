# 部署故障排除指南

井然 Orderly 平台部署過程中常見問題的診斷與解決方案。

## 🚨 緊急故障處理流程

### 1. 立即響應 (0-5分鐘)
1. **確認故障範圍**：單服務 vs 全平台
2. **檢查監控面板**：DataDog、New Relic、Cloud Console
3. **評估用戶影響**：是否影響核心業務流程
4. **決定是否回滾**：如果是新部署導致的問題

### 2. 快速診斷 (5-15分鐘)
```bash
# 使用統一診斷腳本
ENV=production ./scripts/db/diag.sh

# 檢查API Gateway狀態
curl https://api.orderly.com/ready
curl https://api.orderly.com/service-map
```

### 3. 緊急修復 (15-30分鐘)
- **回滾策略**：使用GitHub Actions重新部署上一個穩定版本
- **流量切換**：暫時切換到備用環境
- **服務重啟**：重啟有問題的微服務

## 🗄️ 資料庫連接問題

### Connection Refused [Errno 111]

**快速檢查流程（依序執行）**：
1. `ENV=<env> SERVICE_SUFFIX=<suffix> ./scripts/db/diag.sh` — 一次檢查所有服務的 `/health`、`/db/health`、Cloud SQL 綁定、Service Account。
2. `gcloud run services describe <service> --region=asia-east1 --project=orderly-472413 --format="value(spec.template.metadata.annotations.\"run.googleapis.com/cloudsql-instances\")"` — 確認 annotation 指向 `orderly-472413:asia-east1:orderly-db-v2`。
3. `gcloud run services describe <service> --region=asia-east1 --project=orderly-472413 --format="value(spec.template.spec.serviceAccountName)"` — 需為專用帳號，例如 `orderly-product-fastapi@orderly-472413.iam.gserviceaccount.com`。
4. `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="<service>"' --project=orderly-472413 --limit=50 --format="value(textPayload)"` — 直接查看最新錯誤訊息，確認實際連線主機與埠號。
5. 若所有服務同時回報 `Connection refused`，檢查 `orderly-db-v2` 是否關閉、維護或未開放網路：`gcloud sql instances describe orderly-db-v2 --project=orderly-472413 --format="value(state)"`。
6. 排除連線問題後，執行 `SELECT to_regclass('public.products');` 驗證核心資料表是否存在，必要時重跑 Alembic 遷移建立 schema。

**症狀**：
```
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) 
could not connect to server: Connection refused [Errno 111]
```

**原因分析**：
1. Cloud Run 未綁定 Cloud SQL（annotation 遺漏或指向舊實例）
2. Unix socket 路徑或 `DATABASE_HOST` 設定錯誤
3. 服務使用預設 Compute Engine 帳號，缺少 `cloudsql.client` 權限
4. Secret 或環境變數覆蓋導致密碼錯誤

**診斷步驟**：
```bash
# 1. 使用統一診斷腳本
ENV=staging SERVICE_SUFFIX=-staging ./scripts/db/diag.sh

# 2. 檢查 Cloud Run annotation
gcloud run services describe orderly-product-service-fastapi-staging \
  --region=asia-east1 --project=orderly-472413 \
  --format="value(spec.template.metadata.annotations.\"run.googleapis.com/cloudsql-instances\")"

# 3. 確認 Service Account
gcloud run services describe orderly-product-service-fastapi-staging \
  --region=asia-east1 --project=orderly-472413 \
  --format="value(spec.template.spec.serviceAccountName)"

# 4. 查看最新錯誤日誌
gcloud logging read 'resource.type="cloud_run_revision" \
  AND resource.labels.service_name="orderly-product-service-fastapi-staging"' \
  --project=orderly-472413 --limit=50 --format="value(textPayload)"
```

**解決方案**：
```bash
# 修復1：確保DATABASE_HOST使用正確的Unix socket路徑
# 正確格式：/cloudsql/orderly-472413:asia-east1:orderly-db-v2
DATABASE_HOST=/cloudsql/orderly-472413:asia-east1:orderly-db-v2

# 修復2：添加必要的IAM權限
gcloud projects add-iam-policy-binding orderly-472413 \
  --member="serviceAccount:orderly-user-service@orderly-472413.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# 修復3：重新部署並補上 Cloud SQL annotation
gcloud run deploy orderly-product-service-fastapi-staging \
  --image=asia-east1-docker.pkg.dev/orderly-472413/orderly/product-service-fastapi:latest \
  --region=asia-east1 \
  --service-account=orderly-product-fastapi@orderly-472413.iam.gserviceaccount.com \
  --set-env-vars=DATABASE_HOST=/cloudsql/orderly-472413:asia-east1:orderly-db-v2,DATABASE_NAME=orderly,DATABASE_USER=orderly \
  --set-secrets=POSTGRES_PASSWORD=postgres-password:latest \
  --add-cloudsql-instances=orderly-472413:asia-east1:orderly-db-v2
```

### 認證失敗 Authentication Failed

**症狀**：
```
psycopg2.OperationalError: FATAL: password authentication failed for user "orderly"
```

**診斷步驟**：
```bash
# 1. 檢查Secret Manager中的密碼版本
gcloud secrets versions list postgres-password --project=orderly-472413

# 2. 驗證密碼是否正確
POSTGRES_PASSWORD=$(gcloud secrets versions access latest --secret=postgres-password --project=orderly-472413)
echo "Password length: ${#POSTGRES_PASSWORD}"

# 3. 測試資料庫連接
gcloud sql connect orderly-db-v2 --user=orderly --project=orderly-472413
```

**解決方案**：
```bash
# 修復1：輪換資料庫密碼
./scripts/secrets/rotate-postgres-password.sh

# 修復2：重新創建資料庫用戶
NEW_PASSWORD=$(gcloud secrets versions access latest --secret=postgres-password --project=orderly-472413)
gcloud sql users set-password orderly \
  --instance=orderly-db-v2 \
  --password="$NEW_PASSWORD" \
  --project=orderly-472413
```

## 🌐 Cloud Run 服務問題

### 服務部署失敗

**症狀**：
- GitHub Actions workflow失敗
- 服務無法啟動
- 健康檢查失敗

**診斷步驟**：
```bash
# 1. 檢查服務狀態
gcloud run services describe orderly-api-gateway-fastapi-staging-v2 \
  --region=asia-east1 --project=orderly-472413

# 2. 查看服務日誌
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=orderly-api-gateway-fastapi-staging-v2" \
  --project=orderly-472413 --limit=50

# 3. 檢查最近的部署
gcloud run revisions list --service=orderly-api-gateway-fastapi-staging-v2 \
  --region=asia-east1 --project=orderly-472413
```

**常見錯誤與解決方案**：

#### 鏡像拉取失敗
```bash
# 錯誤: Failed to pull image
# 檢查Artifact Registry權限
gcloud artifacts repositories get-iam-policy orderly \
  --location=asia-east1 --project=orderly-472413

# 修復：添加必要權限
gcloud artifacts repositories add-iam-policy-binding orderly \
  --location=asia-east1 --project=orderly-472413 \
  --member="serviceAccount:orderly-cicd@orderly-472413.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

#### 端口配置錯誤
```bash
# 錯誤: Container failed to start. Failed to start and then listen on the port
# 檢查端口配置
gcloud run services describe orderly-user-service-fastapi-staging-v2 \
  --region=asia-east1 --format='value(spec.template.spec.containers[0].ports[0].containerPort)'

# 修復：更新端口配置
gcloud run services update orderly-user-service-fastapi-staging-v2 \
  --region=asia-east1 --port=8080 --project=orderly-472413
```

#### 環境變數缺失
```bash
# 診斷：檢查環境變數配置
gcloud run services describe orderly-user-service-fastapi-staging-v2 \
  --region=asia-east1 --format='export' | grep -A20 env

# 修復：更新環境變數
gcloud run services update orderly-user-service-fastapi-staging-v2 \
  --region=asia-east1 \
  --set-env-vars="DATABASE_HOST=/cloudsql/orderly-472413:asia-east1:orderly-db-v2,DATABASE_NAME=orderly"
```

### 服務健康檢查失敗

**診斷步驟**：
```bash
# 1. 檢查健康端點
SERVICE_URL=$(gcloud run services describe orderly-user-service-fastapi-staging-v2 \
  --region=asia-east1 --format='value(status.url)')

curl -v "$SERVICE_URL/health"
curl -v "$SERVICE_URL/db/health"

# 2. 檢查服務日誌中的錯誤
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=orderly-user-service-fastapi-staging-v2" \
  --filter="severity>=WARNING" --limit=20
```

**解決方案**：
```bash
# 修復1：重新部署服務
gcloud run services replace-traffic orderly-user-service-fastapi-staging-v2 \
  --region=asia-east1 --to-latest --project=orderly-472413

# 修復2：檢查數據庫遷移
cd backend/user-service-fastapi
PYTHONPATH=. alembic upgrade head
```

## 🔧 GitHub Actions CI/CD 問題

### Workflow 輸入參數錯誤

**症狀**：
```
Error: Unexpected inputs provided: service_suffix, db_instance_name
```

**解決方案**：
```bash
# 確保推送更新到正確分支
git add .github/workflows/deploy.yml
git commit -m "fix: update workflow inputs"
git push origin staging

# 等待GitHub同步後再觸發workflow
sleep 30
gh workflow run "Deploy to Cloud Run" --ref staging -f environment=staging
```

### gcloud 命令錯誤

**常見錯誤**：
```bash
# 錯誤1: Invalid argument --location for gcloud artifacts docker images describe
# 修復：移除 --location 參數

# 錯誤2: Service account does not exist
# 修復：創建Service Account
gcloud iam service-accounts create orderly-user-service \
  --project=orderly-472413 \
  --display-name="Orderly User Service"
```

### Docker 建構失敗

**診斷步驟**：
```bash
# 1. 本地測試Docker建構
cd backend/user-service-fastapi
docker build -t test-user-service .

# 2. 檢查Dockerfile語法
docker run --rm -i hadolint/hadolint < Dockerfile

# 3. 檢查依賴文件
ls -la requirements.txt package*.json
```

## 🔗 API Gateway 路由問題

### 服務URL轉義問題

**症狀**：
```json
{
  "service_urls": {
    "user_service": "https://orderly-user-service-fastapi-staging-v2-xxx.run.app\\",
    "order_service": "https://orderly-order-service-fastapi-staging-v2-xxx.run.app\\"
  }
}
```

**原因**：工作流程中的shell轉義問題

**診斷步驟**：
```bash
# 檢查API Gateway的service-map端點
curl -s https://orderly-api-gateway-fastapi-staging-v2-xxx.run.app/service-map | jq .service_urls
```

**解決方案**：
在 `.github/workflows/deploy.yml` 的 "Configure Service Routing" 步驟中修復字符串處理：
```yaml
# 修復前（錯誤）
--set-env-vars="USER_SERVICE_URL=\"$USER_SERVICE_URL\""

# 修復後（正確）
--set-env-vars="USER_SERVICE_URL=$USER_SERVICE_URL"
```

### 下游服務連接失敗

**診斷步驟**：
```bash
# 1. 檢查API Gateway的ready端點
curl https://orderly-api-gateway-fastapi-staging-v2-xxx.run.app/ready | jq

# 2. 手動測試下游服務連接
curl https://orderly-user-service-fastapi-staging-v2-xxx.run.app/health
curl https://orderly-order-service-fastapi-staging-v2-xxx.run.app/health
```

**解決方案**：
```bash
# 修復1：檢查並更新環境變數
gcloud run services update orderly-api-gateway-fastapi-staging-v2 \
  --region=asia-east1 \
  --set-env-vars="USER_SERVICE_URL=https://orderly-user-service-fastapi-staging-v2-xxx.run.app"

# 修復2：重啟API Gateway服務
gcloud run services replace-traffic orderly-api-gateway-fastapi-staging-v2 \
  --region=asia-east1 --to-latest
```

## 🔐 權限與安全問題

### Service Account 權限不足

**症狀**：
```
Error: Permission 'cloudsql.instances.connect' denied on resource
Error: Permission 'secretmanager.versions.access' denied on resource
```

**診斷步驟**：
```bash
# 檢查Service Account權限
SA_EMAIL="orderly-user-service@orderly-472413.iam.gserviceaccount.com"
gcloud projects get-iam-policy orderly-472413 \
  --filter="bindings.members:serviceAccount:$SA_EMAIL"
```

**解決方案**：
```bash
# 添加必要的IAM權限
gcloud projects add-iam-policy-binding orderly-472413 \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding orderly-472413 \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

### JWT Token 驗證失敗

**症狀**：
```json
{"detail": "Invalid token"}
{"detail": "Missing bearer token"}
```

**診斷步驟**：
```bash
# 檢查JWT_SECRET配置
gcloud run services describe orderly-api-gateway-fastapi-staging-v2 \
  --region=asia-east1 --format='export' | grep JWT_SECRET

# 測試API端點
curl -H "Authorization: Bearer $TEST_TOKEN" \
  https://orderly-api-gateway-fastapi-staging-v2-xxx.run.app/api/users/me
```

## 📊 性能與資源問題

### 記憶體不足

**症狀**：
```
Container terminated due to memory limit exceeded
```

**診斷步驟**：
```bash
# 檢查記憶體配置
gcloud run services describe orderly-user-service-fastapi-staging-v2 \
  --region=asia-east1 --format='value(spec.template.spec.containers[0].resources.limits.memory)'

# 查看記憶體使用情況
gcloud logs read "resource.type=cloud_run_revision" \
  --filter="textPayload:memory" --limit=10
```

**解決方案**：
```bash
# 增加記憶體限制
gcloud run services update orderly-user-service-fastapi-staging-v2 \
  --region=asia-east1 --memory=2Gi --project=orderly-472413
```

### 冷啟動問題

**症狀**：首次請求響應時間過長

**解決方案**：
```bash
# 設定最小實例數
gcloud run services update orderly-api-gateway-fastapi-staging-v2 \
  --region=asia-east1 --min-instances=1 --project=orderly-472413

# 配置CPU始終分配
gcloud run services update orderly-api-gateway-fastapi-staging-v2 \
  --region=asia-east1 --cpu-throttling=false --project=orderly-472413
```

## 🛠️ 實用診斷工具

### 統一診斷腳本使用

```bash
# 基本健康檢查
ENV=staging SERVICE_SUFFIX=-v2 ./scripts/db/diag.sh

# 生產環境檢查
ENV=production ./scripts/db/diag.sh

# 特定服務檢查
ENV=staging SERVICE_SUFFIX=-v2 SERVICES="api-gateway-fastapi user-service-fastapi" ./scripts/db/diag.sh
```

### 快速恢復命令

```bash
# 回滾到上一個版本
gh workflow run "Deploy to Cloud Run" --ref staging \
  -f environment=staging \
  -f force_backend_redeploy=true

# 重啟所有服務
for svc in api-gateway user-service order-service product-service acceptance-service notification-service customer-hierarchy-service supplier-service; do
  gcloud run services replace-traffic "orderly-${svc}-fastapi-staging-v2" \
    --region=asia-east1 --to-latest --project=orderly-472413
done
```

### 監控和日誌查詢

```bash
# 查看錯誤日誌
gcloud logs read "resource.type=cloud_run_revision" \
  --filter="severity>=ERROR" --limit=50 \
  --format="table(timestamp,resource.labels.service_name,textPayload)"

# 監控部署狀態
watch "gcloud run services list --region=asia-east1 --filter='name~staging-v2'"
```

## 🆘 緊急聯絡與升級

### 事故響應流程

1. **L1 支援**：開發團隊（0-15分鐘響應）
2. **L2 支援**：SRE團隊（15-30分鐘響應）
3. **L3 支援**：架構師和技術主管（30-60分鐘響應）

### 聯絡方式

- **Slack**: #orderly-alerts, #sre-team
- **PagerDuty**: production-critical 告警
- **Email**: sre@orderly.com
- **電話**: 緊急聯絡人清單（內部文檔）

---

## 📚 相關文檔

- [部署檢查清單](DEPLOYMENT-CHECKLIST.md) - 部署驗證標準流程
- [環境管理指南](DEPLOYMENT-ENVIRONMENTS.md) - 多環境架構說明
- [CI/CD 配置](ci-secrets.md) - 完整的配置指南
- [資料庫管理](database.md) - 數據遷移和備份策略

---

**最後更新**: 2025-09-24  
**狀態**: ✅ 涵蓋主要故障場景的完整排除指南
