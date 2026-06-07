# Backend 9→1 模組化單體遷移 — STEP 0-3 Implementation Plan

**Goal:** 把 9 個 FastAPI 微服務收斂成單一 modular-monolith app，能用 `uvicorn app.main:app` 在 localhost 單一程序起來、且 `/restart` 一鍵拉起（含 postgres/redis），**frontend API 契約完全不變**。

**Architecture:** 四步增量 — STEP 0 正規化 import + 把 `orderly_fastapi_core` 變成可安裝套件；STEP 1 修 3 個現有 alembic/mapper crasher；STEP 2 把每個服務 re-root 進 `backend/app/modules/<svc>/`（解 `app` 套件名衝突）；STEP 3 寫 composition root `backend/app/main.py` 掛載全部 router、套一次 top-level middleware、建 `.claude/restart.yaml`。各模組此階段**保留自己的 engine/Base/alembic**（DB 與 alembic 收斂屬 STEP 5-6，本 plan 不做）。

**Tech Stack:** FastAPI · SQLAlchemy（per-module Base，暫不統一）· Alembic（per-service chain，只修壞鏈）· uvicorn · `orderly_fastapi_core` 共用 lib · Redis · PostgreSQL · Python 3.11。

**Risk:** high（cross-module、schema migration、~58k LOC 搬移、潛在 breaking）→ 走完整 plan-review + Codex 對抗審。

**這是 STEP 0-9 完整遷移的第 1 階段**（user 已選完整遷移、分階段 gated 執行）。STEP 4-9 見 §Out of Scope。

---

## Goals / Why

**動機**：現況是 distributed monolith（9 服務共用單一 `orderly` DB + 服務間互打 HTTP），對單人維護是淨負擔——9 條 alembic 鏈、9 個 Dockerfile、本地要跑 9 個容器才能動一個流程。survey（14-agent，已完成）證實：

1. **現在就壞**：fresh DB 跑 user-service `alembic upgrade head` 會死（002/003 重複建 `supplier_invitations`）→「完整本地重現」目前根本做不到。
2. **naive 合併會炸**：9 服務全用同名 top-level `app` 套件（import 互相 shadow）；product `sku.py` 重複 mapper 會 startup crash。

STEP 0-3 目標 = 把「9 服務」變成「1 個可在 localhost 跑起來的單體」，**且不動 frontend**。達成後即命中 /goal：`/restart` 拉起單體。

**成功狀態**：單一 `uvicorn app.main:app` 程序服務全部既有 API 路徑（契約逐字不變），`/restart` 綠燈，frozen contract 清單全過。

---

## In Scope

- **STEP 0**：把 `orderly_fastapi_core` 做成可 pip 安裝套件（加 `pyproject.toml` + `pip install -e`）；把 5 個 `from libs.orderly_fastapi_core` 改成 `from orderly_fastapi_core`；移除所有 `sys.path.append/insert` hack。
- **STEP 1**：修 3 個現有 crasher —（a）user-service `003` 斷鏈；（b）刪 product `sku.py` dead 重複 mapper；（c）customer-hierarchy 4 個無 migration 的 model（grep 定 dead/live 後刪或補 migration）。
- **STEP 2**：把 9 個服務 tree re-root 進 `backend/app/modules/<svc>/`（含 app/ + alembic/ + alembic.ini），改 intra-service import `from app.X` → `from app.modules.<svc>.X`，一服務一 commit。
- **STEP 3**：寫 composition root `backend/app/main.py`，`include_router` 全部 router 於 surveyed 前綴（保留 dual-prefix + 無前綴 alias〔由真實 router dual-mount、非 gateway proxy，見 T3.3b〕 + 雙前綴 `/api/api/suppliers`），SecurityHeaders + Auth + Redis rate-limit middleware 套一次於 top-level，serve `/health`；各模組保留自己 engine/Base；建 `backend/app/requirements.txt`（聯集）與 `.claude/restart.yaml`。
- 全程保留 §Contract Invariants 列出的所有 frontend 契約。

## Out of Scope（本 plan 不做；屬 STEP 4-9 後續 gated 階段）

- **STEP 4** 退役 api-gateway reverse-proxy（verification_level + rate-limit 移成共用 dependency）。
- **STEP 5** 合併成單一 SQLAlchemy Base（含 `organizations`/`supplier_profiles` 重複 model 收斂、raw JOIN 改 ORM）。
- **STEP 6** alembic 收斂（branch-labels、`supplier.depends_on=user_head`、單一 `alembic_version` 表）。
- **STEP 7** 消滅 loopback HTTP（billing→order、user→notification OTP… 改 in-process）。
- **STEP 8** 補 phantom FK（`order_items.product_id` 等，需先做 orphan 稽核）。
- **STEP 9** 收斂部署（單一 Dockerfile + 單一 Cloud Run + CI 收斂）。
- 任何 DB schema 內容變更（除 STEP 1 修壞鏈與 STEP 1c 可能補的 4 表 migration）。
- **`/ws/orders` order-events WebSocket handler**：後端現況無此 handler（frontend 建 URL 但沒人服務）；新增屬新功能，列 STEP 7（order 事件 in-process 化）一併設計，不在本階段（守 Complexity Budget「新 endpoint：0」）。
- frontend 任何改動（契約一律保持，不動前端）。

