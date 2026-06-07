# Backend 9→1 模組化單體遷移 — STEP 4-9 收尾 + 驗證 Implementation Plan

**Goal:** 把已 commit 的 STEP 4-9 整併（`bf4abc2`）從「靜態/程式碼層已驗」推進到「runtime 已驗、可 merge」狀態：實機跑過一次 alembic 遷移、實機起單體逐條 curl frozen contract、結清少數真正的剩餘缺口（integration_service stub、phantom FK orphan 風險、死碼清理），**不擴張 scope**。

**Architecture:** STEP 4-9 的程式碼已全部寫完並 commit 在 `codex-backend-step4-9` worktree（單一 `declarative_base`、單一 monolith alembic 鏈 `0001→0002`、loopback HTTP 全部 in-process、gateway proxy 不掛載、單一 `Dockerfile.monolith` + 單一 `backend-monolith` Cloud Run）。本 plan **不重寫實作**，只補「從未被執行過的 runtime 驗證」與「收尾性的死碼移除 + 兩三個 owner 決策」。

**Tech Stack:** FastAPI · SQLAlchemy（單一 Base）· Alembic（單一 `alembic_version_monolith` 鏈）· uvicorn · `orderly_fastapi_core` 共用 lib（含 `SecurityHeadersMiddleware` / `RedisRateLimitMiddleware`）· Redis · PostgreSQL 3.11 · Docker / Cloud Run / GitHub Actions `cd.yml`。

**Risk:** high（schema migration 將首次打到真 DB、cross-module FK 可能因 orphan 直接 abort 遷移、deploy 設定改動、死碼刪除）→ 走完整 plan-review + Codex 對抗審。

**執行 worktree（重要）：** 本 plan 文件 commit 在 `codex-public-pages-redesign` worktree（依 user 指示）；但**所有驗證／清理 task 在 `codex-backend-step4-9` worktree 執行**（程式碼所在）。下列指令的 cwd 一律是
`/Users/leeyude/Projects/_worktrees/Tsaitung-Orderly-72d17797/codex-backend-step4-9`。

**Base commit：** `bf4abc2 feat(monolith): complete backend step 4-9 consolidation`（parent = `b62526f` step0-3 final approval）。

---

## Goals / Why

**動機**：STEP 4-9 的程式碼已寫完且 commit（`bf4abc2`），但 commit 訊息與 run.md 狀態矩陣**自承的驗證只到靜態層**——`compileall`、`import app.main`、metadata load（42 表）、`alembic heads`（單 head）、YAML parse、`docker-compose config`、FastAPI **TestClient** smoke。它**從未**：

1. 對**真 PostgreSQL** 跑過 `alembic -c app/alembic.ini upgrade head`（`0001 create_all` + `0002` orphan-audit/FK validate 都沒實打）。
2. 用**真 uvicorn**（接 DB+Redis）起過單體並逐條 curl frozen contract（只有 TestClient route-prefix 存在性 + Redis 連不上的 smoke）。
3. `docker build -f backend/Dockerfile.monolith` 建過 image，更沒 Cloud Run deploy / Cloud Build / CI run。
4. `npm run type-check` 通過（自承 **失敗**，宣稱是環境/既有 TS 問題、未碰到改動的 BFF 檔——但未證實改動檔本身過）。

因此本 plan 的核心價值＝**補上那一輪 runtime 驗證**（這正是 STEP 0-3 plan 收尾稽核已點名缺的「靜態綠 ≠ feature 真的能跑」），再結清研究查出的**少數真正剩餘缺口**。

**成功狀態**：真 DB 上 `alembic upgrade head` 乾淨（42 表 + 6 個 cross-module FK 已 validate）、真 uvicorn 單體逐條 frozen-contract curl 全綠、改動的前端 BFF 檔 type-check 過、死碼（`gateway_compat`、legacy per-service Dockerfile/cloudbuild、legacy per-module alembic 鏈）依驗證結果移除或留 owner 決策，整支 branch 可 merge。

---

## In Scope

> 動詞分三類：**驗證**（跑從未跑過的 runtime 證據）、**決策**（owner 拍板的開放問題）、**清理**（移除已死的命名目標）。本 plan 不新增 feature、不改 frozen contract 路由形狀。

