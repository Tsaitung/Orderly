# 井然 Orderly Platform - 數位供應鏈平台

> **企業級餐飲供應鏈數位化解決方案**  
> **狀態**: 開發中（以 `docs/3-Development-Plan/DEVELOPMENT-PLAN.md` 為準）  
> **目標**: 將對帳時間從 8 小時縮短到 30 分鐘  
> **架構**: 微服務 + 雲原生 + 自動化 CI/CD

---

## 🚨 當前專案狀態

以 repo 現況為準：

- 後端：多個 FastAPI 微服務已具備主要 API 與資料模型骨架，並逐步補齊業務邏輯
- 前端：已具備多角色 Dashboard 與 BFF proxy，但仍有 mock/fallback 待替換與收斂
- 近期交付重點：串起「登入→下單→接單→驗收→對帳」演示閉環 + 最小 smoke/回歸 + 可重複部署

---

## 📚 重要文檔

- **[完整文件索引](docs/INDEX.md)** — 所有 Markdown 文件的用途與分類一覽。

### 🧑‍💻 開發協作（唯一指南）

- **[開發助手與代碼協作指南](CLAUDE.md)** — 以此為唯一開發助理/代理使用與協作指引
- **[協作守則 Repository Guidelines](CLAUDE.md#repository-guidelines)** — 代理與協作者的流程、測試與安全標準總覽

### 📋 最新狀態報告 (必讀)

- **[開發計畫（唯一來源）](docs/3-Development-Plan/DEVELOPMENT-PLAN.md)** - 以 repo 現況更新的 P0/P1 里程碑與待辦
- **[部署檢查清單](docs/3-Development-Plan/DEPLOYMENT-CHECKLIST.md)** - 生產部署完整指南

### 📖 技術文檔

- **[開發狀態與修復紀錄](docs/3-Development-Plan/STATUS-SUMMARY.md)** - 較長篇的歷史修復與整合筆記（以 `docs/3-Development-Plan/DEVELOPMENT-PLAN.md` 為主）
- **[技術架構文檔](docs/0-Design/Technical-Architecture-Summary.md)** - 系統架構設計
- **[API 規格文檔](docs/0-Design/api-specification.yaml)** - RESTful API 定義
- **[資料庫架構](docs/0-Design/Database-Schema-Core.md)** - 完整資料庫設計

### 🎨 產品設計

- **[產品需求文檔](docs/2-PRD/PRD-Complete.md)** - 完整產品規格
- **[設計系統](docs/0-Design/design-system/INDEX.md)** - UI/UX 設計規範
- **[用戶介面線框](docs/0-Design/User-Interface-Wireframes.md)** - 頁面設計規劃

---

## 🏗️ 架構概覽

### 🖥️ 前端 (Next.js + TypeScript)

```
app/
├── (routes)/                 # App Router 路由
├── components/              # 可重用元件
├── lib/                     # 工具函式
└── styles/                  # 全域樣式

Port: 3000 | Health: /api/health
```

### ⚡ 後端微服務（FastAPI + SQLAlchemy）

```
backend/
├── api-gateway-fastapi/                 # API 閘道 (Port 8000)
├── user-service-fastapi/                # 用戶/組織/認證 (Port 3001)
├── order-service-fastapi/               # 訂單管理 (Port 3002)
├── product-service-fastapi/             # 商品/品類/SKU (Port 3003)
├── acceptance-service-fastapi/          # 驗收管理 (Port 3004)
├── billing-service-fastapi/             # 帳務/對帳 (Port 3005)
├── notification-service-fastapi/        # 通知/OTP (Port 3006)
├── customer-hierarchy-service-fastapi/  # 客戶層級/關係 (Port 3007)
├── supplier-service-fastapi/            # 供應商/邀請 (Port 3008)
└── libs/                                # 共用套件

所有服務健康檢查: /{service}/health
```

### 🗄️ 資料存儲

- **PostgreSQL**: 主要資料庫（SQLAlchemy ORM + Alembic 遷移）
- **Redis**: 快取和會話管理
- **Google Cloud Storage**: 檔案存儲

### 🔧 基礎設施

- **容器化**: Docker + Google Cloud Run
- **CI/CD**: GitHub Actions (8個工作流程)
- **監控**: Prometheus + APM + 分布式追蹤
- **IaC**: Terraform (Google Cloud Platform)

---

## 🚀 快速啟動

### 📋 系統需求

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### 🛠️ 開發環境設置

#### 1. 專案設置

```bash
# 複製專案
git clone <repository-url>
cd orderly

# 安裝依賴
npm install

# 設置環境變數
cp .env.example .env.local
```

#### 2. 資料庫設置（SQLAlchemy + Alembic）

```bash
# 啟動本地資料庫與 Redis（若尚未啟動）
docker-compose up -d postgres redis

# 執行資料庫遷移（各 FastAPI 服務）
cd backend/user-service-fastapi && alembic upgrade head && cd -
cd backend/order-service-fastapi && alembic upgrade head && cd -
cd backend/product-service-fastapi && alembic upgrade head && cd -
```

#### 3. 啟動開發服務

```bash
# 啟動所有服務
npm run dev

# 或分別啟動
npm run dev:frontend    # 前端 (Port 3000)
npm run dev:backend     # 所有後端服務
```

#### 4. 驗證安裝

```bash
# 檢查服務狀態
curl http://localhost:3000/api/health    # 前端
curl http://localhost:8000/health        # API Gateway
curl http://localhost:3001/health        # User Service
# ... 其他服務
```

---

## 🧪 測試和品質保證

### 單元測試

```bash
npm test                    # 執行所有測試
npm run test:watch          # 監視模式
npm run test:coverage       # 測試覆蓋率
```

### 整合測試

```bash
npm run test:integration    # API 整合測試
npm run test:e2e           # 端到端測試
```

### 性能測試

```bash
node scripts/perf/performance-test.js      # 負載測試
node scripts/perf/performance-analysis.js  # 性能分析
```

### 程式碼品質

```bash
npm run lint              # ESLint 檢查
npm run format            # Prettier 格式化
npm run type-check        # TypeScript 類型檢查
```

---

## 🚢 部署指南

### 🏠 本地完整環境

```bash
# Docker Compose 完整環境
docker-compose up -d

# 檢查所有服務狀態
docker-compose ps
docker-compose logs -f
```

### ☁️ 生產部署 (Google Cloud Run)

```bash
# 使用自動化部署腳本
chmod +x scripts/deploy-cloud-run.sh
./scripts/deploy-cloud-run.sh

# 或使用 Terraform
cd infra/terraform
terraform init
terraform plan -var-file="production.tfvars"
terraform apply
```

詳細部署流程請參考 **[部署檢查清單](docs/3-Development-Plan/DEPLOYMENT-CHECKLIST.md)**

---

### 🔧 部署環境變數與優先順序（Cloud Run / gcloud CLI）

- 優先順序（伺服端解析 `backendUrl`）:
  1) `ORDERLY_BACKEND_URL` → 2) `BACKEND_URL` → 3) 由 `NEXT_PUBLIC_API_BASE_URL` 推導（取其 Origin）→ 4) 回退 `http://localhost:8000`
