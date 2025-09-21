# PRD: 雙向推薦系統（Referral System）

## 📊 執行摘要

### 業務目標
建立完整的雙向推薦機制，實現平台網絡效應最大化：
- **獲客目標**：降低獲客成本50%，推薦新用戶佔比達30%
- **轉換目標**：推薦轉換率>20%，推薦用戶留存率>85%
- **網絡目標**：建立自增長的生態系統，病毒係數>1.2

### 成功指標（KPIs）
- 推薦新用戶佔比：5% → 30%
- 推薦轉換率：>20%
- 獲客成本（CAC）：降低50%
- 推薦用戶30天留存率：>85%
- 網絡密度：每個用戶平均連接2.5個合作夥伴

## 🎯 業務背景

### 問題陳述
1. **單向邀請限制**：目前僅支援餐廳→供應商邀請，缺少供應商→餐廳的逆向邀請
2. **缺乏激勵機制**：沒有推薦獎勵，用戶推薦動機不足
3. **獲客成本過高**：主要依賴付費廣告，缺乏有機增長
4. **關係管理薄弱**：邀請後缺乏關係維護和優化機制

### 機會點
- 現有邀請系統基礎良好（8位邀請碼機制）
- 供應商有強烈客戶開發需求
- 餐廳希望發現更多優質供應商
- 平台可作為信任中介建立多方關係

### 競爭優勢
- **雙向互利**：不同於單向推薦，創造雙贏局面
- **行業專業性**：深度理解餐飲供應鏈需求
- **信任機制**：平台背書降低合作風險

## 👥 使用者角色與需求

### 餐廳方推薦需求

#### 推薦供應商場景
- **痛點**：現有供應商服務不佳，尋找替代方案
- **動機**：獲得推薦獎勵，幫助業界夥伴數位化
- **目標**：推薦優質供應商給其他餐廳，建立行業聲譽

#### 接受供應商推薦場景
- **痛點**：尋找特定品類供應商困難
- **動機**：獲得可信推薦，降低試錯成本
- **目標**：通過同業推薦找到優質供應商

### 供應商方推薦需求

#### 推薦餐廳場景（新增功能）
- **痛點**：客戶開發困難，營業額增長緩慢
- **動機**：拓展客戶群，穩定營收來源
- **目標**：推薦優質餐廳客戶給其他供應商，建立合作網絡

#### 接受餐廳推薦場景
- **痛點**：被動等待客戶上門，營銷效果差
- **動機**：獲得優質客戶線索，提升品牌知名度
- **目標**：通過推薦獲得目標客戶群

### 平台方價值主張
- **網絡效應**：用戶推薦用戶，自增長生態
- **降本增效**：減少市場推廣成本，提升獲客效率  
- **提升黏性**：推薦關係增加用戶留存和活躍度

## 🔄 雙向邀請機制設計

### 現有餐廳→供應商邀請（優化）

#### 當前流程回顧
1. 餐廳在平台發起邀請
2. 生成8位邀請碼（如：AB12CD34）
3. 供應商使用邀請碼註冊
4. 自動建立業務關係

#### 優化方案

**批量邀請功能**：
```typescript
interface BatchInvitationRequest {
  suppliers: {
    companyName: string;
    contactEmail: string;
    contactPerson?: string;
    phone?: string;
    specialNote?: string;
  }[];
  invitationTemplate: string;
  expiryDays: number; // 預設30天
}
```

**邀請模板管理**：
- 預設模板：正式邀請、試用邀請、緊急採購
- 自定義模板：支援個性化訊息
- 品牌化元素：餐廳logo、聯絡方式

**智能推薦邀請對象**：
- 基於採購歷史推薦相似供應商
- 地理位置鄰近的供應商
- 同業餐廳合作過的供應商

### 新增供應商→餐廳邀請（核心新功能）

#### 邀請流程設計

**第1步：客戶發現**
```typescript
interface CustomerDiscoveryRequest {
  targetCriteria: {
    locationRadius: number; // 配送半徑（公里）
    restaurantTypes: string[]; // 餐廳類型
    estimatedVolume: 'small' | 'medium' | 'large';
    productCategories: string[]; // 相關商品類別
  };
  maxRecommendations: number; // 最多推薦數量
}
```

**第2步：邀請客製化**
```typescript
interface RestaurantInvitationRequest {
  restaurantId: string;
  invitationMessage: string;
  specialOffers?: {
    discountPercentage?: number;
    freeDelivery?: boolean;
    creditTerms?: number; // 帳期天數
    minimumOrder?: number;
  };
  productSamples?: {
    productId: string;
    sampleQuantity: number;
  }[];
}
```

**第3步：邀請發送與追蹤**
- 多渠道發送：Email、Line、手機簡訊
- 邀請狀態：已發送、已查看、已回應、已接受、已拒絕
- 自動跟進：3天、7天、14天後自動提醒

#### 餐廳接受邀請流程

