# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Canonical Documentation Index: see `docs/INDEX.md` for the single source of truth and cross-links to PRD, Design System, Architecture, API, and Database docs.

## Project Overview

井然 Orderly is an enterprise-grade digital supply chain platform for the restaurant industry, featuring Ultra-Automated CI/CD with 98%+ automation. The platform connects restaurants and suppliers through a unified interface for the complete order-to-settlement workflow: ordering → delivery → acceptance → billing → settlement.

## Architecture

### Microservices Architecture

- **Frontend**: Next.js + TypeScript + TailwindCSS (port 3000)
- **Backend**: FastAPI microservices architecture with API Gateway pattern
  - API Gateway (port 8000) - Routes to all services (FastAPI)
  - User Service (port 3001) - Authentication and user management
  - Order Service (port 3002) - Order processing
  - Product Service (port 3003) - Product catalog
  - Acceptance Service (port 3004) - Receipt verification
  - Billing Service (port 3005) - Invoicing and payments
  - Notification Service (port 3006) - Real-time notifications
- **Database**: PostgreSQL (port 5432) with SQLAlchemy ORM + Alembic
- **Cache**: Redis (port 6379)
- **Infrastructure**: Multi-region Terraform on Google Cloud Platform

### Key Directories

- `backend/` - Microservices (each with own Dockerfile, package.json, TypeScript)
- `frontend/` - Next.js App Router application
- `shared/types/` - TypeScript type definitions shared across services
- `infrastructure/terraform/` - Complete IaC with modules for networking, compute, database, security, monitoring, redis
- `.github/workflows/` - 8 advanced CI/CD workflows including ML-powered quality gates
- `scripts/` - Automation scripts for deployment, monitoring, security, and database management
  - `scripts/database/database_manager.py` - 統一資料庫管理工具（導出、導入、測試資料）
  - `scripts/database/seed_from_real_data.py` - 基於真實資料的完整測試腳本

## Repository Guidelines

> 註解：以下協作守則整合自 `AGENTS.md` 與既有內容，協助代理／協作者快速掌握關鍵流程。

### Project Structure

- 前端：`app/`、`components/`、`lib/`、`stores/` 與 `shared/types/`（跨服務型別），靜態資源集中於 `public/`。
- 後端：`backend/*-service-fastapi/` 內含 FastAPI 微服務，`backend/api-gateway-fastapi/` 提供統一入口，跨服務 Python 工具放在 `backend/libs/`。
- 文檔與設計：主要說明位於 `docs/`，Storybook 與設計參考放在 `stories/` 與 `components/design-system/`。
- 自動化與基礎設施：`scripts/` 收錄部署、資料庫、監控工具；`infrastructure/` 與各 `compose.*.yml` 描述 IaC 與執行拓撲。

### Build, Test, and Develop

- 安裝依賴：`npm install`
- 啟動前端：`npm run dev`（預設埠 3000，預期後端服務由 Docker Compose 提供）
- 啟動後端與依賴：`docker compose -f compose.dev.yml up`
- 建置／啟動正式版本：`npm run build`、`npm run start`
- 測試套件：`npm test`、`npm run test:frontend`、`npm run test:coverage`
- 品質檢查：`npm run lint`、`npm run type-check`、`npm run format:check`

### Coding Style

- TypeScript + Prettier，採 2 空白縮排、保留分號、字串使用單引號；Tailwind 類別順序交由 Prettier 外掛整理。
- React 元件／Hook 採 `PascalCase` 與 `camelCase` 命名；FastAPI 路由與 ORM 模型維持 `snake_case`。
- 檔案命名：React 元件以 `.tsx` 結尾並盡量單一預設匯出；共用函式使用 `kebab-case.ts`；測試檔命名為 `*.test.ts(x)`。

### Testing

- 主要測試框架為 Jest，前端整合 `@testing-library/react`；整合測試集中在 `tests/integration/`。
- 單元測試建議與元件／模組同目錄（例：`Button.test.tsx`）。
- 依 `npm run test:coverage` 監控覆蓋率；新增功能時需撰寫關鍵流程的冒煙測試並適度 mock 後端依賴。

