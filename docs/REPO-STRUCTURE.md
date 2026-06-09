# Repository Structure 目錄地圖（單一事實來源）

本檔是 Orderly repo 目錄結構的**權威說明**，給人與未來的 AI agent 參考，避免重複「為什麼這個檔在這裡 / 能不能搬」的調查。
任何搬移、刪除、新增目錄後，請同步更新本檔。

> 黃金規則：**搬檔＝舊路徑被刪除**。動任何路徑前先 `grep -rn '<basename>'` 掃 `Makefile .github/ scripts/ Dockerfile* compose*.yml infra/service-manifest.yaml`，確認沒有 build / CI / deploy / script 引用，破壞性與刪檔相同。

## 頂層佈局

```
.
├── src/                  # Next.js App Router 前端全部收在此（官方 src/ 慣例）
│   ├── app/              #   App Router（路由、layout、API/BFF）
│   ├── components/  lib/  contexts/  hooks/  types/
│   └── middleware.ts     #   Next.js middleware（src/ 慣例）
├── public/               # 靜態資源 —— [Next 規定必須在 repo root，不可進 src/]
├── backend/              # FastAPI modular monolith
│   ├── app/              #   應用本體（app/modules/<svc>、app/requirements.txt）
│   ├── libs/             #   共用 orderly_fastapi_core
│   ├── Dockerfile.monolith
│   └── cloudbuild.monolith.yaml
├── shared/types/         # 跨服務 TS 型別契約（唯一仍在的 npm workspace 成員）
├── infra/                # 部署 / 基礎設施單一根（2026-06-09 由 4 散落目錄整併）
│   ├── terraform/        #   IaC（main.tf, variables.tf）—— 手動 apply，無 workflow 觸發
│   ├── env/              #   部署期 env 檔（production.env, staging.env）
│   ├── staging/          #   Cloud Run 服務 YAML + env-vars + schema baseline
│   └── service-manifest.yaml   # CI 服務相依宣告（被 scripts/ci/detect-changes.py 讀）
├── scripts/              # 自動化腳本（依用途分目錄，見下方「scripts 規約」）
├── tests/               # 所有測試集中於此
│   ├── unit/  integration/  dev-utils/
│   └── e2e/              #   Playwright E2E（playwright testDir './tests/e2e'）
├── docs/               # 文件單一事實來源（入口 docs/INDEX.md）
├── data/staging/v1/    # staging 資料快照 —— [.gcloudignore + scripts/database 相對路徑釘死]
├── .github/workflows/  # CI/CD（ci.yml, cd.yml, deploy-staging-permanent.yml…）
├── .specify/  specs/   # spec-kit 工作流（specs/<feature>/ 由 .specify 按需 mkdir）
└── 根設定檔             # next.config.js, tsconfig*.json, tailwind/jest/playwright/postcss,
                        # eslint/prettier, package.json, Makefile, compose.*.yml,
                        # Dockerfile.frontend*, cloudbuild-frontend.yaml —— 全部 [釘 root]
```

## 前端在 src/（Next.js 官方慣例）+ 兩個硬約束

前端 runtime 全收在 `src/`（2026-06-09 由 repo root 搬入，採 Next.js 官方 `src/` 慣例）。**Next.js 規定 App Router 只能在 repo root `app/` 或 `src/app/`；`public/` 只能在 repo root**——所以 `public/` 沒進 `src/`。

搬動 `src/` 或改前端路徑時，這些設定彼此釘死、必須同步改（grep 後逐一更新）：

