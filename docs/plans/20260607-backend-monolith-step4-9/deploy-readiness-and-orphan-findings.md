# Monolith 部署就緒度 + Orphan 掃描結論（2026-06-08）

> 本檔是 2026-06-08「部署到 production」嘗試的**持久結論紀錄**。產出來源：兩個 multi-agent workflow（部署前對抗稽核 + orphan 掃描）+ 一個整合執行 workflow。原始 workflow 輸出在 session transient `/tmp`（會被清），本檔把結論固化進 repo。
>
> **狀態：production 全擱置**（owner 指示 2026-06-08）。本 branch 整合工作已 local commit（`c63fc47`），**未 push、未部署、未碰任何真 DB**。

---

## 1. 背景：發現 branch 處於不可部署的破碎中間態

- `codex-public-pages-redesign`（前端 public-pages 重設計 + 半套 monolith：re-root 了 `backend/<svc>/app` 但**缺**部署收斂）。
- `codex-backend-step4-9`（`bf4abc2`→`3de6c1e`：完整 monolith 後端 + `Dockerfile.monolith` + cd.yml 切 `backend-monolith`，但**不含前端**）。
- 兩者是互補兩半，從共同祖先 `a362781` 分出，改不同區域。
- cd.yml 原本部署 8 個微服務，但 re-root 已把各服務 `app/` 搬走 → `docker build` 的 `COPY ${SERVICE_PATH}/app` 必在 CD build time 才爆（`scripts/ci/check-deploy-consistency.sh` 守衛實測 22 條 COPY 路徑全 missing）。

## 2. 部署前對抗稽核結論（workflow `wf_799ee5af-fdb`，38 agents）

**裁定：NO-GO direct-to-prod**（11 blockers / 56 findings）。核心結構缺陷：`Dockerfile.monolith` 把 `alembic upgrade head && uvicorn` **遷移耦合開機**，monolith 鏈（`alembic_version_monolith`，live DB 不存在此表）會在首次啟動對真 DB 從零 replay `0001→0002→0003`；`0002/0003` 共 7 個 cross-module FK orphan audit 用 `RAISE EXCEPTION`，一個 orphan → 遷移 abort → `&&` 短路 → uvicorn 永不啟動 → Cloud Run 永不健康；加上 `deploy-frontend` 並行 repoint → user-facing 5xx。

### 11 blockers 與處置狀態（皆已套用於 `c63fc47`，已逐項 grep 驗證）

| # | Blocker | 處置 | 驗證 |
|---|---|---|---|
| 1-5 | 5 個 merge 衝突（BFF/env-check/SystemStatus 取 step4-9 `:8888` + prettier；plan-gate 取 ours；run.md 兩份都留→`closure-run.md`）| 已解 | merge stat + 無 conflict marker |
| 6 | cd.yml 後端從沒收到 `ENVIRONMENT` → staging+prod 都停在 development（HSTS 掉、Swagger 暴露）| 已加 `ENVIRONMENT=$ENVIRONMENT` | cd.yml L292（migrate job）/L371（build-deploy）|
| 7 | `Dockerfile.monolith` 遷移耦合開機 | CMD 改 uvicorn only + 獨立 gated `migrate` Cloud Run Job | `Dockerfile.monolith` L45 + 註解 L42-44 |
| 8 | cd.yml 無 preflight orphan gate | 加唯讀 `preflight` job（跑 `monolith_fk_audit.sql`，`SUM(orphan_count)>0` 即 fail，SQL instance 不存在即 fail-loud）| cd.yml L124-207 |
| 9 | `deploy-frontend` `needs:[resolve]` → 後端沒起前端就 5xx | 改 `needs:[resolve, build-deploy]` | cd.yml L441 |
| 10 | 守衛只認 `*-fastapi`（merge 後 exit-1）| 改寫成 monolith-aware（驗 `Dockerfile.monolith` COPY context）+ `make deploy-check` + wire 進 preflight | 守衛 `RC=0`：`✓ deploy-consistency OK: backend/Dockerfile.monolith`；Makefile L147 |
| 11 | pre-cutover schema diff | preflight 內加唯讀 `pg_dump --schema-only` 快照 + artifact（**未對任何 DB 跑**）| cd.yml preflight |

本機驗證（exec WF `wf_16e75b73-e55` verify phase = pass）：`type-check` 0、`lint` 0（1 個 pre-existing warning）、`actionlint` clean、`shellcheck` clean、守衛 `exit 0`、`docker build -f backend/Dockerfile.monolith` 成功（首次跑通 step4-9 plan 的 R1 gate）。

