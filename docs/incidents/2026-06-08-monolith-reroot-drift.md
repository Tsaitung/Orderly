# Incident: Monolith re-root drift — CD 將部署 8 個空殼微服務（部署前攔截）

- **Date**: 2026-06-08
- **Severity**: medium（near-miss / averted — 部署前由守衛攔下，未真 deploy、未影響 prod）
- **Modules affected**: 全 backend（部署層 `cd.yml` / `Dockerfile`）

## Timeline

1. STEP 2 re-root 把 `backend/<svc>-fastapi/app` 搬進 `backend/app/modules/<svc>/`（commit `64a81cd` 等），但 `cd.yml` 仍部署 8 個微服務、`docker build` 仍 `COPY ${SERVICE_PATH}/app`（舊路徑）。
2. ci.yml `backend-test` 當時為 advisory、且不 build image → drift 只會在 **CD build time** 現形，本機與 PR gate 都看不到。
3. 2026-06-08 production deploy 嘗試前的對抗稽核（multi-agent workflow `wf_799ee5af-fdb`，38 agents）裁定 **NO-GO direct-to-prod**（11 blockers）。
4. `scripts/ci/check-deploy-consistency.sh` 守衛實測 **22 條 `COPY` 路徑全 missing** → 攔下，未進 staging/prod。

## Root cause（實證）

re-root（＝舊路徑被刪除）對任何指向舊路徑的 build/deploy 引用，破壞性與刪檔相同。`cd.yml` 的 `COPY ${SERVICE_PATH}/app` 與 8-service deploy matrix 未隨 re-root 同步更新 → CD build 會 `COPY` 不存在的路徑、部署出空殼容器（migration 耦合開機時更會 abort-loop → Cloud Run 永不健康）。「目錄殼還在但 `app/` 內容被搬走」使人誤判「deploy 能用、低風險」，但 `docker build COPY` 仍會爆。

## Fix（commit / PR）

- 整合 commit `c63fc47`：11 blockers 全修（migration 與開機解耦、preflight orphan gate、`ENVIRONMENT` 傳遞、deploy-frontend ordering、守衛改 monolith-aware 驗 `backend/Dockerfile.monolith` COPY context）。
- 後續 `cd.yml` `ALL=["backend-monolith"]` 乾淨切換；ci.yml `backend-test` 收斂為單一 monolith job（9 紅 → 1 綠）。
- staging 4 輪 CD 真根因驗證全綠後部署完成（見 runbook §3）。

## Preventive actions

- **已升 global invariant**：`~/.claude/CLAUDE.md`「刪檔前查引用」規則經 RCA 加寬涵蓋 **move / rename / re-root**（搬檔對引用破壞性同刪檔）、grep 範圍加 `Dockerfile*` / `compose*` / `workflows` / `COPY`、收緊「done」定義、明訂「目錄存在 ≠ build context 完整」。
- **已升 runbook**：部署架構安全設計（migration 解耦、preflight orphan gate、deploy-consistency 守衛）→ `docs/governance/runbooks/backend-monolith-production-cutover.md` §2。
- **已升 ADR**：monolith 結構決策 → [ADR-0003](../adr/ADR-0003-backend-modular-monolith-consolidation.md)。

> Provenance：本 incident 由 harvest（2026-06-09）從退役 packet `20260607-backend-monolith-step4-9/deploy-readiness-and-orphan-findings.md` §1-2 升格。