- 推薦做法:
  - Cloud Run 執行時用 `--set-env-vars` 同時設置 `ORDERLY_BACKEND_URL`、`BACKEND_URL`、`NODE_ENV`
  - 額外設 `NEXT_PUBLIC_API_BASE_URL=<BACKEND_URL>/api` 便於診斷與瀏覽器端使用
- 本地開發（.env.local）: 參考 `.env.example` 已示範三者設定與說明

注意：服務 URL 形狀（非常重要）

- PRODUCT_SERVICE_URL: 應為服務根網址（例如 `https://product-service-xxxxx.run.app`）。Gateway 會保留完整路徑 `/api/products/*`。
- SUPPLIER_SERVICE_URL: 服務根網址（例如 `https://supplier-service-xxxxx.run.app`）。Gateway 會轉發 `/api/suppliers/*`。
- CUSTOMER_HIERARCHY_SERVICE_URL: 服務根網址，請勿附加 `/api/v2`（例如 `https://customer-hierarchy-xxxxx.run.app`）。Gateway 會自動附加 `/api/v2` 後再轉發，如 `/api/v2/hierarchy/tree`。
- ACCEPTANCE_SERVICE_URL: 此服務在自身以 `/acceptance` 為根；預設值已包含此路徑（例如 `http://localhost:3004/acceptance`）。在 Cloud Run 也可保持帶路徑的服務 URL。

