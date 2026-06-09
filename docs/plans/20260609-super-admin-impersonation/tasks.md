# Tasks — Super Admin Impersonation / Act-as

> Owner: us-edit (transient-work-artifact). 2-4h tasks, tests-first.
> 禁止引入未批准 mock / stub / fake / no-op / placeholder runtime 行為（CLAUDE.md #14）。
> Canonical: US-AUTH-023/024, PRD §2.5, tech-arch §10.3, ADR-0005, INV-auth-003.

## Group 0 — RED tests first (pre-implementation)

- **T0.1** 寫 impersonation 整合測試骨架（RED）
  - 依賴：—
  - 產出：`backend/app/tests/test_impersonation.py`（先紅；目前 repo 的可執行 Python backend tests 在 `backend/app/tests/`，不是 npm 的 `tests/integration/**/*.test.ts|js`）
  - 驗收：涵蓋 act-as 權限約束、跨租戶隔離、雙 context audit、start/stop/current、frontend-only view-as、TTL 到期；初次執行全紅。focused RED command：`cd backend/app && PYTHONPATH=. pytest tests/test_impersonation.py -q`
- **T0.2** 寫 INV-auth-003 / INV-auth-001 不變式斷言測試（RED）
  - 依賴：T0.1
  - 產出：跨租戶讀取隔離 + effective tenant 切換的 assertion
  - 驗收：模擬 A 租戶帳號讀不到 B 租戶（紅）

## Group 1 — Contract

- **T1.1** `shared/types` 定 impersonation DTO + `act_as` claim 型別
  - 依賴：—
  - 產出：impersonation DTO（start req/resp、current resp）+ `act_as` claim interface
  - 驗收：type-check 通過；前後端共用同一契約

## Group 2 — Backend

- **T2.1** impersonation endpoints（start/stop/current）
  - 依賴：T1.1
  - 產出：新 `backend/app/modules/users/services/impersonation_service.py` + `api/v1/` router；session 走既有 `session_service.py`；start 簽發帶 `act_as` 的短效 token（sibling 既有 `super_user_service.py`，不共用啟用邏輯）
  - **stop 失效契約**：`stop` 必須 `terminate_session` 該 impersonation Redis session **並** `blacklist_token(jti)`。**關鍵**：既有 `AuthMiddleware.dispatch()`(auth.py:91-135) 與 `get_current_user_from_token`(core.py:79) **目前都不查 blacklist** → 本 task 須在 auth validator 補 `is_token_blacklisted(jti)` 檢查（decode 後、set `request.state` 前），否則 blacklist 寫了也不生效。`current` 依 session active/expired 回應（過期回 null）
  - 驗收：T0.1 中 start/stop/current 案例轉綠；stop 後用舊 act-as token 呼叫**一個 protected 非 auth route**（如 orders/products）回 401/403（一條測試，證明 validator 真的查 blacklist）。focused command：`cd backend/app && PYTHONPATH=. pytest tests/test_impersonation.py::test_stop_blacklists_old_act_as_token_on_protected_route -q`
- **T2.2** start guard
  - 依賴：T2.1
  - 產出：caller 必為 super_admin + **real MFA-passed / recent-MFA signal**；target 必 active；讀 target `user.py` 的 `role`+`permissions`+`organization_id`
  - 驗收：非 super_admin 呼叫回 403；MFA 未過或 recent-MFA 過期回 403
  - **⚠ Round-6 G6 verification result（BLOCKER / precondition）**：repo 目前**沒有**可重用的「本次已過 MFA」runtime signal，不能用 `mfa_enabled` 或 `mfa_enforced_at` 代替。grep/code anchors：
    - `backend/app/modules/users/api/v1/auth/core.py:32-55` `_build_claims()` 只放 `sub/email/tenant/org/role/permissions/token_version/status/verification_level`，無 `mfa`/`amr`/`acr`/`auth_time`/`mfa_verified_at`。
    - `backend/app/modules/users/api/v1/auth/core.py:58-76` token creators 只補 `exp`/`type`/`jti`；`backend/app/modules/users/api/v1/mfa.py:425-453` MFA verify success 以一般 claims 簽 access/refresh token，沒有把 MFA 驗證時間或方式寫入 claim。
    - `backend/app/modules/users/models/session.py:8-17` DB session row 無 MFA flag/timestamp；`backend/app/modules/users/services/session_service.py:104-118` Redis session payload 無 MFA flag/timestamp。
    - `rg -n "amr|acr|mfa_verified|mfa_passed|recent_mfa|last_mfa|auth_time|step_up" backend/app/modules/users backend/libs` 未找到可用 signal；`mfa_enabled`（user.py:35）與 `mfa_enforced_at`（user.py:52）只代表帳號有設定/被要求 MFA，不代表目前 token/session 已通過 MFA。
  - **前置實作要求**：T2.2 必須先新增 deterministic MFA-passed/recent-MFA signal（例如 signed access-token claim `amr=["mfa"]` + `auth_time`/`mfa_verified_at`，或 server-side session flag + TTL；二選一並在 code 中強制），再以該 signal gate impersonation start。若此 signal 未完成，**不得實作或宣稱 MFA guard 已完成**。
  - **必要測試**：一條測試以「同一個 super_admin、`mfa_enabled=True` 但 token/session 缺 recent-MFA signal」呼叫 start → 403；一條測試以 recent-MFA signal 存在且未過期 → start 通過；一條測試以 recent-MFA signal 過期 → 403。