**邀請驗證頁面**：
```
/auth/restaurant-invite?code={INVITE_CODE}
```

**快速註冊流程**：
- 預填餐廳基本資訊（基於邀請內容）
- 簡化驗證流程（供應商背書）
- 直接建立供應商關係

## 🎁 獎勵機制設計

### 推薦者獎勵方案

#### 餐廳推薦供應商獎勵
**層級式獎勵結構**：

```typescript
interface RestaurantReferralRewards {
  // Tier 1: 推薦成功註冊
  registrationBonus: {
    amount: 500; // NT$500 平台點數
    condition: "被推薦供應商完成註冊";
  };
  
  // Tier 2: 首筆交易
  firstOrderBonus: {
    percentage: 2; // 首筆訂單金額2%回饋
    maxAmount: 2000; // 最高NT$2,000
    condition: "推薦供應商完成首筆交易";
  };
  
  // Tier 3: 持續合作
  ongoingRewards: {
    percentage: 0.5; // 持續交易0.5%回饋
    duration: 6; // 持續6個月
    condition: "維持活躍交易關係";
  };
}
```

#### 供應商推薦餐廳獎勵
**客戶開發激勵**：

```typescript
interface SupplierReferralRewards {
  // 新客戶註冊獎勵
  customerAcquisitionBonus: {
    amount: 1000; // NT$1,000 平台點數
    condition: "推薦餐廳完成註冊並驗證";
  };
  
  // 首筆交易佣金回饋
  firstSaleCommission: {
    percentage: 3; // 首筆訂單毛利3%回饋
    maxAmount: 5000; // 最高NT$5,000
    condition: "推薦餐廳下單購買";
  };
  
  // 長期客戶價值獎勵
  loyaltyBonus: {
    monthlyThreshold: 50000; // 月交易額達NT$50,000
    bonusPercentage: 1; // 額外1%佣金回饋
    condition: "推薦客戶成為長期穩定客戶";
  };
}
```

### 被推薦者優惠方案

#### 新供應商優惠
```typescript
interface NewSupplierBenefits {
  // 平台費用減免
  platformFeeWaiver: {
    duration: 1; // 首月免平台手續費
    feeTypes: ['transaction', 'listing'];
  };
  
  // 新手專屬折扣
  newUserDiscount: {
    percentage: 15; // 首5筆訂單85折
    maxOrders: 5;
    validityDays: 60;
  };
  
  // 優先支援
  prioritySupport: {
    dedicatedAgent: true; // 專屬客服代表
    responseTime: 2; // 2小時內回應
    duration: 30; // 30天優先支援
  };
}
```

#### 新餐廳優惠
```typescript
interface NewRestaurantBenefits {
  // 交易費用優惠
  transactionDiscount: {
    percentage: 20; // 首月交易手續費8折
    duration: 30; // 30天有效期
  };
  
  // 供應商推薦禮包
  supplierIntroduction: {
    freeConsultation: true; // 免費採購顧問諮詢
    productSamples: 3; // 最多3個免費樣品
    customPricing: true; // 客製化報價
  };
  
  // 信用額度優惠
  creditTerms: {
    extendedPayment: 45; // 45天帳期（一般30天）
    creditLimit: 100000; // 首次信用額度NT$10萬
  };
}
```

### 平台點數系統

#### 點數獲得方式
```typescript
interface PointsEarning {
  referralBonus: number; // 推薦獎勵
  transactionCashback: number; // 交易回饋
  reviewBonus: number; // 評價獎勵
  loyaltyPoints: number; // 忠誠度點數
  eventParticipation: number; // 活動參與
}
```

#### 點數使用方式
```typescript
interface PointsRedemption {
  transactionDiscount: {
    rate: 0.01; // 1點 = NT$0.01
    maxPercentage: 50; // 最多抵扣50%
  };
  platformFeeOffset: {
    rate: 0.01;
    maxMonthly: 10000; // 每月最多抵扣NT$100手續費
  };
  premiumFeatures: {
    advancedAnalytics: 5000; // 進階分析報表
    priorityListing: 3000; // 優先排序曝光
    customBranding: 8000; // 客製化品牌頁面
  };
}
```

## 🔗 關係綁定與管理流程

### 自動關係建立

#### 邀請接受觸發流程
```typescript
interface RelationshipEstablishment {
  // 自動觸發條件
  trigger: 'invitation_accepted';
  
  // 建立關係類型
  relationshipType: 'supplier_customer' | 'preferred_partner' | 'strategic_alliance';
  
  // 預設交易條件
  defaultTerms: {
    paymentTerms: number; // 預設帳期
    deliveryTerms: string; // 配送條件
    minimumOrder: number; // 最低訂購量
    discountTier: string; // 折扣級別
  };
  
  // 信任等級繼承
  trustInheritance: {
    level: 'basic' | 'verified' | 'premium';
    creditLimit: number;
    fastTrackVerification: boolean;
  };
}
```

