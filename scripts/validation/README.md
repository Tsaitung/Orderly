# scripts/validation/ — 設定驗證工具

部署前 / 提交前的設定健全性檢查：

- `cleanup-validate.sh` — 檢查本機 `.secrets/*` 必要 secret 是否齊全（從 repo root 執行）。
- `validate-docker-compose.py` — Docker Compose 設定驗證。
- `validate-yaml-syntax.py` — YAML 語法驗證。

這些是手動 / 開發期驗證工具（非 CI gate）。CI 端的驗證腳本在 `scripts/ci/`。