- **T2.3** authz 化身（effective identity 契約）
  - 依賴：T2.1、T1.1
  - **effective identity 契約**：act-as token / auth context 必須同時保留 `actor_user_id`（super_admin）與 `effective_user_id`(= `impersonated_user_id`)。**業務授權與 current-user 行為一律用 effective target**（`role`/`permissions`/`organization_id` 皆取目標）；**audit 用 actor + target**；**禁止**從 actor 的 `is_super_user` 套用任何 override（即使 actor 本身是 super_user 也不繼承其權限到 effective context）。
  - 產出：既有 `AuthMiddleware`（`orderly_fastapi_core/middleware/auth.py:128`）`dispatch()` 已從 JWT claims 推導 `request.state.user_id`(=`sub`)/`tenant_id`/`permissions` → 在 `core.py` 簽 act_as token 時令 `sub`/`tenant_id`/`permissions`/`role` = target，**對 request.state 消費者** effective context 自動透傳（不需重造 gateway middleware）。本 task 斷言：(a) `sub` 帶 target（非 actor id）；(b) `act_as.actor_id` 僅供 audit、不參與授權；(c) 不從 actor `is_super_user` 套 override。（讀 client `X-Tenant-Id` 的下游模組另由 T2.4 調和）
  - 驗收：act-as operator 不能做 operator 不可做的操作（403）；actor 為 super_admin 時 effective context 仍只有目標角色權限（不出現 super_user override）；INV-auth-001 仍成立；`request.state.user_id` == target_user_id（不等於 actor）
- **T2.4** 跨租戶隔離（INV-auth-003）+ header tenant 調和
  - 依賴：T2.3
  - 產出：effective tenant = 目標租戶；不可讀其他租戶。**header 調和**：orders/products/billing 的 tenant helper（`get_tenant_id` 讀 client `X-Tenant-Id`/`X-Org-Id`：orders.py:37、products.py:252、billing/fee_configs.py:27、customer_prices.py:88）impersonation 下改以 `request.state.tenant_id`(effective) 為準；若 client header 存在且與 effective 不符 → 403（防 client 竄改 header 跨租戶）
  - **全掃 note**：讀 client `X-Tenant-Id`/`X-Org-Id` 的 endpoint **不止列舉 4 個**——實作時 `grep -rl "X-Tenant-Id\|X-Org-Id" backend/app/modules/` 全掃（現 10 檔：billing 3 + orders 1 + products 6），逐一調和，勿只改範例
  - 驗收：T0.2 轉綠；**≥1 條 orders/products/billing route 整合測試**：act-as 帶 effective=B 但送 `X-Tenant-Id=A` → 回 403（不外洩 A）；不送 header 時用 effective=B