若錯誤地在 `CUSTOMER_HIERARCHY_SERVICE_URL` 加上 `/api/v2`，Gateway 將組合為 `/api/v2/api/v2/*`，導致 404/503。

範例：以 gcloud 部署前端（以 CI 同步用法為準）

```bash
BACKEND_URL="https://orderly-api-gateway-fastapi-staging-xxxxx.run.app"

gcloud run deploy orderly-frontend-staging \
  --image=asia-east1-docker.pkg.dev/$PROJECT/orderly/orderly-frontend:staging-<sha> \
  --region=asia-east1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=staging,ORDERLY_BACKEND_URL=$BACKEND_URL,BACKEND_URL=$BACKEND_URL,NEXT_PUBLIC_API_BASE_URL=$BACKEND_URL/api" \
  --memory=1Gi --cpu=1 --min-instances=0 --max-instances=10 --concurrency=100 --port=8080
```

診斷建議（發生 500/503 時）

- 前端：開啟 `https://<frontend>/api/env-check` 確認 `computed_config.backendUrl` 與公開變數設定。
- Gateway：開啟 `https://<gateway>/service-map` 檢查所有下游服務 URL 是否正確（特別是 `CUSTOMER_HIERARCHY_SERVICE_URL` 不應包含 `/api/v2`）。
- 錯誤對應：
  - `HTTP 503: {"error":"products service unavailable", "correlationId":...}` 多為 Gateway 無法連至 Product 服務（URL 錯誤、服務未部署、網路/IAM 設定）。
  - `GET /api/bff/v2/hierarchy/tree 503` 常見為 Hierarchy 服務 URL 附加了 `/api/v2` 導致路徑重複。
  - `GET /api/bff/suppliers ... 500` 多半為供應商服務自身拋錯（請用 `X-Correlation-ID` 於 Cloud Run 日誌追蹤）。

驗證部署結果

- 打開前端服務 `/api/env-check`：
  - `raw_environment_variables.ORDERLY_BACKEND_URL` 與 `BACKEND_URL` 應等於 Cloud Run API Gateway 根網址
  - `computed_config.backendUrl` 應與上列相同
  - `validation.backend_url_resolved = true`

注意事項（Next.js App Router + Standalone）

- 請勿依賴 `publicRuntimeConfig` 在執行時讀取變數；已統一改為伺服端直接使用 `process.env`
- 瀏覽器端如需變數，僅使用 `NEXT_PUBLIC_*` 名稱空間，並在部署時注入

## 🔍 監控和觀測

### 📊 關鍵指標

- **API 響應時間**: P95 < 5ms (已達成)
- **系統可用性**: 目標 99.9%
- **錯誤率**: < 0.1%
- **測試覆蓋率**: 85% (已達成)

### 🔭 監控端點

```bash
/health                    # 服務健康狀態
/metrics                   # Prometheus 指標
/apm/status               # APM 狀態
/metrics/business         # 業務指標
```

### 📈 效能監控

## 🚀 Cloud Run 手動部署快速指南（避免 build context 與 DB 連線陷阱）

以下流程可在本機或 CI 手動部署單一服務，並以「成功訊號」判斷是否真的生效。

1) 設定環境變數（舉例）

```bash
export PROJECT_ID=orderly-472413
export REGION=asia-east1
export ENV=staging
export SHA=$(git rev-parse --short=40 HEAD)
cd "$(git rev-parse --show-toplevel)"  # 回到 repo 根
```

2) 用 Cloud Build 建置（務必以 `backend/` 作為 build context）

- Product Service

```bash
gcloud builds submit . \
  --config=scripts/cloudbuild/cloudbuild.product.yaml \
  --substitutions=_IMAGE=asia-east1-docker.pkg.dev/$PROJECT_ID/orderly/orderly-product-service-fastapi:$SHA
```

- Customer Hierarchy Service

```bash
gcloud builds submit . \
  --config=scripts/cloudbuild/cloudbuild.hierarchy.yaml \
  --substitutions=_IMAGE=asia-east1-docker.pkg.dev/$PROJECT_ID/orderly/orderly-customer-hierarchy-service-fastapi:$SHA
```

3) 部署到 Cloud Run（嚴格使用剛打出的 tag）

