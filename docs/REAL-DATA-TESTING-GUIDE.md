# Orderly Platform Real Data Testing Guide

## 🎯 從 Dummy Data 轉換到 Real Data Testing

目前系統使用混合測試方式。本指南說明如何切換到完全真實數據測試。

## 📊 當前測試數據狀態

### ✅ 已經是真實數據
- 系統性能指標（響應時間、內存使用、CPU）
- 網絡請求和響應
- 監控和日誌數據
- APM 追蹤數據

### 🎭 目前使用模擬數據
- 訂單數據（透過 `/demo/order` 端點）
- 配送數據（透過 `/demo/delivery` 端點）
- 用戶行為數據
- 業務交易數據

## 🔄 切換到真實數據的步驟

### 1. 資料庫連接設定

```bash
# 設定真實資料庫連接
export DATABASE_URL="postgresql://username:password@localhost:5432/orderly_production"
export REDIS_URL="redis://localhost:6379"
```

### 2. 建立真實測試資料

```sql
-- 插入真實餐廳數據
INSERT INTO restaurants (id, name, address, phone, type) VALUES
('rest-001', '美味小館', '台北市信義區信義路1號', '02-12345678', 'chinese'),
('rest-002', '義式風情', '台北市大安區敦化南路2號', '02-87654321', 'italian');

-- 插入真實供應商數據
INSERT INTO suppliers (id, name, address, phone, type) VALUES
('supp-001', '新鮮蔬果供應商', '台北市萬華區西園路1號', '02-11111111', 'vegetables'),
('supp-002', '優質肉品供應商', '台北市士林區中山北路3號', '02-22222222', 'meat');

-- 插入真實產品數據
INSERT INTO products (id, name, category, price, supplier_id, unit) VALUES
('prod-001', '有機高麗菜', 'vegetables', 50, 'supp-001', 'kg'),
('prod-002', '新鮮豬肉', 'meat', 250, 'supp-002', 'kg');
```

### 3. 修改測試端點使用真實資料

```javascript
// 將 demo 端點改為真實 API 測試
const REAL_TEST_ENDPOINTS = [
  { path: '/api/restaurants', method: 'GET', weight: 20 },
  { path: '/api/suppliers', method: 'GET', weight: 20 },
  { path: '/api/products', method: 'GET', weight: 25 },
  { path: '/api/orders', method: 'POST', weight: 25, body: {
    restaurantId: 'rest-001',
    supplierId: 'supp-001',
    items: [
      { productId: 'prod-001', quantity: 5, price: 50 }
    ],
    total: 250
  }},
  { path: '/api/orders', method: 'GET', weight: 10 },
];
```

### 4. 設定真實用戶認證

```javascript
// 加入真實 JWT Token 測試
const authHeaders = {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'X-User-ID': 'user-12345',
  'X-User-Role': 'restaurant'
};
```

## 🧪 真實數據測試配置

### 修改性能測試腳本

```javascript
// performance-test-real.js
const REAL_DATA_CONFIG = {
  baseUrl: 'http://localhost:8000',
  useRealDatabase: true,
  authToken: process.env.TEST_AUTH_TOKEN,
  endpoints: [
    // 真實業務 API 端點
    { path: '/api/orders', method: 'GET', requireAuth: true },
    { path: '/api/products', method: 'GET', requireAuth: false },
    { path: '/api/restaurants/rest-001/orders', method: 'GET', requireAuth: true },
    // 真實訂單創建流程
    { path: '/api/orders', method: 'POST', requireAuth: true, body: realOrderData },
  ],
  realDataSources: {
    restaurants: ['rest-001', 'rest-002'],
    suppliers: ['supp-001', 'supp-002'],
    products: ['prod-001', 'prod-002'],
  }
};
```

### 環境變數設定

```bash
# .env.testing
NODE_ENV=testing
DATABASE_URL=postgresql://orderly_test:password@localhost:5432/orderly_test
REDIS_URL=redis://localhost:6379/1
AUTH_SECRET=your-test-jwt-secret
TEST_AUTH_TOKEN=your-test-jwt-token
USE_REAL_DATA=true
```

## 🔍 真實數據驗證

### 1. 數據完整性檢查

```javascript
// 檢查真實數據是否正確載入
async function validateRealData() {
  const restaurantCount = await db.restaurant.count();
  const supplierCount = await db.supplier.count();
  const productCount = await db.product.count();
  
  console.log(`✅ 餐廳數量: ${restaurantCount}`);
  console.log(`✅ 供應商數量: ${supplierCount}`);
  console.log(`✅ 產品數量: ${productCount}`);
  
  return restaurantCount > 0 && supplierCount > 0 && productCount > 0;
}
```

### 2. 業務流程測試

```javascript
// 真實業務流程測試
async function testRealBusinessFlow() {
  // 1. 餐廳登入
  const loginResponse = await makeRequest('/api/auth/login', {
    email: 'restaurant@test.com',
    password: 'test123'
  });
  
  // 2. 瀏覽產品
  const productsResponse = await makeRequest('/api/products');
  
  // 3. 創建真實訂單
  const orderResponse = await makeRequest('/api/orders', {
    restaurantId: 'rest-001',
    supplierId: 'supp-001',
    items: productsResponse.data.slice(0, 3),
    total: calculateTotal(productsResponse.data.slice(0, 3))
  });
  
  // 4. 供應商確認
  const confirmResponse = await makeRequest(`/api/orders/${orderResponse.data.id}/confirm`);
  
  return orderResponse.success && confirmResponse.success;
}
```

## 📈 真實數據監控

### 業務指標追蹤

```javascript
// 真實業務指標收集
const realBusinessMetrics = {
  // 真實訂單處理時間
  orderProcessingTime: calculateActualProcessingTime(),
  
  // 真實用戶行為
  userEngagement: trackRealUserActions(),
  
  // 真實供應鏈性能
  supplierResponseTime: measureActualSupplierResponse(),
  
  // 真實財務數據
  transactionVolume: calculateRealTransactionVolume()
};
```

## 🚀 運行真實數據測試

### 啟動命令

```bash
# 確保數據庫運行
docker-compose up -d postgres redis

# 載入真實測試數據
npm run db:seed:test

# 啟動所有服務
npm run dev

# 運行真實數據性能測試
USE_REAL_DATA=true npm run test:performance

# 運行真實數據分析
USE_REAL_DATA=true npm run analyze:performance
```

### 驗證檢查清單

- [ ] 真實資料庫連接正常
- [ ] 測試數據已正確載入
- [ ] 認證系統正常運作
- [ ] 所有微服務端點回應正常
- [ ] 業務流程完整測試通過
- [ ] 監控指標收集真實數據

## ⚠️ 注意事項

### 安全考量
- 使用獨立的測試環境
- 不要在生產數據上運行性能測試
- 確保測試 Token 權限最小化

### 數據隔離
- 測試數據與生產數據完全分離
- 使用專用的測試資料庫
- 定期清理測試數據

### 監控考量
- 真實數據測試會影響監控指標
- 需要區分測試流量和真實用戶流量
- 設定適當的標籤和過濾器

---

**結論**: 目前系統具備完整的真實數據測試能力。只需要設定真實資料庫連接和測試數據，就能從 dummy data 轉換到完全真實的數據測試環境。