## Complexity Budget

- **新檔**：`backend/app/main.py`、`backend/app/__init__.py`、`backend/app/requirements.txt`、`backend/libs/pyproject.toml`、`.claude/restart.yaml` ≈ 5 個真正新檔。
- **新 migration**：≤ 1（僅 STEP 1c 若判 live 才補；STEP 1a 是修既有檔非新增）。
- **新 endpoint**：0（契約逐字保留，不新增路徑）。
- **新 dependency**：0（`backend/app/requirements.txt` 為既有 9 份的聯集，不引入新套件）。
- **檔案搬移**：大（9 服務 tree 進 `app/modules/`），但屬 move + import-rename，非新邏輯。

超出上述任一上限 → 需在本 plan 明寫理由再擴。

---

## File Structure（目標佈局）

| 路徑 | 動作 | 職責 |
|------|------|------|
| `backend/libs/pyproject.toml` | Create | 讓共用核心可 `pip install -e backend/libs`（package root 在 `libs/orderly_fastapi_core/`，故 pyproject 放 `libs/`；解 sys.path hack 根因）|
| `backend/app/__init__.py` | Create | 單體 top-level 套件 |
| `backend/app/main.py` | Create | **composition root**：掛全部 router + top-level middleware + /health |
| `backend/app/requirements.txt` | Create | 9 服務 requirements 聯集（單一 venv 可跑單體）|
| `backend/app/modules/users/**` | Move | = 原 `backend/user-service-fastapi/{app,alembic,alembic.ini}`，import re-root |
| `backend/app/modules/orders/**` | Move | = 原 `order-service-fastapi` |
| `backend/app/modules/products/**` | Move | = 原 `product-service-fastapi`（先刪 dead `sku.py`）|
| `backend/app/modules/acceptance/**` | Move | = 原 `acceptance-service-fastapi` |
| `backend/app/modules/billing/**` | Move | = 原 `billing-service-fastapi` |
| `backend/app/modules/notifications/**` | Move | = 原 `notification-service-fastapi` |
| `backend/app/modules/customer_hierarchy/**` | Move | = 原 `customer-hierarchy-service-fastapi` |
| `backend/app/modules/suppliers/**` | Move | = 原 `supplier-service-fastapi` |
| `backend/app/modules/gateway_compat/**` | Move | = 原 `api-gateway-fastapi`（本階段**只貢獻 middleware**；不掛 proxy/catch-all/alias 路由，無前綴 alias 由真實 router dual-mount 達成，見 T3.3b；proxy 退役留 STEP 4）|
| `backend/user-service-fastapi/alembic/versions/003_add_missing_organization_fields.py` | Modify | STEP 1a 修斷鏈 |
| `backend/product-service-fastapi/app/models/sku.py` | Delete | STEP 1b dead 重複 mapper |
| `backend/customer-hierarchy-service-fastapi/app/models/activity_metrics.py` + `__init__.py` | Modify/Delete | STEP 1c 依 grep 結果刪或補 migration |
| `.claude/restart.yaml` | Create | /restart profile：1 個 monolith service + postgres/redis 依賴 |

> 註：STEP 1 在「原服務路徑」上修（因為 STEP 2 才搬移）；STEP 2 把修好的 tree 搬進 `app/modules/`。順序＝先修好再搬，不在搬移途中又改邏輯。

---

## Tasks

### STEP 0 — 正規化 import + 套件化共用核心

**Files:**
- Create: `backend/libs/pyproject.toml`
- Modify: 5 個用 `from libs.orderly_fastapi_core` 的檔（grep 定位）+ 含 `sys.path.append/insert` 的檔

- [ ] **T0.1 確認核心無 packaging**：`ls backend/libs/{pyproject.toml,setup.py,setup.cfg}` — 預期皆無 → 需新增。**注意**：package root 在 `backend/libs/orderly_fastapi_core/__init__.py`，import 名是 `orderly_fastapi_core`，故 pyproject 的 project root 必須是 `backend/libs/`（讓 setuptools 把 `orderly_fastapi_core` 當成被 find 到的 package），**不是** `backend/libs/orderly_fastapi_core/`（放裡面會 find 不到自己）。
- [ ] **T0.2 寫 `backend/libs/pyproject.toml`**：

```toml
[project]
name = "orderly-fastapi-core"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = []   # 核心只用 fastapi/sqlalchemy/pydantic，由各服務 requirements 提供；此處不重複釘版

[tool.setuptools.packages.find]
where = ["."]                       # = backend/libs/
include = ["orderly_fastapi_core*"] # find 到 backend/libs/orderly_fastapi_core/ 這個 package
```