### Commits & PRs

- 採 Conventional Commits 前綴（如 `feat`、`fix`、`chore`、`docs` 等），主旨不超過 72 字元。
- PR 需描述問題背景、功能影響、關聯議題（`Closes #123`），UI／API 變更時附上截圖或範例 payload。
- 在描述中標註已執行的測試與靜態檢查指令輸出，並記錄同步更新的文檔或設定。

### Documentation Maintenance

- 依 `docs/INDEX.md` 定義的 Canonical 文檔維護單一事實來源。
- 行為、契約或設計調整時，務必同步更新對應主檔（PRD、架構、API、資料庫、設計等）並修正索引與交叉引用。
- 新增或重命名檔案後使用 `rg` 檢查舊連結：`rg -n "api-specification\.md|technical-architecture\.md|PRD\.md|Orderly Design System\.md|requirement\.md"`

#### 已清理的過期檔案（2025-12-07）

**一次性遷移腳本**（已被 `database_manager.py` 取代）：
- `migrate_local_to_staging.py`, `migrate_core_tables_to_staging.py`
- `copy_products_to_staging.py`, `migrate_core_data.py`
- `database/sync_missing_staging_tables.py`, `check_staging_tables.py`
- 所有 SQL 遷移檔案（`create_core_tables.sql`, `create_product_tables.sql` 等）

**分析報告**（內容已整合至主要文檔）：
- `PLAN-COMPLETION-SUMMARY.md` → 合併至 `plan.md`
- `DEPLOYMENT-FIX-SUMMARY.md` → 整合至 `docs/CI-CD-ARCHITECTURE.md`
- `API-DATA-INCOMPLETENESS-ROOT-CAUSE-ANALYSIS.md` → 合併至相關API文檔
- `ULTRA-DEEP-ANALYSIS-FINAL-SUMMARY.md`, `PERMANENT-SOLUTIONS-IMPLEMENTATION.md`, `missing-github-secrets.md`

**檢查清單**（一次性專案審查工具）：
- `docs/Configuration-Drift-Prevention-System.md`
- `docs/Final-Validation-Checklist.md`
- `docs/GitHub-Secrets-Audit-Checklist.md`
- `docs/separated-variables-configuration-guide.md`

**臨時目錄**：
- `awesome-claude-agents/` → 改用外部依賴
- `specs-cloud-run-port/` → 臨時測試目錄
- `specs/` → 空目錄已移除

**微服務一次性腳本**：
- `backend/customer-hierarchy-service-fastapi/scripts/create_tables.py` → 已被Alembic取代
- `backend/customer-hierarchy-service-fastapi/scripts/seed_test_data.py` → 已被 `seed_from_real_data.py` 取代
- `backend/customer-hierarchy-service-fastapi/Dockerfile.cloudrun` → 已被統一Dockerfile取代
- `backend/product-service-fastapi/scripts/migration_safety.py` → 功能已整併至CI/CD流程

**測試檔案重新定位**：
- `scripts/test-configs.py` → 移至 `tests/unit/`
- `scripts/test-supplier-flow.js` → 移至 `tests/e2e/`

新增檔案前請檢查 `docs/INDEX.md` 確認無重複內容。

### Security & Configuration

