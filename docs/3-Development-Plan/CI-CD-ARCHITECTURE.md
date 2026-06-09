# Orderly CI/CD Architecture (Authoritative)

_Last updated: 2025-12-18_

This document replaces ad-hoc CI/CD notes that were scattered across `plan.md`, `CICD-init-guide.md`, deployment summaries, and various troubleshooting files. Maintain this as the single source of truth for pipeline behavior, configuration, and operational playbooks. Other documents should reference this file instead of duplicating CI/CD content.

## 1. Scope & Objectives

- Capture the end-to-end deployment flow for the Orderly platform (8 FastAPI backends + API Gateway + frontend).
- Describe how GitHub Actions, Cloud Build, and Cloud Run interact across `staging`, `staging-v2`, and `production`.
- Document deterministic rules around service suffixes, naming constraints, secrets, and manual overrides to prevent API/front-end configuration drift.
- Record remediation history and outstanding follow-ups so the team can track the maturity of the pipeline.

## 2. Pipeline Components

### 2.1 GitHub Actions Workflows

| Workflow | Purpose | Key Notes |
| --- | --- | --- |
| `deploy.yml` | Primary deployment pipeline | Handles environment resolution, service detection, validation checks, Cloud Build images, Cloud Run deployments, and post-deploy smoke tasks. |
| `deploy-staging-permanent.yml` | Legacy staging deployment | Keep for historical reference; all new work should prefer `deploy.yml` with `workflow_dispatch`. |
| `ci.yml` | Unit/integration quality gates | Runs lint, unit tests, and shared checks on PRs. |
| `quality-gates.yml` | Extended quality suite | Adds audit-style checks (OpenAPI validation, dependency scans, formatting). |
| `scheduled-maintenance.yml`, `monitoring.yml`, `security*.yml` | Operational automation | Daily/weekly maintenance, security scanning, docs link verification. |

### 2.2 Cloud Build

- Each backend service owns a Cloud Build configuration under `backend/<service>/cloudbuild.yaml`.
- All files now consume `_TAG` for the short SHA passed from GitHub (`SHORT_SHA=$IMAGE_TAG`), fixing the previous `_IMAGE_TAG` mismatch.
- Docker build contexts are rooted at `backend/<service>-fastapi`, and Dockerfiles no longer rely on dynamic `-f` flags; this prevents missing context issues.
- Build failures caused by missing `SERVICE_PATH` / `LIBS_PATH` arguments were resolved globally (all 8 services share the same ARG contract).

### 2.3 Cloud Run

- Backends deploy to Cloud Run with names derived from `orderly-<service>-<environment><suffix>`.
- `staging-v2` uses abbreviated names to stay below the 30-character limit (see §4.2).
- API Gateway honors the `USE_V2_BACKENDS` flag to control routing between legacy and `-v2` stacks.

## 3. Deployment Flow (`deploy.yml`)

1. **Environment resolution** (`determine-environment` job)
   - Push to `staging`, `develop`, or `main` automatically sets `environment` to `staging`/`production` with guardrails on `ref_name`.
   - Manual `workflow_dispatch` can target any environment; `force_backend_redeploy` and `force_frontend_redeploy` are honored.
2. **Suffix handling** (`flags` step)
   - `staging` branch forces `-v2`.
   - Manual runs trim whitespace; blank inputs for staging default to `-v2` (see §4.1).
3. **Change detection** (`detect-changes` job)
   - Computes service list from Git diff; optional manual `services` input overrides.
   - Setting `force_backend_redeploy=true` deploys all backend services regardless of detected changes (e.g., for cold start or base-image rebuilds).
4. **Configuration validation** (`validate-configuration` job)
   - Executes `scripts/ci/validate-deployment.sh` for service naming, `DATABASE_PORT`, and Cloud SQL annotations.
5. **Build & deploy**
   - Cloud Build triggered per service with normalized `_TAG` and service-specific substitutions.
   - Cloud Run deployment includes `add-cloudsql-instances` annotations using `orderly-db-v2` for staging and `orderly-db` for production.