- **T2.5** impersonation audit（複用既有 `AuditLog`）
  - 依賴：T2.3
  - 產出：呼叫既有 `audit_service.log(...)` 的 **keyword 簽名**（audit_service.py:42-106 已驗證，直接映射 `AuditLog` 欄位，不抄 `super_user_service.py` 的 dict-positional form）：`await audit_service.log(user_id=actor_id, target_user_id=impersonated_id, organization_id=tenant_id, event_type="impersonation_*", metadata={...act_as session...})`；start/stop 入審計
  - **Round-6 G3 decision（MUST-FIX resolved to implementation contract）**：採 **新增 act-as audit middleware**，不收斂範圍。新增 middleware 接進活的 monolith stack，偵測帶 `act_as` 的 mutating request（POST/PUT/PATCH/DELETE），在 business handler 執行前寫入 `impersonation_mutating_request` audit，metadata 至少含 `act_as_session_id`、`actor_id`、`impersonated_user_id`、`effective_tenant_id`、`request_method`、`request_path`、`request_id`。若 actor/target/tenant/session metadata 缺失或 audit 寫入失敗，middleware 必須 fail closed（401/403/5xx 依錯誤類型），不得放行未審計寫入。PRD §2.5、tech-arch §10.3、smoke test 已同步此決策。
  - **middleware order requirement**：middleware 必須在 `AuthMiddleware` 已驗證 JWT 並填入 `request.state.user` / `request.state.tenant_id` 後讀取 act-as context；實作時需加 composition/canary test 證明 mutating route 進 handler 前已有 audit row，且 non-mutating GET 不寫逐操作 audit。
  - **⚠ Round-6 G4 verification result（SHOULD-FIX，欄位 nullable + service 無 guard）**：`AuditLog.event_type` (`audit_log.py:89`)、`user_id` (`:98`)、`organization_id` (`:102`)、`target_user_id` (`:105`) 皆 `nullable=True`；只有 `event_metadata` (`:115`) `nullable=False`。`audit_service.log(...)` (`audit_service.py:42-59`) 接受 `Optional` actor/target/org，且建 `AuditLog` 時 (`:92-107`) 原樣寫入，沒有非空檢查。因此「impersonation audit actor+target+tenant+event_type 非空」只能靠 app 層 assertion，DB 和既有 service 不會替你擋。
  - **app-layer assertion requirement**：新增 impersonation 專用 audit helper / write path 時，必須在呼叫 `audit_service.log(...)` 前或 helper 內明確拒絕空值：`event_type`、`actor_user_id`→`user_id`、`impersonated_user_id`→`target_user_id`、`effective_tenant_id`→`organization_id`、`event_metadata.act_as_session_id` 皆 required；缺任何一個就 raise domain error / 4xx，且**不得**吞掉錯誤後寫 nullable audit row。
  - **必要測試**：至少五條 focused tests：(a) start/stop success audit row 帶非空 `event_type/user_id/target_user_id/organization_id/event_metadata.act_as_session_id`；(b) 缺 actor 或 target 時拒寫且 DB 無 nullable impersonation audit row；(c) 缺 tenant 或 event_type 時拒寫且 DB 無 nullable impersonation audit row；(d) act-as mutating request 在 orders/products/billing 至少各一條代表 route 產生 actor+target+tenant+method/path audit row；(e) audit write failure 時 mutating request fail closed 且 handler 未執行。
  - 驗收：審計案例轉綠；impersonation audit 寫入時 `user_id`(actor)/`target_user_id`/`organization_id`/`event_metadata` 經 app 斷言非空；複用既有欄位、不新增 schema（audit_service.log 已支援全部 kwarg）；G3 機制決策已落 PRD/spec 並由 middleware canary 證明
- **T2.6** view-as contract guard（純前端 nav-lens，無後端 endpoint/token）
  - 依賴：T1.1
  - 產出：不建立 `POST /auth/role-switch`、不簽 preview token、不接受 client preview role 作為後端授權依據；view-as 狀態只在前端 local UI state，依預覽角色過濾導航/可見功能。若既有 route stub 出現，須移除或保持 404/410，不得成為授權入口。
  - **Round-6 G5 decision（SHOULD-FIX resolved）**：view-as 不授寫入權的 enforcement = **沒有後端身份變更**。前端可依 preview role 過濾導航；任何繞過前端直打 backend 的 mutating request 仍只使用真實 `super_admin` token/session 做授權，不因 preview role 取得目標租戶或目標角色寫入權。若未來改成真 token/read-only scope，須另開 ADR 或修改本 PRD/spec，不可在本實作中偷偷改語意。
  - 驗收：(a) route scan 或 backend test 證明沒有可用 `/auth/role-switch` token endpoint；(b) 前端切換與還原只更新 local preview state / frontend preview event，不換 token；(c) view-as 狀態下直打代表性 mutating endpoint 不會以 preview role/tenant 授權；(d) 前端導航分區改變只由 local preview state 驅動
- **T2.7** Alembic 遷移（條件性 — 預設 N/A）
  - 依賴：T2.5
  - 產出：**僅當** T2.5 確認既有 `AuditLog`/`User` 欄位不足（如需 `act_as` 專屬持久欄位）才 autogenerate 遷移 + server_default
  - 驗收：若觸發 → `alembic upgrade head` 通過、`alembic history` 鏈不斷；若不需要 → 明確記錄「既有欄位足夠，無遷移」

