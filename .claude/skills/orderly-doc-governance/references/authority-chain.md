# Authority Chain

## Truth Layers

Orderly 文檔治理的 truth layers 固定為：

1. User Stories
2. PRD
3. System specs / Design
4. API contract
5. ADR

這五層互相對齊，但不互相替代。

## Derived Surfaces

以下文件為 derived surfaces：

- `docs/INDEX.md` 與各區 `docs/<area>/INDEX.md`（`0-Design` / `1-User-Story` / `2-PRD` / `3-Development-Plan` / `4-Test`）
- `docs/2-PRD/INDEX.md`
- `docs/1-User-Story/INDEX.md`
- `docs/4-Test/*.md` 的 coverage/status 鏡像欄位

Derived surfaces 只能鏡像 stabilized truth layers，不得新增：

- 新需求
- 新決策
- 新 ADR 語意
- 新狀態定義

## Scope Resolution

### Module Scope

先用 `docs/INDEX.md` + 各區 `INDEX.md` 找模組邊界，再補讀該模組的：

- user story module file（`docs/1-User-Story/by-module/NN-*.md`）
- PRD file（`docs/2-PRD/PRD-*.md`）
- system spec（`docs/0-Design/*.md`）
- API contract（`docs/0-Design/api-specification.yaml`）
- test plan（`docs/4-Test/*.md`）

### ADR Cluster Scope

不能只依賴 `docs/INDEX.md`，因為當前 repo 的 navigation index 還沒有完整 ADR 引用層。

ADR cluster scope 必須先讀：

- `docs/adr/README.md`
- 相關 ADR 文件
- ADR metadata 內的 `Primary PRD` / `FR References` / `US References`

需要回寫 navigation index 時，再把 ADR cross-reference 當成 derived output。

## Code And Test Evidence

code/tests 只用來回答：

- 文檔有、code 無
- code 有、文檔無
- route/schema/name drift
- coverage/status 是否與 derived mirrors 不一致

code/tests 不是 truth-layer requirement source。
