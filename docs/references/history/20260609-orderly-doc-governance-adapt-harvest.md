# Harvest Extraction Report — `20260609-orderly-doc-governance-adapt`

- **Harvest run**: orderly-doc-governance `harvest` mode, 2026-06-09
- **Target packet**: `docs/plans/20260609-orderly-doc-governance-adapt/`（run.md 444 + handoff.md 63 + codex-review-1..2）
- **Disposition**: promote-then-delete (`rm -rf`)
- **Machine evidence**: `.claude/.gov-harvest-evidence.json`

**Meta packet**：把 `orderly-doc-governance` skill 從 stale branch 移植到 main 的編號 taxonomy + modular-monolith 佈局（Class A/B/C re-point）、建 canonical homes、改寫 ADR-0001、建 ADR-0002、註冊 3 hooks。**這是本 session 正在執行的 skill 本身的 build 紀錄。** 已 merge via PR #14（= current HEAD `065d876`）。

> **自我參照特性**：此 harvest 由該 packet 所建的 skill + hooks 執行——harvest-evidence-gate 本 session 實際 gate 過前 4 個 packet 的 `rm`。durable 產物全部在線。

---

## §0 Verification Evidence (Hard Rule #11)

每個 build claim 對 current `main` HEAD（`065d876`）實證。**Zero drift。**

| # | Claim | Target dim | Command | Output | Verdict |
|---|-------|-----------|---------|--------|---------|
| 1 | skill 20 files on main | applied-claim | `git ls-files '.claude/skills/orderly-doc-governance/*' \| wc -l` | `20` | ✅ |
| 2 | 3 hooks + settings.json 註冊 | applied-claim | `git ls-files .claude/hooks + jq '.hooks\|keys' .claude/settings.json` | 3 hook .sh + settings.json keys = PreToolUse/PostToolUse/Stop | ✅（本 session hooks 實際 fire）|
| 3 | ADR-0001 改寫（無 stale flat-rename assert）| applied-claim | `grep -cE 'system-spec\|settings\.local\.json\|228 處' docs/adr/ADR-0001-*.md` | `0` | ✅ |
| 4 | Class A/C dangling refs = 0（DONE oracle）| verification-truth | `grep -rn 'docs/system-spec\|...' + '\-fastapi' .claude/skills/orderly-doc-governance .claude/hooks` | 0（Class C `-fastapi` 空、Class A 僅 HelloGlow sibling 敘述）| ✅ |
| 5 | canonical homes 存在 | applied-claim | `test -e docs/{governance,references,incidents,adr}, business-invariants.md, governance-ledger.md` | 全 ✓ | ✅ |
| 6 | INDEX governance section | applied-claim | `grep -c governance/adr/business-invariants docs/INDEX.md` | `6` | ✅ |
| 7 | PR #14 merged = HEAD | commit-claim | `git merge-base --is-ancestor 065d876 HEAD` + `git log 21e82c8/7c84319/de2ea63` | PR#14 = HEAD；extract/register-hooks/record-verification commits 全在 main | ✅ |
| 8 | adapt run 未在 ledger（closeout gap）| external-state | `grep -c orderly-doc-governance-adapt docs/governance/governance-ledger.md` | `0` → 需 closeout entry | ✅（gap 確認）|
| 9 | 06-06 ledger entry dangling ref | external-state | `ls docs/plans/health-check-2026-06-06.md` | ABSENT（artifact 未 ported）→ ledger 修正 | ✅（drift 確認）|

**Drift detection**: packet 內容無 drift（build 全 applied）。附帶發現 canonical ledger 06-06 entry 有 dangling health-check ref（非 packet claim drift，是 ported 歷史 entry 的 accuracy issue）→ 編 ledger 時順修。codex-review-2 = APPROVED。

---

## §1-2 Inventory + Classify (9-class)

| # | Durable knowledge | 9-class | Promotion target | Status |
|---|-------------------|---------|------------------|--------|
| 1 | 保留編號 taxonomy + port skill + 註冊 hooks + 全域 doc-governance 降 router 的決策 | `architectural-decision-frozen` | **ADR-0001**（已 canonical，本 packet 改寫之）| ✅ 已 homed |
| 2 | hybrid gcp identity 決策 | `architectural-decision-frozen` | **ADR-0002**（已 canonical）| ✅ 已 homed |
| 3 | skill（20 files）+ 3 hooks + canonical homes（governance/references/incidents/adr/ledger/business-invariants）| 治理 capability（code/config）| 已在 `.claude/` + `docs/` on main | ✅ 已 in-place |
| 4 | Class A/B/C re-point mechanics、grep oracle、checkout 程序 | `transient-execution-state` | git history（9 commits）| ✅ delete |
| 5 | adapt run closeout | `closeout-summary` | **governance-ledger**（新 entry）| ✅ promoted |
| 6 | execution log / 2 codex rounds / task list / handoff | `transient-execution-state` | DELETE（git 保存）| ✅ |

## §3-4 Promote + Rewrite References

- governance-ledger：新增 adapt-run closeout row + 順修 06-06 entry 的 dangling `health-check-2026-06-06.md` ref（artifact 未 ported 到 main）。
- `docs/plans/README.md`：加入退役 pointer（此 packet 原不在 active table，屬 build/treatment run）。

## §5 Disposition

`rm -rf docs/plans/20260609-orderly-doc-governance-adapt/`。無 KEEP：build 完成 + merged（PR#14=HEAD）、D-1 已決、Task 9 PR 已 merge（handoff「Next Exact Step: Task 1」為內部 stale，與底部「implementation complete」矛盾，以後者+repo state 為準）。durable 產物全在線（skill 正在被本 harvest 使用）。git history 保存全檔。

## Note — self-referential harvest

此 packet 建的 skill 正在執行其自身的 harvest。skill / hooks / canonical homes 全部 live（harvest-evidence-gate 本 session gate 過 5 個 rm）。刪 packet 不影響 capability——capability 在 `.claude/` + `docs/`，非在 packet。