- **T2.8** act-as TTL 自然到期由 `exp` 強制（Round-5 gap G1，MUST-FIX）
  - 依賴：T2.1
  - 背景：活的 `AuthMiddleware.dispatch()`（`backend/libs/orderly_fastapi_core/middleware/auth.py:91-146`）只用 `jwt.decode(... options={"verify_exp": True})` 查簽章/`exp`，再把 claims 寫入 `request.state`（:127-131）；它**不查 Redis session 是否存在**。若 Redis impersonation session TTL < access-token `exp`，session 自然到期（無明確 stop → 無 blacklist）後、`exp` 未到前，舊 act-as token 仍能打 protected route。
  - code anchors：
    - `backend/app/modules/users/api/v1/auth/core.py:58-66`：`create_access_token(data, expires_delta)` 已支援自訂 `expires_delta`，並在 payload 內寫 `exp` + `type="access"` + `jti`。
    - `backend/app/modules/users/services/session_service.py:24` / `:61-147`：`SESSION_TTL_SECONDS` 目前固定 7 天，`create_session()` 沒有 per-session TTL；`:122-137` 對 `session:<id>` 與 `jti_session:<jti>` 都寫死同一常數。
  - 產出：
    - 新增 `IMPERSONATION_SESSION_TTL_SECONDS`（來源可為設定/env，但單一來源），act-as start 用 `create_access_token(..., expires_delta=timedelta(seconds=IMPERSONATION_SESSION_TTL_SECONDS))`。
    - `SessionService.create_session()` 保持既有呼叫相容，但新增 `ttl_seconds: int = SESSION_TTL_SECONDS`（或等價 per-session TTL 參數），並用同一 TTL 寫 `session:<id>`、`user_sessions:<user>` expire、`jti_session:<access_jti>`。
    - act-as token payload 的 `exp`、Redis impersonation session TTL、`jti_session` mapping TTL 必須同源；不得出現 token 15 分鐘但 Redis 7 天，或 Redis 短於 token 的漂移。
    - 因 `create_access_token()` 只回 token 字串，實作須以相容方式取得 `jti`/`exp` 給 session（例如抽出內部 helper 回傳 encoded token + payload，並保留既有 `create_access_token()` public signature）。
  - 驗收：整合測試——用極短 TTL（例如 1 秒，透過 monkeypatch 設定常數/設定值）建立 act-as token，**不呼叫 stop**，等 TTL 過後打 protected 非 auth route（orders/products 或 composition test-only protected route）回 401/403；同測試斷言 decoded token `exp - iat/issued_at`（或 `exp - frozen_now`）不大於 impersonation TTL，且 Redis `session:<id>` / `jti_session:<jti>` TTL 不大於同一 TTL。focused command：`cd backend/app && PYTHONPATH=. pytest tests/test_impersonation.py::test_act_as_natural_expiry_is_enforced_by_token_exp -q`

- **T2.9** act-as 不可 refresh（Round-5 gap G2，MUST-FIX）
  - 依賴：T2.1
  - 背景：`create_refresh_token()`（`backend/app/modules/users/api/v1/auth/core.py:70-76`）固定簽 7 天 refresh token；正常登入/MFA/OAuth 路徑會回 refresh（`auth/token.py:78-80`、`oauth.py:273-280`、`mfa.py:425-438`）。`/auth/refresh` 是 public path（`backend/libs/orderly_fastapi_core/middleware/auth.py:33-40`、`backend/app/modules/users/main.py:23-45`），端點接受 Authorization bearer 或 JSON body（`auth/token.py:36-49`），只驗 JWT type/sub/token_version（`:51-70`），然後固定簽發新的 access + refresh（`:78-95`）；它**沒有查 DB `sessions` row 是否存在**，也沒有 blacklist/act_as guard。
  - 產出：
    - impersonation start response 使用 impersonation 專用 response schema，**不得包含 usable refresh token**（不要沿用會填 `refresh_token` 的 `AuthResponse` 成功語意；若因 schema 相容保留欄位，值必須為 `null` 且前端不可保存）。
    - act-as start 不呼叫 `create_refresh_token()`，不建立 `UserSession(token=<refresh>)` DB refresh session；Redis `create_session(..., refresh_token_jti=None, ttl_seconds=IMPERSONATION_SESSION_TTL_SECONDS)`。
    - `backend/app/modules/users/api/v1/auth/token.py:30-113` 的 `refresh_token_endpoint()` 在 decode 後、issue tokens 前拒絕任何 `payload.get("act_as")`（建議 403，detail 明確如 `Impersonation sessions cannot be refreshed`）。本次選擇**拒絕**，不採「strip act_as 還原 actor」以避免 refresh endpoint 同時承擔 session 切換語意。
    - 防回歸：若未來有人誤簽 `type="refresh"` 且帶 `act_as` 的 token，`/auth/refresh` 仍必須拒絕，不得產生新的 access token 或 refresh token。
  - 驗收：整合測試——(a) `POST /auth/impersonation/start` 回應不含 usable `refresh_token`，且沒有新增 refresh `UserSession` row；(b) 手工/fixture 建一顆 `type="refresh"` 且含 `act_as` claim 的 token 呼叫 `/auth/refresh` 與 `/api/auth/refresh` → 403/401，response 不含 `token`/`refresh_token`；(c) 一般非 act-as refresh 既有行為仍可用。focused commands：`cd backend/app && PYTHONPATH=. pytest tests/test_impersonation.py::test_act_as_start_does_not_issue_refresh_token tests/test_impersonation.py::test_refresh_endpoint_rejects_act_as_refresh_token -q`；回歸：`cd backend/app && PYTHONPATH=. pytest tests/test_auth_social_only.py tests/test_composition_smoke.py -q`

