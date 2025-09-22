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

### Project Structure

- `app/`: Next.js App Router + TypeScript frontend application.
- `backend/`: Microservices (API Gateway and core domain services in FastAPI + SQLAlchemy).
- `shared/types/`: Reusable TS types as `@orderly/types`.
- `infrastructure/`, `scripts/`, `docker-compose.yml`: IaC, automation, local orchestration.

### Build, Test, and Develop

- Install deps (root): `npm install`.
- Dev all: `npm run dev` (frontend) and `docker-compose up -d` (backend services).
- Build all/one: `npm run build` (frontend) or Docker builds per service.
- Start API Gateway: `docker compose up -d api-gateway` (FastAPI).
- Tests: `npm test` (all) or `npm test -w <workspace>`; watch: `npm run test:watch -w backend/user-service`.
- Lint/format: `npm run lint`, `npm run format`.

### Coding Style

- TypeScript, 2-space indent, Prettier trailing commas.
- ESLint with TS, React, and hooks plugins; fix issues before PR.
- Names: `PascalCase` components, `camelCase` vars/functions, env as `SCREAMING_SNAKE_CASE`.
- Files: components `PascalCase.tsx`, modules `kebab-case.ts`, tests `*.test.ts(x)`.

### Testing

- Frontend: Jest + React Testing Library; Backend: Jest (+ ts-jest). Prefer co-located unit tests.
- Target ≥80% unit coverage; add integration tests for FastAPI routes and DB flows.
- Run fast locally with watch; run full suite in CI.

### Commits & PRs

- Conventional Commits (e.g., `feat(api): add rate limiting`, `fix(user): hash password correctly`).
- PRs: concise summary, linked issues (`Closes #123`), UI screenshots, test plan, and green lint/tests.
- Keep scope focused; update docs when behavior changes.

### Documentation Maintenance

- Single source of truth lives in `docs/INDEX.md`.
- Update the corresponding canonical docs when changing behavior/contracts:
  - PRD → `docs/PRD-Complete.md`
  - Architecture → `docs/Technical-Architecture-Summary.md`
  - Design System → `docs/design-system.md`
  - API → `docs/API-Endpoints-Essential.md` and `docs/api-specification.yaml`
  - Database → `docs/Database-Schema-Core.md` and `docs/database.md`
- If adding/renaming docs, also update `docs/INDEX.md` and cross-links.
- Before merging, run a quick link check for stale paths:
  - `rg -n "api-specification\.md|technical-architecture\.md|PRD\.md|Orderly Design System\.md|requirement\.md"`

### Security & Configuration

- Copy `.env.example` per workspace to `.env.local`; never commit secrets.
- For full local stack use `docker-compose up -d`; verify health endpoints before merging.
- Manage secrets via GitHub Secrets as outlined in README.

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
docker build -t orderly-user-service backend/user-service-fastapi/

# 模擬Cloud Run環境測試
docker run -e PORT=8080 -p 8080:8080 orderly-user-service

# 本地開發環境測試
docker run -e PORT=3001 -p 3001:3001 orderly-user-service

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
