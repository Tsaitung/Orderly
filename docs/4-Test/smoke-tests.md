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
