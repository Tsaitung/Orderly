**Findings**

MUST-FIX 1 — C2 stop invalidation is not enforced by the live auth path.  
`§技術選型確認` / `T2.1` says `blacklist_token(jti)` makes the old act-as token return 401/403, but [AuthMiddleware](/Users/leeyude/Projects/Orderly/backend/libs/orderly_fastapi_core/middleware/auth.py:110) only decodes JWT and sets state; it never calls `is_token_blacklisted`. `get_current_user_from_token` also re-decodes without blacklist checking. The blacklist exists in [session_service.py](/Users/leeyude/Projects/Orderly/backend/app/modules/users/services/session_service.py:359), but nothing consults it.  
Minimal plan edit: add to `T2.1`: “wire `jti` blacklist validation into the live auth validator before setting `request.state`; old act-as token must fail on a protected non-auth route.”

MUST-FIX 2 — The “happy-path no middleware change” claim is only true for `request.state` consumers, not the full monolith.  
`§File Structure` and `T2.3` say effective tenant flows from JWT claims via `request.state`, but live mounted modules still take tenant from client headers: [orders.py](/Users/leeyude/Projects/Orderly/backend/app/modules/orders/api/v1/orders.py:37), [fee_configs.py](/Users/leeyude/Projects/Orderly/backend/app/modules/billing/api/v1/fee_configs.py:27), [products.py](/Users/leeyude/Projects/Orderly/backend/app/modules/products/api/v1/products.py:252), [customer_prices.py](/Users/leeyude/Projects/Orderly/backend/app/modules/products/api/v1/customer_prices.py:88). Since [backend/app/main.py](/Users/leeyude/Projects/Orderly/backend/app/main.py:43) mounts those modules under the single top-level auth middleware, a target JWT alone does not guarantee those routes use the target tenant, and arbitrary/mismatched `X-Tenant-Id` remains a cross-tenant risk.  
Minimal plan edit: add to `T2.3/T2.4`: “normalize live tenant helpers to use `request.state.tenant_id` as source of truth; if legacy `X-Tenant-Id/X-Org-Id` is present and mismatches, return 403; cover at least one orders/products/billing route in integration tests.”

**Warnings**

Frontend execution should explicitly replace active auth/session context with the impersonation token’s effective `user.id/role/organizationId`, then restore the super_admin context on stop. Current frontend code often derives scope from `user.organizationId`, and the API client only adds `Authorization`. This is likely covered by `T3.0/T3.1`, but add that assertion so the banner test is not token-only.

I did not find an existing code path that re-derives authorization from `act_as.actor_id`; with `sub` set to target, both `request.state.user_id` and `get_current_user_from_token` resolve to the target. Audit reuse is also sound at the schema/service-signature level.

VERDICT: REVISE