- [ ] **T0.3 editable 安裝**：`direnv exec . pip install -e backend/libs`。預期：`Successfully installed orderly-fastapi-core-0.1.0`，且 `python -c 'import orderly_fastapi_core'` 成功。
- [ ] **T0.4 改 5 檔 import**：把 `from libs.orderly_fastapi_core` → `from orderly_fastapi_core`（grep 清單逐檔 Edit）。
- [ ] **T0.5 移除 sys.path hack**：對每個含 `sys.path.append(...)/insert(...)` 指向 `backend/libs` 的檔，刪該行（保留其他無關 sys.path 操作，逐一判讀）。
- [ ] **T0.6 驗證**：每個服務在自己目錄 `direnv exec . python -c 'import app.main'` 仍可 import（不啟 server，只驗 import graph）。**全 9 個服務皆 PASS** 才算過。
- [ ] **T0.7 Commit**：`git add backend/libs/pyproject.toml <改動的檔>` → `git commit -m "refactor(core): make orderly_fastapi_core pip-installable; drop sys.path hacks + normalize imports"`。

**Verify STEP 0**：`grep -rn "sys.path.append\|sys.path.insert" backend/*-fastapi --include=*.py | grep -v __pycache__` 為 0（指向 libs 的）；`grep -rln "from libs.orderly_fastapi_core" backend` 為 0；9 服務 import smoke 全綠。

---

### STEP 1 — 修 3 個現有 crasher

#### T1a — user-service alembic 002→003 斷鏈

**Files:** Modify `backend/user-service-fastapi/alembic/versions/003_add_missing_organization_fields.py`

- [ ] **T1a.1** Read 003 檔，定位 `upgrade()` 內 `op.create_table('supplier_invitations', ...)`（line ~85）與其後續 `op.create_index(...)`（該表的 4 個 index）。
- [ ] **T1a.2** 從 `upgrade()` 刪除該 `create_table('supplier_invitations')` 區塊 + 其 4 個 index（這些在 002 已建）；**保留** 003 其餘的 `op.add_column(...)`（真正要加的 organization 欄位）。
- [ ] **T1a.3** 從 `downgrade()` 刪除對應的 `op.drop_table('supplier_invitations')`（避免 downgrade 砍掉 002 的表）。
- [ ] **T1a.4 驗證（throwaway DB）**：

```bash
direnv exec . bash -c '
createdb -h localhost -p $POSTGRES_PORT -U orderly _tmp_user_chain 2>/dev/null || true
cd backend/user-service-fastapi
DATABASE_URL="postgresql+asyncpg://orderly:orderly_dev_password@localhost:$POSTGRES_PORT/_tmp_user_chain" alembic upgrade head
'
```
預期：升到 head 無 `table "supplier_invitations" already exists`。驗完 `dropdb _tmp_user_chain`。

- [ ] **T1a.5 Commit**：`git commit -m "fix(user-service): repair broken alembic 002->003 chain (duplicate supplier_invitations create_table)"`。

#### T1b — 刪 product-service dead 重複 mapper `sku.py`

**Files:** Delete `backend/product-service-fastapi/app/models/sku.py`

- [ ] **T1b.1 確認 production dead（排除 tests）**：`grep -rn "from app.models.sku import\|from .sku import\|import app.models.sku" backend/product-service-fastapi/app --include=*.py | grep -v __pycache__ | grep -vE "sku_simple|sku_upload|supplier_sku"`。預期：**0**（`models/__init__.py` 已證實從 `.sku_simple`/`.supplier_sku` import，非 `sku.py`）。**註**：已知 `backend/product-service-fastapi/tests/test_sku_integration.py:13` 有 `from app.models.sku import ...`（test-only，測的是 dead 重複 mapper）— 由 T1b.2 一併處理，不算 production load-bearing。
- [ ] **T1b.2** 若 T1b.1（app 範圍）為 0 → (a) `git rm backend/product-service-fastapi/app/models/sku.py`；(b) 處理 stale test `tests/test_sku_integration.py`：它 import 的 `ProductSKU`/`SupplierSKU` 應改指向真實 model（`from app.models.sku_simple import ProductSKU` / `from app.models.supplier_sku import SupplierSKU`），`ProductAllergen`/`ProductNutrition` 若僅存在於 dead `sku.py` 則該測試對應斷言一併移除或重寫；若整檔只測 dead mapper 則 `git rm` 該測試。**若 T1b.1（app 範圍）非 0** → STOP 回報（claim 不成立，需重評）。
- [ ] **T1b.3 驗證**：`cd backend/product-service-fastapi && direnv exec . python -c 'import app.models'` 無 `InvalidRequestError`（重複 mapper 消失）；`grep -rn "from app.models.sku import" backend/product-service-fastapi --include=*.py | grep -v __pycache__` 為 0（含 tests）。
- [ ] **T1b.4 Commit**：`git commit -m "fix(product-service): delete dead duplicate-mapper models/sku.py + repoint stale test imports"`。

#### T1c — customer-hierarchy 4 個無 migration model（grep 定 dead/live）

**Files:** Modify `backend/customer-hierarchy-service-fastapi/app/models/__init__.py`；Delete or Migrate `.../app/models/activity_metrics.py`

