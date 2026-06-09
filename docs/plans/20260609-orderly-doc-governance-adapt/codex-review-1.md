**Findings**

1. **Must-fix: `ADR-0001` would import the stale flat-taxonomy decision as accepted.**  
Plan “Ported canonical-home docs” includes `docs/adr/ADR-0001...`, but Task 4 only fixes `project-paths.md`. The stale ADR says `0-Design → system-spec`, `1-User-Story → user-stories`, etc., and mentions `.claude/settings.local.json`. That contradicts main and D-1. Add `docs/adr/ADR-0001...` to Task 4: either omit it, or rewrite it to state “main kept numbered taxonomy; skill was adapted; hooks register in `.claude/settings.json`.”

2. **Must-fix: Class C file list and grep oracle are incomplete.**  
Task 5 lists harvest eval, regression eval, `plan-residency`, `project-paths`, and one hook, but stale branch also has `backend/<svc>-fastapi...` in `references/stage-gates.md:107`. Also Task 5 / Task 8 grep uses `backend/[a-z-]+-fastapi`, which does not match `backend/<svc>-fastapi`. Add `references/stage-gates.md` to Task 5 and change the oracle to cover both spellings, e.g. `backend/(<svc>|[A-Za-z0-9_-]+)-fastapi`.

3. **Must-fix: Class B verification scope misses surviving `docs/plans/<curated-doc>.md` refs outside `project-paths.md`.**  
Task 4 says “and any other file,” but the concrete grep only checks `.claude/skills/...`, and Task 8’s “DONE oracle” omits Class B. Stale refs exist in `evals/smoke.json:9` (`docs/plans/CI-CD-ARCHITECTURE.md`) and `docs/governance/deprecation-roadmap.md:17` (`docs/plans/CI-CD-TROUBLESHOOTING-GUIDE.md`, `DEVELOPMENT-PLAN.md`). Add those files explicitly to Task 4, and include the Class B grep across skill + ported docs in Task 8.

Checked: the main path mappings themselves are correct for numbered docs and `backend/app/modules/*`; I found no Class A stale refs in the 6 templates or in `evals/{smoke,regression,failure-injection}.json` beyond the Class B smoke case above.

VERDICT: REVISE