- **V1 真 DB alembic 驗證**：起 postgres（空 DB）→ `alembic -c backend/app/alembic.ini upgrade head` → 確認 42 表 + 6 FK `convalidated=true`；再跑一次驗 idempotency（已存在 DB 行為）。
- **V2 phantom FK orphan pre-flight（本機 dev DB；staging/prod 屬 release-time gate）**：在**本機重建後的 orderly dev DB** 套 `0002` 前先跑 `scripts/database/monolith_fk_audit.sql`，6 條 orphan_count 必須全 0（否則 `0002` 會 `RAISE EXCEPTION` 直接 abort 整個遷移）。**注意**：staging/prod 因歷來無 FK 強制、orphan 可能存在，其 orphan audit 是**獨立的 release-time gate**（merge 後 user 觸發真 deploy 前用同一支 SQL 驗），**不在本 plan 執行範圍**（見 R1、Out of Scope「真 Cloud Run deploy」）；本 plan 只證明 local dev DB 套真資料安全 + 提供 candidate FK 的 orphan 數據。
- **V3 真 uvicorn boot + frozen contract curl**：實機起 `uvicorn app.main:app`（接 DB+Redis）→ 逐條 curl STEP 0-3 frozen contract 7 條 + STEP 4 健康/middleware 行為（SecurityHeaders header 出現、login 429 rate-limit、verification_level 403）。
- **V4 前端 BFF type-check**：證實 `bf4abc2` 改動的 11 個前端檔本身 type-check 通過（與環境/既有 TS 問題切開）。
- **D1 integration_service stub 決策**：`customer_hierarchy/services/integration_service.py` 移除 HTTP 後改成 **permissive-read / deny-write / no-op stub**（非真 in-process）。owner 拍板：補真 in-process 實作，或正式接受 stub（附理由 + 影響範圍）。
- **D2 phantom FK 覆蓋決策**：是否補 `acceptances.orderId`（最明確的未覆蓋 cross-module FK；type 相容）等 candidate FK。
- **C1 刪 `gateway_compat` 死碼**：composition root 已不掛載、全 repo 零外部引用（grep 證實）→ 連同其重複的 `middleware/security_headers.py` / `middleware/redis_rate_limit.py` 一併刪。
- **C2 結清 legacy 部署死碼**：9 個 per-service `backend/*-fastapi/Dockerfile` + per-service `cloudbuild.yaml`（active CD `cd.yml` 已不引用，只剩 deprecated `deploy.yml` + security 掃描引用）→ 依 D3 決策刪或留。
- **C3 legacy per-module alembic 鏈處置**：20 個 per-module alembic version 檔（8 條鏈、各自 `alembic_version_*` 表）在 monolith 鏈成為 canonical 後屬 legacy。**先過 V1**（證明 monolith 鏈真能建出全 schema）→ 再依 D4 刪除或留。

## Out of Scope（本 plan 不做；避免擴張 scope）

- **raw JOIN → ORM 完整轉換**：研究確認 `bf4abc2` **未**轉換 4 處 raw `text(...JOIN...)`（`users/services/supplier_service.py` ×2、`users/api/v1/oauth.py`、`customer_hierarchy/main_api.py`）。這些全是**模組內** JOIN（parent+child 同模組/同 Base），**不**破壞「單一 Base」目標，純屬 code-quality leftover → 列 Out of Scope（STEP 5 的 load-bearing 目標「單一 Base + organizations/supplier_profiles 去重」已達成且 live 驗過 42 表）。
- **真 Cloud Run production deploy**：本 plan 只到 `docker build` 成功 + `cd.yml` 靜態驗（actionlint）。實際 staging/prod deploy 由 user 在 merge 後依 git-workflow 另行觸發（需 GCP 憑證、屬 release 動作，不在 plan 內盲跑）。
- **/ws/orders WebSocket handler**：後端仍無此 handler（`bf4abc2` 只改了前端 fallback port，未新增 handler）；維持 STEP 0-3 既有結論「契約＝維持現狀」，新增 handler 屬未來功能。
- **新增 feature / 改 frontend 契約形狀**：前端 BFF 的 11 檔改動經研究判定為「deploy-target repoint（localhost fallback `:8000`/`:300x`→`:8888`）+ 標籤/註解/dev-script」，request/response/auth/cookie/path **未變**；本 plan 不再動前端契約。
- **billing reconciliations / customer_prices / price_history 的 candidate FK**：orphan 風險與耦合較高、目標表有歧義 → 不在本 plan 補（列 D2 decision 但預設 skip）。

## Complexity Budget

- **新檔**：0（本 plan 以驗證為主；無新功能檔）。
- **新 migration**：0（除非 D2 拍板補 `acceptances.orderId` 等 FK → 至多 +1 migration，需在此明寫理由再擴）。
- **新 endpoint**：0。
- **新 dependency**：0。
- **刪檔**：大（`gateway_compat/**`、9 per-service Dockerfile + cloudbuild、20 legacy alembic version 檔）——但全屬已證實死碼的移除，非新邏輯，且 C3 受 V1 通過 gate。
- 超出上述任一上限 → 需在本 plan 明寫理由再擴。

---

## Current State（`bf4abc2` 已 commit 的實況；研究 + 手動 spot-check 證實）

