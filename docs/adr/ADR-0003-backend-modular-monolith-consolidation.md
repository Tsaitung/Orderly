# ADR-0003: Backend 收斂為模組化單體（9 FastAPI 服務 → 1）

- **Type**: foundational
- **Lifecycle Status**: accepted
- **Date**: 2026-06-09
- **Cluster**: —（cross-module）
- **Primary PRD**: —
- **FR References**: —
- **US References**: —
- **Supersedes / Superseded By**: —
- **Review By**: —

## Context

Orderly 後端原為 **distributed monolith**：9 個 FastAPI 微服務（user / order / product / acceptance / billing / notification / customer-hierarchy / supplier / api-gateway）共用單一 `orderly` PostgreSQL DB，且服務間以 loopback HTTP 互打。一個 14-agent survey 證實這個結構對**單人維護**是淨負擔，且現況已壞：

1. **現在就壞**：fresh DB 跑 user-service `alembic upgrade head` 會死（002/003 重複建 `supplier_invitations`）→「完整本地重現」當下根本做不到。
2. **naive 合併會炸**：9 服務全用同名 top-level `app` 套件（import 互相 shadow）；product `sku.py` 重複 mapper 會 startup crash。
3. **維護成本**：9 條 alembic 鏈、9 個 Dockerfile、本地要跑 9 個容器才能動一個流程。

設計約束：**frontend API 契約逐字不變**（不動前端）。

## Decision

採用 **modular monolith**：把 9 服務收斂為單一 `uvicorn app.main:app` 程序，能在 localhost 單一程序起來、`/restart` 一鍵拉起（含 postgres/redis）。

實作分四步增量（STEP 0-3，第一階段）+ 後續收斂（STEP 4-9，第二階段）：

1. **STEP 0** — 把共用核心 `orderly_fastapi_core` 做成可 pip 安裝套件（`backend/libs/pyproject.toml` + `pip install -e`），移除全部 `sys.path` hack、正規化 `from libs.orderly_fastapi_core` → `from orderly_fastapi_core`。commit `db1d2c5`。
2. **STEP 1** — 修 3 個既有 crasher：user-service alembic 002→003 斷鏈（`de26b84`）、刪 product 死重複 mapper `models/sku.py`（`c34f6c7`）、customer-hierarchy 4 個無 migration 的 model（T1c，當時延後）。
3. **STEP 2** — 把每個服務 re-root 進 `backend/app/modules/<svc>/`（解 `app` 套件名全撞的硬阻斷）；intra-service import 改 `from app.X` → `from app.modules.<svc>.X`，一服務一 commit（`4356887` pilot + `64a81cd` 其餘 8）。
4. **STEP 3** — 寫 composition root `backend/app/main.py`：`include_router` 全部 module router、top-level 套一次 middleware（CORS / Auth / Redis rate-limit）、serve `/health`；建 `backend/app/requirements.txt`（聯集）與 `.claude/restart.yaml`（commit `448badd`）。
5. **STEP 4-9（第二階段，收斂）** — 退役 api-gateway reverse-proxy、合併成單一 SQLAlchemy `Base`（`backend/app/db/base.py`）、alembic 收斂為單一鏈（`backend/app/alembic`，`0001_consolidated_schema` 起）、消滅 loopback HTTP 改 in-process、補 phantom FK、收斂部署為單一 `backend/Dockerfile.monolith` + 單一 Cloud Run + CD matrix 切 `backend-monolith`。canonical 收尾記於 `docs/plans/20260607-backend-monolith-step4-9/`（commits `bf4abc2` / `5fd4e43` / `3de6c1e`）。

### 子決策（隨本 ADR 一併凍結）

STEP 0-3 子決策：

| ID | 決策 | 採用 |
|----|------|------|
| D2(0-3) | billing module 是否納入單體 | **納入**（mount 其 router；部署層收斂於 STEP 9）|
| D3 | 雙前綴 `/api/api/suppliers` 怎麼處理 | **單體接受雙前綴**（零 frontend 改動，契約不變）|
| D-gw | gateway 的 Auth/rate-limit + 無前綴 alias 如何處理 | gateway middleware（SecurityHeaders / Auth / Redis rate-limit）移成 **top-level 套一次**；`gateway_compat` 模組**不註冊任何 `_proxy` / catch-all 路由**；無前綴 alias（`/auth/login`、`/suppliers`、`/products/*` 等）改由**真實 module router dual-mount**（有前綴 + 無前綴同時掛載）達成 |

STEP 4-9 子決策（harvest 2026-06-09 驗證後凍結）：

