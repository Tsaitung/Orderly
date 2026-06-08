**Findings**

1. HIGH: 平台供裝 allowlist 只有 model 計畫，沒有 DB/API 落點。Plan 在 `Complexity Budget` 命名 `POST /auth/admin/platform-provisioning`，T2.4 只說建立 `models/platform_provisioning.py`；但 T3.1 的 0004 只處理 enum、email、reset 欄位、`password_history`，沒有 `op.create_table`。目前 repo 也沒有既有表或 endpoint。這會讓平台 allowlist 查詢/管理在實作後直接壞掉。請在 T3.1 補 create/drop table，並在 T2.4 指定最小 admin route 落點。

2. HIGH: OAuth 主登入路徑合約未閉合。Plan T2.1/T2.2 要強化 `oauth.py`，但現有 SQL 用 `oauth_links.user_id/provider_user_id/created_at`；實際 model 是 `userId/providerUserId/createdAt`（[oauth.py](/Users/leeyude/Projects/_worktrees/Tsaitung-Orderly-72d17797/refactor-login/backend/app/modules/users/api/v1/oauth.py:212)、[oauth_link.py](/Users/leeyude/Projects/_worktrees/Tsaitung-Orderly-72d17797/refactor-login/backend/app/modules/users/models/oauth_link.py:20)）。同時 T4.1 說 CTA 導向 `/api/auth/oauth/{provider}/initiate`，但 Next 只有 `/api/auth/login|register|refresh|me|logout`，且沒有 `/auth/callback/line|google` page；backend default redirect URI 正是這些 frontend callback paths。請把 T2.1/T2.2 明確改成 ORM 或 quoted camelCase columns，並在 T4.1 補同源 OAuth initiate/callback proxy/handler；也要明確寫入「Line 可首次註冊、Google 未綁定拒登」。

3. HIGH: email+password registration 仍有公開路徑未移除。Plan `In Scope` 命名移除 `POST /auth/register`，但 `Complexity Budget` 的移除端點未列它，T2.3 也沒有移除 `registration_router` 或 `public_auth_paths` 的 `/auth/register`/`/api/auth/register`。Frontend proxy [app/api/auth/register/route.ts](/Users/leeyude/Projects/_worktrees/Tsaitung-Orderly-72d17797/refactor-login/app/api/auth/register/route.ts:5) 仍要求 `email/password` 並呼叫 `AuthService.register()`。請把 backend `/auth/register` 與 Next `/api/auth/register` 明確 delete/410，或改成不建立帳號的社群導流端點。

我沒有把 `invitations.py` 的 password onboarding 升為 must-fix，因為它目前未被 `users/main.py` mount；但若 T4.3 要保留 supplier onboarding API，backend schema 也要跟 `shared/types/src/supplier.ts` 一起去 password。

VERDICT: REVISE