#### 智能條件設定
```typescript
interface SmartTermsGeneration {
  // 基於推薦者歷史資料
  referrerHistory: {
    averageOrderValue: number;
    paymentRecord: 'excellent' | 'good' | 'fair';
    disputeRate: number;
  };
  
  // 行業標準對照
  industryBenchmarks: {
    standardPaymentTerms: number;
    typicalMinimumOrder: number;
    marketDiscountRange: [number, number];
  };
  
  // 生成建議條件
  suggestedTerms: {
    paymentTerms: number;
    creditLimit: number;
    discountPercentage: number;
    specialConditions: string[];
  };
}
```

### 關係維護機制

#### 關係健康度監控
```typescript
interface RelationshipHealth {
  // 交易活躍度
  transactionFrequency: {
    ordersPerMonth: number;
    averageOrderValue: number;
    growthTrend: 'increasing' | 'stable' | 'decreasing';
  };
  
  // 滿意度指標
  satisfactionMetrics: {
    orderFulfillmentRate: number; // 訂單完成率
    deliveryOnTimeRate: number; // 準時交付率
    qualityRating: number; // 品質評分
    serviceRating: number; // 服務評分
  };
  
  // 健康度評分
  healthScore: number; // 0-100分
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}
```

#### 關係優化建議
```typescript
interface RelationshipOptimization {
  // 基於數據分析的建議
  suggestions: {
    orderOptimization: string[]; // 訂購優化建議
    priceNegotiation: string[]; // 價格談判建議
    serviceImprovement: string[]; // 服務改善建議
  };
  
  // 自動化優化選項
  automatedActions: {
    priceAlerts: boolean; // 價格異常提醒
    inventorySync: boolean; // 庫存同步
    autoReorder: boolean; // 自動補單
  };
}
```

## 🏷️ 邀請碼/連結系統

### 邀請碼生成與管理

#### 碼格式規範（擴展現有8位制）
```typescript
interface InviteCodeFormat {
  // 現有格式保持（向後兼容）
  legacy: {
    format: 'XXXXXXXX'; // 8位英數字
    example: 'AB12CD34';
  };
  
  // 新增格式選項
  enhanced: {
    format: 'XXX-XXX-XXX'; // 分組便於記憶
    example: 'ABC-123-DEF';
    checksum: boolean; // 檢查碼防偽
  };
  
  // 特殊場景格式
  bulk: {
    format: 'BULK-XXXX-XX'; // 批量邀請專用
    example: 'BULK-2024-01';
    batchSize: number;
  };
}
```

#### 邀請碼生命週期管理
```typescript
interface InviteCodeLifecycle {
  // 生成階段
  creation: {
    timestamp: Date;
    createdBy: string;
    initialStatus: 'active';
    expiryDays: number; // 預設30天
  };
  
  // 使用階段
  usage: {
    viewedAt?: Date;
    clickedAt?: Date;
    registrationStarted?: Date;
    registrationCompleted?: Date;
  };
  
  // 終止階段
  termination: {
    status: 'expired' | 'used' | 'cancelled' | 'suspended';
    terminatedAt: Date;
    reason?: string;
  };
}
```

### 多渠道分享機制

#### 分享渠道整合
```typescript
interface SharingChannels {
  // Email 分享
  email: {
    templateType: 'formal' | 'casual' | 'promotional';
    customMessage: boolean;
    attachments: ['company_intro', 'product_catalog'];
  };
  
  // Line 分享
  line: {
    messageType: 'text' | 'flex_message' | 'rich_menu';
    qrCodeGeneration: boolean;
    groupSharing: boolean;
  };
  
  // QR Code 生成
  qrCode: {
    size: 'small' | 'medium' | 'large';
    logoEmbedding: boolean;
    downloadFormats: ['png', 'svg', 'pdf'];
  };
  
  // 社群媒體
  socialMedia: {
    platforms: ['facebook', 'instagram', 'linkedin'];
    autoPosting: boolean;
    hashtagSuggestions: string[];
  };
}
```

#### 動態連結生成
```typescript
interface DynamicLinkGeneration {
  // 基礎 URL 結構
  baseUrl: 'https://orderly.tw/invite';
  
  // 參數組成
  parameters: {
    code: string; // 邀請碼
    ref: string; // 推薦人ID
    type: 'supplier' | 'restaurant'; // 邀請類型
    campaign?: string; // 行銷活動標識
    utm_source?: string; // 流量來源
    utm_medium?: string; // 媒介類型
    utm_campaign?: string; // 活動名稱
  };
  
  // 動態內容
  dynamicContent: {
    previewTitle: string; // 連結預覽標題
    previewDescription: string; // 連結預覽描述
    previewImage: string; // 連結預覽圖片
    fallbackUrl: string; // 降級連結
  };
}
```

## 📊 成效追蹤與分析系統

### 推薦漏斗分析

