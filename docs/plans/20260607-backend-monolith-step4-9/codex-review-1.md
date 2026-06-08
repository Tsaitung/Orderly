**Findings**

1. **V2 還沒有真正證明「含資料 DB 套 `0002` 安全」。**  
   `V2.1` 只跑 `monolith_fk_audit.sql`，`Verify V2` / `AC-V2` 卻宣稱可證明「`0002` 套真資料安全」。請在 `V2.1` 前明確要求同一個 `orderly` DB 處於 pre-`0002` 狀態，並在 orphan=0 後新增一步：對同一個含資料 DB 執行 `alembic ... upgrade head`，再驗 6 個 FK `convalidated=true`。若 D2 新增 FK migration，也要重跑 V1/V2 並更新 AC 的 FK 數量。

2. **V1 的「空 DB」gate 可能假通過。**  
   `V1.1` 用 `createdb ... _tmp_monolith_fresh || true`，如果上一輪留下已升級 DB，這會直接重用舊 DB，不能證明 `0001 create_all + 0002` fresh upgrade。請在 `V1.1` 前加一行 `dropdb --if-exists _tmp_monolith_fresh`，或改用唯一 temp DB 名。

3. **C2 / D3 teardown 契約不完整。**  
   `D3` 說預設 A 是「連同 deprecated `deploy.yml` 一起刪」，但 `C2.1` 只 `git rm backend/*-fastapi/Dockerfile backend/*-fastapi/cloudbuild.yaml`，沒有刪 `.github/workflows/deploy.yml`。另外目前還有 `compose.dev.yml`、`ci/service-manifest.yaml`、部分 scripts 參照 per-service Dockerfile/cloudbuild。請在 `C2.1` 加一個 bounded `rg` 殘留檢查，並要求每個 executable reference 要嘛更新到 monolith，要嘛在 D3=B 合法延後；若 D3=A，`.github/workflows/deploy.yml` 也要列入 File Structure / named-target table / `git rm`。

其餘邊界我認為合理：raw JOIN、prod Cloud Run deploy、`/ws/orders`、frontend contract 變更都已正確列為 out of scope；C3 對 legacy alembic chain 的 V1 gate + D4 合法延後條件也夠清楚。

VERDICT: REVISE