# Harvest Extraction Report — `20260607-backend-monolith-step4-9`

- **Harvest run**: orderly-doc-governance `harvest` mode, 2026-06-09
- **Target packet**: `docs/plans/20260607-backend-monolith-step4-9/`（run.md 306 行 + closure-run.md + deploy-readiness-and-orphan-findings.md + codex-review-1..2）
- **Disposition**: promote-then-delete (`rm -rf`) — default per plan-residency §Source Disposition Decision Tree rule 2
- **Machine evidence**: `.claude/.gov-harvest-evidence.json`

此 packet 是 backend 9→1 modular-monolith 遷移的 **STEP 4-9 canonical 收尾**（companion of step0-3）：結構性收斂（single Base / single alembic / single Cloud Run / migration 解耦）+ runtime acceptance（V1-V3）+ staging 部署 + production 擱置（6 owner 決策未決）。

---

## §0 Verification Evidence (Hard Rule #11)

每個 `applied / done / executed / verified` claim 對 current `main` HEAD（`065d876`）+ external state（`gcloud`）實證。**Zero drift。**

> **差點誤報**：初查 `ls` 看到 `backend/app/modules/gateway_compat/`、`backend/app/modules/*/alembic/`、`backend/*-fastapi/` 仍在 disk → 疑似 §10 cleanup 沒做。改用 `git ls-files` 證明這些**全 0 tracked** = 已 committed-deleted，disk 上只剩 gitignored `.pyc` / untracked venv 殼。**`ls` ≠ repo state；git ls-files 才是。** 無 P-PACKET-DRIFT。

| # | Claim | Target dim | Command | Output | Verdict |
|---|-------|-----------|---------|--------|---------|
| 1 | C1 gateway_compat removed | applied-claim | `git ls-files backend/app/modules/gateway_compat \| wc -l` | `0`（disk 僅 3 `.pyc`，0 source） | ✅ committed-deleted |
| 2 | §10 8 per-module alembic 鏈刪 (D4) | applied-claim | `git ls-files 'backend/app/modules/*/alembic/*' \| wc -l` | `0` | ✅ |
| 3 | §10 9 微服務殼刪 | applied-claim | `git ls-files 'backend/*-fastapi/*' \| wc -l` | `0`（disk 留 untracked 殼） | ✅ committed-deleted |
| 4 | committed module set | applied-claim | `git ls-files 'backend/app/modules/*' \| cut dir` | 8 svc（acceptance/billing/customer_hierarchy/notifications/orders/products/suppliers/users）+ composition files，無 gateway_compat | ✅ |
| 5 | scripts/deploy-cloud-run.sh retired | applied-claim | `ls scripts/deploy-cloud-run.sh` | not found | ✅ |
| 6 | D2 acceptances.orderId FK + 0003 migration | applied-claim | `ls .../0003_acceptance_order_fk.py` + `grep ForeignKey acceptance/models/acceptance.py` | migration 存在 + `fk_acceptances_order_id_orders` model FK | ✅ |
| 7 | commits bf4abc2/3de6c1e/5fd4e43/c63fc47 | commit-claim | `git log --oneline -1 <sha>` + `git merge-base --is-ancestor c63fc47 HEAD` | 全在 main（c63fc47 ancestor of HEAD via PR #7）| ✅ |
| 8 | orderly-db-v2 sole SQL instance | external-state | `gcloud sql instances list` | `orderly-db-v2 RUNNABLE`（唯一）| ✅ |
| 9 | orderly-db (prod target) absent | external-state | `gcloud sql instances describe orderly-db` | `HTTPError 404: instance does not exist` | ✅ |
| 10 | staging monolith + frontend deployed | external-state | `gcloud run services list` | `orderly-backend-staging-v2` + `orderly-frontend-staging-v2` 存在（另有 legacy `*-fastapi-staging-v2`）| ✅ |

