# 靜態資源路徑衝突掃描紀錄

## 背景
- Next.js App Router 若在 `app/` 與 `public/` 同時存在相同檔名（例如 `favicon.ico`、`icon.svg`），會造成路由衝突並回傳 500。
- 需要定期掃描並紀錄結果，避免再次發生。

## 掃描指令（本地）
```bash
cd /Users/leeyude/Projects/Orderly
python3 - <<'PY'
from pathlib import Path
app_files = {p.name: p for p in Path("app").rglob("*") if p.is_file()}
pub_files = {p.name: p for p in Path("public").rglob("*") if p.is_file()}
dups = sorted(set(app_files) & set(pub_files))
print("Duplicates by basename:", dups)
for name in dups:
    print(f"{name}: app -> {app_files[name]}, public -> {pub_files[name]}")
PY
```

## 最新結果
- 本次掃描未發現重複檔名（app/ 與 public/ 無交集）。

## 預防與作業建議
- 靜態資源（favicon、icons、manifest）統一放在 `public/`，`app/` 僅保留頁面與 API route。
- 新增圖示或靜態檔前，先執行上述掃描；CI 可加入同樣檢查並在找到重複時 fail。
- 避免將相同檔名同時放在 App Router 與 `public/`，包含子路徑（例如 `app/(marketing)/favicon.ico`）。
