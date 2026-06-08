**Findings**

Must fix: `/tmp/claude-plan-240777f4.md:397` and `/tmp/claude-plan-240777f4.md:401` are still misleading. The named-target table says customer-hierarchy `activity_metrics.py` 4 models were either deleted or migrated, and that the “orphan model” state disappeared. The repo contradicts that: [activity_metrics.py](/Users/leeyude/Projects/Orderly/backend/app/modules/customer_hierarchy/models/activity_metrics.py:23) still defines the 4 tables, and `rg` found no matching `op.create_table(...)` in `backend/app/modules/customer_hierarchy/alembic/versions`. This also conflicts with the corrected follow-up at `/tmp/claude-plan-240777f4.md:378`, which honestly says the per-module migration is still missing. Update the progress table/ratio to mark this target as deferred/open, not “7 / 7 done.”

The new AC3 downgrade is accurate: `/tmp/claude-plan-240777f4.md:328` correctly says the evidence is prefix presence plus `/restart`, not per-row curl shape.

The 3 contract mismatches in `/tmp/claude-plan-240777f4.md:434-436` are characterized correctly:
- notifications mounts bare `/notifications`: [notifications.py](/Users/leeyude/Projects/Orderly/backend/app/modules/notifications/api/v1/notifications.py:21), frontend path source [notifications.ts](/Users/leeyude/Projects/Orderly/lib/api/notifications.ts:5).
- suppliers has `/api` plus bare dual mount, so `/api/suppliers/suppliers` exists, not `/api/api/...`: [suppliers/main.py](/Users/leeyude/Projects/Orderly/backend/app/modules/suppliers/main.py:27), [supplier/api.ts](/Users/leeyude/Projects/Orderly/lib/api/supplier/api.ts:44).
- products has `/api/products/skus...` and BFF `/api/bff/products/skus...`, but no mounted `v1/skus` route: [products/main.py](/Users/leeyude/Projects/Orderly/backend/app/modules/products/main.py:93), [supplier/api.ts](/Users/leeyude/Projects/Orderly/lib/api/supplier/api.ts:549).

Minor precision note, not a must-fix: `/tmp/claude-plan-240777f4.md:380` is directionally right that `/api/v2/health` can be blocked by the monolith top-level public-path gap, but customer-hierarchy’s own middleware does hard-code an exemption for `/api/v2/health`: [auth.py](/Users/leeyude/Projects/Orderly/backend/app/modules/customer_hierarchy/middleware/auth.py:45). The blocker is the top-level `AuthMiddleware` public path union, not that inner middleware itself lacks the exemption.

VERDICT: REVISE