#### 轉換流程追蹤
```typescript
interface ReferralFunnel {
  // 第1階段：邀請發送
  invitationSent: {
    totalSent: number;
    channelBreakdown: Record<string, number>;
    targetAudience: string;
  };
  
  // 第2階段：邀請查看
  invitationViewed: {
    totalViewed: number;
    viewRate: number; // viewed/sent
    avgTimeToView: number; // 小時
  };
  
  // 第3階段：點擊連結
  linkClicked: {
    totalClicks: number;
    clickRate: number; // clicked/viewed
    bounceRate: number; // 立即離開率
  };
  
  // 第4階段：開始註冊
  registrationStarted: {
    totalStarted: number;
    conversionRate: number; // started/clicked
    dropOffPoints: string[]; // 流失節點
  };
  
  // 第5階段：完成註冊
  registrationCompleted: {
    totalCompleted: number;
    completionRate: number; // completed/started
    avgRegistrationTime: number; // 分鐘
  };
  
  // 第6階段：首次交易
  firstTransaction: {
    totalTransacted: number;
    activationRate: number; // transacted/completed
    avgTimeToFirstOrder: number; // 天
  };
}
```

#### 病毒係數計算
```typescript
interface ViralityMetrics {
  // K因子計算（病毒係數）
  kFactor: {
    formula: 'invitationsSentPerUser * conversionRate';
    invitationsSentPerUser: number; // 每用戶平均發送邀請數
    conversionRate: number; // 邀請轉換率
    kValue: number; // K值（>1表示病毒式增長）
  };
  
  // 世代分析
  cohortAnalysis: {
    generation: number; // 推薦世代（第幾代用戶）
    size: number; // 該世代用戶數量
    acquisitionCost: number; // 該世代獲客成本
    lifetimeValue: number; // 該世代生命週期價值
  };
  
  // 網絡效應測量
  networkEffect: {
    nodes: number; // 網絡節點數（用戶數）
    edges: number; // 網絡邊數（關係數）
    density: number; // 網絡密度
    centralityMeasures: Record<string, number>; // 中心性測量
  };
}
```

### ROI 評估與歸因分析

#### 推薦渠道 ROI 計算
```typescript
interface ChannelROI {
  // 成本計算
  costs: {
    systemDevelopment: number; // 系統開發成本
    rewardPayouts: number; // 獎勵支出
    operationalCosts: number; // 營運成本
    marketingSupport: number; // 行銷支援成本
  };
  
  // 收益計算
  revenue: {
    transactionCommission: number; // 交易佣金
    subscriptionFees: number; // 訂閱費用
    valueAddedServices: number; // 增值服務
    lifetimeValue: number; // 用戶生命週期價值
  };
  
  // ROI 指標
  metrics: {
    roi: number; // (收益-成本)/成本
    paybackPeriod: number; // 回本期（月）
    marginContribution: number; // 邊際貢獻
  };
}
```

#### 歸因模型設計
```typescript
interface AttributionModel {
  // 首次接觸歸因
  firstTouch: {
    weight: 100; // 100%歸因給首次推薦
    useCase: '品牌認知測量';
  };
  
  // 最後接觸歸因
  lastTouch: {
    weight: 100; // 100%歸因給最終推薦
    useCase: '轉換效果測量';
  };
  
  // 線性歸因
  linear: {
    weight: 'equal'; // 平均分配給所有接觸點
    useCase: '整體客戶旅程分析';
  };
  
  // 時間衰減歸因
  timeDecay: {
    weight: 'exponential_decay'; // 越近期的接觸點權重越高
    halfLife: 7; // 7天半衰期
    useCase: '近期活動效果測量';
  };
}
```

### A/B 測試框架

#### 測試設計範本
```typescript
interface ABTestDesign {
  // 測試假設
  hypothesis: {
    primary: string; // 主要假設
    secondary: string[]; // 次要假設
    nullHypothesis: string; // 零假設
  };
  
  // 測試變數
  variables: {
    independent: string[]; // 自變數（測試變數）
    dependent: string[]; // 因變數（測量指標）
    controlled: string[]; // 控制變數
  };
  
  // 實驗設計
  design: {
    testType: 'simple' | 'multivariate' | 'split_url';
    sampleSize: number; // 樣本大小
    testDuration: number; // 測試期間（天）
    trafficSplit: Record<string, number>; // 流量分配
    significanceLevel: 0.05; // 顯著性水準
    powerLevel: 0.8; // 統計功效
  };
}
```