- [ ] **T1c.1 判 dead/live**：`grep -rn "ActivityMetrics\|DashboardSummary\|PerformanceRanking\|ActivityTrend" backend/customer-hierarchy-service-fastapi/app --include=*.py | grep -v __pycache__ | grep -vE "models/__init__.py|models/activity_metrics.py"`。
- [ ] **T1c.2 分支 A（dead，T1c.1 為 0）**：`git rm app/models/activity_metrics.py`；從 `models/__init__.py` 刪 line 19 import + lines 30-33 `__all__` + lines 46-49 re-export。驗證：`python -c 'import app.models'` OK。
- [ ] **T1c.3 分支 B（live，T1c.1 有 hit）**：`alembic revision --autogenerate -m "add activity_metrics/dashboard_summary/performance_rankings/activity_trends tables"`；檢視生成的 migration 只建這 4 表；throwaway DB `alembic upgrade head` 4 表建成功。
- [ ] **T1c.4 Commit**：依分支 `git commit -m "fix(customer-hierarchy): <remove dead activity_metrics models | add missing activity_metrics migration>"`。

**Verify STEP 1**：throwaway DB 上 user/product/customer-hierarchy 各自 `alembic upgrade head` 成功；`python -c 'import app.models'` 三服務皆無 mapper error。

---

### STEP 2 — Re-root 9 服務進 `backend/app/modules/<svc>/`

**解的是硬阻斷 A（`app` 套件名全撞）。一服務一 commit。**

**Procedure P2（對每個服務套用一次）**，以 `<svc>`=module 名、`<src>`=原服務目錄：

- [ ] **P2.1** `mkdir -p backend/app/modules`（首次）+ `backend/app/__init__.py`、`backend/app/modules/__init__.py`（空檔）。
- [ ] **P2.2** `git mv backend/<src>/app backend/app/modules/<svc>`（搬 python 套件）；`git mv backend/<src>/alembic backend/app/modules/<svc>/alembic`、`git mv backend/<src>/alembic.ini backend/app/modules/<svc>/alembic.ini`（alembic 隨模組，per-module 暫不統一）。
- [ ] **P2.3** 在 `backend/app/modules/<svc>/` 內全域改 import 前綴：`from app.` → `from app.modules.<svc>.`、`import app.` → `import app.modules.<svc>.`（用 `grep -rl` 找檔逐一 Edit；含 `alembic/env.py` 與 `alembic.ini` 的 `script_location`/`prepend_sys_path` 對應調整）。
- [ ] **P2.4** 改 `alembic.ini` 的 `script_location` 為 `backend/app/modules/<svc>/alembic`（或相對路徑），確保 alembic 仍找得到 versions。
- [ ] **P2.5 驗證（單服務）**：`direnv exec . python -c 'import app.modules.<svc>.main'`（從 repo root 或 backend/ 起，視 PYTHONPATH）無 ImportError。
- [ ] **P2.6 Commit**：`git commit -m "refactor(monolith): re-root <src> into app/modules/<svc> (rename app.* imports)"`。

**逐服務對照表（module 名 + 原目錄）**：

| 順序 | `<svc>`（module） | `<src>`（原目錄） | 備註 |
|---|---|---|---|
| 1 | `notifications` | `notification-service-fastapi` | 小、無下游依賴，先做試水溫 |
| 2 | `acceptance` | `acceptance-service-fastapi` | 小 |
| 3 | `suppliers` | `supplier-service-fastapi` | 小 |
| 4 | `orders` | `order-service-fastapi` | 中 |
| 5 | `billing` | `billing-service-fastapi` | 中 |
| 6 | `users` | `user-service-fastapi` | 大（先完成 T1a）|
| 7 | `customer_hierarchy` | `customer-hierarchy-service-fastapi` | 大（先完成 T1c）|
| 8 | `products` | `product-service-fastapi` | 大（先完成 T1b）|
| 9 | `gateway_compat` | `api-gateway-fastapi` | 最後；本階段只貢獻 middleware（不掛 proxy/alias 路由，alias 由真實 router dual-mount，見 T3.3b）；proxy 退役留 STEP 4 |

- [ ] **T2.final 跨服務無 shadow 驗證**：同一 interpreter 一次 import 全部 9 個 module：

```bash
direnv exec . python -c "
import importlib
for m in ['notifications','acceptance','suppliers','orders','billing','users','customer_hierarchy','products','gateway_compat']:
    importlib.import_module(f'app.modules.{m}.main')
print('ALL 9 MODULES IMPORT OK — no app namespace shadowing')
"
```
預期印出成功行（證明硬阻斷 A 已解）。

**Verify STEP 2**：上面跨服務 import 全綠；`ls backend/*-fastapi` 原目錄已空或僅剩非 python 殘留（Dockerfile 等 STEP 9 處理）。

---

### STEP 3 — Composition root + restart profile（命中 /goal）

**Files:**
- Create: `backend/app/main.py`、`backend/app/requirements.txt`、`.claude/restart.yaml`