| ID | 決策 | 採用 |
|----|------|------|
| D1 | `customer_hierarchy/integration_service` 移 loopback HTTP 後 | **partial in-process + accepted stub**：user 權限查詢改 in-process query monolith users 表、hierarchy alert 改 in-process persist notification；order/billing fanout 保守 deny-write / no-op stub（無 in-process domain owner API）。Exit trigger：bulk/migration write flow 啟用時補真實 handler（見 deprecation-roadmap）|
| D2(4-9) | phantom FK 覆蓋 | **補 `acceptances.orderId → orders.id`**（最明確、type 相容；migration `0003_acceptance_order_fk`，orphan-audit→NOT VALID→VALIDATE pattern）；其餘 candidate FK skip（ownership/coupling 不明）|
| D4 | legacy per-module alembic 鏈 | **retire（已執行）**：8 條 per-module 鏈已 `git rm`；解鎖條件達成（staging `orderly-db-v2` 已 stamp 到 `alembic_version_monolith`）；canonical 鏈在 `backend/app/alembic`（`0001→0004`）|
| D-deploy | migration 與容器開機關係 | **解耦**：`Dockerfile.monolith` CMD = uvicorn only，migration 走獨立 gated Cloud Run Job；理由＝避免 cross-module FK orphan audit `RAISE EXCEPTION` abort 後 `&&` 短路打死 serving（見 runbook §2）|

## Consequences

- (+) 單一程序服務全部既有 API 路徑，契約逐字不變；`/restart` 一鍵拉起單體 + frontend + postgres + redis。
- (+) 解除兩個硬阻斷：`app` 套件名 shadow（STEP 2 re-root）、product 重複 mapper startup crash（STEP 1b）。
- (+) fresh DB 可重現：STEP 1a 修好 user-service alembic 斷鏈；STEP 4-9 後 `0001_consolidated_schema` 以 `unified_metadata.create_all(bind)` 一次建出全 schema。
- (+) 維護面收斂：單一 Dockerfile、單一 alembic 鏈、單一 Cloud Run service。
- (T1c 已解) STEP 0-3 當時把 customer-hierarchy 4 表（`activity_metrics` / `dashboard_summary` / `performance_rankings` / `activity_trends`）標為「無 per-module migration、延後」。**STEP 4-9 的 `unified_metadata.create_all` 策略已隱式閉合**此缺口：這 4 個 model 已 import 進 `backend/app/modules/customer_hierarchy/models/__init__.py` → 進 unified `Base.metadata` → fresh-DB monolith path 由 `0001_consolidated_schema` 建出。舊 per-module customer-hierarchy alembic 鏈為 legacy/dead，非 active fresh-DB path。故此項**非** open tech-debt。
- (−/分界) `backend/app/modules/gateway_compat/**` 仍留 legacy proxy source（不被 `backend/app/main.py` 掛載）；舊 `backend/*-fastapi/` 目錄殘留 `tests/` 與散落 scripts。清理屬 STEP 9 收尾，記於 step4-9 closure。
- (分界) `/ws/orders` order-events WebSocket：後端現況**無** FastAPI WebSocket handler（frontend 建 URL 但無人服務）→「契約不變」＝維持現狀，**不**列入 frozen contract、不新增 endpoint；order 事件 in-process 化屬 STEP 7 設計。

## Alternatives Considered

- **A：保留 9 微服務 + 逐一修補**（修斷鏈、修重複 mapper，但維持分散結構）— rejected：未解維護成本根因（9 alembic / 9 Dockerfile / 9 容器），單人維護負擔不變，loopback HTTP 的分散式失敗模式持續。
- **B：一次性全合併成單體**（立即統一單一 `Base` + 單一 alembic，不分階段）— rejected：~58k LOC 搬移 + schema 收斂同批進行，breaking 風險不可控、無法逐步驗證、rollback 粒度過粗。
- **採用（本 ADR）：modular monolith 增量收斂**（STEP 0-3 先正規化 import / re-root / composition root，各模組暫留自己的 engine/Base/alembic；STEP 4-9 再收斂 DB/alembic/deploy）— 取兩者之長：先讓單體在 localhost 跑起來（命中 `/restart` 目標），結構性 DB/部署收斂留第二階段，每步獨立 commit 可 `git revert`。

## Provenance

本 ADR 由 `orderly-doc-governance` harvest（2026-06-09）從兩個已退役 plan packet 升格：

- **STEP 0-3**（`docs/plans/20260607-backend-monolith-step0-3/`，已 promote-then-delete）：架構決策 + import/namespace/composition 機制。經 5 輪 Codex 對抗審（最終 APPROVED）+ 執行後驗證稽核。審計軌：`docs/references/history/20260607-backend-monolith-step0-3-harvest.md`。
- **STEP 4-9**（`docs/plans/20260607-backend-monolith-step4-9/`，已 promote-then-delete）：結構性收斂（single Base / single alembic / single Cloud Run / migration 解耦）+ runtime acceptance（V1-V3 真 DB/真 uvicorn 驗證）+ staging 部署（已 ground-truth 驗證）。審計軌：`docs/references/history/20260607-backend-monolith-step4-9-harvest.md`。

實作證據以 commit SHA 為準（永久）：STEP 0-3 `db1d2c5`/`de26b84`/`c34f6c7`/`4356887`/`64a81cd`/`448badd`；STEP 4-9 `bf4abc2`/`3de6c1e`/`5fd4e43`/`c63fc47`。**Production cutover 程序 + 6 個未決 owner 決策 + 已驗 infra state** 見 runbook `docs/governance/runbooks/backend-monolith-production-cutover.md`（production 仍擱置）。tech-debt（D1 stub、legacy staging services）見 `docs/governance/deprecation-roadmap.md`；re-root drift incident 見 `docs/incidents/2026-06-08-monolith-reroot-drift.md`。
