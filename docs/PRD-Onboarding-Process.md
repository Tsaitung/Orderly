# PRD: 使用者 Onboarding 流程

## 📊 執行摘要

### 業務目標

建立完整的使用者引導流程，實現：

- **速度目標**：5分鐘內完成註冊，24小時內完成首筆交易
- **轉換目標**：85%註冊完成率，90%首週活躍率
- **體驗目標**：降低學習門檻，提供直觀的使用者旅程

### 成功指標（KPIs）

- 註冊轉換率：60% → 85%
- 平均註冊時間：15分鐘 → 5分鐘
- 首週活躍率：40% → 90%
- 客服諮詢減少：40%

## 🎯 業務背景

### 問題陳述

1. **餐廳 Onboarding 不完整**：缺少專屬引導流程，導致註冊後不知如何開始
2. **供應商流程雖完整但可優化**：5步驟流程存在，但缺少後續引導
3. **學習成本高**：新使用者需要大量時間理解平台功能
4. **首次使用門檻高**：缺少樣板資料和快速上手機制

### 機會點

- 現有供應商 onboarding 流程可作為基礎模板
- JWT 認證和 RBAC 系統已成熟
- 邀請系統已建立，可整合引導流程

## 👥 使用者角色與旅程

### 餐廳方（Restaurant Side）

#### 使用者角色

- **主要使用者**：餐廳採購經理、主廚、營運總監
- **痛點**：繁複的採購流程、供應商管理困難、價格不透明
- **目標**：快速找到優質供應商、簡化訂購流程、降低採購成本

#### Onboarding 旅程設計（新增）

**第1步：基本資料設定**

- 必要欄位：
  - 電子信箱（登入帳號）
  - 密碼（最少12字符）
  - 餐廳名稱
  - 聯絡人姓名
  - 聯絡電話
- 選填欄位：
  - 營業地址
  - 餐廳類型（快餐、正餐、咖啡店等）
  - 預計月採購量

**第2步：營業資訊驗證**

- 必要驗證：
  - 統一編號（8位數字）
  - 手機號碼 OTP 驗證
  - Email 確認連結
- 選填驗證：
  - 營業執照上傳
  - 食品安全證照

**第3步：供應商選擇**

- 智能推薦系統：
  - 基於地理位置推薦（同縣市優先）
  - 基於餐廳類型推薦相關品類供應商
  - 顯示供應商評分和主打產品
- 邀請機制：
  - 可選擇3-5家推薦供應商
  - 系統自動發送合作邀請
  - 可輸入既有供應商資訊邀請加入

**第4步：首單引導**

- 範本訂單：
  - 根據餐廳類型提供預設商品清單
  - 建議採購量和頻率
  - 示範下單流程
- 互動教學：
  - 訂單管理介面導覽
  - 驗收流程說明
  - 付款和對帳功能介紹

### 供應商方（Supplier Side）

#### 使用者角色

- **主要使用者**：供應商業務經理、倉管人員、財務人員
- **痛點**：客戶開發困難、訂單管理複雜、帳務對帳繁瑣
- **目標**：穩定客戶來源、提升營運效率、加速回款週期

#### Onboarding 旅程優化（基於現有流程）

**現有5步驟流程保留並優化**：

1. ✅ 帳戶設定（現有）
2. ✅ 公司資訊（現有）
3. ✅ 聯絡資訊（現有）
4. ✅ 身份驗證（現有）
5. ✅ 完成註冊（現有）

**新增引導內容**：

**第6步：產品目錄建立（新增）**

- 快速導入工具：
  - Excel 範本下載
  - 批量商品上傳
  - 自動品類分類
- 產品資訊完善：
  - 商品圖片上傳
  - 規格和包裝說明
  - 保存期限設定

**第7步：定價策略設定（新增）**

- 定價模式選擇：
  - 固定價格
  - 階梯定價（依數量）
  - 季節性定價
- 客戶群組定價：
  - VIP 客戶折扣
  - 新客戶優惠
  - 大宗採購價

**第8步：客戶邀請引導（新增）**

- 現有客戶導入：
  - 客戶清單上傳
  - 批量邀請發送
  - 邀請狀態追蹤
- 目標客戶開發：
  - 基於地理位置推薦餐廳
  - 客戶需求匹配
  - 主動邀請工具

## 📋 最小化資料需求分析

