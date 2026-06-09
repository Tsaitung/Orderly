Must-fixes: none remaining.

C3 is closed. The plan now requires `is_token_blacklisted(jti)` in the live auth validator path after decode and before trusting `request.state`, plus an acceptance test proving an old act-as token fails on a protected non-auth route. See `/tmp/claude-plan-bd7a9f82.md:50`, `:60`, `:68`, `:152`.

C4 is closed. The plan now requires orders/products/billing tenant helpers to use effective `request.state.tenant_id`, reject mismatched client `X-Tenant-Id` with 403, and prove it with an integration test on at least one protected route. See `/tmp/claude-plan-bd7a9f82.md:51`, `:68`, `:81`, `:163`.

Warning only: there are additional helper-like tenant-header reads beyond the named examples; the plan’s broader `api/v1/*` wording should be interpreted literally during implementation.

VERDICT: APPROVED