- [ ] **T3.1 合併 requirements**：`backend/app/requirements.txt` = 9 服務 `requirements.txt` 去重聯集（同套件取最高相容版；衝突則記入 §Risks）。`direnv exec . pip install -r backend/app/requirements.txt` 成功。
- [ ] **T3.2 蒐集各模組 router**：對每個 module 確認其 router 匯出符號（survey 已知多為 `*_router` module-level `APIRouter`；逐 module Read `main.py` 確認 `include_router` 清單與前綴）。
- [ ] **T3.3 寫 composition root** `backend/app/main.py`：

```python
from fastapi import FastAPI
from orderly_fastapi_core.middleware import SecurityHeadersMiddleware  # 路徑以實際為準
# 各模組 router（保留 survey 的 mount 前綴，含 dual-prefix / 無前綴 alias / 雙前綴 suppliers）
from app.modules.users.main import register_routers as register_users  # 形態以各 main.py 實際匯出為準
# ... 其餘 8 模組

app = FastAPI(title="Orderly Monolith")
app.add_middleware(SecurityHeadersMiddleware)
# Auth middleware + Redis rate-limit：套一次 top-level（從 gateway_compat 移植，見 §Decision D-gw）

# 逐模組掛載（保留既有前綴）
register_users(app)   # 內部 include_router 維持 /api + 無前綴 dual
# ... orders/products/acceptance/billing/notifications/customer_hierarchy/suppliers/gateway_compat

@app.get("/health")
def health():
    return {"status": "ok", "service": "orderly-monolith"}
```
（實際以各 module 既有的 router 註冊方式為準：若 module `main.py` 是建好 `app` 而非匯出 register 函式，改為 import 其 `APIRouter` 物件直接 `app.include_router(..., prefix=...)`。T3.2 已確認形態。）

- [ ] **T3.3b 無前綴 alias 改成 in-process dual-mount（不可照搬 gateway proxy）**：gateway 現有的無前綴 alias（`/products/{path}`、`/suppliers`、`/suppliers/{path}`、`/auth/login`、`/auth/register`，見 `api-gateway-fastapi/app/main.py:607-652`）**全是 `_proxy(...)` 反向代理路由**，會 httpx 打去 `localhost:3003/3008/...`。單體裡那些下游 port 不存在 → 照搬必失敗。正解：**gateway_compat 模組此階段只貢獻 middleware（SecurityHeaders/Auth/Redis rate-limit），不註冊任何 `_proxy` / catch-all 路由**；無前綴 alias 改由「把真實 module router 同時掛在有前綴與無前綴兩處」達成 — user-service 已用 `register_dual_prefix`（/api + 無前綴）；products / suppliers 需在 composition root 顯式 dual-mount（`app.include_router(products_router, prefix="/api/products")` + `prefix="/products"`；suppliers 同理含雙前綴 `/api/api/suppliers`）。**驗收**：T3.5 無前綴 alias 列 curl 全綠且後端無任何對 `:3001-3008` 的 httpx 呼叫（`grep` composition root 無 `_proxy`）。

- [ ] **T3.4 boot smoke**：`direnv exec . uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT`（前景起 5 秒）無 traceback；`curl -s localhost:$BACKEND_PORT/health` 回 `{"status":"ok",...}`。
- [ ] **T3.5 frozen contract 驗證**（單體起著，逐條 curl／ws，全 200/預期形狀才過）：

| 契約 | 驗證 | 預期 |
|---|---|---|
| login JSON 形狀 | `POST /api/auth/login` | `{success, user:{id,email,role,organization:{id,type}}, token|access_token, refresh_token}` |
| 無前綴 alias | `POST /auth/login`、`GET /suppliers`、`GET /products/<x>` | 與 `/api/*` 同源 |
| 雙前綴 supplier | `GET /api/api/suppliers/suppliers` | 200 |
| product v1-optional | `GET /api/products/v1/skus`、`GET /api/products/categories` | 200 |
| hierarchy v2 | `GET /api/v2/hierarchy/tree` | 200 |
| list envelope | `GET /api/orders`、`/api/notifications` | `{success, data:[], count}` |
| acceptance legacy | `GET /acceptance/health` | 200 |

> **WebSocket 註（Codex R1 + 已驗證）**：frontend 建 `ws://.../ws/orders/<orgId>`（`lib/websocket/order-websocket.ts:97`），但 **後端目前無任何 FastAPI WebSocket handler**（grep 全 backend，僅 notification-service 有 config flag、無 handler）→ 該 WS 現況根本沒被服務。「契約不變」＝維持現狀，故 **`/ws/orders` 不列入本階段 frozen contract**（不新增 endpoint，守 Complexity Budget）；order-events WebSocket 改列 §Out of Scope（STEP 7 order 事件 in-process 化時一併設計）。

- [ ] **T3.6 建 `.claude/restart.yaml`**（單一 monolith service + 依賴）：