| Step | 實作狀態 | 已驗 | 未驗 / 剩餘 |
|---|---|---|---|
| **STEP 4** gateway 退役 | proxy 不掛載（`main.py:12` 僅 docstring）；`SecurityHeadersMiddleware`+`RedisRateLimitMiddleware`+`verification_requirements` 套為 top-level（`main.py:131-138`） | 靜態：import/grep 證實無 `_proxy`/`httpx`/gateway route | runtime 未驗（header/429/403 沒實打）；`gateway_compat/**` 死碼仍在（C1）|
| **STEP 5** 單一 Base | 全 repo 僅 1 個 `declarative_base()`（`app/db/base.py:5`）；8 模組 `models/base.py` 全 `from app.db.base import Base`；organizations/supplier_profiles 去重為 users canonical + suppliers re-export shim | **live 驗過**：42 表、無重複 tablename | raw JOIN→ORM 未做（Out of Scope）|
| **STEP 6** alembic 收斂 | 單一線性鏈 `0001_consolidated_schema(down_revision=None)→0002_cross_module_fks`，`VERSION_TABLE=alembic_version_monolith`；`0001` 從 unified_metadata `create_all` 建全表 | 靜態：`alembic heads` 單 head；metadata load 42 表 | **從未對真 PG 跑 upgrade**（V1）；20 個 legacy per-module version 檔/8 鏈仍在（C3）；`downgrade()` 為 `NotImplementedError`；`_consolidated_schema.py:14-17` docstring 過時 |
| **STEP 7** loopback 消滅 | OTP（`otp_bridge.py`）、orders→notification、billing→order **真 in-process**；OAuth httpx 為對外，保留 | 靜態：grep 證實模組間無 loopback HTTP | `customer_hierarchy/integration_service.py` 移 HTTP 但改成 **stub**（非真 in-process）→ D1；`suppliers/core/config.py:114-115` 死 config |
| **STEP 8** phantom FK | 6 個 cross-module FK 同時存在 **model-level**（`order.py` 8×ForeignKey 等）**與 migration `0002`**；orphan-audit nullable 處理正確；`monolith_fk_audit.sql` 與 migration 一致 | 靜態：covered 6 FK + audit SQL 對齊 | **orphan audit 從未對真資料跑** → 真 DB 有 orphan 會直接 abort 遷移（V2，最大 live 風險）；`acceptances.orderId` 等未覆蓋（D2）|
| **STEP 9** 部署收斂 | `cd.yml` `ALL=["backend-monolith"]` 乾淨切換；`Dockerfile.monolith` 路徑/PATH 正確；image/service/manifest 命名一致；`compose.monolith.yml` 新 `backend` service 合理 | 靜態：actionlint 過、YAML 過、命名交叉一致 | **deploy 全未跑**（無 docker build / Cloud Run / CI）；9 per-service Dockerfile+cloudbuild 死碼仍在（C2）；`cloudbuild.monolith.yaml` 為備用手動路徑（cd.yml 走 in-runner build）|
| 前端 BFF | 11 檔改動＝deploy-target repoint + 標籤/註解/dev-script | 研究判定契約未變 | `npm run type-check` 自承失敗（V4 證實改動檔本身過）|

---

## File Structure（收尾工作會碰的檔；以「刪除/驗證」為主）

| 路徑 | 動作 | 職責 |
|------|------|------|
| `backend/app/modules/gateway_compat/` | Delete (C1) | 死碼：proxy 模組已不掛載、零外部引用 |
| `backend/*-fastapi/Dockerfile`（×9）| Delete (C2.2，依 D3) | legacy per-service image build，active CD 已不用 |
| `backend/*-fastapi/cloudbuild.yaml`（×9）| Delete (C2.2，依 D3) | legacy per-service Cloud Build，active CD 已不用 |
| `.github/workflows/deploy.yml` | Delete (C2.2，依 D3=A) | deprecated manual-only deploy（已被 `cd.yml` 取代）；研究確認非 push 路徑 |
| `backend/app/modules/*/alembic/`（8 條鏈、20 version 檔）| Delete (C3，gated on V1) | legacy per-module 遷移，monolith 鏈成 canonical 後死 |
| `backend/app/modules/customer_hierarchy/services/integration_service.py` | Modify or Decision (D1) | stub→真 in-process，或正式接受 stub |
| `backend/app/modules/_consolidated_schema.py` | Modify (小) | 修 `:14-17` 過時 docstring（已接入鏈，非「follow-up not done」）|
| `backend/app/modules/suppliers/core/config.py` | Modify (小，可選) | 刪未用的 `USER_SERVICE_URL`/`ORDER_SERVICE_URL` 死 config |
| `backend/app/alembic/versions/<new>_acceptance_fks.py` | Create (僅 D2 拍板補才有) | `acceptances.orderId` 等 candidate FK（+1 migration，需理由）|

> 註：本 plan 文件本身位於 `codex-public-pages-redesign` worktree 的 `docs/plans/20260607-backend-monolith-step4-9/run.md`；上表所有程式碼路徑在 `codex-backend-step4-9` worktree。

---

## Tasks