```bash
gcloud run deploy orderly-product-service-fastapi-$ENV \
  --image=asia-east1-docker.pkg.dev/$PROJECT_ID/orderly/orderly-product-service-fastapi:$SHA \
  --region=$REGION --project=$PROJECT_ID --allow-unauthenticated

gcloud run deploy orderly-customer-hierarchy-$ENV \
  --image=asia-east1-docker.pkg.dev/$PROJECT_ID/orderly/orderly-customer-hierarchy-service-fastapi:$SHA \
  --region=$REGION --project=$PROJECT_ID --allow-unauthenticated

> ℹ️ 若部署目標為 `staging-v2`，請改用 `orderly-custhier-staging-v2` 作為服務名稱。
```

4) 確保 Cloud SQL 連接器與 DB 環境變數/Secret（保險覆蓋一次）

```bash
INSTANCE_CONN=$(gcloud sql instances describe orderly-db --project=$PROJECT_ID --format='value(connectionName)')

gcloud run services update orderly-product-service-fastapi-$ENV \
  --region=$REGION --project=$PROJECT_ID \
  --add-cloudsql-instances="$INSTANCE_CONN" \
  --update-secrets=POSTGRES_PASSWORD=postgres-password:latest \
  --set-env-vars="DATABASE_HOST=/cloudsql/$INSTANCE_CONN,DATABASE_NAME=orderly,DATABASE_USER=orderly"

gcloud run services update orderly-customer-hierarchy-$ENV \
  --region=$REGION --project=$PROJECT_ID \
  --add-cloudsql-instances="$INSTANCE_CONN" \
  --update-secrets=POSTGRES_PASSWORD=postgres-password:latest \
  --set-env-vars="DATABASE_HOST=/cloudsql/$INSTANCE_CONN,DATABASE_NAME=orderly,DATABASE_USER=orderly"

> ℹ️ `staging-v2` 請改用 `orderly-custhier-staging-v2` 作為服務名稱。
```

5) 成功訊號清單（務必逐項通過）

- 部署映像：
  - `gcloud run services describe <service> --format=json | jq '.spec.template.spec.containers[0].image'` 應等於剛 build 的 `$SHA` tag。
  - `.status.traffic[0].percent==100` 且 `latestReadyRevisionName` 為新 revision。
- DB 連線：
  - 直打服務 `/db/health` 應回 200；`/db/info` 回遮罩過的 DSN 與 ping_ms。
  - 若 `/db/health` 404 → 映像未更新；503 → CloudSQL 綁定/ENV/Secret 未落地。
- Gateway 路由：
  - `/ready` 應為 ready，且包含每個探針的 url 與錯誤摘要。
  - 三條 smoke（無授權）：`/api/products/categories?includeProducts=false`、`/api/products/skus/search?page_size=1`、`/api/v2/hierarchy/tree` 應 2xx。
  - 若 4xx/5xx，從回應 header 擷取 `X-Correlation-ID` 查 Cloud Logging。

6) 常見陷阱

- 不要在子資料夾用 `gcloud run deploy --source .` 或本機 `docker build`：會用錯 build context，導致 Dockerfile 的 `COPY backend/...` 與 `COPY libs/` 失效。
- Cloud SQL：
  - `cloudsql-instances` 注解必須存在（`<PROJECT>:asia-east1:<INSTANCE>`）。
  - `DATABASE_HOST` 必須精確為 `/cloudsql/<INSTANCE_CONN>`。
  - `POSTGRES_PASSWORD` 建議以 Secret latest 綁定，並與 DB 使用者口令同步。

7) 一鍵診斷

```bash
bash scripts/db/diag.sh
```

將列出各服務的 Cloud SQL 綁定、主要 DB ENV/Secret、`/db/health` 結果，並快速找出問題點。CI 的 post-deploy 也會自動執行，且在 Summary 中附上 Correlation ID 與 DB 概況。


- **分布式追蹤**: OpenTelemetry 相容
- **日誌聚合**: 結構化 JSON 日誌
- **APM 整合**: DataDog + New Relic 支援
- **告警系統**: 基於閾值的自動告警

---

## 🏃‍♂️ 當前開發重點

### 🔥 緊急優先 (本週)

1. **執行資料庫遷移** - 連接真實資料庫
2. **移除 mock 數據依賴** - 實現真實 CRUD
3. **開發核心前端頁面** - 登入、訂單、對帳介面
4. **實現基本業務邏輯** - 訂單流程和簡化對帳

