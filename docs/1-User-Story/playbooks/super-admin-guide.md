# 系統超管操作指南 - 井然 Orderly 平台

> **版本**: v1.0
> **更新日期**: 2025-12-16
> **適用對象**: 平台管理員、系統超管、開發團隊
> **狀態**: 正式版

---

## 概述

井然 Orderly 平台包含完整的系統超管機制，為開發人員和平台管理員提供提升權限的功能。此系統包含自動過期、安全日誌記錄和生產環境保護措施。

---

## 功能特色

### 🔑 核心功能

- **臨時提升權限**: 時間限制的超管權限（預設：24 小時）
- **自動過期**: 權限到期後自動撤銷
- **安全日誌**: 所有超管操作均記錄供審計使用
- **生產環境保護**: 在生產環境中限制創建
- **角色整合**: 與現有用戶角色系統整合

### 🛡️ 安全特性

- **環境保護**: 除非明確啟用，否則在生產環境中被封鎖
- **原因追蹤**: 所有超管存取都需要提供理由
- **審計軌跡**: 完整記錄創建、使用和撤銷
- **自動清理**: 過期權限自動移除

---

## 資料庫結構

超管系統使用 `users` 表中的現有欄位：

```sql
-- users 表中的超管欄位
isSuperUser         Boolean   @default(false)
superUserExpiresAt  DateTime?
superUserReason     String?

-- 用戶角色包含 platform_admin
role                UserRole  -- 包含 'platform_admin'
```

---

## API 端點

### 創建超管

```
POST /auth/super-admin
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecurePassword123!",
  "name": "管理員名稱",
  "reason": "開發功能實作需要存取權限",
  "duration": 24  // 小時（選填，預設：24）
}
```

**回應:**

```json
{
  "success": true,
  "message": "超管創建成功",
  "data": {
    "user": {
      "id": "user_123",
      "email": "admin@example.com",
      "role": "platform_admin",
      "isSuperUser": true,
      "superUserExpiresAt": "2025-09-20T01:56:00.000Z",
      "superUserReason": "開發功能實作需要存取權限"
    }
  }
}
```

### 列出超管

```
GET /auth/super-admins
```

**回應:**

```json
{
  "success": true,
  "data": {
    "superAdmins": [
      {
        "id": "user_123",
        "email": "admin@example.com",
        "role": "platform_admin",
        "isSuperUser": true,
        "superUserExpiresAt": "2025-09-20T01:56:00.000Z",
        "superUserReason": "開發存取",
        "lastLoginAt": "2025-09-19T01:56:00.000Z",
        "createdAt": "2025-09-19T01:56:00.000Z",
        "organization": {
          "id": "org_123",
          "name": "平台管理",
          "type": "restaurant"
        }
      }
    ],
    "total": 1,
    "expiredCount": 0
  }
}
```

### 撤銷超管

```
DELETE /auth/super-admin/:userId
Content-Type: application/json

{
  "reason": "不再需要存取權限"
}
```

**回應:**

```json
{
  "success": true,
  "message": "超管權限已成功撤銷",
  "data": {
    "user": {
      "id": "user_123",
      "email": "admin@example.com",
      "role": "platform_admin",
      "isSuperUser": false
    }
  }
}
```

---

## CLI 腳本

### 互動式創建腳本

```bash
# 執行互動式超管創建
./scripts/create-super-admin.sh

# 或直接使用 Node.js
node scripts/create-super-admin.js
```

腳本會提示輸入：

- Email 地址
- 密碼（最少 8 個字元）
- 完整姓名
- 存取原因
- 持續時間（小時，選填）

### 環境變數

```bash
# 資料庫連線必要設定
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=orderly
DATABASE_USER=orderly
POSTGRES_PASSWORD=orderly_dev_password

# 在生產環境中允許創建所需（僅在必要時設定）
ALLOW_SUPER_ADMIN_CREATION=true

# JWT Token 生成所需
JWT_SECRET="your-jwt-secret"
```

---

## 使用範例

### 開發環境設置

```bash
# 1. 確保資料庫正在運行
docker-compose up -d postgres

# 2. 透過 FastAPI User Service 建立超級管理員
curl -X POST http://localhost:3001/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
        "email":"admin@orderly.com",
        "password":"ChangeMe123!",
        "organizationName":"Orderly Platform",
        "organizationType":"supplier"
      }'
```

### API 使用

```javascript
// 透過 API 創建超管
const response = await fetch('/auth/super-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'dev@orderly.com',
    password: 'DevPassword123!',
    name: '開發管理員',
    reason: '初始平台設置',
    duration: 48,
  }),
})

const data = await response.json()
console.log('超管創建完成:', data.data.user.id)
```