- 機敏設定僅放於 `.env.local` 或授權密鑰庫，依 `docs/ci-secrets.md` 流程管理。
- 新增服務時更新 `compose.*.yml` 與 FastAPI 設定，確保所有入口均由 API Gateway 控制；必要環境變數記錄於 `docs/DEPLOYMENT-CHECKLIST.md`。
- 本地整合測試建議透過 Docker Compose 啟動 Postgres／Redis，並確認健康檢查端點再提交 PR。
- Cloud Run 部署必須使用專用 Service Account（由 `scripts/iam/bootstrap-service-accounts.sh` 建立，例如 `orderly-apigw-fastapi@PROJECT.iam.gserviceaccount.com`）。部署時務必指定這些帳戶（`scripts/deploy-cloud-run.sh` 會自動帶入），避免落回預設的 Compute Engine 帳戶。
- 資料庫遷移／測試資料導入改以 Cloud Build / Cloud Run Job 執行：
  - Service Account：`orderly-migration@<project>.iam.gserviceaccount.com`，請先以 `gcloud iam service-accounts create orderly-migration` 建立並賦予 `cloudsql.client`、`secretmanager.secretAccessor`、`logging.logWriter`。
  - 遷移：`gcloud builds submit --config=scripts/cloudbuild/migration-job.yaml --substitutions=_INSTANCE=orderly-472413:asia-east1:orderly-db-v2,_SERVICE_ACCOUNT=orderly-migration@...`
  - 種子資料：`gcloud run jobs create orderly-seed-data --image=asia-east1-docker.pkg.dev/.../orderly-seeder:latest --service-account=orderly-migration@... --add-cloudsql-instances=orderly-472413:asia-east1:orderly-db-v2 --set-env-vars=DATABASE_HOST=/cloudsql/orderly-472413:asia-east1:orderly-db-v2,DATABASE_NAME=orderly,DATABASE_USER=orderly --set-secrets=POSTGRES_PASSWORD=postgres-password:latest`
  - 以上流程統一連到 staging Cloud SQL（`orderly-db-v2`），再視需要同步回本機。
- Cloud Run 健康檢查與連線問題排查：
  1. `ENV=<env> SERVICE_SUFFIX=<suffix> ./scripts/db/diag.sh` — 一次收集所有服務的 `/health`、`/db/health`、Cloud SQL annotation 與 Service Account。
  2. 若所有服務都回 `Connection refused`，先確認 Cloud SQL `orderly-db-v2` 狀態是否 RUNNABLE；接著依 `docs/DEPLOYMENT-TROUBLESHOOTING.md` 快速流程檢查 annotation、Service Account、Secret，並使用 `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="<service>"' --project=orderly-472413 --limit=50 --format="value(textPayload)"` 抓錯誤堆疊。
  3. 連線恢復後，務必執行 Alembic 遷移或 SQL 檢查 `SELECT to_regclass('public.products');` 等核心表是否存在，避免 API 因缺表持續回 500。
  4. 驗證 API Gateway `/service-map` 是否與目標環境一致（`-staging` 或 `-staging-v2`），避免誤接舊服務。
- API Gateway 與後端服務的路由/健康檢查標準：
  - 所有 `*_SERVICE_URL` 必須對應 Cloud Run HTTPS URL，不得使用 localhost。
  - 基本健康檢查：`/health` + `/db/health`（Acceptance Service 為 `/acceptance/health`、`/acceptance/db/health`）。
  - Customer Hierarchy Service 額外提供 `/api/v2/health`、`/api/v2/health/live`、`/api/v2/health/ready`。
  - 部署後務必執行 `scripts/db/diag.sh` 驗證 Cloud SQL 綁定與 Service Account 是否正確，並檢視 `/service-map` 確保所有 URL 指向預期服務。

## Common Commands

### Development

```bash
# Start all services in development
npm run dev

# Start only backend services
npm run dev:backend

# Start only frontend
npm run dev:frontend

# Build all workspaces
npm run build

# Run tests across all workspaces
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

### Docker Development

```bash
# Start full environment with Docker
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Rebuild specific service
docker-compose build [service-name]

# Stop all services
docker-compose down
```

### Infrastructure Management

```bash
# Initialize Terraform
cd infrastructure/terraform
terraform init

# Plan infrastructure changes
terraform plan -var-file="[environment].tfvars"

# Apply infrastructure
terraform apply

# Deploy to staging (triggers CI/CD)
git push origin develop

# Deploy to production (requires approval)
git push origin main
```

### Service-Specific Commands

```bash
# Generate SQLAlchemy client (user-service)
cd backend/user-service
alembic upgrade head # per FastAPI service

# Run database migrations
alembic upgrade head