#### 測試案例規劃
```typescript
interface TestCases {
  // 邀請訊息優化
  invitationMessage: {
    control: '標準邀請訊息';
    variants: [
      '個性化邀請（含推薦原因）',
      '緊迫感邀請（限時優惠）',
      '社會證明邀請（成功案例）'
    ];
    metric: 'invitation_acceptance_rate';
  };
  
  // 獎勵金額測試
  rewardAmount: {
    control: 'NT$500 平台點數';
    variants: [
      'NT$300 平台點數',
      'NT$1000 平台點數',
      '首筆交易2%回饋'
    ];
    metric: 'referral_participation_rate';
  };
  
  // 註冊流程優化
  onboardingFlow: {
    control: '標準5步驟流程';
    variants: [
      '簡化3步驟流程',
      '引導式智能流程',
      '一頁式快速註冊'
    ];
    metric: 'registration_completion_rate';
  };
}
```

## 💻 技術實作規格

### API 端點設計

#### 推薦管理 APIs
```typescript
// 創建邀請
POST /api/referrals/invitations
{
  invitationType: 'supplier_to_restaurant' | 'restaurant_to_supplier';
  targets: InvitationTarget[];
  message?: string;
  specialOffers?: SpecialOffer[];
  expiryDays?: number;
}

// 查看邀請列表
GET /api/referrals/invitations
Query: {
  status?: 'pending' | 'viewed' | 'accepted' | 'expired';
  dateRange?: [string, string];
  limit?: number;
  offset?: number;
}

// 邀請統計分析
GET /api/referrals/analytics
Query: {
  timeframe: 'daily' | 'weekly' | 'monthly';
  metrics: string[];
  groupBy?: string;
}

// 獎勵查詢
GET /api/referrals/rewards
Response: {
  totalEarned: number;
  pendingRewards: RewardItem[];
  rewardHistory: RewardTransaction[];
  pointsBalance: number;
}

// 兌換獎勵
POST /api/referrals/rewards/redeem
{
  rewardType: 'points' | 'discount' | 'cashback';
  amount: number;
  targetAccount?: string;
}
```

#### 關係管理 APIs
```typescript
// 建立業務關係
POST /api/relationships
{
  type: 'supplier_customer' | 'preferred_partner';
  counterpartyId: string;
  terms: BusinessTerms;
  sourceType: 'referral' | 'direct' | 'platform_match';
  sourceId?: string;
}

// 關係健康度檢查
GET /api/relationships/{relationshipId}/health
Response: {
  healthScore: number;
  metrics: HealthMetrics;
  trends: TrendAnalysis;
  recommendations: string[];
}

// 更新關係條件
PUT /api/relationships/{relationshipId}/terms
{
  paymentTerms?: number;
  creditLimit?: number;
  discountTier?: string;
  specialConditions?: string[];
}
```

### 資料庫 Schema 設計

#### 推薦系統核心表
```sql
-- 邀請記錄表
CREATE TABLE referral_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  inviter_id UUID NOT NULL REFERENCES users(id),
  inviter_type VARCHAR(20) NOT NULL, -- 'restaurant' | 'supplier'
  invitee_type VARCHAR(20) NOT NULL, -- 'restaurant' | 'supplier'
  invitee_email VARCHAR(255) NOT NULL,
  invitee_company_name VARCHAR(255),
  invitee_contact_person VARCHAR(255),
  invitation_message TEXT,
  special_offers JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 獎勵系統表
CREATE TABLE referral_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  invitation_id UUID REFERENCES referral_invitations(id),
  reward_type VARCHAR(50) NOT NULL, -- 'registration_bonus' | 'first_order' | 'ongoing'
  reward_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TWD',
  points_awarded INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'paid' | 'cancelled'
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 業務關係表
CREATE TABLE business_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  relationship_type VARCHAR(30) NOT NULL,
  source_type VARCHAR(20) NOT NULL, -- 'referral' | 'direct' | 'platform_match'
  source_invitation_id UUID REFERENCES referral_invitations(id),
  terms JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active',
  health_score INTEGER DEFAULT 70,
  last_interaction TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, restaurant_id)
);

-- 推薦追蹤表
CREATE TABLE referral_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID NOT NULL REFERENCES referral_invitations(id),
  event_type VARCHAR(50) NOT NULL, -- 'sent' | 'viewed' | 'clicked' | 'registered' | 'transacted'
  event_data JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 平台點數表
CREATE TABLE user_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  points_balance INTEGER DEFAULT 0,
  lifetime_earned INTEGER DEFAULT 0,
  lifetime_spent INTEGER DEFAULT 0,
  last_transaction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 點數交易記錄表
CREATE TABLE points_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_type VARCHAR(20) NOT NULL, -- 'earn' | 'spend' | 'expire'
  points_change INTEGER NOT NULL, -- 正數為獲得，負數為消費
  balance_after INTEGER NOT NULL,
  source_type VARCHAR(50) NOT NULL, -- 'referral' | 'cashback' | 'redemption' | 'promotion'
  source_id UUID, -- 關聯的推薦、交易等ID
  description TEXT,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE, -- 點數到期時間
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 索引設計
```sql
-- 效能優化索引
CREATE INDEX idx_referral_invitations_inviter ON referral_invitations(inviter_id);
CREATE INDEX idx_referral_invitations_code ON referral_invitations(code);
CREATE INDEX idx_referral_invitations_status ON referral_invitations(status);
CREATE INDEX idx_referral_invitations_expires ON referral_invitations(expires_at);