6. **Post-deployment**
   - Smoke verification scripts hit `/health` and `/db/health` endpoints.
   - Workflow summary includes correlation IDs when `enable_smoke_correlation=true`.

## 4. Naming & Suffix Rules

### 4.1 Service Suffix Defaults

- `staging` pipelines default to `-v2` when no suffix is provided (blank or whitespace `service_suffix`).
- `production` pipelines do **not** receive an automatic suffix; the input must be explicit if needed.
- The validator emits `ℹ️  No service suffix provided...` when a fallback occurs, ensuring transparency in CI logs.

### 4.2 Cloud Run Service Naming

| Logical Service | Staging-v2 Name | Character Count |
| --- | --- | --- |
| api-gateway-fastapi | `orderly-apigw-staging-v2` | 24 |
| user-service-fastapi | `orderly-user-staging-v2` | 23 |
| order-service-fastapi | `orderly-order-staging-v2` | 24 |
| product-service-fastapi | `orderly-product-staging-v2` | 26 |
| acceptance-service-fastapi | `orderly-accept-staging-v2` | 25 |
| notification-service-fastapi | `orderly-notify-staging-v2` | 25 |
| customer-hierarchy-service-fastapi | `orderly-custhier-staging-v2` | 27 |
| supplier-service-fastapi | `orderly-supplier-staging-v2` | 27 |

**Constraints**: Maximum 30 characters. Any new service must follow the same abbreviation scheme or provide an alternative suffix.

### 4.3 Future Guardrails

- TODO: Add lint step in CI to fail when proposed service names exceed 30 characters or violate the abbreviation map.

## 5. Configuration & Secrets

### 5.1 GitHub Secrets

| Secret | Purpose |
| --- | --- |
| `GCP_SA_KEY` | Service account JSON used to authenticate gcloud for Cloud Build/Run. |
| `GCP_PROJECT_ID` | Preferred project id override (defaults to `orderly-472413`). |
| `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET` | Shared across all backend deployments via Secret Manager injection. |
| `API_GATEWAY_SERVICE_ACCOUNT` (if enabled) | Optional per-service account deployment toggle. |

### 5.2 Service Account Requirements (pending verification)

- Roles that must be present on the service account referenced by `GCP_SA_KEY`:
  1. Cloud Build Editor
  2. Artifact Registry Writer
  3. Cloud Run Admin
- Verification of these permissions is tracked in the remediation plan (see `STATUS-SUMMARY.md` §3).

### 5.3 Environment Variables

- Shared environment config resides in `infra/<environment>/env-vars.yaml`.
- Critical variables: `DATABASE_HOST`, `DATABASE_PORT` (must be `5432`), `DATABASE_USER`, `DATABASE_NAME`, `POSTGRES_PASSWORD`.
- FastAPI services construct DSNs from split variables to avoid URL encoding drift. Hard-coded `DATABASE_URL` values were removed from manifests and docs.

## 6. Validation Tooling

### 6.1 `scripts/ci/validate-deployment.sh`

- **`check-names`** — Enforces the naming table above, applies automatic suffix normalization, and surfaces suggestions for long names.
- **`check-database-port`** — Verifies `DATABASE_PORT` in config files and inspects service code for DSN usage.
- **`check-cloudsql`** — Confirms Cloud SQL annotations in the `cd.yml` workflow (the legacy per-service `deploy-cloud-run.sh` was retired with the microservices; the monolith deploys via `cd.yml`).
- **`all`** — Runs the full suite and generates a Markdown summary for GitHub step outputs.

### 6.2 Regression Tests

- `scripts/tests/test-validate-deployment-suffix.sh` ensures blank/whitespace suffix inputs trigger the `-v2` fallback.
- Future work: add CI wiring so this script runs as part of `quality-gates.yml` or a dedicated test job.

## 7. Operational Runbooks

### 7.1 Full Backend Redeploy (All Services)

