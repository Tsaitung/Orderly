# Smoke Tests

Quick checks for user endpoints via the API Gateway and directly against the user-service.

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