# Reset database
# use backups + alembic downgrade if needed
```

### Database Management Commands

```bash
# 🎯 統一資料庫管理工具 (scripts/database/database_manager.py)

# 導出所有業務資料
python scripts/database/database_manager.py export

# 創建標準測試客戶資料 (20個客戶：15個公司+5個自然人)
python scripts/database/database_manager.py create-test-customers

# 導入資料到其他環境
python scripts/database/database_manager.py import --target "postgresql+asyncpg://staging:pass@host:5432/orderly"

# 清理測試資料
python scripts/database/database_manager.py clean --test-data

# 清理導出文件
python scripts/database/database_manager.py clean --export-files

# 🏷️ 基於真實資料的完整測試腳本 (scripts/database/seed_from_real_data.py)

# 創建所有真實資料的測試副本 (9供應商+20客戶+105品類+52SKU)
python scripts/database/seed_from_real_data.py

# 清理真實資料測試副本
python scripts/database/seed_from_real_data.py --clean

# 強制重新創建
python scripts/database/seed_from_real_data.py --force
```

## Docker Strategy & Architecture

### 統一Docker策略

井然 Orderly 採用**單一Dockerfile原則**，每個微服務僅維護一個Dockerfile，透過環境變數支援多環境部署。這種策略解決了之前Dockerfile.cloudrun缺失導致的Cloud Run部署失敗問題。

### 核心設計理念

#### 1. 動態端口配置
- **本地開發**: 使用固定端口便於服務間通信和除錯
- **Cloud Run**: 自動適配 `PORT=8080` 環境變數要求
- **測試環境**: 可自定義端口進行隔離測試

#### 2. 環境變數驅動
```dockerfile
# 關鍵配置：支援動態端口
ARG DEFAULT_PORT=3001  # 每個服務有不同預設值
ENV PORT=${PORT:-${DEFAULT_PORT}}
EXPOSE ${PORT}
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 1"]
```

### 服務端口配置標準

| 服務名稱 | 本地開發端口 | Cloud Run端口 | 說明 |
|---------|-------------|--------------|-----|
| api-gateway-fastapi | 8000 | ${PORT:-8080} | API閘道 |
| user-service-fastapi | 3001 | ${PORT:-8080} | 用戶管理 |
| order-service-fastapi | 3002 | ${PORT:-8080} | 訂單處理 |
| product-service-fastapi | 3003 | ${PORT:-8080} | 商品目錄 |
| acceptance-service-fastapi | 3004 | ${PORT:-8080} | 驗收管理 |
| notification-service-fastapi | 3006 | ${PORT:-8080} | 通知服務 |
| customer-hierarchy-service-fastapi | 3007 | ${PORT:-8080} | 客戶層級 |
| supplier-service-fastapi | 3008 | ${PORT:-8080} | 供應商管理 |

### 標準Dockerfile模板

```dockerfile
# 多階段構建 - FastAPI服務標準模板
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# 依賴安裝階段
FROM base AS deps

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --user --no-warn-script-location -r requirements.txt

# 運行階段
FROM base AS runtime

RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# 複製依賴
COPY --from=deps /root/.local /root/.local

# 複製應用程式
COPY app ./app
COPY alembic.ini ./alembic.ini
COPY alembic ./alembic

ENV PATH=/root/.local/bin:$PATH

# 動態端口配置 - 核心設計
ARG DEFAULT_PORT=3001
ENV PORT=${PORT:-${DEFAULT_PORT}}
EXPOSE ${PORT}

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# 啟動命令 - 支援動態端口
CMD ["sh", "-c", "alembic upgrade head 2>/dev/null || true && uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 1"]
```

### 環境配置指南

#### 本地開發 (compose.dev.yml)
```yaml
services:
  user-service:
    build:
      context: backend/user-service-fastapi
      dockerfile: Dockerfile
    environment:
      PORT: 3001  # 明確指定本地端口
    ports:
      - "3001:3001"