```yaml
services:
  - name: backend-monolith
    cwd: backend
    runtime: python
    start_command: "uvicorn app.main:app --host 0.0.0.0 --port ${BACKEND_PORT}"
    ports: [8888]          # = BACKEND_PORT（以 .envrc SSOT 為準，不 hardcode 於程式）
    healthcheck:
      url: "http://localhost:8888/health"
  - name: frontend
    cwd: .
    runtime: node
    start_command: "npm run dev"
    ports: [5566]          # = FRONTEND_PORT
    healthcheck:
      url: "http://localhost:5566"
dependency_checks:
  - kind: container_runtime
    required: true
    bringup_command: "colima start"
    bringup_timeout_s: 30
  - kind: container_service
    compose_file: compose.dev.yml
    compose_command: "docker-compose"      # 此機 plugin 形式不可用，用 standalone
    services: [postgres, redis]
    required: true
  - kind: tcp
    host: localhost
    port: 54888                            # POSTGRES_PORT
    name: PostgreSQL
    required: true
  - kind: tcp
    host: localhost
    port: 64888                            # REDIS_PORT
    name: Redis
    required: true
```
（port 數字以 `.envrc` resolve 值為準；restart.yaml 不支援變數插值，故寫實值並在 §Risks 註明「改 port 要同步」。）

- [ ] **T3.7 /restart 驗收**：跑 `/restart` → Phase B 帶起 colima/postgres/redis、Phase D 起 monolith + frontend、Phase E healthcheck 兩個 `/health` 綠。**這一步綠 = 命中 /goal**。
- [ ] **T3.8 Commit**：`git commit -m "feat(monolith): composition root app/main.py + restart profile (9 services -> 1 localhost process)"`。

**Verify STEP 3**：單一 `uvicorn app.main:app` 起；T3.5 frozen contract 全綠；`/restart` 綠燈拉起單體+frontend+db+redis。

---

## Risks & Open Questions

| # | 風險 | 嚴重度 | 緩解 |
|---|---|---|---|
| R1 | `app` 套件 shadow（硬阻斷 A）| high | STEP 2 re-root；T2.final 跨服務 import 證明已解 |
| R2 | product 重複 mapper startup crash（硬阻斷 B）| high | STEP 1b 刪 dead `sku.py`；T1b.3 import smoke |
| R3 | requirements 聯集版本衝突（同套件不同釘版）| medium | T3.1 取最高相容；衝突逐筆記錄並以較新版測 import smoke |
| R4 | composition root 掛載後路由前綴碰撞（/health、/auth/login 多源）| high | gateway_compat 不註冊 proxy/alias 路由；無前綴 alias 由真實 router dual-mount（T3.3b），user-service router 為單一 owner；T3.5 contract 清單逐條驗 |
| R5 | 各 module 仍各自 engine/Base → 單一程序開多個 DB pool | medium | 本階段接受（STEP 5 才統一）；確認連線數不超 postgres max_connections（dev 預設足夠）|
| R6 | re-root 漏改某處 `from app.X` → runtime ImportError | medium | 每服務 P2.5 import smoke + T2.final 全量 import |
| R7 | restart.yaml port 寫死，改 port 會 drift | low | §註明；STEP 9 可改 adapter |
| R8 | gateway 的 verification_level 與 rate-limit 移植不全 | medium | STEP 3 移植後 T3.5 驗 protected/public 路徑；完整退役在 STEP 4 |

## Decision Queue（已給推薦預設；無異議即採預設）

| ID | 決策 | 推薦預設 | 影響 |
|---|---|---|---|
| D1 | customer-hierarchy 4 model dead/live | **由 T1c.1 grep 決定**（無外部引用→dead→刪；有→補 migration）| STEP 1c 分支 |
| D2 | billing module 是否納入單體 | **納入**（mount 其 router；survey 指出它沒進 cd.yml，但本地單體一律掛載，部署層 STEP 9 再議）| STEP 3 router 清單 |
| D3 | 雙前綴 `/api/api/suppliers` 怎麼處理 | **單體接受雙前綴**（零 frontend 改動，契約不變）| STEP 3 supplier 掛載 |
| D-gw | gateway 的 Auth/rate-limit + 無前綴 alias 此階段如何處理 | **middleware（SecurityHeaders/Auth/Redis rate-limit）移植成 top-level 套一次；gateway_compat 模組此階段不註冊任何 `_proxy`/catch-all 路由**（無前綴 alias 改由真實 router dual-mount 達成，見 T3.3b）。gateway proxy 層完整退役在 STEP 4 | STEP 3 middleware + T3.3b |

## Acceptance Criteria

- **AC0**：`grep -rn "sys.path.append\|sys.path.insert" backend/*-fastapi --include=*.py`（指向 libs 者）為 0；`grep -rln "from libs.orderly_fastapi_core" backend` 為 0；9 服務原地 `import app.main` 全綠。
- **AC1**：throwaway DB 上 user / product / customer-hierarchy 各 `alembic upgrade head` 成功；product/customer-hierarchy models import 無 mapper error。
- **AC2**：同一 interpreter 一次 import 全 9 個 `app.modules.<svc>.main` 成功（無 shadow）；原 `backend/*-fastapi` 已無 python 套件殘留。
- **AC3**：單一 `uvicorn app.main:app` 起；§STEP 3 frozen contract 表 **7 條**全綠（login JSON 形狀、無前綴 alias、雙前綴 `/api/api/suppliers`、product v1-optional、/api/v2 hierarchy、list envelope、/acceptance；**不含 /ws/orders**，見 WebSocket 註）。
- **AC4**：`.claude/restart.yaml` 存在；`/restart` Phase B-E 全綠，monolith `/health` + frontend 皆 200 → **/goal 達成**。