### 必要資料（Cannot Proceed Without）

**餐廳方**：

- 電子信箱（唯一識別）
- 密碼（安全性）
- 餐廳名稱（業務識別）
- 聯絡人姓名
- 聯絡電話
- 統一編號（合規要求）

**供應商方**：

- 電子信箱（唯一識別）
- 密碼（安全性）
- 公司/商號名稱
- 聯絡人姓名
- 聯絡電話
- 統編/身分證字號（合規要求）

### 重要資料（Strong Recommendation）

**餐廳方**：

- 營業地址（配送服務）
- 餐廳類型（精準推薦）
- 預計採購量（供應商匹配）

**供應商方**：

- 營業地址（配送範圍）
- 主要商品類別（客戶匹配）
- 供應能力（產能規劃）

### 可選資料（Nice to Have）

**餐廳方**：

- 營業執照（提升信任度）
- 食品安全證照（品質保證）
- 月營業額區間（財務能力）

**供應商方**：

- 相關認證證書（食品安全、有機等）
- 產品型錄
- 公司介紹

## 🔄 驗證流程設計

### 即時驗證（Real-time）

- **Email 格式檢查**：RFC 5322 標準
- **手機號碼格式**：台灣手機號碼正規表達式
- **統編檢查**：8位數字 + checksum 驗證
- **密碼強度**：最少12字符，包含大小寫字母和數字

### 異步驗證（Asynchronous）

- **Email 確認**：註冊後5分鐘內發送確認連結
- **手機 OTP**：6位數字驗證碼，有效期5分鐘
- **統編查驗**：對接財政部資料庫（24小時內完成）
- **營業執照**：人工審核（72小時內完成）

### 信任等級系統

**基礎等級（Basic）**：

- 完成email和手機驗證
- 可進行小額交易（≤NT$10,000）
- 每日交易限額：NT$50,000

**驗證等級（Verified）**：

- 完成統編查驗
- 交易額度提升（≤NT$100,000）
- 每日交易限額：NT$500,000

**認證等級（Certified）**：

- 完成營業執照審核
- 無交易額度限制
- 優先客服支援
- 特殊金融服務（供應鏈金融）

## 🎓 教學引導系統

### 互動式導覽（Interactive Tour）

**餐廳方導覽重點**：

1. **儀表板概覽**：訂單狀態、供應商管理、財務報表
2. **下單流程**：商品搜尋、購物車、訂單確認
3. **驗收功能**：照片上傳、品質評價、異常回報
4. **帳務管理**：對帳單檢查、付款確認、發票管理

**供應商方導覽重點**：

1. **訂單管理**：新訂單提醒、出貨安排、配送追蹤
2. **商品管理**：價格調整、庫存更新、促銷設定
3. **客戶關係**：客戶需求分析、滿意度追蹤、業務開發
4. **財務報表**：銷售分析、應收帳款、利潤統計

### 情境式提示（Contextual Hints）

**智能提示觸發條件**：

- 使用者停留時間超過30秒未操作
- 滑鼠懸停但未點擊重要按鈕
- 錯誤操作後的引導修正
- 新功能上線時的主動介紹

### 影片教學資源

**基礎操作影片**（1-2分鐘）：

- 如何下第一筆訂單
- 如何上傳商品
- 如何邀請合作夥伴
- 如何查看財務報表

**進階功能影片**（3-5分鐘）：

- 批量操作技巧
- 報表分析方法
- 自動化設定
- 問題排除指南

## 💻 技術實作規格

### API 端點設計

#### 餐廳 Onboarding APIs

```typescript
// 餐廳註冊步驟1：基本資料
POST /api/restaurants/onboarding/basic-info
{
  email: string;
  password: string;
  restaurantName: string;
  contactPerson: string;
  contactPhone: string;
  address?: string;
  restaurantType?: string;
  monthlyVolume?: number;
}

// 餐廳註冊步驟2：營業驗證
POST /api/restaurants/onboarding/business-verification
{
  taxId: string;
  businessLicense?: File;
  foodSafetyCert?: File;
}

// 餐廳註冊步驟3：供應商推薦
GET /api/restaurants/onboarding/supplier-recommendations
Response: {
  recommendedSuppliers: Supplier[];
  criteria: {
    location: string;
    restaurantType: string;
    productCategories: string[];
  };
}

// 餐廳註冊步驟4：首單範本
GET /api/restaurants/onboarding/template-order
Response: {
  templateItems: ProductItem[];
  suggestedQuantities: Record<string, number>;
  estimatedCost: number;
}
```