**Drift detection**: none. No `P-PACKET-DRIFT`. 所有 repo-state + commit + external-state claim 一致。

---

## §1-2 Inventory + Classify (9-class)

| # | Durable knowledge | 9-class | Promotion target | Status |
|---|-------------------|---------|------------------|--------|
| 1 | STEP 4-9 結構：single Base、single monolith alembic 鏈（0001→0004）、gateway proxy 退役、loopback→in-process、single Dockerfile.monolith + single Cloud Run | `architectural-decision-frozen` | **ADR-0003 amend**（Decision pt5 + 子決策 D-deploy）| ✅ promoted |
| 2 | D1 integration_service partial in-process + accepted stub；D2 acceptances.orderId FK；D4 per-module 鏈 retire；D-deploy migration 與開機解耦 | `architectural-decision-frozen` (sub) | ADR-0003 §子決策 STEP 4-9 表 | ✅ folded |
| 3 | Production cutover 程序 + deploy 安全設計（migration 解耦、preflight orphan gate、ENVIRONMENT 傳遞、deploy ordering、deploy-consistency 守衛）+ staging 4 輪 CD 模板 | `operator-procedure` | **runbook** `docs/governance/runbooks/backend-monolith-production-cutover.md` | ✅ promoted |
| 4 | 6 個未決 production owner 決策（prod DB target / alembic stamp / 表共存 / backfill / backup / rollback）+ 已驗 infra（orderly-db 缺、orderly-db-v2 唯一、legacy services 並存）| `operator-procedure`（release-time decisions）| runbook §4-5 | ✅ promoted |
| 5 | D1 stub no-op、legacy staging/prod per-service Cloud Run 服務、cd.yml smoke `if:always` | `tech-debt-with-exit-trigger` | **deprecation-roadmap** DR-001..004 | ✅ promoted |
| 6 | re-root drift 部署空殼（22 COPY missing，守衛攔截）+ wrong completion claim | `incident-postmortem` | **incidents** `2026-06-08-monolith-reroot-drift.md` | ✅ promoted |
| 7 | frozen contract V3 runtime 驗證（7 條 curl 200 + middleware）；契約未變 | `wire-contract` | code = source of truth（unchanged）；V3 已關閉 step0-3 的「3 row 需 runtime 補證」缺口 | n/a |
| 8 | closeout（V1-R2 pass、D1-D4、staging 部署）| `closeout-summary` | **governance-ledger** | ✅ promoted |
| 9 | V1-R2 verification 逐步 log、codex rounds、11-blocker fix 細節（fix 已在 cd.yml）、plan task list | `transient-execution-state` | DELETE（git 保存）| ✅ |

## §3 Promote — done in this run

- ADR-0003 amended（STEP 4-9 結構 + D1/D2/D4/D-deploy 子決策 + Provenance 雙 packet）。
- runbook `backend-monolith-production-cutover.md` 新建（runbooks/ dir 首篇）。
- deprecation-roadmap DR-001..004 新增。
- incident `2026-06-08-monolith-reroot-drift.md` 新建 + incidents README ledger。
- governance-ledger closeout row 追加。

## §4 Rewrite References

- `docs/plans/README.md`：step4-9 row → retired pointer。
- 無 active-path orphan ref（驗證見 harvest run 末段 grep）。

## §5 Disposition

`rm -rf docs/plans/20260607-backend-monolith-step4-9/`。無 KEEP 條件：code done+merged、staging 部署、production 6 決策屬「等 deploy/owner sign-off」（plan-residency 明列**不算** KEEP）→ 已 promote 成 runbook（cutover onboarding doc）。git history 保存全檔。

## Note — local working-tree cruft（非 repo state）

disk 殘留已 git-deleted 的 `backend/*-fastapi/` 殼 + stale `.pyc`（gitignored）→ `git clean -fdx backend/` 候選（local-only，已記於 runbook §5），不在 doc-governance 升格範圍。