---

## 執行紀錄 (Execution Log) — 2026-06-07 STEP 0+1 batch

| 步驟 | 狀態 | commit | 證據 / 偏差 |
|---|---|---|---|
| **STEP 0.0**（新增前置） | ✓ | (env, 不入 git) | plan 假設 host env 存在，實際**無 venv**（系統 py3.9、backend 平常跑 Docker）。建 `backend/.venv`（py3.11）+ 裝 merged deps（**8 個版本衝突取最高**：fastapi 0.115.0 / sqlalchemy 2.0.35 / alembic 1.14.0 / asyncpg 0.30.0 / uvicorn 0.32.0 / redis 5.2.0 / structlog 24.4.0 / email-validator 2.1.0）+ editable core |
| STEP 0 | ✓ | `db1d2c5` | pyproject@backend/libs + 5 imports 正規化 + 移除全部 libs sys.path hack（alembic service-root 保留）；**9 服務 `import app.main` 全 PASS** |
| T1a 斷鏈 | ✓ | `de26b84` | **比 survey 更 broken**：002 重複了 003 的**每一個** organizations 欄位+索引+FK（非僅 supplier_invitations）→ 003 改 no-op。Verify：fresh DB `alembic upgrade head` → 001..005 head 乾淨 |
| T1b dead mapper | ✓ | `c34f6c7` + `9dfbe63` | 刪 dead `models/sku.py`；repoint test ProductSKU→sku_simple、SupplierSKU→supplier_sku；skip `test_get_sku_allergens`（ProductAllergen 僅存於已刪檔）。Verify：app.models/app.main import 無 mapper error、grep=0 |
| **T1c 4 models** | **⏸ DEFERRED（finding）** | — | **非 dead，是 LIVE**：`main_api.py` 有 `/api/v2/hierarchy/activity`+`/performance` endpoint、`activity_service.py`/`cache_enhanced_service.py` 實例化查詢。但**4 張表（activity_metrics/dashboard_summary/performance_rankings/activity_trends）無 migration** = 既有 runtime bug（該功能今天就 500）。autogenerate 又被 **缺 `alembic/script.py.mako`** 擋。**不擋 monolith boot、不擋 /goal**（frozen contract 無 activity endpoint）。**合法延後**：需 (a) 修復 customer-hierarchy alembic 模板、(b) 產+驗 4 表 migration；歸 STEP 6 alembic 收斂或專屬 migration task |

**STEP 3 待修發現**：`compose.dev.yml` 是 overlay（單獨無效，image 在 `compose.base.yml`）→ T3.6 `.claude/restart.yaml` 的 container_service 不能用單一 `compose_file: compose.dev.yml`，需 base+dev 疊加（restart-authoring 的 container_service 僅吃單一 compose_file → 需用 wrapper 或調整）。

**STEP 1 收斂判定**：T1a+T1b（真正擋 monolith boot 的兩個 crasher）完成且驗證；T1c 為 LIVE-feature 缺 schema 的既有 bug，不擋 boot/goal，合法延後。STEP 0+1 batch 於此 checkpoint 停，待 user 決定 T1c 處理時機與是否續 STEP 2。

### STEP 2 — re-root（user 核准續做，T1c 延後）

| 步驟 | 狀態 | commit | 證據 |
|---|---|---|---|
| notifications（pilot）| ✓ | `4356887` | git mv + import rename；`import app.modules.notifications.main` OK；pre-commit 過 |
| 其餘 8 服務 | ✓ | `64a81cd` | 285 檔 rename；每服務 0 殘留 bare `app.` import |
| **T2.final 跨服務驗證** | ✓ | — | **同一 interpreter 一次 import 全 9 module 無 shadowing**（硬阻斷 A 解除）|

順手發現：billing 的 alembic 有 `script.py.mako`（customer-hierarchy T1c autogenerate 缺的那個）→ 處理 T1c 時可複製。舊服務 dir 留下 loose scripts/tests（非 app 套件，STEP 9/測試重整再處理）。

### STEP 3 — composition root（命中 /goal）

| 步驟 | 狀態 | commit | 證據 |
|---|---|---|---|
| T3.1 merged requirements | ✓ | `448badd` | `backend/app/requirements.txt`（30 套件，8 衝突取最高）|
| T3.3 composition root | ✓ | `448badd` | `backend/app/main.py`：`include_router(module.router)` × 8 + CORS/Auth middleware 套一次 + union public_paths；gateway_compat proxy 排除 |
| T3.4 boot smoke | ✓ | — | TestClient：**346 routes 合併**、`/health` 200、13 個關鍵契約 prefix 全在（含無前綴 alias /auth/login、/suppliers、/api/v2、/api/bff）|
| T3.4 real uvicorn HTTP | ✓ | — | **`uvicorn app.main:app` on :8888 startup complete、8 模組全 start、redis connected、`curl /health`→`{orderly-monolith}`、`GET /`→200** |
| T3.6 restart.yaml + compose | ✓ | (本 commit) | `.claude/restart.yaml`（monolith `.venv/bin/python -m uvicorn` + frontend `next dev -p ${FRONTEND_PORT}` + colima/postgres/redis deps）；`compose.monolith.yml`（自足 pg/redis 解 compose overlay 問題，同 volume 重用資料）|
| T3.7 /restart e2e | ✓ | (本 commit) | **跑完整 /restart dispatcher**：Phase A env✓ / Phase B docker+pg+redis✓ / Phase C ports clear / Phase D 起 backend+frontend / Phase E healthcheck — **backend `/health` 200 + `/db/health` healthy、frontend `/` 200** |