#### 供應商 Onboarding APIs（擴展現有）

```typescript
// 供應商產品快速導入
POST /api/suppliers/onboarding/bulk-products
{
  products: ProductBulkImport[];
  priceStrategy: PricingStrategy;
}

// 供應商客戶邀請
POST /api/suppliers/onboarding/invite-customers
{
  customerList: CustomerInvitation[];
  invitationMessage?: string;
}
```

### 資料庫 Schema 更新

```sql
-- 新增餐廳 onboarding 狀態追蹤
CREATE TABLE restaurant_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id),
  current_step VARCHAR(50) NOT NULL,
  completed_steps JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 新增信任等級表
CREATE TABLE trust_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  organization_type VARCHAR(20) NOT NULL, -- 'restaurant' | 'supplier'
  trust_level VARCHAR(20) NOT NULL, -- 'basic' | 'verified' | 'certified'
  verification_status JSONB DEFAULT '{}',
  daily_limit DECIMAL(12,2),
  transaction_limit DECIMAL(12,2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 新增引導進度追蹤
CREATE TABLE tour_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  tour_type VARCHAR(50) NOT NULL,
  completed_steps JSONB DEFAULT '[]',
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 前端頁面流程

#### 餐廳 Onboarding 頁面結構

```
app/(auth)/restaurant-onboarding/
├── page.tsx                 # 主要 onboarding 流程
├── components/
│   ├── BasicInfoStep.tsx   # 步驟1：基本資料
│   ├── BusinessVerificationStep.tsx  # 步驟2：營業驗證
│   ├── SupplierSelectionStep.tsx     # 步驟3：供應商選擇
│   └── FirstOrderGuideStep.tsx       # 步驟4：首單引導
└── hooks/
    ├── useOnboardingProgress.ts
    └── useSupplierRecommendations.ts
```

#### 供應商 Onboarding 頁面擴展

```
app/(auth)/supplier-onboarding/
├── page.tsx                # 現有流程（保留）
├── components/
│   ├── ProductImportStep.tsx       # 新增：產品導入
│   ├── PricingStrategyStep.tsx     # 新增：定價策略
│   └── CustomerInvitationStep.tsx  # 新增：客戶邀請
└── utils/
    ├── productImportHelpers.ts
    └── pricingCalculators.ts
```

### 狀態管理設計

```typescript
// Zustand store for onboarding state
interface OnboardingStore {
  currentStep: number
  completedSteps: number[]
  formData: OnboardingFormData

  // Actions
  nextStep: () => void
  prevStep: () => void
  updateFormData: (data: Partial<OnboardingFormData>) => void
  markStepComplete: (step: number) => void
  resetOnboarding: () => void
}

// Tour progress state
interface TourStore {
  activeTour: string | null
  tourProgress: Record<string, number>

