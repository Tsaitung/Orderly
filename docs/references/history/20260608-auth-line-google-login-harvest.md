# Harvest Extraction Report — `20260608-auth-line-google-login`

- **Harvest run**: orderly-doc-governance `harvest` mode, 2026-06-09
- **Target packet**: `docs/plans/20260608-auth-line-google-login/`（run.md + handoff.md + implementation-plan.md + tasks.md + diff-manifest.md + codex-review-1..2）
- **Disposition**: promote-then-delete (`rm -rf`)
- **Machine evidence**: `.claude/.gov-harvest-evidence.json`

全平台登入改社群 only（Line 主/Google 次、廢密碼、Email→財務對帳、平台社群+強制 MFA）+ US-AUTH-022 帳號恢復。**docs sync + implementation 皆已完成並 merge 進 main**（PR #12 `d68cdad`）。

> **State note**：`docs/plans/README.md` 標 `ready_for_implementation` 為 **stale**；packet frontmatter `state: implementation_complete_auth_scope_and_local_pr_gate_verified` 經 §0 verify 屬實。`keep_until: 2026-06-15` 不適用（唯一 open = G3 外部 smoke，等 staging creds，per plan-residency 不算 KEEP）。

---

## §0 Verification Evidence (Hard Rule #11)

每個 claim 對 current `main` HEAD（`065d876`）實證。**Zero drift。**

| # | Claim | Target dim | Command | Output | Verdict |
|---|-------|-----------|---------|--------|---------|
| 1 | 密碼 files 刪除（login/password/registration/password_service/password_history）| applied-claim | `git ls-files \| grep -E 'login\|password\|registration\.py\|password_service\|password_history'` | 0 tracked（committed-deleted）| ✅ |
| 2 | social-only auth 模組存在 | applied-claim | `git ls-files modules/users/api/v1/auth/` | recovery.py / platform_provisioning.py / token.py / verification.py / admin.py / core.py | ✅ |
| 3 | 0004 migration | migration-claim | `git ls-files \| grep 0004_auth_refactor_social_only` | 存在 | ✅ |
| 4 | 密碼登入 route 移除 | applied-claim | `grep api/auth/login/route\|/api/auth/password src/app/api/auth/` | 0 | ✅ |
| 5 | US-AUTH-022 added + US-AUTH-004 deprecated | applied-claim | `grep US-AUTH-022/004 docs/1-User-Story/by-module/01-auth-user-management.md` | US-022 line198 added、US-004 line79+84 deprecated | ✅ |
| 6 | PRD/Specs synced | applied-claim | `ls + grep docs/2-PRD/PRD-Auth-Module.md docs/0-Design/technical-architecture-auth.md` | 存在 + mention social/Line | ✅ |
| 7 | commits on main | commit-claim | `git log --oneline -1 d68cdad 7b10f66 0b274f4 336e3b3` | 全在 main（PR #12 merge）| ✅ |
| 8 | platform 安全緩解為 real code（非文件宣稱）| verification-truth | `grep PLATFORM_AUTH_ALLOWED_IPS / registration_ticket oauth.py; grep providerUserId 0004` | IP allowlist + server-side ticket + oauth_links 唯一約束（dup→RAISE EXCEPTION）皆在 code | ✅ |
| 9 | 無既有 auth ADR（決策 ownerless）| external-state | `ls docs/adr/ \| grep auth` | none → 必 promote ADR-0004 | ✅（ownerless 確認）|

**Drift detection**: none. No `P-PACKET-DRIFT`。codex-review-2 = APPROVED（must-fix none）。

---

## §1-2 Inventory + Classify (9-class)

| # | Durable knowledge | 9-class | Promotion target | Status |
|---|-------------------|---------|------------------|--------|
| 1 | 社群 only 登入模型 + 平台端安全 trade-off（刻意降防釣魚等級，使用者拍板，附緩解）| `architectural-decision-frozen`（risk-acceptance）| **ADR-0004**（新；ownerless→re-home per Hard Rule #8）| ✅ promoted |
| 2 | 4 項使用者決策（Google 次要 / 平台社群+MFA / 廢密碼 / Email→財務）| `business-requirement` + 決策 | US-AUTH/PRD 已 canonical synced；決策脈絡入 ADR-0004 §Decision | ✅（req homed + ADR）|
| 3 | US/PRD/Specs/Test/INDEX 同步（US-AUTH-001..022、PRD §、AUTH 22/106）| `business-requirement` | **已 homed** on main（diff-manifest 是 transient 記錄）| n/a（已 canonical）|
| 4 | G3 真實 Line/Google provider callback smoke（等 staging creds）| `tech-debt-with-exit-trigger` | **deprecation-roadmap DR-006** | ✅ promoted |
| 5 | G4 prod-DB password-only re-count caveat | `tech-debt-with-exit-trigger` | DR-006 + ADR-0004 Consequences（連動 cutover runbook D-prod-1）| ✅ promoted |
| 6 | Makefile runner-drift 修（compose.base+dev / TEST_PG_ADMIN_DSN / python selector）| code | Makefile = source of truth（已在 main）；lesson 已全域 CLAUDE.md | n/a（code truth）|
| 7 | execution log / 2 codex rounds / 2 independent audits / tasks / implementation-plan / diff-manifest | `transient-execution-state` | DELETE（git 保存）| ✅ |
| 8 | closeout | `closeout-summary` | **governance-ledger** | ✅ promoted |

## §3-4 Promote + Rewrite References

- **ADR-0004**（risk-acceptance，auth social-only + 安全 trade-off）+ ADR README ledger（含 Review By 2026-12-09）。
- deprecation-roadmap **DR-006**（G3 OAuth smoke + G4 prod caveat）。
- governance-ledger closeout row。
- `docs/plans/README.md`：auth row → retired pointer。

## §5 Disposition

`rm -rf docs/plans/20260608-auth-line-google-login/`。`keep_until: 2026-06-15` 標記**不適用**——implementation 已 complete + merged + CI-green，唯一 open（G3 外部 provider smoke）等 staging creds = plan-residency 明列「等 operator E2E / 等 sign-off」**不算 KEEP**，已 promote 成 DR-006。安全決策已先 home 至 ADR-0004（防 ownerless）。git history 保存全檔（含 G3 resume prompt）。

## Note — stale state in deleted packet

packet frontmatter `governance_gate: not-applicable（repo 無 .claude/skills/）` 為 stale（repo 現有 orderly-doc-governance skill）；隨 packet 一併刪除，無影響。README 的 `ready_for_implementation` 標籤已由本 harvest 移除（retired pointer 取代）。