### ⚡ 高優先 (2-4週)

1. **完成對帳引擎** - 自動匹配和差異檢測
2. **ERP 系統整合** - 至少 1 個外部系統
3. **通知系統** - Email 和系統內通知
4. **用戶體驗優化** - 錯誤處理和回饋機制

### 📅 中期目標 (1-3個月)

1. **行動端優化** - PWA 功能實現
2. **進階分析** - BI 儀表板和報表
3. **多重整合** - 支付、發票、多ERP系統
4. **規模化準備** - 性能優化和自動擴展

---

## 👥 團隊協作

### 🔄 開發流程

- **分支策略**: GitFlow (main → staging → feature)
- **程式碼審查**: 所有 PR 需要審查
- **提交規範**: Conventional Commits
- **CI/CD**: 自動測試、建構、部署

### 📅 會議節奏

- **每日站會**: 9:30 AM (15分鐘)
- **週回顧**: 週五 4:00 PM (60分鐘)
- **Sprint 規劃**: 每兩週一次
- **架構討論**: 按需安排

### 📢 溝通渠道

- **技術討論**: GitHub Issues/Discussions
- **即時協作**: Slack/Teams
- **文檔更新**: 直接提交到 docs/
- **重大決策**: 架構會議 + RFC

---

## 🆘 故障排除

### 常見問題

#### 🔴 服務啟動失敗

```bash
# 檢查端口占用
lsof -i :3000
lsof -i :8000

# 檢查 Docker 狀態
docker-compose ps
docker-compose logs [service-name]

# 重啟服務
npm run dev:restart
```

#### 🔴 資料庫連接問題

```bash
# 檢查資料庫狀態
docker-compose exec postgres psql -U postgres -c "\\l"

# 重新執行資料庫遷移（FastAPI 服務）
cd backend/user-service-fastapi && alembic upgrade head && cd -
cd backend/order-service-fastapi && alembic upgrade head && cd -
cd backend/product-service-fastapi && alembic upgrade head && cd -
```

#### 🔴 建構/部署錯誤

```bash
# 檢查建構日誌
npm run build 2>&1 | tee build.log

# 驗證 Docker 映像
docker build -f Dockerfile -t test-build .
docker run --rm test-build
```

### 📞 支援資源

- **技術文檔**: docs/ 目錄
- **API 文檔**: docs/0-Design/api-specification.yaml
- **錯誤追蹤**: GitHub Issues
- **性能分析**: scripts/perf/performance-analysis.js

---

## 🔮 未來發展

### 🎯 短期目標 (3個月)

- ✅ 完成核心 MVP 功能
- ✅ 至少 3 個客戶 PoC 成功
- ✅ 對帳效率提升 >70%
- ✅ 系統穩定性 >99.5%

### 🚀 中期目標 (6個月)

- 🎯 支援 100+ 餐廳客戶
- 🎯 整合 5+ ERP 系統
- 🎯 AI 驅動的智能對帳
- 🎯 多地區部署

### 🌟 長期願景 (12個月)

- 🌟 餐飲供應鏈數位化領導者
- 🌟 平台生態系統建立
- 🌟 國際市場擴展
- 🌟 IPO 準備就緒

---

## 📄 授權與貢獻

### 📜 授權

本專案採用 MIT 授權條款。

### 🤝 貢獻指南

1. Fork 本專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'feat: add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

### 📈 專案統計

- **程式碼行數**: 50,000+ 行
- **測試覆蓋率**: 85%
- **文檔頁數**: 20+ 份技術文檔
- **微服務數量**: 8 個服務
- **CI/CD 流水線**: 8 個工作流程

---

## 📞 聯絡資訊

### 🏢 專案團隊

- **技術負責人**: 後端架構團隊
- **產品經理**: 產品策略團隊
- **DevOps 工程師**: 基礎設施團隊
- **UI/UX 設計師**: 用戶體驗團隊

### 📧 聯絡方式

- **技術支援**: GitHub Issues
- **產品反饋**: 產品團隊
- **商業合作**: 業務開發團隊
- **媒體詢問**: 公關團隊

---

_最後更新: 2025-09-19 | 版本: v1.0-alpha | 建構: #2025.09.19.1_

**🎯 記住我們的使命**: 將餐飲業的對帳時間從 8 小時縮短到 30 分鐘，讓每一筆交易都井然有序。