---

## 安全最佳實踐

### 🔒 生產環境安全

1. **絕對不要**在生產環境啟用 `ALLOW_SUPER_ADMIN_CREATION=true`，除非有充分理由
2. **務必使用**強密碼（最少 12 個字元，包含大小寫、數字、符號）
3. **設定短期**的超管存取時間（最多 24-48 小時）
4. **清楚記錄原因**以供審計使用
5. **立即撤銷**不再需要的存取權限

### 🔍 監控與審計

- 所有超管操作都會記錄用戶 ID、時間戳和 IP 地址
- 定期審計超管存取日誌
- 監控未清理的過期帳號
- 在生產環境創建超管時發出警報

### 🚨 緊急處理程序

如果偵測到未經授權的超管存取：

1. **立即回應**:

   ```bash
   # 列出所有超管
   curl -X GET http://localhost:3001/auth/super-admins

   # 撤銷特定超管
   curl -X DELETE http://localhost:3001/auth/super-admin/USER_ID \
     -H "Content-Type: application/json" \
     -d '{"reason":"安全事件 - 未經授權存取"}'
   ```

2. **調查**:
   - 檢查超管創建和使用的審計日誌
   - 驗證所有超管帳號是否合法
   - 審查近期的平台管理操作

3. **復原**:
   - 更改所有超管帳號的密碼
   - 必要時審查並更換 JWT 密鑰
   - 如需要實施額外監控

---

## 技術實作

### 自動過期機制

系統在列出超管時自動檢查過期帳號：

```typescript
// 檢查並更新過期的超管
const now = new Date()
const expiredAdmins = superAdmins.filter(
  admin => admin.superUserExpiresAt && admin.superUserExpiresAt < now
)

if (expiredAdmins.length > 0) {
  await prisma.user.updateMany({
    where: { id: { in: expiredAdmins.map(admin => admin.id) } },
    data: {
      isSuperUser: false,
      superUserExpiresAt: null,
      superUserReason: null,
    },
  })
}
```

### 組織管理

超管用戶會自動分配到「平台管理」組織：

```typescript
// 如果不存在則創建平台組織
let platformOrg = await prisma.organization.findFirst({
  where: { name: 'Platform Administration' },
})

if (!platformOrg) {
  platformOrg = await prisma.organization.create({
    data: {
      name: 'Platform Administration',
      type: 'restaurant',
      settings: { description: '平台管理和開發人員存取' },
    },
  })
}
```

---

## 故障排除

### 常見問題

1. **「生產環境不允許創建超管」**
   - 設定 `ALLOW_SUPER_ADMIN_CREATION=true` 環境變數
   - 僅在生產環境絕對必要時才這樣做

2. **無法連接到 User Service**
   - 確保 FastAPI user-service 正在 port 3001 運行且資料庫已遷移（`alembic upgrade head`）
   - 確保 `DATABASE_HOST`、`DATABASE_PORT`、`DATABASE_NAME`、`DATABASE_USER`、`POSTGRES_PASSWORD` 已正確設定

3. **「資料庫連線失敗」**
   - 驗證 PostgreSQL 正在運行
   - 系統使用分離式環境變數：`DATABASE_HOST`、`DATABASE_PORT`、`DATABASE_NAME`、`DATABASE_USER`、`POSTGRES_PASSWORD`
   - 如需手動連線測試，可臨時組裝 DSN：`postgresql://user:password@host:port/database`
   - 確保資料庫存在且可存取

4. **創建時「用戶已存在」**
   - 系統會將現有用戶升級為超管狀態
   - 檢查回應以確認升級是否成功

### 除錯模式

如需故障排除，可啟用除錯日誌：

```bash
DEBUG=* node scripts/create-super-admin.js
```

---

## 遷移指南

如果從沒有超管功能的系統升級：

1. **資料庫遷移**: Schema 已包含必要欄位
2. **現有管理員**: 使用升級功能轉換現有的平台管理員
3. **腳本**: 將創建腳本放在 `scripts/` 目錄
4. **環境**: 添加必要的環境變數
5. **測試**: 使用測試腳本驗證功能

---

## 總結

超管系統為井然 Orderly 平台提供安全、可審計、時間限制的提升存取權限。它包含完整的安全功能以供生產環境使用，同時對本地開發和測試保持友善。

如需額外支援或有任何問題，請參考專案主文檔或聯繫開發團隊。

---

## 相關文件

- [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) - 身份驗證完整 PRD
- [01-auth-user-management.md](../by-module/01-auth-user-management.md) - 身份驗證 User Stories
- [platform-roles.md](../by-role/platform-roles.md) - 平台端角色索引