  // Actions
  startTour: (tourType: string) => void
  completeTourStep: (tourType: string, step: number) => void
  finishTour: (tourType: string) => void
}
```

## 📊 實施優先級與時程

### Phase 1：基礎建設（第1-2週）

**優先級：P0 - 必須完成**

1. **餐廳 Onboarding 基本流程**
   - 4步驟註冊頁面開發
   - 基礎驗證功能
   - 資料庫 schema 更新

2. **信任等級系統**
   - 等級判定邏輯
   - 限額控制機制
   - 後台管理介面

### Phase 2：體驗優化（第3-4週）

**優先級：P1 - 重要功能**

1. **智能推薦系統**
   - 供應商推薦算法
   - 地理位置匹配
   - 類型相似度計算

2. **教學引導系統**
   - 互動式導覽實作
   - 情境式提示機制
   - 影片教學整合

### Phase 3：進階功能（第5-6週）

**優先級：P2 - 增值功能**

1. **供應商功能擴展**
   - 產品批量導入
   - 定價策略工具
   - 客戶邀請功能

2. **數據分析與優化**
   - 轉換率追蹤
   - 使用者行為分析
   - A/B 測試框架

## 🧪 測試策略

### 單元測試

- **驗證邏輯測試**：Email、手機、統編格式驗證
- **狀態管理測試**：Onboarding 流程狀態轉換
- **API 端點測試**：輸入驗證、錯誤處理、回應格式

### 整合測試

- **完整註冊流程**：端到端用戶註冊流程
- **驗證流程測試**：Email確認、OTP驗證、文件審核
- **推薦系統測試**：地理位置、類型匹配準確性

### 使用者體驗測試

- **可用性測試**：新用戶完成註冊的成功率和時間
- **A/B 測試**：不同引導方式的轉換率比較
- **無障礙測試**：WCAG 2.1 AA 標準合規性

## 📈 成效評估機制

### 量化指標

**註冊轉換率**：

- 基準線：60%
- 目標：85%
- 測量：(完成註冊用戶 / 開始註冊用戶) × 100%

**註冊完成時間**：

- 基準線：15分鐘
- 目標：5分鐘
- 測量：從開始到完成的中位數時間

**首週活躍率**：

- 基準線：40%
- 目標：90%
- 測量：註冊後7天內至少進行1次有意義操作

### 質化指標

**使用者滿意度**：

- NPS（Net Promoter Score）評分
- 註冊流程滿意度調查
- 客服反饋分析

**功能使用率**：

- 各引導步驟的完成率
- 教學影片觀看完成率
- 幫助文檔點擊率

### 監控與告警

**即時監控指標**：

- 註冊失敗率 > 5% 觸發告警
- API 回應時間 > 2秒 觸發告警
- 驗證服務可用性 < 99% 觸發告警

**每日報表**：

- 新用戶註冊統計
- 各步驟轉換率
- 異常事件摘要

## 🚀 部署計劃

### 分階段上線策略

**Phase 1：灰度發布（10% 流量）**

- 目標用戶：內部測試用戶和友好客戶
- 期間：1週
- 成功標準：無重大bug，基本功能正常

**Phase 2：小規模發布（30% 流量）**

- 目標用戶：隨機選取的新註冊用戶
- 期間：2週
- 成功標準：轉換率提升15%，用戶反馈正面

**Phase 3：全量發布（100% 流量）**

- 目標用戶：所有新註冊用戶
- 期間：持續
- 成功標準：達到目標KPI，系統穩定運行

### 回滾準備

**回滾觸發條件**：

- 註冊成功率下降超過20%
- API 錯誤率超過5%
- 用戶投訴率異常上升

**回滾程序**：

1. 立即切換到舊版流程
2. 保留新版數據不丟失
3. 分析問題原因
4. 修復後重新部署

## 📋 風險評估與緩解

### 技術風險

**資料庫性能風險**：

- **風險**：新增表可能影響查詢性能
- **緩解**：充分的索引設計和查詢優化
- **監控**：資料庫性能指標持續監控

**第三方服務依賴風險**：

- **風險**：統編查驗服務不穩定
- **緩解**：實作重試機制和降級方案
- **監控**：第三方服務可用性監控

### 業務風險

**用戶接受度風險**：

- **風險**：新流程可能讓現有用戶困惑
- **緩解**：提供新舊流程選擇權，漸進式切換
- **監控**：用戶反馈收集和分析

**競爭對手反應風險**：

- **風險**：競爭對手可能快速跟進
- **緩解**：快速迭代，建立先發優勢
- **監控**：市場動態和競品分析

### 合規風險

**資料隱私風險**：

- **風險**：收集更多用戶資料可能涉及隱私問題
- **緩解**：嚴格遵守GDPR和個資法要求
- **監控**：定期隱私評估和合規檢查

## 📝 後續迭代計劃

### 短期優化（1-3個月）

**個性化推薦**：

- 基於用戶行為的供應商推薦
- 個性化的商品推薦
- 動態定價建議

**自動化程度提升**：

- 智能表單自動填充
- 文件自動識別和資料提取
- 風險評估自動化

### 中期發展（3-6個月）

**跨平台整合**：

- 手機 App 版本的 onboarding
- 微信小程序註冊流程
- API 開放給第三方整合

**AI 智能助手**：

- 聊天機器人引導註冊
- 語音指令支援
- 智能問答系統

### 長期願景（6-12個月）

**生態系統建設**：

- 合作夥伴推薦網絡
- 供應鏈金融整合
- 國際化擴展支援

---

**文檔版本**：1.0  
**最後更新**：2025-01-20  
**負責人**：產品團隊  
**審核狀態**：待審核
