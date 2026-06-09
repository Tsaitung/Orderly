# scripts/dev/ — 一次性開發 / 測試便利腳本

放**沒有** CI / hooks / deploy 引用的開發期便利腳本（啟動、停止、檢查、診斷、本機測試等）。
2026-06-09 由 `scripts/` root 移入，讓 root 只剩 load-bearing 入口。

新增腳本前判斷：被 `Makefile` / `.github/workflows/` / git hooks / 其他 load-bearing 腳本引用 → 放 `scripts/`（或對應子目錄）；純手動開發便利 → 放這裡。

> 同名陷阱：本目錄的 `docker-deploy.sh` 與 load-bearing 的 `scripts/deploy-staging-permanent.sh` 不同檔；
> `check-services.sh` / `stop-all-services.sh` 預設從 **repo root** 執行（`./scripts/dev/<x>.sh`），相對路徑才正確。