> 順序原則：**先驗證（V1-V4）拿到 runtime 真相 → 再決策（D1-D2）→ 最後清理（C1-C3，C3 受 V1 gate）**。每個 task 在 `codex-backend-step4-9` worktree 執行；commit 落在該 branch（`codex-backend-step4-9`），本 plan 文件 commit 落在 `codex-public-pages-redesign`。

### V1 — 真 PostgreSQL alembic 遷移驗證（STEP 6/8 核心 gate）

**Files:** 無改動（純驗證）。

- [ ] **V1.1 起空 PG + 跑 monolith 鏈**：

```bash
direnv exec . bash -c '
dropdb -h localhost -p $POSTGRES_PORT -U orderly --if-exists _tmp_monolith_fresh   # 防呆：避免重用上一輪殘留 DB 造成假通過
createdb -h localhost -p $POSTGRES_PORT -U orderly _tmp_monolith_fresh
cd backend
DATABASE_URL="postgresql+asyncpg://orderly:orderly_dev_password@localhost:$POSTGRES_PORT/_tmp_monolith_fresh" \
  .venv/bin/python -m alembic -c app/alembic.ini upgrade head
'
```
Expected：升到 `0002_cross_module_fks (head)` 無 error；`0001 create_all` 建出全表、`0002` orphan-audit 在空表 trivially pass + 6 FK 加上並 validate。**注意**：`dropdb --if-exists` 確保是真 fresh upgrade（Codex R1 指出 `createdb || true` 會靜默重用舊 DB → 假通過）。

- [ ] **V1.2 驗 42 表 + 6 FK validated**：

```bash
direnv exec . psql -h localhost -p $POSTGRES_PORT -U orderly -d _tmp_monolith_fresh -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name NOT LIKE 'alembic_version%';"
direnv exec . psql -h localhost -p $POSTGRES_PORT -U orderly -d _tmp_monolith_fresh -c \
  "SELECT conname, convalidated FROM pg_constraint WHERE conname LIKE 'fk_%' ORDER BY 1;"
```
Expected：表數 = 42；6 條 `fk_*` 全 `convalidated = t`。

- [ ] **V1.3 驗 idempotency（重跑不炸）**：對同一 `_tmp_monolith_fresh` 再跑一次 `alembic upgrade head` → Expected：`Already at head`（version 表已記錄）；無 `already exists` / 無重複 FK error。

- [ ] **V1.4 清理**：`direnv exec . dropdb -h localhost -p $POSTGRES_PORT -U orderly _tmp_monolith_fresh`。

**Verify V1**：V1.1 升到 head 乾淨 + V1.2 42 表/6 FK validated + V1.3 idempotent。**這是「STEP 6 從未實打真 DB」缺口的關閉證據。**

### V2 — phantom FK orphan pre-flight（套到含資料 DB 前的安全閥）

**Files:** 無改動（純驗證 + 可能的資料清理回報）。

- [ ] **V2.1 對含資料 DB 跑 audit**：在本機重建後的 `orderly` DB（含 42 表資料、由 `7dd5e51` create_all rebuild、尚未經 monolith 鏈 `0002`）跑：

```bash
direnv exec . psql -h localhost -p $POSTGRES_PORT -U orderly -d orderly -f scripts/database/monolith_fk_audit.sql
```
Expected：6 row，每個 `orphan_count = 0`。**任一非 0 → `0002` 會 `RAISE EXCEPTION` abort 整個遷移** → 停下回報哪張表哪欄有 orphan、各幾筆，**不**自行刪資料（資料清理需 owner 決定，屬 destructive）。

- [ ] **V2.2 實際套用 `0002` 到含資料 DB 並驗 FK（真「套真資料安全」證據）**：orphan=0 後，對同一個 `orderly` dev DB 實跑遷移（非只 audit）：

```bash
direnv exec . bash -c '
cd backend
DATABASE_URL="postgresql+asyncpg://orderly:orderly_dev_password@localhost:$POSTGRES_PORT/orderly" \
  .venv/bin/python -m alembic -c app/alembic.ini upgrade head
'
direnv exec . psql -h localhost -p $POSTGRES_PORT -U orderly -d orderly -c \
  "SELECT conname, convalidated FROM pg_constraint WHERE conname LIKE 'fk_%' ORDER BY 1;"
```
Expected：`alembic upgrade head` 在含資料 DB 乾淨完成（`0001` create_all skip 既有表、`0002` orphan-audit 對真資料 pass → `NOT EXISTS` 守門跳過已由 create_all 建好的 FK 或新增之 → re-VALIDATE no-op）；6 條 `fk_*` 全 `convalidated = t`。**這一步才是「`0002` 套真資料安全」的實打證據**（Codex R1：只跑 audit SQL 不等於證明套用安全）。

