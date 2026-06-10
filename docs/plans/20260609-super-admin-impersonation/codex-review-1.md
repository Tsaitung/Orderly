**Findings**
1. **`§技術選型確認` / `T2.3 authz 化身`：`sub` 與 effective identity contract 不夠明確。**  
   Plan 說 authorization 仍用 `sub`，但也要用目標 `role/permissions/organization_id`。需補一句定義：act-as token/auth context 必須同時保留 `actor_user_id` 與 `effective_user_id/impersonated_user_id`；業務授權與 current-user 行為使用 effective target，audit 使用 actor+target，且不得從 actor 的 `is_super_user` 套用 override。否則容易讓 super_admin 權限或錯誤 user id 漏進下游。

2. **`T2.1 start/stop/current` / `T3.2 一鍵退出`：stop 的失效契約未關閉。**  
   目前提到 SessionService 與 TTL，但驗收沒有明確要求 stop 後舊 act-as token 立即不可用。建議在 `T2.1` 加一行：stop 必須 terminate Redis impersonation session 並 blacklist/jti，使同一 act-as token 之後呼叫 API 回 401/403；current 也必須依 session active/expired 狀態回應。

除此之外，plan 對 frozen decisions 的落地方向是合理的：target role/permissions、effective tenant=`organization_id`、audit 複用既有欄位都已覆蓋；跨租戶隔離與 super_user override 也有對應測試方向。

VERDICT: REVISE