```

#### CI/CD 部署 (deploy.yml)
```yaml
# 統一使用 Dockerfile（不再需要 Dockerfile.cloudrun）
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: backend/${{ matrix.service }}
    file: backend/${{ matrix.service }}/Dockerfile  # 統一路径
    # Cloud Run 會自動設定 PORT=8080
```

#### Cloud Run 自動配置
- Cloud Run 平台自動設定 `PORT=8080`
- 容器啟動時自動使用正確端口
- 無需額外配置或特殊Dockerfile

### Docker命令擴展

```bash
# 本地測試統一Dockerfile
docker build -t orderly-user-service-fastapi backend/user-service-fastapi/

# 模擬Cloud Run環境測試
docker run -e PORT=8080 -p 8080:8080 orderly-user-service-fastapi

# 本地開發環境測試
docker run -e PORT=3001 -p 3001:3001 orderly-user-service-fastapi

# 批量構建所有服務
for service in api-gateway user-service order-service product-service acceptance-service notification-service customer-hierarchy-service supplier-service; do
  docker build -t orderly-$service-fastapi backend/$service-fastapi/
done
```

### 部署驗證流程

1. **本地驗證**: `docker-compose -f compose.dev.yml up`
2. **Cloud Run模擬**: `docker run -e PORT=8080 -p 8080:8080 [image]`
3. **健康檢查**: `curl http://localhost:${PORT}/health`
4. **CI/CD觸發**: `git push origin staging`

### 故障排除

#### 常見問題
- **端口綁定失敗**: 檢查 `PORT` 環境變數是否正確設定
- **健康檢查失敗**: 確認 `/health` 端點使用正確端口
- **容器啟動失敗**: 檢查 `uvicorn` 命令端口參數

#### 除錯命令
```bash
# 檢查容器內環境變數
docker exec -it [container] env | grep PORT

# 檢查端口監聽狀態
docker exec -it [container] netstat -tlnp | grep LISTEN

# 查看容器啟動日誌
docker logs [container] --tail 50
```

## CI/CD System

### Ultra-Automated Pipeline Features

- **ML-Powered Quality Gates**: 5 algorithms (Isolation Forest, Random Forest, DBSCAN, Time Series Forecasting, Ensemble Methods)
- **Zero-Downtime Deployments**: 5 strategies (Blue-Green Fast Track, Blue-Green Standard, Progressive Canary, Conservative Canary, Feature Flag Progressive)
- **Self-Healing Systems**: >90% automatic recovery from anomalies
- **Security Scanning**: Every 4 hours (SAST, DAST, container, dependency, compliance)
- **Cost Optimization**: ML-driven resource right-sizing and budget monitoring

### Deployment Strategies

The system automatically selects deployment strategy based on ML confidence levels:

- **High Confidence (>95%)**: Fast Track Blue-Green (<30s rollback)
- **Medium Confidence (80-95%)**: Standard Blue-Green (5min soak time)
- **Low Confidence (60-80%)**: Progressive Canary (5% → 100% traffic)
- **Very Low (<60%)**: Manual review required

### Required GitHub Secrets

Core secrets for CI/CD automation:

- `GCP_PROJECT_ID`, `GCP_SA_KEY` - Infrastructure access
- `ML_CONFIDENCE_THRESHOLD_*` - ML decision thresholds
- `COST_THRESHOLD_*` - Budget monitoring
- `DATADOG_API_KEY`, `NEWRELIC_LICENSE_KEY` - APM integration
- `SLACK_WEBHOOK_URL`, `PAGERDUTY_INTEGRATION_KEY` - Alerting

## Business Context

### Three-Role System

- **Restaurant Side**: Digital ordering, transparent acceptance, automated billing
- **Supplier Side**: Unified order management, real-time inventory sync, simplified payment
- **Platform Side**: Global monitoring, anomaly alerts, business insights

### Revenue Model

- Transaction commission: 1.5-3% GMV (tiered by volume and category)
- Subscription tiers: Free → Professional (NT$3,999) → Enterprise (NT$9,999)
- Financial value-added services: Supply chain finance, insurance, payments

### Key Performance Indicators

