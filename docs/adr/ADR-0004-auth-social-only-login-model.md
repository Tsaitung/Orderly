# ADR-0004: 全平台社群登入模型（Line 主 / Google 次，廢密碼）+ 平台端安全 trade-off

- **Type**: risk-acceptance
- **Lifecycle Status**: accepted
- **Date**: 2026-06-09
- **Cluster**: auth
- **Primary PRD**: `docs/2-PRD/PRD-Auth-Module.md`（§0 權威）
- **FR / US References**: US-AUTH-001/002/003/005/006/007/008/010/014/016/021（modified）、US-AUTH-004（deprecated）、US-AUTH-022（added，社群帳號恢復）
- **Supersedes / Superseded By**: —
- **Review By**: 2026-12-09（risk-acceptance 標準半年安全複審；或 G3 真實 provider smoke + 首次 production deploy 時提前複審）

## Context

Orderly 原 auth 模型為 Email + 密碼 + （平台端）獨立 Email+密碼+MFA 系統。維護負擔（密碼重設攻擊面、忘記密碼流程、Email 驗證）對單人維護偏重，且與「Line 為台灣餐飲業主要溝通管道」的現實不符。使用者於 2026-06-08 經 `/us-edit` 拍板四項決策（見 §Decision）。

## Decision

全平台登入模型改為**社群登入 only**：

1. **Line 為主要登入**；**Google 為次要**（綁定後可登入）。
2. **完全廢除密碼**（移除 `POST /api/auth/login`、`/api/auth/password/*`、`POST /api/auth/verify-email`、公開 `POST /api/auth/register`）。
3. **Email 不做登入/恢復**，改純財務對帳用途。
4. **平台端（platform admin）**由「獨立 Email+密碼+MFA 系統」改為「Line/Google + **強制 MFA** + 供裝允許名單 + IP 白名單」。
5. **帳號恢復**（US-AUTH-022）取代密碼重設：以另一個已綁定社群帳號驗證；兩者皆失效則人工支援（需多項證據）。

需求落於 US/PRD/Specs（canonical，已 synced on main）；本 ADR 記**安全 trade-off 與其接受理由**。

## Risk Acceptance（本 ADR 的核心）

平台端從「獨立 Email+密碼+MFA」改為「Line/Google + 強制 MFA」是**刻意降低**原獨立系統的防釣魚層級、並**提高對第三方 OAuth provider 的依賴**。此風險由使用者明確拍板接受，換取：免密碼管理、統一登入入口、降維護面。

**已實作的緩解（2026-06-09 grep 驗證在 code，非僅文件宣稱）：**

| 緩解 | 證據 |
|------|------|
| 強制 MFA（平台端）| `backend/app/modules/users/api/v1/auth/` MFA 流程 + `/mfa` 完成頁 |
| 帳號供裝允許名單 | `platform_provisioning` model + auth-gated admin route（migration `0004` idempotent 建表）|
| 靜態 IP 白名單 | `PLATFORM_AUTH_ALLOWED_IPS`（`oauth.py`）|
| 3 次失敗 → 15 分鐘鎖定、max 3 active sessions | platform OAuth 邏輯 + audit rows |
| Line 首次註冊 server-side `registration_ticket` | `oauth.py`（前端不再傳信任的 `provider_user_id`）|
| `oauth_links(provider, providerUserId)` 唯一約束 | `0004` migration（duplicate → `RAISE EXCEPTION`）|
| 完整審計 | `audit_logs`（registration_ticket / platform 登入 / recovery）|

**殘餘風險**：帳號恢復僅剩「另一社群綁定」；兩者皆失效須人工支援 → onboarding 必須引導使用者**綁第二個社群帳號**。

## Consequences

- (+) 免密碼管理、統一社群登入、降維護面與密碼重設攻擊面。
- (+) Line-first 對齊台灣餐飲業溝通現實。
- (−/accepted) 平台端防釣魚層級下降 + 第三方 OAuth 依賴上升（由上列緩解承接）。
- (G3, open) **真實 Line/Google provider callback smoke 未跑**（需 staging OAuth credentials + redirect URI `/auth/callback/{provider}`）→ pre-production gate，記於 `docs/governance/deprecation-roadmap.md` DR-006。
- (G4, caveat) T0.2 密碼帳號盤點僅在可存取的 `orderly-db-v2` 跑（`pw_only=0`）；若日後引入獨立 production DB 實例，**deploy 前須重跑** password-only count（連動 cutover runbook D-prod-1）。
- (G1/G2, 非本 ADR) repo-wide `type-check:full`（937 非 auth error）/ `shared/types` build（customer-hierarchy enum）為 pre-existing 非 auth debt，不阻 auth CI。

## Alternatives Considered

- **A：平台端保留獨立 Email+密碼+MFA**（只改餐廳/供應商端為社群）— rejected：維護兩套 auth、密碼重設攻擊面與流程負擔不變。
- **B：社群 only 但平台端不強制 MFA** — rejected：平台 admin 權限高，單一社群因素不足。
- **採用（本 ADR）：社群 only + 平台端強制 MFA + 供裝/IP/鎖定/審計緩解** — 取免密碼維護之利，以強制 MFA + 多層緩解承接平台端風險。

## Provenance

本 ADR 由 `orderly-doc-governance` harvest（2026-06-09）從已退役 plan packet `docs/plans/20260608-auth-line-google-login/` 升格（packet 標 `keep_until: 2026-06-15`，但 frontmatter `state: implementation_complete...` 經 §0 verify 屬實：實作已 merge 進 main，唯一 open 為 G3 外部 smoke → 不符 KEEP 條件，promote-then-delete）。實作 commit：`7b10f66`（feat: migrate auth to social login）、`0b274f4`（close auth local pr gate）、PR #12 `d68cdad`。需求 canonical：US-AUTH（`docs/1-User-Story/by-module/01-auth-user-management.md`）+ PRD-Auth-Module + technical-architecture-auth（已 synced）。審計軌：`docs/references/history/20260608-auth-line-google-login-harvest.md`。
