# Smoke Tests

Quick checks for user endpoints via the API Gateway and directly against the user-service.

## Auth Test Plan — Line/Google 登入模型（2026-06-08）

> 對應 US-AUTH-003/006/008/016/022、PRD Section 4.1.1 / 4.5 / 5。design-stage Test Plan，待 OAuth 端點實作後轉為 `tests/integration` 可執行測試。

- [ ] **Line 主要登入**：`GET /api/v1/auth/oauth/line/initiate` 回授權 URL + `state`；`callback` 簽發 JWT
- [ ] **Google 次要登入**：已綁定 Google 的帳號可經 `oauth/google/callback` 登入
- [ ] **Google 綁定/解綁**：`POST|DELETE /api/v1/auth/social-bindings/google`；解綁至零須被拒（保留至少一個社群綁定）
- [ ] **無密碼**：`POST /api/v1/auth/login`（email/password）與 `/auth/password/*` 回 404/410（已移除）
- [ ] **Email 非認證**：註冊不要求 Email；Email 僅作財務對帳欄位
- [ ] **平台端**：平台帳號以 Line/Google + 強制 MFA 登入；未在供裝允許名單的社群帳號被拒
- [ ] **帳號恢復**：Line 失效 → Google 登入成功；雙失效 → 人工恢復（platform_support）
- [ ] **MFA**：方法僅 TOTP / SMS（無 Email OTP）
- [ ] **審計**：登入/綁定/解綁/恢復事件寫入 `audit_logs`，欄位非空

> **⚠️ 已停用**：下方 forgot-password / reset-password smoke 隨密碼廢除而停用，保留作歷史對照。

## Auth Test Plan — Impersonation / Act-as（超管模擬登入，2026-06-09）

> 對應 US-AUTH-023/024、PRD Section 2.5、`docs/0-Design/technical-architecture-auth.md` §10.3、ADR-0005、INV-auth-003。design-stage Test Plan，待 impersonation 端點實作後轉為 `tests/integration` 可執行測試。

**化身權限（act-as 目標角色，非 God mode）**
- [ ] `super_admin` 對某 `restaurant_operator` 發起模擬 → effective `role`/`permissions` 等於該 operator；嘗試該 operator 不可做的操作（如改價目）回 403
- [ ] 模擬 token **不**含 `super_user` override/bypass；嘗試 override 業務規則被拒
- [ ] 非 `super_admin` 呼叫 `POST /auth/impersonation/start` 回 403

**租戶 context 與隔離（INV-auth-003）**
- [ ] 模擬 session 的 effective `tenant_id` = 目標帳號租戶；下游查詢仍帶 `tenant_id`（INV-auth-001 不破）
- [ ] 模擬 A 租戶帳號時，讀不到 B 租戶資料（跨租戶隔離仍成立，只是 effective tenant 改為目標）
- [ ] token / 每筆 audit 同時含 `actor_id`（超管）與 `impersonated_user_id`（雙 context 可回溯真實發起者）

**Session 生命週期與入口**
- [ ] `POST /auth/impersonation/start { target_user_id }` 簽發帶 `act_as` claim 的 token；`GET /auth/impersonation/current` 回正確 actor/impersonated/tenant/expires
- [ ] `POST /auth/impersonation/stop` 還原超管原 session
- [ ] 模擬 session 逾 TTL 自動失效，需重新發起
- [ ] 使用者清單（US-AUTH-009）每列「切換到此帳號」可發起模擬；非 super_admin 不顯示該入口
- [ ] 發起模擬要求超管 MFA 已通過

**角色切換預覽（view-as，US-AUTH-024）**
- [ ] `POST /auth/role-switch { preview_role }` 改變介面導航/可見功能分區，但不授予特定租戶寫入權
- [ ] 切換與還原皆記錄審計（`actor_id` + 預覽角色 + `timestamp`）

**審計不可關閉**
- [ ] 模擬期間所有寫入操作 → `audit_logs` 出現 `impersonation`（actor + impersonated + tenant），欄位非空
- [ ] `start` / `stop` 本身亦寫入審計

## Prerequisites

- Services running locally (user-service default `:3001`, api-gateway default `:3000`).
- `curl` and `jq` installed.
- A valid JWT from `POST /api/v1/users/login` for the `/me` endpoint.

## API Gateway (recommended)

- Get current user
  - `GET /api/v1/users/me`
  - Example:
    ```bash
    BASE_URL=http://localhost:3000 TOKEN=<jwt> ./scripts/smoke/gateway-users.sh me
    ```

- Forgot password
  - `POST /api/v1/users/forgot-password`
  - Example:
    ```bash
    BASE_URL=http://localhost:3000 ./scripts/smoke/gateway-users.sh forgot user@example.com
    ```

- Reset password
  - `POST /api/v1/users/reset-password`
  - Example:
    ```bash
    BASE_URL=http://localhost:3000 ./scripts/smoke/gateway-users.sh reset <token> 'NewP@ssw0rd1'
    ```

### Organizations (user-service)

- Create organization
  - `POST /api/v1/users/organizations`
  - Example:
    ```bash
    curl -sS -X POST -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
      -d '{"name":"My Org","type":"restaurant"}' \
      http://localhost:3000/api/v1/users/organizations | jq .
    ```
- List organizations
  - `GET /api/v1/users/organizations`

### Products (product-service via gateway)

- List products
  - `GET /api/v1/products`
  - Example: `BASE_URL=http://localhost:3000 TOKEN=<jwt> ./scripts/smoke/gateway-products.sh list`
- Create product
  - `POST /api/v1/products`
  - Example: `BASE_URL=http://localhost:3000 TOKEN=<jwt> SUPPLIER_ID=s1 CATEGORY_ID=c1 ./scripts/smoke/gateway-products.sh create "Apple"`
- Update product
  - `PUT /api/v1/products/:id`
- Delete product
  - `DELETE /api/v1/products/:id`
- Categories
  - `GET|POST|PUT|DELETE /api/v1/products/categories[/:id]`

### Orders (order-service via gateway)

- Create order
  - `POST /api/v1/orders`
  - Example: `BASE_URL=http://localhost:3000 TOKEN=<jwt> ./scripts/smoke/gateway-orders.sh create`
- List orders
  - `GET /api/v1/orders`
- Order detail
  - `GET /api/v1/orders/:id`
- Update status
  - `PATCH /api/v1/orders/:id/status`
- Cancel order
  - `POST /api/v1/orders/:id/cancel`

## Direct to User Service

- Get current user
  - `GET /me`
  - Example:
    ```bash
    BASE_URL=http://localhost:3001 TOKEN=<jwt> ./scripts/smoke/users.sh me
    ```

- Forgot password
  - `POST /forgot-password`
  - Example:
    ```bash
    BASE_URL=http://localhost:3001 ./scripts/smoke/users.sh forgot user@example.com
    ```

- Reset password
  - `POST /reset-password`
  - Example:
    ```bash
    BASE_URL=http://localhost:3001 ./scripts/smoke/users.sh reset <token> 'NewP@ssw0rd1'
    ```

## Notes

- API Gateway TypeScript build currently reports type errors unrelated to these route changes; runtime usage is unaffected if you run with ts-node or a prior build. Direct service calls remain valid for local testing.
- The user-service logs the generated reset token to stdout for testing.
