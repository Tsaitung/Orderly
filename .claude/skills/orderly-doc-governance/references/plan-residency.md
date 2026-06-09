# Plan Residency

處理 Orderly 一般 plan packet（`docs/plans/{date}-*/`）的「放哪裡、怎麼升格、何時刪」。

這份 reference 專門解決三個問題：

1. plan packet 預設不應長期 active；durable knowledge 必須 promote 到 canonical home，而不是長住 packet
2. 沒有明確 owner 的 code / architectural / naming / debt / ops 決策，不能只留在 plan packet / handoff / run log
3. harvest 不能只看「KEEP / DELETE」二選一，必須先列 promotion target，KEEP 是例外不是預設

> **Provenance**：本檔對齊 sibling repo `helloglow-doc-governance` 的 `plan-residency.md` rules（自該 skill 移植）。該規則嚴於早期 stage-gates.md 的 Source Disposition 表；衝突時以本檔為準（per Orderly SKILL.md Hard Rule #9 Plan Packet KEEP-Only-If-Active-Development）。這是 preventive rule，不是 Orderly 既有事故紀錄。

## Knowledge Classes

每一條 durable knowledge 都必須被 classify 成下列其中一類：

| 類型 | 說明 | Orderly 落點 |
|------|------|------|
| `naming-canonical` | 專案代號 / service name / route / domain / package / table 命名規則 | `docs/references/canonical-vocabulary.md` 或 `docs/references/doc-governance-vocabulary.yaml`；缺對應 home 時建議新建 `docs/references/canonical-vocabulary.md`（on demand；Orderly 尚未建立）|
| `architectural-decision-frozen` | 架構抉擇（凍結後）— 例：authority chain 變更、cross-module pattern、storage backend、auth model | `docs/adr/ADR-NNN-*.md`（NNN = 既有最大流水號 + 1）|
| `tech-debt-with-exit-trigger` | legacy code / workaround / deprecated surface + 明確 exit trigger | `docs/governance/deprecation-roadmap.md` 或 `docs/3-Development-Plan/todo.md`（Orderly 無專屬 legacy-debt-ledger；4 種 disposition：execute-now / defer-once / permanent-compatibility / retire）|
| `operator-procedure` | 部署 rollout / migration / incident response 步驟 | `docs/governance/runbooks/*.md` |
| `incident-postmortem` | 故障還原、根因、修復後保留的 historical evidence | `docs/incidents/{YYYY-MM-DD}-{slug}.md` |
| `business-requirement` | 新 / 變更的 US / FR / Spec 條款 | `docs/1-User-Story/by-module/NN-*.md` + `docs/2-PRD/PRD-*.md` + `docs/0-Design/*.md`（**禁止本 skill 直接寫**；走 `us-edit` skill handoff）|
| `wire-contract` | API / DTO / event payload schema | `backend/app/modules/<svc>/` + `shared/types/` + `docs/0-Design/api-specification.yaml`（backend code 是 source of truth；OpenAPI derived 由 `api-specification.yaml` 同步）|
| `closeout-summary` | run 結束後的單條紀要（誰、何時、結果、PR / commit）| `docs/governance/governance-ledger.md` |
| `transient-execution-state` | plan / handoff / dev-reference / run log / interim matrices / scratch evidence | DELETE（promote 完畢後直接移除）|

> 這 9 類取代 `project-paths.md` 的舊「Knowledge Ownership Types」5 類粗分類。舊分類保留作為 broader category（broader 5 類見 `project-paths.md` §Broader Categories (Legacy 5-class)）。

## KEEP Conditions（packet 不刪的唯一例外）

Plan packet 的 default disposition 是 **promote-then-delete**。僅在下列**任一**條件成立時，才允許 KEEP：

1. **Active code development**：scope 內仍有未完成的 code/test work（不是 deploy、不是 sign-off、不是 observe、不是 operator E2E）
2. **Active decision packet**：scope 含未決的設計意圖衝突，且使用者已被通知尚未裁決
3. **Live cross-session handoff**：當前 implementation owner 將在 ≤ 7 天內接手執行，且 packet 是其 onboarding 文件

下列**不算** KEEP 條件（必須 promote-then-delete）：

| 看似 active 但實際應 promote 的狀態 | 應走的 promotion path |
|------------------------------------|---------------------|
| 「等 production deploy / dispatch」 | runbook + ledger entry |
| 「等 operator real-env E2E smoke」 | runbook + ledger entry |
| 「等 7-day observability baseline」 | runbook + ledger entry（observe 結果回填）|
| 「等 Ops / PO sign-off」 | ADR or runbook + ledger entry |
| 「等 replacement fixture data 決策」 | ADR or deprecation-roadmap（disposition = defer-once）|
| 「等其他 packet 收斂後再回頭」 | deprecation-roadmap（disposition = defer-once）+ 刪除本 packet |
| 「文件量大、刪掉怕資訊流失」 | run log → 摘要至 ledger entry，原文若需保留改放 incidents/ |