- [ ] **V2.3 audit candidate FK（為 D2 提供數據）**：對 `acceptances.orderId`/`restaurantId`/`supplierId`、`notifications.userId` 跑 orphan count（研究提供的 SQL），把結果填進 D2 決策。**若 D2 拍板補 FK（新增 migration）→ V1 與 V2 須重跑，且 AC-V1/AC-V2 的 FK 數量（6→N）同步更新。**

**Verify V2**：V2.1 orphan 全 0 + **V2.2 在含資料 dev DB 實跑 `upgrade head` 成功且 6 FK `convalidated=t`**（真「套真資料安全」證據，非僅 audit）；V2.3 candidate FK 數據已記錄供 D2。

### V3 — 真 uvicorn boot + frozen contract curl（STEP 4 runtime + 契約 gate）

**Files:** 無改動（純驗證）。前置：postgres+redis 起著（`/restart` 或 `compose.monolith.yml`）。

- [ ] **V3.1 真 uvicorn 起單體**：`direnv exec . bash -c 'cd backend && .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT'`（前景起，看 startup 無 traceback、8 模組 start、redis connected）。
- [ ] **V3.2 frozen contract 7 條逐條 curl**（STEP 0-3 既有契約，逐條 200 + 預期形狀才過）：

| 契約 | 驗證 | 預期 |
|---|---|---|
| login JSON 形狀 | `POST /api/auth/login` | `{success, user:{id,email,role,organization}, token\|access_token, refresh_token}` |
| 無前綴 alias | `POST /auth/login`、`GET /suppliers`、`GET /products/<x>` | 與 `/api/*` 同源 |
| suppliers 真實路徑 | `GET /api/suppliers/suppliers` | 200（修正 STEP 0-3 稽核標記的 `/api/api/...` typo）|
| product v1-optional | `GET /api/products/categories` | 200（`v1/skus` 屬已知 optional 缺口，獨立查）|
| hierarchy v2 | `GET /api/v2/hierarchy/tree` | 200 |
| list envelope | `GET /api/orders`、`GET /notifications` | `{success, data:[], count}` |
| acceptance legacy | `GET /acceptance/health` | 200 |

- [ ] **V3.3 STEP 4 middleware 行為驗證**：
  - SecurityHeaders：`curl -sI localhost:$BACKEND_PORT/service-map | grep -iE 'content-security-policy|x-frame-options|permissions-policy'` → header 存在。
  - rate-limit 429：對 `POST /api/auth/login` 連打 > 限制次數 → 出現 `429`。
  - verification_level 403：用 `verification_level < 3` 的 JWT 打 `/api/billing/*` → `403`（無合法 token 可先確認端點受 AuthMiddleware 保護回 401/403，不回 500）。
- [ ] **V3.4 確認無 loopback**：`curl -s localhost:$BACKEND_PORT/service-map` 回應內 `routing=in-process`、無 `localhost:300x`；`grep -rn "AsyncClient\|localhost:300" backend/app/modules --include=*.py | grep -v gateway_compat | grep -v oauth_service` 為 0。

**Verify V3**：7 條 frozen contract 全綠（**runtime_validated**，非 TestClient route-prefix 存在性）+ 3 條 middleware 行為符預期。**這是 STEP 0-3 稽核點名「3 row 字面字串需 runtime 補證」的關閉證據。**

### V4 — 前端 BFF type-check

**Files:** 無改動（驗證；若改動檔真有 type error 才回報並修）。

- [ ] **V4.1 type-check 改動檔**：在前端 worktree 跑 `npm run type-check`，把錯誤分流為 (a) 環境/既有 TS 問題（missing react/@types、`tsconfig.staging` lib target）vs (b) `bf4abc2` 改動的 11 個 BFF/lib 檔本身的 error。
- [ ] **V4.2 判定**：若 (b) 為 0 → V4 過（contract repoint 不引入 type 破壞）；若 (b) 非 0 → 列為 must-fix 修掉（屬本 branch 改動引入，依 Core #12 不得當 pre-existing 略過）。

**Verify V4**：`bf4abc2` 改動的前端檔 type-check 0 error（環境/既有問題分開記錄，不混為一談）。

### D1 — integration_service stub 決策（STEP 7 唯一功能缺口）

- [ ] **D1.1 影響範圍盤點**：確認 `integration_service` 的 stub 方法（`validate_user_permissions`→deny-write、`get_user_hierarchy_permissions`→`can_order:False`、`notify_*`→no-op）的呼叫端（`customer_hierarchy/services/migration_service.py`、`services/bulk/base.py`）在單體部署下是否為**live 流程**。
- [ ] **D1.2 owner 拍板**（二選一，寫進 Decision Queue 結論）：
  - (A) 補真 in-process：把 stub 換成直接呼叫 users/orders 模組的權限查詢（in-process function call）。
  - (B) 正式接受 stub：附理由（例：bulk/migration 流程目前未啟用）+ 影響範圍 + 解鎖條件，列入 §Risks 並在程式碼加明確 `# ACCEPTED STUB（理由）` 標註（**註：此標註僅是決策留痕，不等於完成拆除；若選 B，命名目標進度表標「合法延後」**）。

