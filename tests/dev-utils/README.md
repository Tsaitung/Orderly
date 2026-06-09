# tests/dev-utils/ — 開發期手動測試工具

需要外部服務在跑才能用的手動測試小工具（**非** jest 套件、非 CI 收集對象）。
檔名刻意不用 `*.test.*` / `*.spec.*`，避免被 jest `testMatch` 誤收。

- `test-super-admin.js` — super-admin 端點手動測試（需 user-service 跑在 `localhost:3001`）。

自動化單元 / 整合測試請放 `tests/unit/`、`tests/integration/`。