## 3. Orphan 掃描結論（workflow `wf_7f24e939-4e5`，唯讀）

**標的＝唯一存在的真 DB `orderly-472413:asia-east1:orderly-db-v2` / database `orderly`**（唯讀連線，PostgreSQL 15.17，psql 實證）。

**裁定：`block-on-schema-drift` — refactor 與 remove 皆不適用，因為沒有資料可動。**

- DB 內**只有 customer-hierarchy 一塊的 6 個表，全部 0 rows**：`business_units / customer_companies / customer_groups / customer_locations / customer_migration_logs` + `alembic_version_customer_hierarchy`(=`001_initial_hierarchy`)。
- **7 個 monolith FK 的表全部不存在**（`orders / organizations / order_items / products / product_skus / supplier_skus / acceptances`，`to_regclass` 在所有 schema 查都是 NULL）。
- `alembic_version_monolith` 不存在 → monolith 遷移從未跑過（first-run）。
- 7 個 FK 全部 `columns_exist=false`、`orphan_count=-1`（**無法測量，非 0**）。

### per-FK 決策（7 個一致：`fix-schema-drift-first`）

| FK | child 欄位 | NOT NULL | 決策 |
|---|---|---|---|
| fk_orders_restaurant_id_organizations | orders.restaurant_id | ✅ | fix-schema-drift-first（NULL 不可、moot）|
| fk_orders_supplier_id_organizations | orders.supplier_id | ✅ | 同上；未來若有 orphan→backfill 或 owner DELETE，永不 make-nullable |
| fk_order_items_product_id_products | order_items.product_id | ✅ | 同上 |
| fk_order_items_sku_id_product_skus | order_items.sku_id | ❌ | 未來 make-nullable 為合法 fallback |
| fk_products_supplier_id_organizations | products.supplierId | ❌ | audit 需含 IS NOT NULL guard |
| fk_supplier_skus_supplier_id_organizations | supplier_skus.supplier_id | ✅ | NULL 不可 |
| fk_acceptances_order_id_orders | acceptances.orderId | ✅ | 0003 guard 會 RAISE EXCEPTION |

→ **稽核當成最大風險的「真 DB orphan abort」整個是空的**——沒有業務資料 → 沒有 orphan → monolith 遷移在這顆 DB 上其實低風險（空表加 FK = 0 orphan）。

## 4. 推翻假設的基礎設施發現（已 grep/gcloud 驗證）

- **`orderly-db`（production DB 實例）不存在**（`gcloud sql instances describe` 回 404）。
- **8 個 `orderly-*-service-fastapi-production` Cloud Run 服務的 cloudsql annotation 指向不存在的 `orderly-db`**；production api-gateway **無 URL** → production 實質未運作。
- **`orderly-db-v2` 是 project `orderly-472413` 內唯一存在的 SQL 實例**，且其 `orderly` DB 近乎空（只有 customer-hierarchy、0 rows）。
- **在此 project 內找不到任何訂單/商品/組織/驗收業務資料**（可能在他處、從沒 seed、或被清掉——未確認）。

## 5. Owner 決策點（全部延後；production 擱置中）

未來若要真正遷移/部署，以下 6 點需 owner 拍板（皆不可逆 / 動 live 資料）：

1. **Production 的 DB target**：`orderly-db` 不存在 → 要建真 prod DB、還是 production 改指 `orderly-db-v2`、還是把 v2 當唯一環境。
2. **split-brain alembic**：live 是 `alembic_version_customer_hierarchy`，monolith 要單一 `alembic_version_monolith` → history merge/stamp 策略。
3. **表共存衝突**：`0001` 的 unified_metadata 也含 customer_hierarchy 那 5 個表（已存在、0 rows）→ 確認 create-if-not-exists 不 clobber。
4. **缺真資料**：遷移前需有 order/product 資料來源（backfill）。
5. **遷移前 backup/PITR** + GitHub `environment=production` reviewer 簽核。
6. **rollback posture**：`0001` downgrade 是 `NotImplementedError`，half-migrated 無乾淨 downgrade → 先定回滾計畫（snapshot vs roll-forward）。

## 6. 目前狀態