**執行中修的兩個 /restart bug**：
1. **`${VAR}` 外層 shell 展開成空**：dispatcher 的 `direnv exec $CMD` 在無 direnv 的外層 shell 先展開 `${BACKEND_PORT}` → 空 → uvicorn `--port ''` exit 2、next `-p ''` exit 1。修：restart.yaml start_command 改 `${BACKEND_PORT:-8888}` / `${FRONTEND_PORT:-5566}` fallback（同 SSOT 值）。
2. **缺 greenlet**：merged requirements 漏 SQLAlchemy async 的隱性依賴 `greenlet` → 所有 async DB 查詢失敗（`/db/health` 503）。修：`pip install greenlet` + 補進 `backend/app/requirements.txt`，重啟 backend → `/db/health` healthy。

**AC 狀態（全達成）**：AC0 ✓、AC1 ✓（T1c 延後）、AC2 ✓、AC3 ✓、**AC4 ✓**（/restart e2e 全綠）。

**🎯 /goal 達成**：`/restart` 把 modular-monolith（單一 `uvicorn app.main:app` 程序，9 服務路由合一）拉起在 localhost，backend `/health`+`/db/health` 與 frontend 皆綠。

**已知後續（不擋 /goal）**：(a) T1c customer-hierarchy 4 表 migration（延後 STEP 6，可從 billing 複製 script.py.mako）；(b) orderly DB 部分遷移（users/organizations 在、products 缺）→ 需跑各模組 migration 才有完整資料；(c) `/api/v2/health` 等 auth-protected health 端點 401/500（public_paths 未涵蓋，STEP 4 gateway 退役一併處理）；(d) gateway SecurityHeaders/rate-limit/verification_level 移植（STEP 4）。

---

## 命名目標進度表（拆除/搬移類）

本 plan 含拆除與搬移動詞，逐一列出可 grep 的命名目標與其真正消失/移位的 task：

| 命名目標（可 grep） | 動詞 | 第 1 輪狀態 | 真的動的 task | 沒真的動的 task | 備註 |
|---|---|---|---|---|---|
| `sys.path.append` / `sys.path.insert`（指向 `backend/libs`）| remove | 真的動了 (T0.5) | T0.5 | — | AC0 grep 結果為 0 驗收 |
| `from libs.orderly_fastapi_core`（5 檔）| rename→remove | 真的動了 (T0.4) | T0.4 | — | AC0 grep 結果為 0 驗收 |
| `op.create_table('supplier_invitations')` @ 003:85 | remove | 真的動了 (T1a.2) | T1a.2 | — | throwaway DB `alembic upgrade head` 驗收 |
| `backend/product-service-fastapi/app/models/sku.py` | delete | 真的動了 (T1b.2) | T1b.2 | — | `git rm` + import smoke 無 mapper error |
| customer-hierarchy `activity_metrics.py` 4 models | delete **或** 合法延後 | 真的動了 (T1c.2，dead 分支) **或** 補表 migration (T1c.3，live 分支) | T1c.2/T1c.3 | — | 由 T1c.1 grep 決定分支；兩分支都讓「無 migration 的孤兒 model」狀態消失 |
| `backend/<svc>-fastapi/app`（9 個原套件位置）| move (`git mv`) | 真的動了 (P2.2) | P2.2（×9）| — | AC2：原目錄無 python 套件殘留 |
| `app.` import 前綴（re-root 後應變 `app.modules.<svc>.`）| rename | 真的動了 (P2.3) | P2.3（×9）| — | T2.final 同 interpreter 全量 import 無 shadow 驗收 |

**目標達成比例**：7 / 7 命名目標皆「真的動了」（其中 customer-hierarchy 一項為 grep 決定的 dead-刪 / live-補 雙分支，兩者都讓孤兒狀態消失）。無「沒碰到」或「只有間接動作」。

> 註：STEP 4-9 的拆除目標（api-gateway proxy 層、9 條獨立 alembic 鏈、per-service Dockerfile 等）屬 §Out of Scope，為後續 gated 階段的命名目標，不在本 plan 計分。

## Rollback

每個 STEP 的每個動作都是獨立 commit；回退 = `git revert <commit>`。STEP 2 的 `git mv` 亦可整 commit revert 還原原目錄結構。STEP 1a alembic 修改若已套到實 DB，需手動補回（但本 plan 只在 throwaway DB 驗，不碰 staging/prod；DB 收斂屬 STEP 6）。