## Group 3 — Frontend

- **T3.0** impersonation 前端旅程 Playwright E2E（RED first，runtime validation）
  - 依賴：T2.1（後端 start/stop 可用）
  - 產出：`tests/e2e/` 新增 impersonation 旅程 spec（repo `testDir: ./tests/e2e`）；**先紅**，禁 `test.skip`/`test.fixme`
  - 驗收：單一 critical 旅程 runtime 綠 —— super_admin 從使用者清單發起模擬 → 前端以 effective target 替換 active user context（`user.id`/`role`/`organizationId`，非只塞 token）→ 全域 banner 顯示「正在以 {帳號} 身分操作」→ 畫面 scope 變為目標租戶 → 點一鍵退出 → **還原超管 context** **且** 前端持有的舊 act-as token 對後端呼叫回 401/403。理由：US-AUTH-023/024 為 user-facing UI 旅程，純後端 `tests/integration` 不證明 banner/退出真的能跑；既有前端從 `user.organizationId` 推 scope，故須驗 context 替換而非 token-only（runtime-validation guard）
- **T3.1** 使用者清單「切換到此帳號」入口（super_admin only）
  - 依賴：T2.1
  - 產出：US-AUTH-009 清單列動作；非 super_admin 不顯示
  - 驗收：點擊發起模擬，進入目標租戶
- **T3.2** 全域 impersonation 橫幅 + 一鍵退出
  - 依賴：T2.1
  - 產出：「正在以 {帳號} 身分操作」橫幅 + stop（呼叫 T2.1 stop 失效契約：terminate session + blacklist jti）
  - 驗收：模擬期間恆顯示；退出還原超管；退出後前端持有的舊 act-as token 不再可用（後端回 401/403）
- **T3.3** 帳號選單角色切換（view-as）
  - 依賴：T2.6
  - 產出：角色清單切換 + 還原超管視角
  - 驗收：切換只改變前端導航/可見功能分區；不呼叫後端 role-switch endpoint、不換 token、不改 active backend identity

## Group 4 — Verification

- **T4.1** 全 Test Plan 轉整合測試並通過
  - 依賴：T2.*、T3.*
  - 產出：docs/4-Test/smoke-tests.md impersonation section → `backend/app/tests/test_impersonation.py` backend pytest 全綠 + T3.0 `tests/e2e` 旅程綠
  - 驗收：act-as 約束 / 跨租戶隔離 / 雙 context audit / TTL / 入口 各至少一條 backend pytest 通過（目前可執行位置：`backend/app/tests/test_impersonation.py`）；**且** Round-5/6 gap 各補一條：T2.8（TTL 自然到期 token 被 `exp` 擋 401/403）、T2.9（act-as 不可 refresh）、T2.5-G3（act-as mutating request 經 audit middleware pre-write，失敗 fail-closed）、T2.5-G4（audit actor+target app 斷言非空）、T2.6-G5（view-as frontend-only：無 token endpoint + direct backend request 不受 preview state 影響）、T2.2-G6（`mfa_enabled=True` 但缺 recent-MFA signal 仍拒 start；recent-MFA 過期也拒）；**且** T3.0 Playwright 前端旅程 runtime 綠（banner + 退出 + 舊 token 401/403）
- **T4.2** OpenAPI 同步
  - 依賴：T2.*
  - 產出：impersonation endpoints 由實作同步至 `docs/0-Design/api-specification.yaml`（planned → implemented）
  - 驗收：spec 與實作一致
