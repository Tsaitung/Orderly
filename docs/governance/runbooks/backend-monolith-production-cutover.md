# Runbook — Backend Monolith Production Cutover

- **Owner**: backend / infra
- **Status**: staging deployed ✅ · **production ON HOLD** (6 owner decisions pending)
- **Source**: promoted from retired plan packet `20260607-backend-monolith-step4-9` (harvest 2026-06-09). Architecture decision → [ADR-0003](../../adr/ADR-0003-backend-modular-monolith-consolidation.md).
- **Last verified**: 2026-06-09（infra findings re-verified via `gcloud`；deploy state per packet closure 2026-06-08）

此 runbook 是 backend modular-monolith **部署收斂 + production cutover** 的 operator 程序與待決 owner 決策的 canonical home。實作（`cd.yml` / `Dockerfile.monolith` / `0002`-`0003` migration）是 code source of truth；本檔記 **why + procedure + open decisions + verified infra state**。

---

## 1. 目前部署狀態（已驗證）

| 環境 | 狀態 | 證據 |
|------|------|------|
| **staging** | ✅ monolith 部署完成 | Cloud Run `orderly-backend-staging-v2`（`gcloud run services list` 2026-06-09 確認存在）、`orderly-frontend-staging-v2`。Closure（2026-06-08）：`/health` 200 `{"status":"ok","service":"orderly-monolith"}`、`/openapi.json` 395 路由、DB `orderly-db-v2/orderly` `alembic_version_monolith=0003_acceptance_order_fk`、44 base tables、7 cross-module FK validated、orphan=0 |
| **production** | ⛔ ON HOLD | prod DB target 未定（見 §4 D-prod-1）；`orderly-db` 不存在 |

**已驗證 infra findings（`gcloud` @ orderly-472413，2026-06-09 re-verify）：**

- `orderly-db-v2` 是 project 內**唯一** Cloud SQL 實例（RUNNABLE）。
- `orderly-db`（舊 production DB target）**不存在**（`gcloud sql instances describe orderly-db` → HTTP 404）。
- 8 個 `orderly-*-service-fastapi-production` Cloud Run 服務的 cloudsql annotation 指向不存在的 `orderly-db` → **production 實質未運作**。
- **legacy per-service staging Cloud Run 服務仍在**（`orderly-acceptance-service-fastapi-staging-v2`、`orderly-api-gateway-fastapi-staging-v2`、`orderly-notification-service-fastapi-staging-v2` 等），與新 monolith `orderly-backend-staging-v2` 並存 → teardown candidate（見 deprecation-roadmap）。

---

## 2. 部署架構安全設計（為何 cd.yml 這樣寫）

production deploy 前對抗稽核（2026-06-08）裁定 **NO-GO direct-to-prod**，核心結構缺陷已修進 `cd.yml`/`Dockerfile.monolith`。下列是**設計理由**（實作在 code，勿在此重述行號細節）：

1. **Migration 與開機解耦**（最關鍵）：`Dockerfile.monolith` CMD = **uvicorn only**，**不**在容器啟動跑 `alembic upgrade head`。Migration 走獨立、gated 的 Cloud Run **Job**。
   - 理由：若 `alembic && uvicorn` 耦合，monolith 鏈（`alembic_version_monolith`）首次對真 DB replay `0001→0003`；`0002/0003` 的 cross-module FK orphan audit 用 `RAISE EXCEPTION`，一個 orphan → migration abort → `&&` 短路 → uvicorn 永不啟動 → Cloud Run 永不健康。解耦後 migration 失敗不會打死 serving。
2. **Preflight orphan gate**：`cd.yml` 有唯讀 `preflight` job 跑 `scripts/database/monolith_fk_audit.sql`，`SUM(orphan_count)>0` 即 fail，SQL instance 不存在即 fail-loud。
3. **`ENVIRONMENT` 傳遞**：cd.yml migrate job + build-deploy job 都帶 `ENVIRONMENT=$ENVIRONMENT`（否則後端停在 development → HSTS 掉、Swagger 暴露）。
4. **Deploy ordering**：`deploy-frontend` `needs:[resolve, build-deploy]`（不能在後端起來前 repoint，否則 user-facing 5xx）。
5. **Monolith-aware deploy-consistency guard**：`scripts/ci/check-deploy-consistency.sh` 驗 `backend/Dockerfile.monolith` 的 COPY context（取代舊只認 `*-fastapi` 的版本，否則 re-root 後 exit-1）。wire 進 `make deploy-check` + preflight。