| 設定 | 釘住什麼 |
|---|---|
| `tsconfig.json` `paths`（`@/* -> ./src/*`、`@/public/* -> ./public/*`、`@/shared/* -> ./shared/*`、`lib/* -> ./src/lib/*`） | `@/` 別名解析 |
| `next.config.js` webpack alias（`'@' -> __dirname/src`、`lib -> __dirname/src/lib`） | build 時 `@/`、`lib` 解析 |
| `tailwind.config.ts` `content`（`./src/app ./src/components ./src/lib`）+ `import './src/lib/theme/tokens'` | CSS purge 掃描 |
| `jest.config.js` `moduleNameMapper`（`@/shared`、`@/public` 例外在前，catch-all `@/* -> <rootDir>/src/$1`）+ `collectCoverageFrom` | 測試解析 |
| `Dockerfile.frontend`：`COPY . .`（含 src/，不變）+ `COPY src/app/apple-icon.png ./app/apple-icon.png` + `COPY public ./public`（不變） | 前端 image |
| `.github/workflows/ci.yml` `dorny/paths-filter`（`src/app/** src/components/** …`、`public/**`） | 前端變更偵測 |
| `scripts/ci/resolve-deploy-context.sh:70` 前端 glob（`src/app/ src/components/ … public/`）+ 其 `*.test.sh` | CD 變更偵測 |

> build context 仍是 repo root（`COPY . .` 不變），所以 `cloudbuild-frontend.yaml` / `cd.yml` 的前端 build 不需改 context；只有上表的 alias / glob / 一行 COPY 來源需同步。

## scripts 規約

- **`scripts/` root**：只放 load-bearing 入口（被 CI / hooks / deploy 直接引用）：
  `ci/`（CI 共用腳本）、`database/`（遷移 / seed / schema）、`deploy-staging-permanent.sh`、
  `health-check-simple.sh`、`health-check-all.sh`、`check-doc-references.sh`、
  `run_plan_checks.sh`、`test-redis-connection.sh`。
- **`scripts/dev/`**：一次性開發 / 測試便利腳本（無 CI 引用）。
- **`scripts/validation/`**：設定驗證工具（compose / yaml / 部署前 secret 檢查）。
- **`scripts/perf/`**：效能 / 相容性測試（JS）。
- **`scripts/cloudbuild/` `scripts/iam/`**：Cloud Build 設定 / SA bootstrap —— load-bearing。

> 注意同名陷阱：`health-check-simple.sh`（load-bearing, cd.yml 引用）≠ `dev/`（無）；
> `deploy-staging-permanent.sh`（load-bearing）≠ `dev/docker-deploy.sh`。

## 2026-06-09 reorg 紀要

由散落整併（git mv 保留 history，所有引用同步更新）：

- 孤兒 root 檔歸位：`plan.md`→`docs/3-Development-Plan/STATUS-SUMMARY.md`、
  `test-super-admin.js`→`tests/dev-utils/`、`cleanup-validate.sh`→`scripts/validation/`、
  `scripts/performance-*.js`→`scripts/perf/`。
- 刪 dead shell / 過時文件：`frontend/`（僅含廢棄 cloudbuild.yaml）、`specs/.workflow-confirmations.json`、
  obsolete `scripts/*.sql`（已被 Alembic + seed_from_real_data.py 取代）、deprecated `CICD-init-guide.md`
  （已被 `docs/3-Development-Plan/CI-CD-ARCHITECTURE.md` 取代）。
- 15 支一次性腳本 → `scripts/dev/`。
- `package.json` workspaces 清掉 9 個已不存在的 `backend/*-service-fastapi`（backend 已 re-root 成 monolith）。
- infra 整併：`infrastructure/` + `deploy/` + `ci/` + `configs/staging/` → 單一 `infra/`。
- 退役 per-service compose 子系統（backend monolith 化後遺留）：刪 `compose.services.yml`、`compose.staging.yml`、`compose.prod.yml` 及對應 validator；現行 compose 集合 = `base` + `dev` + `monolith`。
- **前端收進 `src/`**（Next.js 官方慣例）：`app/ components/ lib/ contexts/ hooks/ types/ middleware.ts` → `src/`；`public/` 依 Next 規定留 root。同步改 tsconfig/next.config/tailwind/jest/Dockerfile.frontend/ci.yml/resolve-deploy-context。最終 `next build` 正確性由 GCP build + CI 證實（本機無 node_modules 無法 build）。