### D2 — phantom FK 覆蓋決策

- [ ] **D2.1 依 V2.2 orphan 數據拍板**：`acceptances.orderId → orders.id`（最明確、type 相容）建議補；`acceptances.restaurantId/supplierId`、`notifications.userId` 視 orphan=0 才補；billing reconciliations / customer_prices / price_history **預設 skip**（耦合/歧義/orphan 風險高）。
- [ ] **D2.2 若拍板補**：在 `models/` 加 model-level FK + 新增 1 個 migration（沿用 `0002` 的 orphan-audit→NOT VALID→VALIDATE pattern），Complexity Budget「新 migration」+1 並在此記理由。**若全 skip → 0 改動**。

### C1 — 刪 gateway_compat 死碼

**Files:** Delete `backend/app/modules/gateway_compat/`。

- [ ] **C1.1 再確認零引用**：`grep -rn "gateway_compat" backend ci scripts compose*.yml .github 2>/dev/null | grep -v __pycache__ | grep -v "docstring"` → 僅剩 `main.py:12` docstring（可一併刪該行說明）。
- [ ] **C1.2 刪除**：`git rm -r backend/app/modules/gateway_compat`（含其重複的 `middleware/security_headers.py` / `middleware/redis_rate_limit.py`）。
- [ ] **C1.3 驗證**：`direnv exec . bash -c 'cd backend && .venv/bin/python -c "import app.main"'` 仍 OK；V3.1 boot 不受影響。
- [ ] **C1.4 Commit**：`git commit -m "chore(monolith): remove dead gateway_compat proxy module + duplicate middleware"`。

### C2 — 結清 legacy 部署死碼（依 D3）

- [ ] **D3 決策**：刪除目標＝9 個 per-service `backend/*-fastapi/Dockerfile` + per-service `cloudbuild.yaml` + deprecated `.github/workflows/deploy.yml`（active CD `cd.yml` 已不引用，僅 deprecated `deploy.yml`〔manual-only〕+ `security.yml`/`security-audit.yml` 掃描引用）。拍板：(A) 三者一起刪 + 修 security workflow glob；(B) 留待專屬 cleanup。**預設 (A)**（本 plan 是「收尾」）。
- [ ] **C2.1 殘留引用稽核（bounded）**：刪前先列出所有對 per-service Dockerfile/cloudbuild + `deploy.yml` 的 executable reference：

```bash
rg -n "fastapi/Dockerfile|fastapi/cloudbuild|workflows/deploy\.yml|deploy\.yml" \
  .github ci scripts compose*.yml 2>/dev/null | grep -v "Dockerfile.monolith"
```
把每個 hit 分類為 (i) active 路徑引用（必須更新到 monolith 或改走 `cd.yml`）vs (ii) 純文件/註解（可隨刪）。**任一 active 引用未處理 → 不刪**（避免刪掉仍被引用的檔斷 CI）。

- [ ] **C2.2（若 D3=A）刪除 + 修引用**：`git rm backend/*-fastapi/Dockerfile backend/*-fastapi/cloudbuild.yaml .github/workflows/deploy.yml`；對 C2.1 列出的每個 active 引用：(i) `security.yml`/`security-audit.yml` 的 `backend/*/Dockerfile*` 掃描 glob 改指 `backend/Dockerfile.monolith`；(ii) `ci/service-manifest.yaml` / `compose.dev.yml` / scripts 若仍指 per-service 構件 → 更新到 monolith，或在 D3=B 路徑明列合法延後。刪後 `rg` 重跑為 0 active 引用。
- [ ] **C2.3 Commit**：`git commit -m "chore(deploy): remove legacy per-service Dockerfiles + cloudbuild + deprecated deploy.yml; repoint security scans at monolith image"`。

### C3 — legacy per-module alembic 鏈處置（gated on V1）

**前置：V1 必須先過**（證明 monolith 鏈真能在空 DB 建出全 42 表）。

- [ ] **C3.1 決策 D4**：20 個 per-module alembic version 檔（8 鏈、各自 `alembic_version_*` 表）在 monolith 鏈成 canonical 後屬 legacy。拍板：(A) `git rm` 8 條 per-module `alembic/` 目錄（fresh-DB 已走 monolith 鏈）；(B) 合法延後（若 staging/prod 仍以 per-module 鏈管理現有資料庫，需先有「資料庫已切換到 monolith 鏈」的遷移計畫才能刪）。**預設依 deployment 現況**：若 staging/prod 尚未切到 `alembic_version_monolith`，則 (B) 合法延後到「資料庫切鏈」task，解鎖條件＝staging 已用 monolith 鏈 stamp。
- [ ] **C3.2（若 A）刪 + 驗**：`git rm -r backend/app/modules/*/alembic`；確認 `Dockerfile.monolith` CMD 的 `alembic -c app/alembic.ini upgrade head` 不依賴 per-module 鏈（已驗，走 `backend/app/alembic`）；V1 重跑仍綠。
- [ ] **C3.3 修過時 docstring**：`backend/app/modules/_consolidated_schema.py:14-17`（移除「wiring into a chain is a follow-up, not done here」——`0002` 已 chain on 它）。
- [ ] **C3.4 Commit**：依決策 `git commit -m "chore(alembic): <retire legacy per-module chains | document monolith chain as canonical> + fix stale _consolidated_schema docstring"`。