1. Trigger `deploy.yml` via **Run workflow**.
2. Inputs:
   - `environment`: `staging`
   - `force_backend_redeploy`: `true`
   - `force_frontend_redeploy`: `false` (unless the frontend needs a rebuild)
   - Leave `service_suffix` blank to accept the `-v2` default.
3. Monitor:
   - `determine-environment` logs confirm suffix fallback.
   - `validate-configuration` must pass all checks.
   - Cloud Build job IDs for eight services should finish successfully.
4. Post-deployment: run `scripts/health-check-all.sh --environment staging-v2` to confirm all `/health` and `/db/health` endpoints.

### 7.2 Targeted Service Redeploy

- Provide a comma-separated list to the `services` input (e.g., `user-service-fastapi,api-gateway-fastapi`).
- When combined with `force_backend_redeploy=false`, only listed services rebuild and deploy.
- Keep the suffix explicit if deviating from defaults (e.g., temporary canary suffix).

### 7.3 Common Failure Patterns & Fixes

| Error | Root Cause | Resolution |
| --- | --- | --- |
| `COPY failed: file not found` | Missing `SERVICE_PATH` / `LIBS_PATH` ARG | All Dockerfiles include correct ARG wiring |
| Cloud Build `_TAG` missing | Workflow passed `_IMAGE_TAG` | Standardized `_TAG` + `SHORT_SHA=$IMAGE_TAG` |
| Cloud Run URL truncation | Name exceeded 30 chars | Use abbreviations (e.g., `orderly-custhier-staging-v2`) |
| `/db/health` returning 503 | `DATABASE_PORT` missing | Added to configs, validated via script |
| `alembic: command not found` | GitHub Actions lacks Python | Use Cloud Build for migrations |
| `key "_XXX" not matched` | Substitution variable mismatch | Check YAML substitutions block |
| `cannot execute binary file` | Binary architecture mismatch | Don't run local tools in CI/CD |
| Customer Hierarchy 404 | Environment variable mismatch | Set correct `ENV` value (e.g., `staging-v2`) |
| Frontend substitution error | cloudbuild.yaml missing build-arg | Add `--build-arg` and Dockerfile `ARG`/`ENV` |
| Gateway `/api/v2/*` 401 | Auth middleware catches all `/api/v2/` | Add exceptions in `api-gateway-fastapi/app/main.py` |

### 7.4 Database Operations in CI/CD

- **Migrations**: Use Cloud Build or Cloud Run Jobs (not GitHub Actions runner)
- **Local Testing**: Use Cloud SQL Proxy
- **Production**: Use Cloud Run Jobs with dedicated service account

## 8. Remediation Timeline (2025-09-29 → 2025-09-30)

- **2025-09-29 18:10** — Rebuilt all services with explicit `DATABASE_PORT=5432`.
- **2025-09-29 20:22** — Renamed customer hierarchy service, updated API Gateway target, and opened health endpoints in auth middleware.
- **2025-09-30 00:18** — Pushed final `deploy.yml` fixes to GitHub (service suffix defaults, DB instance selection, validation scripts).
- **2025-09-30 16:08** — Manual `workflow_dispatch` with `force_backend_redeploy=true` deployed all eight services successfully (Run ID 18090027823).
- **2025-09-30 16:30** — Added CI suffix normalization and regression tests to ensure `staging` runs stay aligned.

## 9. Outstanding Work

| Item | Owner | Status |
| --- | --- | --- |
| Verify `GCP_SA_KEY` permissions (Cloud Build / Artifact Registry / Cloud Run) | Platform | Pending |
| Add CI lint for service name length | Platform | Pending |
| Automate execution of `test-validate-deployment-suffix.sh` | Platform | Pending |
| Split `staging` vs `staging-v2` pipelines if long-term dual-track is required | To Discuss | Backlog |

## 10. Monitoring Strategy

### 10.1 Automated Monitoring Schedule

**Primary Workflow**: `.github/workflows/monitoring.yml`