> **Rationale**：KEEP 訊號必須是「code 還沒寫完」，不是「外部 actor 還沒動作」。後者屬於 operator workflow，runbook + ledger 已足以承接，不需要 packet 長存。

## Owner Fallback

若 durable knowledge 沒有單一明確 owner：

- 先判斷它最接近哪一類 Knowledge Class
- 找不到對應類別 → 升格成 `architectural-decision-frozen`，存進新 ADR
- 不要把它留在：
  - `plan.md` 的 §Frozen Decisions
  - `handoff.md` 的 Current truth
  - `run.md` 的某一段
  - `dev-reference-*.md`
  - `compact.md`

每個 packet 在 closeout 時，**`§Frozen Decisions / Frozen Architecture / Risk Register / Ownership Matrix` 必須被分散到上述 9 類落點**，這幾個 section 不能跟 packet 一起被刪卻沒有承接 home。

## Harvest Algorithm

### Step 0. Verify Plan Claims（per Orderly SKILL.md Hard Rule #11）

Plan packet 內所有「applied / complete / executed / verified」claim 都是 **AI 生成的二手描述**，不是 source of truth。在 Step 1 Inventory 前必須**逐筆對 repo 當前 state 實證**。違反 → `P-PACKET-DRIFT`。

> **Provenance**：本步驟移植自 sibling repo `helloglow-doc-governance`，該 failure mode（不經 grep / git / ls 驗證就採信 plan-packet 的文字 claim）在該 repo 同一 session 內重複發生。移植到 Orderly 作為 preventive rule，不是 Orderly 既有事故紀錄。

#### 0.1 Applied Items 實證

對 packet 內 `Primary doc write set (applied)` / `Runtime implementation (applied)` / `Derived surfaces (applied)` 列的每個檔案：

- 檔案存在（`ls path/to/file`）
- 內容含預期 marker（`grep` 對應 FR ID / spec section / API endpoint / variable name / table column）
- 若 packet 列「FR-05-003 added」→ `grep -r "FR-05-003" docs/` 命中（示意：以實際 FR id 為準）
- 若 packet 列「`reconciliation_status` schema added」→ `grep "reconciliation_status" backend/app/modules/billing/models/`（示意：以實際欄位 / 服務為準）

#### 0.2 Frozen Decisions Cross-Ref Canonical Home

對 packet 內 `Frozen Decisions` 列的每條決策：

- 找 canonical home（依 §Knowledge Classes 9-class routing）
- grep canonical home 確認決策內容已落地
- 任何決策無 canonical home → 觸發 `P-OWNERLESS-DECISION`（per SKILL.md Hard Rule #8）

#### 0.3 Verification Truth Claims 對 Repo 當前 State

對 packet 內 `Verification Truth` 列的數字 / hash / commit SHA：

- migration head：`cd backend/app && python3.11 -m alembic heads` 跟 packet 列的一致（示意：以實際受影響的 `backend/app/modules/<svc>` 為準）
- commit SHA：`git log --oneline -50 | grep <SHA>` 找得到（含被 squash merged 的 PR commit）
- 「N tests pass」claim：若 packet 落筆超過 7 天 → 標 stale，重跑驗證或標註「stale-but-recorded」

#### 0.4 Drift Detection

任一 §0.1 / §0.2 / §0.3 verification 失敗 → 觸發 `P-PACKET-DRIFT`：

- packet claim 跟 repo state 不一致 = drift
- **不 default 到 promote-then-delete**
- 停下，輸出 drift report：哪些 claim 沒 verify 過、可能原因（partial implementation / packet stale / commit pending / PR not merged / branch divergence）
- 等 user 判斷：(a) 補做 missing items、(b) 撤回 claim 並縮小 scope、(c) explicit override 強制繼續（必須在 ledger entry 註明 override reason + verification gap）

#### 0.5 Verification Evidence Logged

verification 結果**必須持久化**到 harvest extraction-report 內 `§0 Verification Evidence` section：每筆 claim 對應實證命令（`grep` / `ls` / `git log`）+ 輸出摘要。不能只「在對話中 verify 過」而不留 trace —— 下一個 session 看不到對話。

### Step 1. Inventory

列出 target packet 內每個可持久知識點，**不只列檔名**：

- naming canonical（路由、service、domain、bucket、enum value、table 命名）
- architectural decision（auth model、storage backend、FK semantics、retry policy）
- tech debt（legacy code、deprecated surface、workaround）
- operator procedure（migration step、deploy dispatch、rollback、smoke checklist）
- incident evidence（root cause、repair script、observation）
- business requirement（新 / 變更 US / FR / Spec）
- wire contract（API、DTO、event payload）
- closeout summary
- transient state（log、interim matrix、scratch）

### Step 2. Classify

每一項都要被標成上面 9 類之一。

不能只說：

- 「這是 plan.md」
- 「這是 handoff」
- 「這是 run log」

那只是檔案形態，不是知識類型。

### Step 3. Promote

對每個 durable item 做 promotion，**寫入動作必須在本次 governance run 落地**（不是「建議使用者去做」）：

