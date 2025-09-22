-- 井然 Orderly Platform - 資料庫權限設置腳本
-- Database Permissions Setup Script
-- 
-- 此腳本確保 orderly 用戶對所有表、序列和函數有適當權限
-- 防止 "permission denied" 錯誤發生

-- 授予現有表的權限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO orderly;

-- 授予現有序列的權限  
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO orderly;

-- 授予現有函數的權限
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO orderly;

-- 設置新建表的預設權限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO orderly;

-- 設置新建序列的預設權限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO orderly;

-- 設置新建函數的預設權限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO orderly;

-- 確保 orderly 用戶可以在 public schema 中創建對象
GRANT CREATE ON SCHEMA public TO orderly;

-- 顯示授權完成
\echo 'Database permissions granted successfully for user "orderly"'
\echo 'All current and future tables, sequences, and functions are accessible'

-- 驗證權限設置
\echo 'Verifying permissions...'
\dp customer*;