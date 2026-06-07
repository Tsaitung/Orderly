**Must-Fix Findings**
1. C1 仍有殘留錯路徑：雖然 T0.1/T0.2 已改成 `backend/libs/pyproject.toml`，但 [Complexity Budget](/tmp/claude-plan-c333a2d5.md:50)、[STEP 0 Files](/tmp/claude-plan-c333a2d5.md:91)、[T0.7 git add](/tmp/claude-plan-c333a2d5.md:113) 仍寫 `backend/libs/orderly_fastapi_core/pyproject.toml`。這會把實作帶回 Round 1 的錯 layout。

2. C2 主修正已在 T3.3b / D-gw 寫對，但仍有衝突文字：[gateway_compat file row](/tmp/claude-plan-c333a2d5.md:76)、[服務對照表](/tmp/claude-plan-c333a2d5.md:188)、[R4](/tmp/claude-plan-c333a2d5.md:308) 仍暗示 gateway_compat 保留無前綴 alias。需統一成：`gateway_compat` 只貢獻 middleware；無前綴 alias 只由 composition root dual-mount 真實 routers 達成；不得註冊 `_proxy` / catch-all。

3. C3 還沒完全清掉：[AC3](/tmp/claude-plan-c333a2d5.md:328) 仍寫 frozen contract 含 `/ws/orders`。這和 Out of Scope 與 WebSocket 註相衝突，也會破壞「新 endpoint: 0」。把 `/ws/orders` 從 AC3 移除，並同步修正 contract 條數。

我沒有把其他新問題升級成 fatal。Repo grep 也支持你對 WebSocket 的事實判斷：frontend 有 `/ws/orders` client，但 backend 沒有 FastAPI WebSocket handler。

VERDICT: REVISE