- naming canonical → patch `docs/references/canonical-vocabulary.md` 或 `docs/references/doc-governance-vocabulary.yaml`
- architectural decision → 新建 `docs/adr/ADR-NNN-*.md`（流水號 = 既有最大 + 1）
- tech debt → append 列至 `docs/governance/deprecation-roadmap.md` 或 `docs/3-Development-Plan/todo.md`（需 disposition + exit trigger）
- operator procedure → 新建或更新 `docs/governance/runbooks/*.md`
- incident postmortem → 新建 `docs/incidents/{YYYY-MM-DD}-{slug}.md`
- business requirement → **不直接寫**；輸出 `us-edit` handoff brief 給使用者，明列要動哪幾條 US / FR / Spec
- wire contract → 確認 `backend/app/modules/<svc>/` code 已是 source of truth，跑 OpenAPI 同步 derived（`docs/0-Design/api-specification.yaml`）
- closeout summary → append 一條 entry 至 `docs/governance/governance-ledger.md`
- transient state → 不 promote，直接 delete

### Step 4. Rewrite References

promotion 完後必做：

- grep repo 對 packet folder 的所有引用（含其他 plan / docs / code / skill references）
- 改指向新 canonical home（canonical-vocabulary / ADR / deprecation-roadmap / runbook / incident / ledger entry）
- 若 skill 自己的 references 仍引用該 packet，也一起改
- generated 檔（navigation index / derived surfaces）由下次 regen 自動更新，不手改

### Step 5. Delete Or KEEP

只在下面條件成立時 KEEP：

1. 通過上面 §KEEP Conditions 任一條件
2. KEEP 必須在 ledger entry 中明示 reason + 預計 KEEP-until 日期（不超過 14 天，逾期觸發 `P-PACKET-STALE`）

否則一律刪除：

```bash
rm -rf docs/plans/{date}-{slug}/
```

刪除前必驗證：

- repo 內無 orphan refs（grep 0 hits 在 active paths；`docs/references/history/` 與 `docs/governance/governance-ledger.md` 內的 historical-narrative residues 不算 orphan）
- durable knowledge 已升格（每個 inventory item 對應 promotion target 已寫入）
- ledger entry 已 append

## Source Disposition Decision Tree

替代既有 `stage-gates.md` 的 Source Disposition 表。優先序（從上往下）：

1. **KEEP Conditions 任一成立** → KEEP（含 14 天 expiry）
2. **全部 sections 都已 promote / absorb+delete + 無 historical-evidence 留存價值** → `rm -rf`（**default**）
3. **Reference + historical-only authority header**（明示為歷史檔）→ `git mv` 到 `docs/references/history/`
4. **Closed parent run + companion artifacts**（如 extraction-report 是另一個 closed run 的 byproduct，需保留 audit trail）→ `git mv` 到 `docs/references/history/{parent-run-id}/`

> **archive-to-history（規則 3、4）是 exception，不是 default**。Default 是 `rm -rf`。

## Red Flags

出現以下情況，代表 plan residency 還沒收乾淨：

- packet 已開超過 14 天且 status 仍 active，但 scope 內無 code commit
- harvest 結論連續兩輪都是 KEEP，但 promotion target 始終沒被更新
- 同一決策在 2+ packet / handoff / dev-reference 間互相引用，沒有任一 canonical home
- packet 內 `§Frozen Decisions` 條目超過 5 條，沒有任一條 promote 到 ADR
- run.md 行數 > 1500，但 ledger entry 對其 closeout 只有一行籠統摘要
- 「等 deploy」「等 sign-off」「等 observe」被當成 KEEP 理由
- naming / route / surface 改動只進 packet，沒同步 `docs/references/canonical-vocabulary.md`
- legacy code mention 出現在 packet 但未進 `docs/governance/deprecation-roadmap.md`
- ADR-worthy 決策（auth model / storage backend / cross-cutting policy）寫在 plan.md `§Frozen Decisions` 而沒進 `docs/adr/`
- 「外部平台限制」被誤當成 ADR-worthy 決策（外部限制走 spec / runbook，不是 ADR；ADR 必須有真正 trade-off 結構：「我們選 X 而非 Y，因為 Z」）

## Expected Outputs

做完一次 plan packet harvest 後，至少要有：

- 對 packet 內每條 durable knowledge 的 classify table（9 類對應）
- 每條對應的 promotion target 路徑（已實際寫入，不是 TODO）
- updated references（grep 0 orphan hits 在 active paths）
- ledger entry 一行（含 promotion target 摘要）
- 明確 delete / KEEP 決定 + KEEP 的話要有 KEEP-until 日期

## Cross-Reference

- 5-layer truth chain（US / PRD / Specs / API / ADR）對齊走 `authority-chain.md`
- 跨 plan packet 的 cardinality 檢查走 `stage-gates.md` Stage 2
- Orderly paths / artifact roles 走 `project-paths.md`
- ADR 流水號規則走 `adr-schema.md`
