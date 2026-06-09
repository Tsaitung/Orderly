未發現 Round-1 fatal 仍開啟。Must-fix: 0。

C1 已關閉：計畫明確定義 `actor_user_id` + `effective_user_id`，授權與 current-user 使用 target 的 `role` / `permissions` / `organization_id`，audit 使用 actor + target，且禁止繼承 actor 的 `is_super_user` override。

C2 已關閉：`stop` 契約已明確要求 `terminate_session` + `blacklist_token(jti)`，舊 act-as token 後續 API 必須回 401/403，`current` 也要反映 active/expired/null。

Warnings: 無。剩餘風險只在實作與測試是否真的落實契約，不是計畫層 fatal。

VERDICT: APPROVED