> Provenance：以上 11 條 blocker 的修復已套用於整合 commit `c63fc47`，並經 staging 4 輪 CD 真根因驗證全綠（見 §3）。

---

## 3. Staging cutover 已走過的程序（可複用模板）

整合 branch 推 `staging` 後，4 輪 CD（每輪真根因 + 本機 repro + 修，**禁 blind redispatch**）達全綠：

| 輪 | 根因 | 修 |
|---|---|---|
| R1 | jest 撈 Playwright e2e spec → CI gate fail | `jest.config` 排除 `e2e/` |
| R2 | resolve 偵測無部署變更 → 全 skip | `workflow_dispatch force_all` |
| R3 | migrate Cloud Run Job：alembic ConfigParser 把密碼 URL-encode 的 `%` 當插值 → `invalid interpolation syntax` | `backend/app/alembic/env.py` `%`→`%%` escape |
| R4 | — | 全綠：monolith + frontend 部署、migration `0001→0003` 套用 |

ground-truth 驗證（非僅 CD 綠）：monolith `/health` 200、frontend `/` 200、`alembic_version_monolith=0003`、44 tables、7 FK、orphan=0。

---

## 4. Production cutover — 待決 owner 決策（全部不可逆 / 動 live 資料）

production 真正遷移/部署前，以下 6 點需 owner 拍板。**每點都是 release-time gate，禁 AI 盲跑。**

| # | 決策 | 現況 | 解鎖 / 選項 |
|---|------|------|-------------|
| D-prod-1 | **Production DB target** | `orderly-db` 不存在；`orderly-db-v2` 是唯一實例且近乎空 | (a) 建真 prod DB、(b) production 改指 `orderly-db-v2`、(c) 把 v2 當唯一環境 |
| D-prod-2 | **split-brain alembic stamp** | live DB 是 `alembic_version_customer_hierarchy`（=`001_initial_hierarchy`）；monolith 要單一 `alembic_version_monolith` | history merge / stamp 策略（先 stamp 再 upgrade）|
| D-prod-3 | **表共存衝突** | `0001` unified_metadata 也含 customer_hierarchy 那 5 表（已存在、0 rows）| 確認 `create_all` create-if-not-exists 不 clobber 既有表 |
| D-prod-4 | **缺真資料 backfill** | project 內查無 order/product/organization/acceptance 業務資料 | 遷移前需有資料來源 + backfill 計畫 |
| D-prod-5 | **遷移前 backup/PITR + reviewer** | — | snapshot/PITR + GitHub `environment=production` reviewer 簽核 |
| D-prod-6 | **rollback posture** | `0001` downgrade = `NotImplementedError`，half-migrated 無乾淨 downgrade | 先定回滾計畫（snapshot 還原 vs roll-forward）|

**Release-time orphan gate（獨立於 staging）**：merge 後真 deploy 前，對目標 prod DB 跑同一支 `monolith_fk_audit.sql`；orphan>0 **停下回報哪表哪欄幾筆，不自行刪資料**（資料清理需 owner 決定）。註：2026-06-08 唯讀掃描證實 `orderly-db-v2/orderly` 空（FK 表全不存在）→ 空表加 FK = 0 orphan，該 DB 上 monolith 遷移低風險；但 prod DB target 一旦改變需重掃。

---

## 5. Cutover 後 teardown（解 production 後執行）

- legacy per-service staging Cloud Run 服務（`orderly-*-service-fastapi-staging-v2` 等）confirm monolith 穩定後 teardown。
- 8 個指向不存在 `orderly-db` 的 `orderly-*-service-fastapi-production` 服務 decommission。
- 本機 dirty working-tree cruft（已 git-deleted 但 disk 殘留的 `backend/*-fastapi/` 殼 + stale `.pyc`）→ `git clean -fdx backend/` 候選（local-only，非 repo state）。

詳見 [deprecation-roadmap](../../governance/deprecation-roadmap.md)。

## 6. 已知限制

- `0001 create_all` 對既有表 **skip**（不 reconcile schema drift）— 列已知限制；若 model 與既有表 drift，需手動 migration。
- `downgrade()` = `NotImplementedError` → dev 回退走 drop DB 重建；prod 回退走 snapshot（D-prod-6）。
- cd.yml smoke job `if: always() && build-deploy.result != 'failure'` 在 deploy skip 時仍跑（low-priority cosmetic，見 deprecation-roadmap）。