- **Frequency**: Daily at 01:00 UTC (09:00 UTC+8 / Taiwan time)
- **Previous Setting**: Every 5 minutes (過於頻繁，已於 2025-09-30 優化)
- **Change Rationale**:
  - 5分鐘頻率產生過多 GitHub Actions 執行費用與 GCP API 調用
  - 業界標準為 15-30 分鐘或每日一次
  - GitHub Actions 不適合作為持續監控平台，應使用專業 APM 工具

### 10.2 Monitoring Components

每日監控涵蓋六大模組：

1. **Service Health Monitoring** (`health-monitoring` job)
   - 檢查所有 Cloud Run 服務的 `/health` 端點
   - 環境：staging + production
   - 失敗時自動發送 Slack/PagerDuty 告警

2. **Performance Monitoring** (`performance-monitoring` job)
   - 收集請求數量、延遲、資料庫與 Redis 效能指標
   - 僅在手動觸發或 `check_type=all` 時執行

3. **Cost Monitoring** (`cost-monitoring` job)
   - 統計 Cloud Run、Cloud SQL、Redis 資源數量
   - 超過 20 個資源時發出成本警告

4. **Security Monitoring** (`security-monitoring` job)
   - IAM 成員數量、公開服務檢查、Secret Manager 狀態
   - 驗證加密與認證機制

5. **Log Analysis** (`log-analysis` job)
   - 分析過去 1 小時的錯誤與警告日誌
   - 錯誤數量 >10 時觸發告警

6. **SLO Monitoring** (`slo-monitoring` job)
   - 檢查 Uptime (>99.9%)、P95 Latency (<500ms)、Error Rate (<0.1%)
   - 計算 SLO burn rate

### 10.3 Daily Email Report

**新增功能**（2025-09-30）：

- **Job**: `email-report`
- **觸發條件**: 僅在 `schedule` 事件時執行（避免手動測試時發送）
- **收件人**: `tech@tsaitung.com`（可透過 `REPORT_EMAIL` secret 覆寫）
- **發送方式**: SendGrid API
- **報告格式**: HTML 郵件，包含：
  - 所有監控模組狀態總覽（表格形式）
  - 整體系統健康狀態徽章
  - GCP Console 與 GitHub Actions 快速連結
  - 自動判斷狀態（成功/失敗/警告）並套用顏色標記

**必要 GitHub Secrets**：
- `SENDGRID_API_KEY` — SendGrid API 金鑰（必需）
- `REPORT_EMAIL` — 收件人信箱（預設：tech@tsaitung.com）
- `GOOGLE_CLOUD_PROJECT` — GCP 專案 ID（用於報告連結）

**Fallback 機制**：
- 若 `SENDGRID_API_KEY` 未設定，workflow 會將 HTML 報告內容記錄至 GitHub Actions logs
- 不會導致 workflow 失敗，但會顯示警告訊息

### 10.4 Manual Monitoring

保留 `workflow_dispatch` 手動觸發選項：

```yaml
inputs:
  check_type:
    - health      # 僅健康檢查
    - performance # 效能分析
    - security    # 安全稽核
    - cost        # 成本監控
    - all         # 全部執行
```

**使用情境**：
- 部署後即時驗證服務健康狀態
- 效能問題排查
- 成本審計
- 安全合規檢查

### 10.5 Integration with Professional Monitoring

GitHub Actions 監控應作為**輔助工具**，主要監控仍應使用：

- **APM**: DataDog / New Relic / Prometheus + Grafana
- **Uptime Monitoring**: Pingdom / UptimeRobot
- **Error Tracking**: Sentry
- **Log Aggregation**: GCP Cloud Logging + BigQuery

GitHub Actions 監控優勢：
- 與 CI/CD 流程整合
- 版本控制與程式碼審查
- 免費額度足夠日常使用
- 結果可追溯至 Git commit

## 11. Contact & Maintenance

- CI/CD DRI: Platform Engineering (DevOps)
- Update cadence: after any pipeline change merged to `main` or `staging`.
- When introducing new API/back-end behavior, update this document first, then reference it from feature PRs.
