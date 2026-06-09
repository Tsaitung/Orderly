# Plans — Active Plan Packets

> 各 packet 為開發前的設計完成交付物（design completion packet）。KEEP-until 到期須重新驗證或退役。

| Packet | 主題 | 狀態 | KEEP-until | 入口 |
|--------|------|------|------------|------|
| [20260609-super-admin-impersonation](./20260609-super-admin-impersonation/) | Super Admin 帳號模擬登入（act-as 化身目標角色）+ 角色切換 | ready_for_implementation（Round-6 rework passed；runtime unimplemented）| 2026-06-16 | [run](./20260609-super-admin-impersonation/run.md) · [handoff](./20260609-super-admin-impersonation/handoff.md) |

> 已退役（2026-06-09 harvest，promote-then-delete）：
> - `20260607-backend-monolith-step0-3/` → [ADR-0003](../adr/ADR-0003-backend-modular-monolith-consolidation.md)；審計軌 `docs/references/history/20260607-backend-monolith-step0-3-harvest.md`
> - `20260607-backend-monolith-step4-9/` → [ADR-0003](../adr/ADR-0003-backend-modular-monolith-consolidation.md) + [cutover runbook](../governance/runbooks/backend-monolith-production-cutover.md) + [deprecation-roadmap](../governance/deprecation-roadmap.md) DR-001..004 + [incident](../incidents/2026-06-08-monolith-reroot-drift.md)；審計軌 `docs/references/history/20260607-backend-monolith-step4-9-harvest.md`
> - `20260607-public-pages-redesign/` → [competitive-analysis](../0-Design/competitive-analysis-cocomart.md) §9 R1-R7 backlog + [deprecation-roadmap](../governance/deprecation-roadmap.md) DR-005；審計軌 `docs/references/history/20260607-public-pages-redesign-harvest.md`
> - `20260608-auth-line-google-login/` → [ADR-0004](../adr/ADR-0004-auth-social-only-login-model.md)（risk-acceptance）+ [deprecation-roadmap](../governance/deprecation-roadmap.md) DR-006（G3/G4）；需求 canonical = US-AUTH/PRD-Auth-Module；審計軌 `docs/references/history/20260608-auth-line-google-login-harvest.md`
> - `20260609-orderly-doc-governance-adapt/`（skill build run）→ [ADR-0001](../adr/ADR-0001-docs-structure-and-governance-alignment.md) + [ADR-0002](../adr/ADR-0002-hybrid-gcp-identity.md)；capability 已在 `.claude/skills/` + `.claude/hooks/`；審計軌 `docs/references/history/20260609-orderly-doc-governance-adapt-harvest.md`
> - closeout 索引見 [governance-ledger](../governance/governance-ledger.md)