### R — release 就緒（image build；不含真 deploy）

- [ ] **R1 docker build**：`direnv exec . docker build -f backend/Dockerfile.monolith -t orderly-backend-monolith:verify .` → 成功。
- [ ] **R2 image 本地 smoke**：`docker run -e PORT=8080 -e DATABASE_*... -p 8080:8080 orderly-backend-monolith:verify` → `curl localhost:8080/health` 200（image 內 `alembic upgrade head` + uvicorn 起得來）。
- [ ] **R3 cd.yml 靜態**：`actionlint .github/workflows/cd.yml`（已知過）+ 命名一致性（image=`orderly-backend-monolith`、service=`orderly-backend-<env>`）再確認。
- [ ] **R4**：真 Cloud Run deploy **不在本 plan**（merge 後 user 依 git-workflow 觸發，需 GCP 憑證）。

---

## Risks & Open Questions

| # | 風險 | 嚴重度 | 緩解 |
|---|---|---|---|
| R1 | `0002` cross-module FK 在含資料 DB 因 orphan `RAISE EXCEPTION` abort 整個遷移 | **high** | 本 plan：V2 對 local dev DB 強制 pre-flight `monolith_fk_audit.sql` 全 0 才套。Release-time（merge 後 user 真 deploy 前）：對 staging/prod 跑同一支 SQL 為獨立 gate，orphan>0 停下回報、不自行刪資料（資料清理需 owner 決定） |
| R2 | monolith 鏈從未實打真 PG，`create_all` 對非空 DB 的行為未驗 | high | V1 空 DB 升 head + idempotency 雙驗；`create_all` 對既有表 skip（不 reconcile drift，列已知限制）|
| R3 | `integration_service` 是 stub 非真 in-process（deny-write / can_order:False）→ 若 bulk/migration 流程 live 則權限判斷退化 | medium | D1 盤點呼叫端 live 與否 + owner 拍板（補實作或正式接受並標註）|
| R4 | 刪 legacy per-module alembic 鏈若 staging/prod 仍靠它管理現有 DB → 切鏈前刪會斷現有 DB 遷移軌 | medium | C3 gated on V1；D4 預設依 deployment 現況，未切鏈則合法延後 |
| R5 | `npm run type-check` 自承失敗，改動檔是否乾淨未證 | medium | V4 分流環境/既有 vs 改動檔；改動檔有 error 列 must-fix |
| R6 | deploy 全未跑（無 docker build / Cloud Run）；in-runner build vs `cloudbuild.monolith.yaml` 雙路徑可能 drift | low | R1 docker build + R3 actionlint；雙 build 路徑同 image 名，列 follow-up |
| R7 | 刪 `gateway_compat` 若有隱性 import 殘留 | low | C1.1 grep 零引用 + C1.3 import smoke |
| R8 | `downgrade()` 為 `NotImplementedError`（無法 alembic 回退）| low | rollback 走 `git revert` + drop DB 重建（dev）；prod 回退屬 release 計畫，不在本 plan |

## Decision Queue（已給推薦預設；無異議即採預設）

| ID | 決策 | 推薦預設 | 影響 |
|---|---|---|---|
| D1 | integration_service stub vs 真 in-process | **依 V2/D1.1 盤點**：bulk/migration 非 live → 接受 stub 並標註（合法延後真實作）；live → 補真 in-process | STEP 7 收斂判定 |
| D2 | 補 `acceptances.orderId` 等 candidate FK | **補 `acceptances.orderId`（orphan=0 前提）；其餘預設 skip** | +0 或 +1 migration |
| D3 | legacy per-service Dockerfile/cloudbuild + deprecated deploy.yml | **刪（A）**（本 plan 是收尾；active CD 已不用）| 部署死碼清理 |
| D4 | legacy per-module alembic 鏈 | **依 deployment 現況**：staging/prod 已切 monolith 鏈→刪；未切→合法延後到切鏈 task | alembic 收斂閉環 |

## Acceptance Criteria