- Restaurant: 70% reduction in ordering time, <2% acceptance error rate
- Supplier: <5min order confirmation, 85%+ fulfillment rate, 30% shorter payment cycle
- Platform: 150% GMV growth, <24h exception handling, 99% log coverage

## Design System

### Brand Guidelines

- **Primary Color**: Mocha Mousse (#A47864)
- **Border Radius**: 4px consistent across all components
- **Typography**: Noto Sans TC (Chinese) / Inter (English)
- **Accessibility**: WCAG 2.1 AA compliance (4.5:1 contrast ratio minimum)
- **Touch Targets**: ≥44×44px for mobile interfaces

## Canonical Documentation

Refer to `docs/INDEX.md` for the up-to-date documentation map. Key entries:

- PRD: `docs/PRD-Complete.md`
- Design System: `docs/design-system.md`
- Technical Architecture: `docs/Technical-Architecture-Summary.md`
- API Essentials: `docs/API-Endpoints-Essential.md`
- OpenAPI Spec: `docs/api-specification.yaml`
- Database Core Schema: `docs/Database-Schema-Core.md`
- Database Operations: `docs/database.md`

## Multi-Region Infrastructure

### Regions

- **Primary**: asia-east1 (Taiwan/Hong Kong proximity)
- **Secondary**: us-central1 (Global distribution)
- **Tertiary**: europe-west1 (European operations)

### High Availability Features

- Cross-region database replication
- Automated failover with <5min RTO
- Zero data loss (RPO = 0) with point-in-time recovery
- Load balancing with health checks
- Disaster recovery drills (monthly automated)

## Security & Compliance

### Automated Compliance

- **SOC2**: IAM policy validation, data encryption verification, audit logging
- **GDPR**: Consent management, right to erasure, data portability
- **HIPAA**: Physical/administrative/technical safeguards, encryption at rest/transit

### Security Architecture

- Zero-trust network model with VPC private subnets
- Secret Manager for credential management
- KMS encryption for data at rest
- Continuous vulnerability scanning (every 4 hours)
- Penetration testing with OWASP ZAP and custom security tests

## Development Guidelines

### Code Organization

- Each microservice follows the same structure: src/controllers/, src/services/, src/routes/, src/middleware/
- Shared TypeScript types in `shared/types/` workspace
- Environment-specific configuration through environment variables
- Database access through SQLAlchemy ORM with migration-driven schema management

### Service Communication

- API Gateway handles external requests and routes to internal services
- Inter-service communication via HTTP (considering gRPC for high-throughput scenarios)
- Real-time notifications through WebSocket connections
- Event-driven architecture capabilities with Redis Streams/Kafka integration

### Testing Strategy

- Unit tests: >80% coverage requirement
- Integration tests: API endpoint validation with ephemeral databases
- E2E tests: Critical user journeys with Playwright
- Load tests: k6 performance benchmarking
- Chaos engineering: Network partitions, resource exhaustion, database failures

### Monitoring & Observability

- Multi-provider APM: DataDog + New Relic + Prometheus/Grafana
- Distributed tracing across microservices
- Structured JSON logging with correlation IDs
- Custom business metrics tracking (GMV, order conversion rates, fulfillment metrics)
- SLO monitoring: >99.9% uptime, <500ms P95 latency, <0.1% error rate

## Data Flow

### Order Processing Flow

1. Restaurant creates order → API Gateway → Order Service
2. Order Service validates → Product Service (inventory check)
3. Notification Service → Supplier notification
4. Supplier accepts → Order status update → Restaurant notification
5. Delivery tracking → Acceptance Service (photo verification)
6. Billing Service → Invoice generation → Payment processing

### User Authentication Flow

- JWT-based authentication through API Gateway
- User Service handles registration, login, password reset
- Role-based access control (restaurant, supplier, admin)
- Session management with Redis for scalability

This codebase represents an enterprise-grade platform with emphasis on automation, reliability, and scalability. The Ultra-Automated CI/CD system ensures high-quality deployments with minimal human intervention while maintaining strict security and compliance standards.

- 所有路由設定都不應該hard code