CREATE INDEX idx_referral_rewards_user ON referral_rewards(user_id);
CREATE INDEX idx_referral_rewards_status ON referral_rewards(status);
CREATE INDEX idx_referral_rewards_earned_date ON referral_rewards(earned_at);

CREATE INDEX idx_business_relationships_supplier ON business_relationships(supplier_id);
CREATE INDEX idx_business_relationships_restaurant ON business_relationships(restaurant_id);
CREATE INDEX idx_business_relationships_health ON business_relationships(health_score);

CREATE INDEX idx_referral_tracking_invitation ON referral_tracking(invitation_id);
CREATE INDEX idx_referral_tracking_event_type ON referral_tracking(event_type);
CREATE INDEX idx_referral_tracking_occurred ON referral_tracking(occurred_at);

CREATE INDEX idx_points_transactions_user ON points_transactions(user_id);
CREATE INDEX idx_points_transactions_type ON points_transactions(transaction_type);
CREATE INDEX idx_points_transactions_created ON points_transactions(created_at);
```

### 前端組件設計

#### 推薦儀表板頁面
```typescript
// components/referral/ReferralDashboard.tsx
interface ReferralDashboardProps {
  userType: 'restaurant' | 'supplier';
}

interface ReferralStats {
  totalInvitationsSent: number;
  successfulReferrals: number;
  totalRewardsEarned: number;
  pendingRewards: number;
  conversionRate: number;
  ranking: {
    position: number;
    totalParticipants: number;
  };
}

// 主要功能組件
const ReferralDashboard = ({ userType }: ReferralDashboardProps) => {
  // 統計資料顯示
  // 近期推薦活動
  // 獎勵歷史
  // 推薦排行榜
  // 快速邀請入口
};
```

#### 邀請創建表單
```typescript
// components/referral/InvitationCreator.tsx
interface InvitationFormData {
  invitationType: 'bulk' | 'single';
  targets: InvitationTarget[];
  customMessage: string;
  specialOffers: SpecialOffer[];
  expiryDays: number;
  sharingChannels: string[];
}

const InvitationCreator = () => {
  // 目標選擇器
  // 訊息客製化
  // 優惠設定
  // 分享渠道選擇
  // 預覽與發送
};
```

#### 關係管理介面
```typescript
// components/relationships/RelationshipManager.tsx
interface RelationshipCardProps {
  relationship: BusinessRelationship;
  onUpdateTerms: (terms: BusinessTerms) => void;
  onViewAnalytics: () => void;
}

const RelationshipManager = () => {
  // 關係列表展示
  // 健康度監控
  // 快速操作選單
  // 條件編輯功能
  // 分析報表連結
};
```

### 狀態管理架構

#### Zustand Store 設計
```typescript
// stores/referralStore.ts
interface ReferralStore {
  // 狀態
  invitations: ReferralInvitation[];
  rewards: RewardItem[];
  relationships: BusinessRelationship[];
  analytics: ReferralAnalytics;
  
  // 載入狀態
  loading: {
    invitations: boolean;
    rewards: boolean;
    analytics: boolean;
  };
  
  // 操作方法
  createInvitation: (data: InvitationFormData) => Promise<void>;
  loadInvitations: (filter?: InvitationFilter) => Promise<void>;
  acceptInvitation: (code: string) => Promise<void>;
  redeemRewards: (amount: number) => Promise<void>;
  updateRelationship: (id: string, terms: BusinessTerms) => Promise<void>;
  loadAnalytics: (timeframe: string) => Promise<void>;
}

// stores/pointsStore.ts
interface PointsStore {
  balance: number;
  transactions: PointsTransaction[];
  redemptionOptions: RedemptionOption[];
  