- **AC-V1**：真 PG 空 DB `alembic -c backend/app/alembic.ini upgrade head` 乾淨升到 `0002 (head)`；42 表 + 6 `fk_*` `convalidated=t`；重跑 idempotent。
- **AC-V2**：本機 dev orderly DB `monolith_fk_audit.sql` 6 條 orphan_count 全 0 **且**對同一 DB 實跑 `alembic upgrade head` 成功、6 條 `fk_*` `convalidated=t`（實打證明套真資料安全，非僅 audit）；candidate FK orphan 數據已記錄。staging/prod orphan audit + apply 明列 release-time gate（不在本 plan AC）。
- **AC-V3（runtime_validated）**：真 uvicorn 單體起，frozen contract 7 條逐條 curl 200 + 預期形狀全綠；SecurityHeaders header 出現、login 429、verification_level 403 三條 middleware 行為符預期；`/service-map` `routing=in-process` 無 `localhost:300x`。
- **AC-V4**：`bf4abc2` 改動的 11 個前端檔 type-check 0 error（環境/既有問題分開記錄）。
- **AC-D**：D1/D2/D3/D4 皆有 owner 結論（補實作 or 合法延後 with 解鎖條件）。
- **AC-C**：`gateway_compat` 已 `git rm` 且 `import app.main` 仍綠（C1）；legacy 部署死碼依 D3 處置（C2）；legacy alembic 鏈依 D4 處置（C3，gated on AC-V1）。
- **AC-R**：`docker build -f backend/Dockerfile.monolith` 成功 + image `/health` 200；`actionlint cd.yml` 過。真 Cloud Run deploy 明列 Out of Scope（merge 後 user 觸發）。

---

## 命名目標進度表（拆除/搬移類）

本 plan 含拆除動詞（刪死碼）。逐一列可 grep 的命名目標與其真正消失的 task：

| 命名目標（可 grep） | 動詞 | 第 1 輪狀態 | 真的動的 task | 沒真的動的 task | 備註 |
|---|---|---|---|---|---|
| `backend/app/modules/gateway_compat/` | delete | 真的動了 (C1.2) | C1.2 | — | `git rm -r`；C1.3 `import app.main` 綠驗收 |
| `gateway_compat/middleware/{security_headers,redis_rate_limit}.py`（重複 middleware）| delete | 真的動了 (C1.2) | C1.2 | — | 隨 gateway_compat 一併刪 |
| `backend/*-fastapi/Dockerfile`（×9）| delete | 真的動了 (C2.2) 或 合法延後（D3=B）| C2.2 | — | 預設 D3=A 刪；C2.1 殘留稽核守門 |
| `backend/*-fastapi/cloudbuild.yaml`（×9）| delete | 真的動了 (C2.2) 或 合法延後（D3=B）| C2.2 | — | 同上 |
| `.github/workflows/deploy.yml`（deprecated）| delete | 真的動了 (C2.2) 或 合法延後（D3=B）| C2.2 | — | D3=A 連同 per-service 構件一起刪；非 active CD 路徑 |
| `backend/app/modules/*/alembic/`（8 鏈 20 version 檔）| delete | **延後（gated on V1；D4 依 deployment 現況）** | C3.2（若 D4=A）| — | **合法延後條件**：staging/prod 尚未切 `alembic_version_monolith` → 刪會斷現有 DB 遷移軌；解鎖＝「資料庫已 stamp 到 monolith 鏈」後執行 C3.2。若已切 → 本 plan 內 C3.2 直接刪 |
| `_consolidated_schema.py:14-17` 過時 docstring | remove | 真的動了 (C3.3) | C3.3 | — | 移除「follow-up not done」誤述 |
| `suppliers/core/config.py:114-115` 死 config | remove（可選）| 真的動了（C2 順手）或 skip | — | — | 純死 config，低優先；不單列 must |

**目標達成比例（規劃階段預測）**：7 個命名目標「真的動了」（gateway_compat + 重複 middleware + 9 Dockerfile + 9 cloudbuild + deprecated `deploy.yml` + `_consolidated_schema` docstring，部署死碼受 D3 預設=A + C2.1 殘留稽核守門）+ 1 個（legacy alembic 鏈）**合法延後**（gated on V1，解鎖條件＝資料庫已切 monolith 鏈）= 全部有著落，無「沒碰到」「只有間接動作」。

> 註：integration_service stub（D1）若選 (B) 正式接受，命名目標進度表不重複列（它是「行為缺口決策」非「拆除目標」）；但若選 (B)，D1 的「接受 stub」屬合法延後真實作，解鎖條件＝bulk/migration 流程被啟用時補真 in-process。

## Rollback

每個收尾動作獨立 commit；回退 = `git revert <commit>`。V1-V4 為純驗證（throwaway DB / 前景 boot），無副作用。C1-C3 刪檔可整 commit revert 還原。真 DB 遷移（V1/V2）只在 throwaway DB 或本機 dev DB 驗，不碰 staging/prod（prod 遷移屬 release 計畫）。`0002` 的 `downgrade()` 為 `NotImplementedError` → dev 回退走 drop DB 重建，不靠 alembic downgrade。
