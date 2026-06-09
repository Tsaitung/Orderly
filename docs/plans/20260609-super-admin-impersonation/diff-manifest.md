# Diff Manifest — Super Admin Impersonation / Act-as

> Owner: us-edit. Phase 5 docs diff manifest. Source: `git diff --name-status` against repo state 2026-06-09.
> Scope: module 01 (auth). High-risk (cross-tenant, touches INV-auth-001, needs ADR-0005). >3 docs files → manifest mandatory.

## Changed Files (us-edit-owned, applied)

| File | Layer | Change |
|------|-------|--------|
| `docs/1-User-Story/by-module/01-auth-user-management.md` | US (truth) | + US-AUTH-023, US-AUTH-024；modify US-AUTH-009；+ 對照表 2 列 |
| `docs/2-PRD/PRD-Auth-Module.md` | PRD (truth) | + Section 2.5 Impersonation / Act-as + 權限矩陣 + API（planned）|
| `docs/0-Design/technical-architecture-auth.md` | System spec (truth) | + §10.3 Impersonation / Act-as Session System（token / tenant context / endpoints / audit）|
| `docs/4-Test/smoke-tests.md` | Test Plan | + Auth Test Plan — Impersonation / Act-as section |
| `docs/4-Test/INDEX.md` | derived | + impersonation test-plan reference |
| `docs/1-User-Story/INDEX.md` | derived | count 106→108；module 01 22→24；P1 31→32；P2 19→20；PRD-Auth 22→24 |
| `docs/1-User-Story/by-role/platform-roles.md` | derived | fix off-by-one（008→009 / 011→012 / 012→013）；+ US-AUTH-023/024 links；super_admin row note |
| `docs/1-User-Story/playbooks/super-admin-guide.md` | derived | + STALE 過期警告 banner（Prisma / Email+password 已過期）|

## Expected Governance-Owned Files (handoff to orderly-doc-governance, not yet applied by us-edit)

| File | Owner | Change |
|------|-------|--------|
| `docs/adr/ADR-0005-auth-super-admin-impersonation.md` | governance | new ADR (risk-acceptance) — act-as model + tenant-isolation exception |
| `docs/adr/README.md` | governance | ledger row ADR-0005 |
| `docs/0-Design/business-invariants.md` | governance | + INV-auth-003（impersonation dual-context）；note on INV-auth-001 exception |
| `docs/plans/20260609-super-admin-impersonation/run.md` | governance | FSM state + decision freeze |
| `docs/plans/README.md` | governance | active path sync |
| `docs/governance/governance-ledger.md` | governance | closeout entry on run completion |

## Changed Identifiers

### US (added)
- `US-AUTH-023` 超管帳號模擬登入（Impersonation / Act-as） — P1 — source: PRD §2.5, ADR-0005
- `US-AUTH-024` 超管角色切換預覽（Role Switch / View-as Role） — P2 — source: PRD §2.5

### US (modified)
- `US-AUTH-009` 使用者清單管理 — + 「切換到此帳號」入口（act-as 起點）

### PRD section (added)
- PRD-Auth-Module §2.5 Impersonation / Act-as（模擬登入與角色切換）

### System spec section (added)
- technical-architecture-auth §10.3 Impersonation / Act-as Session System

### API endpoints (planned — not implemented; OpenAPI sync deferred to implementation)
- `POST /auth/impersonation/start`
- `POST /auth/impersonation/stop`
- `GET /auth/impersonation/current`
- `POST /auth/role-switch`

### Token claim (planned)
- `act_as` claim block: `{ actor_id, actor_role, started_at, expires_at, reason? }`

### Audit (planned)
- `ImpersonationAuditEvent.impersonation = { actor_id, impersonated_user_id, tenant_id, session_started_at }`

### Invariant (governance-owned, expected)
- `INV-auth-003` impersonation 雙 context（effective tenant = target; token/audit records actor）
- `INV-auth-001` note: impersonation exception（effective vs actor）

### ADR (governance-owned, expected)
- `ADR-0005` auth-super-admin-impersonation（risk-acceptance）

## Traceability Check (per identifier)

| Identifier | US | PRD | Spec | Test Plan | Result |
|------------|----|----|------|-----------|--------|
| US-AUTH-023 | self | §2.5 | §10.3 | smoke impersonation | OK (ADR-0005 governance-pending) |
| US-AUTH-024 | self | §2.5 | §10.3（role-switch）| smoke role-switch | OK |
| US-AUTH-009 (mod) | self | §9.1 | — | — | OK (entry-point only) |
| INV-auth-003 | US-AUTH-023 | §2.5 | §10.3.2 | smoke tenant-context | governance-pending |
| ADR-0005 | US-AUTH-023/024 | §2.5 | §10.3 | — | governance-pending |

## Derived-Surface Drift Fixed (pre-existing, in-scope cleanup)
- `platform-roles.md` off-by-one：US-AUTH-008→009、011→012、012→013（by-role index 與 by-module truth 對齊）
- `super-admin-guide.md`：標記 Prisma / Email+password 內容過期（與 ADR-0003 / US-AUTH-016 矛盾）

## Pre-existing Drift NOT Fixed (out of scope, noted only)
- `docs/1-User-Story/INDEX.md` line 75「P0 (55 stories)」 vs 表格 P0=56 — 既有，未由本次造成
- `data_steward` role 出現在 INDEX 角色表但不在 by-module §角色定義 — 既有