  loadBalance: () => Promise<void>;
  earnPoints: (amount: number, source: string) => Promise<void>;
  spendPoints: (amount: number, target: string) => Promise<void>;
  loadTransactionHistory: () => Promise<void>;
}
```

## 📊 實施優先級與時程

### Phase 1：核心推薦功能（第1-3週）
**優先級：P0 - 核心功能**

#### Week 1-2：基礎架構
- 資料庫 schema 設計與建立
- 基礎 API 端點開發
- 邀請碼生成與驗證系統
- 供應商→餐廳邀請流程

#### Week 3：前端介面
- 推薦儀表板頁面
- 邀請創建表單
- 邀請驗證頁面
- 基礎統計顯示

### Phase 2：獎勵系統（第4-5週）
**優先級：P1 - 重要功能**

#### Week 4：點數系統
- 平台點數機制
- 獎勵計算邏輯
- 點數交易記錄
- 兌換功能實作

#### Week 5：獎勵分發
- 自動獎勵觸發
- 手動獎勵調整
- 獎勵統計報表
- 稅務處理邏輯

### Phase 3：關係管理（第6-7週）
**優先級：P1 - 重要功能**

#### Week 6：關係建立
- 自動關係綁定
- 預設條件設定
- 信任等級繼承
- 關係狀態管理

#### Week 7：關係優化
- 健康度監控
- 智能建議系統
- 條件優化工具
- 關係分析報表

### Phase 4：分析與優化（第8-10週）
**優先級：P2 - 增值功能**

#### Week 8-9：數據分析
- 推薦漏斗追蹤
- 病毒係數計算
- ROI 分析報表
- 歸因模型實作

#### Week 10：A/B 測試
- 測試框架建立
- 實驗設計工具
- 結果分析系統
- 自動化決策

## 🧪 測試策略

### 功能測試

#### 推薦流程測試
```typescript
describe('Referral Flow Tests', () => {
  test('Supplier can create restaurant invitation', async () => {
    // 測試供應商創建餐廳邀請
    // 驗證邀請碼生成
    // 確認邀請資料儲存
  });
  
  test('Restaurant can accept supplier invitation', async () => {
    // 測試餐廳接受邀請
    // 驗證註冊流程
    // 確認關係建立
  });
  
  test('Rewards are correctly calculated and distributed', async () => {
    // 測試獎勵計算邏輯
    // 驗證分發機制
    // 確認點數更新
  });
});
```

#### 邊界條件測試
```typescript
describe('Edge Cases', () => {
  test('Expired invitation handling', async () => {
    // 測試過期邀請處理
  });
  
  test('Duplicate invitation prevention', async () => {
    // 測試重複邀請防範
  });
  
  test('Maximum reward limits', async () => {
    // 測試獎勵上限控制
  });
});
```

### 效能測試

#### 負載測試場景
```typescript
interface LoadTestScenarios {
  // 高並發邀請創建
  concurrentInvitations: {
    users: 1000;
    invitationsPerUser: 10;
    duration: '5 minutes';
  };
  
  // 大量邀請接受
  massAcceptance: {
    simultaneousAcceptances: 500;
    targetResponseTime: '< 2 seconds';
  };
  
  // 獎勵計算壓力測試
  rewardCalculation: {
    transactions: 10000;
    complexRules: true;
    targetProcessingTime: '< 30 seconds';
  };
}
```

### 安全測試

#### 安全測試重點
```typescript
interface SecurityTests {
  // 邀請碼安全
  inviteCodeSecurity: {
    bruteForceProtection: boolean;
    rateLimit: '10 attempts per minute';
    codeComplexity: 'sufficient entropy';
  };
  
  // 獎勵系統安全
  rewardSecurity: {
    duplicatePreventions: boolean;
    fraudDetection: boolean;
    amountValidation: boolean;
  };
  
  // 權限控制
  accessControl: {
    roleBasedAccess: boolean;
    dataIsolation: boolean;
    auditLogging: boolean;
  };
}
```

## 📈 成效評估與 KPI 監控

### 核心指標儀表板

#### 即時監控指標
```typescript
interface RealTimeMetrics {
  // 推薦活動指標
  referralActivity: {
    invitationsSentToday: number;
    acceptanceRateToday: number;
    activeInvitations: number;
    expiringInvitations: number;
  };
  
  // 系統健康指標
  systemHealth: {
    apiResponseTime: number;
    errorRate: number;
    databaseConnections: number;
    cacheHitRate: number;
  };
  
  // 業務健康指標
  businessHealth: {
    newRelationshipsToday: number;
    rewardsDistributedToday: number;
    userEngagementRate: number;
    revenueFromReferrals: number;
  };
}
```

#### 每日營運報表
```typescript
interface DailyOperationalReport {
  // 推薦統計
  referralStats: {
    totalInvitationsSent: number;
    totalAccepted: number;
    conversionRate: number;
    topPerformers: ReferralLeader[];
  };
  
  // 獎勵統計
  rewardStats: {
    totalRewardsEarned: number;
    totalRewardsPaid: number;
    pendingRewards: number;
    topEarners: RewardEarner[];
  };
  
  // 關係統計
  relationshipStats: {
    newRelationships: number;
    totalActiveRelationships: number;
    averageHealthScore: number;
    relationshipsAtRisk: number;
  };
}
```

### 長期趨勢分析

#### 月度成長分析
```typescript
interface MonthlyGrowthAnalysis {
  // 用戶成長
  userGrowth: {
    organicSignups: number;
    referralSignups: number;
    referralPercentage: number;
    monthOverMonthGrowth: number;
  };
  
  // 收益成長
  revenueGrowth: {
    totalRevenue: number;
    referralRevenue: number;
    revenuePerReferral: number;
    roiImprovement: number;
  };
  