- 整合 branch `codex-public-pages-redesign` @ `c63fc47`（2-parent merge：`68cd4dc` + `3de6c1e`）= 前端 public-pages 重設計 + 完整 monolith 後端 + CD 安全修復（blocker 1-11）。
- **本機 commit only — 未 push、未部署、未碰真 DB。** push 到 `staging`/`main` 或 `workflow_dispatch` 才會觸發 cd.yml 部署（已驗證 `on:` 區塊）。
- 後續任何 staging 排演 / production 動作**等 owner 指示**。

## 7. 原始 workflow 輸出（transient，本 session 內有效）

- 部署稽核：`/tmp/synth.json`、`/private/tmp/.../tasks/w8zyx9es5.output`
- Orphan 掃描：`/private/tmp/.../tasks/wjpz1nzqf.output`
- 整合執行：`/private/tmp/.../tasks/w8wkmv8hu.output`

## 8. 相關 harness 改善（已落地）

`~/.claude/CLAUDE.md` 既有規則「刪檔前查引用」經 RCA 加寬涵蓋 **move/rename/re-root**（搬檔對引用的破壞性同刪檔）+ grep 範圍加 `Dockerfile*`/`compose*`/`workflows`/`COPY` + 收緊「done」定義 + 「目錄存在 ≠ build context 完整」——直擊本次 re-root drift 的生產端根因。

## 9. Staging 部署完成（2026-06-08，已 ground-truth 驗證）

**狀態更新：staging 已從「擱置」推進到「部署完成並驗證」。production 仍擱置。**

整合 branch 推到 `staging` 後，經 4 輪 CD（每輪真根因 + 本機 repro/驗證 + 修，禁 blind redispatch）達成全綠：

| 輪 | 失敗根因 | 修復 |
|---|---|---|
| R1 | jest 撈 Playwright e2e spec → CI gate fail | `jest.config` 排除 `e2e/` |
| R2 | resolve 偵測無部署變更 → 全 skip | 改 `workflow_dispatch force_all` |
| R3 | migrate Cloud Run Job：alembic ConfigParser 把真密碼 URL-encode 的 `%` 當插值 → `invalid interpolation syntax` | `backend/app/alembic/env.py` `%`→`%%` escape（repro 證明 round-trip）|
| R4 | — | 全綠：monolith + frontend 部署、migration `0001→0003` 套用 |

**ground-truth 驗證**（非僅 CD 綠）：
- monolith `orderly-backend-staging-v2` `/health` → 200 `{"status":"ok","service":"orderly-monolith"}`；`/openapi.json` 395 路由；auth 路由 401。
- frontend `orderly-frontend-staging-v2` `/` → 200。
- DB `orderly-db-v2/orderly`：`alembic_version_monolith`=`0003_acceptance_order_fk`、44 base tables、7 cross-module FK。orphan 掃描證實空 DB → 0 orphan（migration 無 abort）。

## 10. Re-root drift 收尾清理（2026-06-08）

承 §10 owner 決策，已完成：
- **ci.yml backend-test**：9 微服務殼 matrix → 單一 Backend Monolith job（裝 `backend/app` deps + fresh CI DB 跑 `alembic upgrade head` + 有測試才 pytest）。backend advisory 由 9 紅收斂為 1 綠。
- **刪 9 個微服務殼** `backend/*-fastapi`（`app/` 早已 re-root 搬走）→ `backend/` 現純 monolith。
- **刪 8 個 per-module alembic 鏈** `backend/app/modules/*/alembic`（D4 解鎖條件達成：orderly-db-v2 已切 `alembic_version_monolith`；canonical 鏈在 `backend/app/alembic`）。
- **退役 `scripts/deploy-cloud-run.sh`**（per-service legacy，被 cd.yml 取代）+ 更新 CLAUDE.md / CI-CD-ARCHITECTURE.md / ci-secrets.md 引用。
- **刪 4 個 0-ref dead script**（start-dev / start-all-services / cloudbuild Dockerfile.migration-{simple,fix}）。
- **修 `scripts/database/database_manager.py`** sys.path + customer_hierarchy model import 路徑（re-root 後 `app.models.*` → `app.modules.customer_hierarchy.models.*`）。
- **`make verify` test-fe 對齊 CI**：窄 testMatch → 全套 `jest --passWithNoTests`（殺 local-vs-CI divergence）。
- `.jest-cache` untrack + gitignore。

**仍開放**：cd.yml smoke job `if: always() && build-deploy.result != 'failure'` 會在 deploy 被 skip 時仍執行（應改為要求 build-deploy `== 'success'`）——目前服務已存在故無害，屬低優先 cosmetic 修正。production 部署（需先決定 prod DB target，`orderly-db` 不存在）。