  // 網絡效應
  networkEffect: {
    totalConnections: number;
    averageConnectionsPerUser: number;
    networkDensity: number;
    viralCoefficient: number;
  };
}
```

### 預警系統

#### 自動告警規則
```typescript
interface AlertRules {
  // 效能告警
  performance: {
    conversionRateDropBelow: 15; // 轉換率低於15%
    responseTimeExceeds: 5000; // 回應時間超過5秒
    errorRateExceeds: 2; // 錯誤率超過2%
  };
  
  // 業務告警
  business: {
    dailyInvitationsDropBelow: 10; // 每日邀請數少於10
    rewardPayoutExceeds: 50000; // 每日獎勵超過NT$50,000
    fraudSuspicionScore: 0.8; // 欺詐懷疑分數超過0.8
  };
  
  // 系統告警
  system: {
    databaseConnectionIssue: true;
    thirdPartyServiceDown: true;
    unusualTrafficPattern: true;
  };
}
```

## 🚀 上線部署計劃

### 分階段上線策略

#### Phase 1：內測版本（第1週）
- **目標用戶**：內部員工和種子用戶（50人）
- **功能範圍**：基礎推薦流程、簡單獎勵機制
- **成功標準**：功能正常運作，無重大bug
- **監控重點**：系統穩定性、基礎功能驗證

#### Phase 2：邀請制測試（第2-3週）
- **目標用戶**：友好客戶和合作夥伴（200人）
- **功能範圍**：完整推薦功能、獎勵系統
- **成功標準**：轉換率>10%，用戶反饋正面
- **監控重點**：用戶行為、轉換效果

#### Phase 3：限量公測（第4-5週）
- **目標用戶**：隨機選取的現有用戶（20%流量）
- **功能範圍**：全部功能包含分析報表
- **成功標準**：達到預期KPI的70%
- **監控重點**：規模化效果、系統負載

#### Phase 4：全量上線（第6週開始）
- **目標用戶**：所有用戶（100%流量）
- **功能範圍**：完整功能集合
- **成功標準**：達到目標KPI，系統穩定
- **監控重點**：業務指標、長期影響

### 風險緩解計劃

#### 技術風險緩解
```typescript
interface TechnicalRiskMitigation {
  // 系統過載
  systemOverload: {
    loadBalancing: true;
    autoScaling: true;
    circuitBreaker: true;
    gracefulDegradation: true;
  };
  
  // 資料完整性
  dataIntegrity: {
    transactionRollback: true;
    dataValidation: true;
    backupStrategy: true;
    consistencyChecks: true;
  };
  
  // 第三方依賴
  thirdPartyDependency: {
    fallbackMechanisms: true;
    timeoutHandling: true;
    retryLogic: true;
    alternativeProviders: true;
  };
}
```

#### 業務風險緩解
```typescript
interface BusinessRiskMitigation {
  // 欺詐防範
  fraudPrevention: {
    patternDetection: true;
    velocityChecks: true;
    manualReview: true;
    blacklistManagement: true;
  };
  
  // 成本控制
  costControl: {
    dailyLimits: true;
    approvalWorkflow: true;
    budgetAlerts: true;
    emergencyStop: true;
  };
  
  // 用戶體驗
  userExperience: {
    progressiveRollout: true;
    userFeedbackLoop: true;
    rapidIteration: true;
    supportEscalation: true;
  };
}
```

## 📋 後續迭代與擴展

### 短期優化（上線後1-3個月）

#### 用戶體驗優化
- **個性化推薦**：基於用戶行為和偏好的智能推薦
- **獎勵多樣化**：現金回饋、服務升級、專屬功能
- **分享便利性**：一鍵分享、社群整合、病毒式傳播

#### 運營工具完善
- **推薦活動管理**：季節性推薦活動、主題推廣
- **效果追蹤優化**：更精細的歸因分析、預測模型
- **客服整合**：推薦相關問題的專門支援

### 中期發展（3-6個月）

#### 技術能力提升
- **AI 推薦引擎**：機器學習優化推薦匹配
- **預測分析**：用戶行為預測、流失風險預警
- **自動化運營**：智能推薦觸發、動態獎勵調整

#### 生態系統擴展
- **合作夥伴推薦**：物流、金融、技術服務商
- **跨平台整合**：社群媒體、通訊軟體、第三方系統
- **國際化準備**：多語言、多幣種、跨境推薦

### 長期願景（6-12個月）

#### 平台生態建設
- **推薦者社群**：推薦者專屬社群、經驗分享、排行競賽
- **數據服務**：推薦效果分析、市場洞察、行業報告
- **金融整合**：供應鏈金融、推薦擔保、風險共擔

#### 創新模式探索
- **區塊鏈應用**：去中心化推薦、智能合約執行
- **IoT 整合**：設備自動推薦、使用數據驅動
- **元宇宙佈局**：虛擬展示、沉浸式體驗

---

**文檔版本**：1.0  
**最後更新**：2025-01-20  
**負責人**：產品團隊  
**審核狀態**：待審核  
**相關文檔**：PRD-Onboarding-Process.md