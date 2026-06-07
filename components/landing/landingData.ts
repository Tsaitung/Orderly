/**
 * landingData.ts — 井然 Orderly premium landing 的單一資料來源（SSOT）。
 *
 * 所有 landing section 元件一律 import 此檔取得文案 / 樣本數字 / 定價 / 連結，
 * 元件本身不得 hardcode 任何文案或數字。文案逐字對應已核准的視覺 mockup：
 *   .superpowers/brainstorm/65035-1780824512/content/full-mockup.html
 *
 * Hero 背景圖：已把免費授權餐廳照片在地化到 public/hero/restaurant-hero.jpg。
 * mockup 原參考 Unsplash photo 1414235077428-338989a2e8c0；Hero 元件讀本機
 * 路徑 `/hero/restaurant-hero.jpg`（見 HERO_IMAGE_SRC）。
 *
 * 示意（sample）資料一律標 `sample: true`，元件會在旁標示「（示意）」。
 * 嚴禁出現任何捏造的真實客戶名稱；定價為真實級距（免費 / NT$3,999 / NT$9,999）。
 *
 * 此檔為純資料 + 型別，無 JSX。
 */

/** Hero 背景圖本機路徑。 */
export const HERO_IMAGE_SRC = '/hero/restaurant-hero.jpg' as const

// ---------------------------------------------------------------------------
// 共用型別
// ---------------------------------------------------------------------------

/** 連結（站內 anchor 或站內路由皆用相對 href）。 */
export interface CtaLink {
  label: string
  href: string
}

/** 帶示意旗標的統計數字；sample=true 代表非真實紀錄，元件需標「（示意）」。 */
export interface StatItem {
  value: string
  label: string
  sample: boolean
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export interface HeroContent {
  titleLine1: string
  titleAccent: string
  subtitle: string
  primaryCta: CtaLink
  secondaryCta: CtaLink
}

export const HERO: HeroContent = {
  titleLine1: '對帳，從 8 小時',
  titleAccent: '到 30 分鐘',
  subtitle:
    '井然 Orderly 用 AI 自動比對訂單・送貨單・發票，三方逐筆勾稽，差異一鍵核准。',
  primaryCta: { label: '預約 Demo', href: '/contact' },
  secondaryCta: { label: '看實際運作', href: '#reconciliation' },
}

/** Hero 底部三個統計（自動匹配率與服務餐廳為示意）。 */
export const HERO_STATS: StatItem[] = [
  { value: '99.4%', label: '自動匹配率', sample: true },
  { value: '8h→30m', label: '對帳工時', sample: false },
  { value: '1,200+', label: '服務餐廳', sample: true },
]

// ---------------------------------------------------------------------------
// Trust bar
// ---------------------------------------------------------------------------

/** 信任條四個統計，全為示意數字。 */
export const TRUST_STATS: StatItem[] = [
  { value: 'NT$24億', label: '年處理 GMV', sample: true },
  { value: '1,200+', label: '服務餐廳', sample: true },
  { value: '380+', label: '串接供應商', sample: true },
  { value: '99.4%', label: '平均自動匹配', sample: true },
]

// ---------------------------------------------------------------------------
// Pain / Solution 對照
// ---------------------------------------------------------------------------

export interface ComparePane {
  title: string
  items: string[]
}

export const PAIN: ComparePane = {
  title: '現在：人工逐筆對單',
  items: [
    '紙本送貨單 + Excel 手動比對',
    '數量、單價、發票三方逐筆核',
    '差異靠電話 / LINE 來回爭議',
    '月底結算塞車，平均 8 小時',
  ],
}

export const SOLUTION: ComparePane = {
  title: '導入後：Orderly 自動對帳',
  items: [
    '訂單・送貨・發票自動三方勾稽',
    'AI 標出數量差 / 價差 / 未匹配',
    '差異一鍵核准，留稽核軌跡',
    '對帳壓到 30 分鐘內',
  ],
}

// ---------------------------------------------------------------------------
// 運作流程 5 步
// ---------------------------------------------------------------------------

export interface FlowStep {
  n: number
  title: string
  desc: string
}

export const STEPS: FlowStep[] = [
  { n: 1, title: '下單', desc: '線上下單，品項價格即時帶入' },
  { n: 2, title: '配送', desc: '供應商確認、出貨追蹤' },
  { n: 3, title: '驗收', desc: '拍照核對、差異即時記錄' },
  { n: 4, title: '對帳', desc: 'AI 三方自動勾稽' },
  { n: 5, title: '結算', desc: '發票收款、報表一鍵' },
]

// ---------------------------------------------------------------------------
// 功能特色 8 項
// ---------------------------------------------------------------------------

/**
 * @property icon lucide-react 的 icon 元件「名稱」（字串）。
 *   元件端以 `LucideIcons[icon]` 動態取用，需確保名稱存在於 lucide-react@0.359.0。
 */
export interface FeatureItem {
  icon: string
  title: string
  desc: string
}

export const FEATURES: FeatureItem[] = [
  { icon: 'ClipboardList', title: '訂單管理', desc: '下單、確認、追蹤一條龍' },
  { icon: 'Camera', title: '拍照驗收', desc: '到貨核對，差異即時留證' },
  { icon: 'Tags', title: 'SKU 主檔', desc: '品項、價格、稅則集中管' },
  { icon: 'ShieldCheck', title: '權限矩陣', desc: '角色細粒度權限控管' },
  { icon: 'Plug', title: 'ERP・API 整合', desc: 'API 優先，無縫串接既有 ERP' },
  { icon: 'Bell', title: '即時通知', desc: '關鍵事件即時推送' },
  { icon: 'BarChart3', title: '財務報表', desc: '對帳、結算一鍵匯出' },
  { icon: 'ScrollText', title: '稽核軌跡', desc: '每筆操作可回溯' },
]

// ---------------------------------------------------------------------------
// 三角色方案
// ---------------------------------------------------------------------------

export interface RoleItem {
  key: 'restaurant' | 'supplier' | 'platform'
  name: string
  /** 角色強調色（hex），對應 mockup 的 --r / --s / --p。 */
  accent: string
  href: string
  /** 三條核心價值主張。 */
  valueProps: [string, string, string]
  /** 角色截圖區塊的佔位標籤（後續換實際截圖）。 */
  shotLabel: string
}

export const ROLES: RoleItem[] = [
  {
    key: 'restaurant',
    name: '餐廳',
    accent: '#ff6b35',
    href: '/restaurant',
    valueProps: [
      '數位下單，價格稅則自動帶入',
      '拍照驗收，差異即時留證',
      'AI 對帳，帳務透明可追溯',
    ],
    shotLabel: '餐廳 Dashboard 縮影',
  },
  {
    key: 'supplier',
    name: '供應商',
    accent: '#00a896',
    href: '/supplier',
    valueProps: [
      '訂單集中管理，確認出貨不漏單',
      '出貨與發票對應，款項進度一目了然',
      '與餐廳共用對帳，差異少爭議',
    ],
    shotLabel: '供應商 Dashboard 縮影',
  },
  {
    key: 'platform',
    name: '平台',
    accent: '#6366f1',
    href: '/platform',
    valueProps: [
      '全鏈路交易與履約即時監控',
      '異常自動標示，加速例外處理',
      '完整稽核軌跡，營運數據可追溯',
    ],
    shotLabel: '平台 Dashboard 縮影',
  },
]

// ---------------------------------------------------------------------------
// 定價（真實級距）
// ---------------------------------------------------------------------------

export interface PricingTier {
  name: string
  price: string
  period: '/月'
  popular: boolean
  modules: string[]
  cta: CtaLink
}

export const PRICING: PricingTier[] = [
  {
    name: '免費版',
    price: 'NT$0',
    period: '/月',
    popular: false,
    modules: ['基本下單與驗收', '單一門市', '社群支援'],
    cta: { label: '開始使用', href: '/register' },
  },
  {
    name: '專業版',
    price: 'NT$3,999',
    period: '/月',
    popular: true,
    modules: [
      'AI 自動對帳',
      '多門市 + ERP 同步',
      '財務報表 + 稽核軌跡',
      '優先支援',
    ],
    cta: { label: '開始使用', href: '/register' },
  },
  {
    name: '企業版',
    price: 'NT$9,999',
    period: '/月',
    popular: false,
    modules: ['專業版全部', '客製整合 + SSO', '專屬客戶成功經理'],
    cta: { label: '聯絡業務', href: '/contact' },
  },
]

export const PRICING_NOTE =
  '另含交易抽成 1.5–3% GMV（依量級與品類分級）。價格為實際級距。'

// ---------------------------------------------------------------------------
// FAQ（依角色分組）
// ---------------------------------------------------------------------------

export interface FaqItem {
  q: string
  a: string
}

export interface FaqContent {
  restaurant: FaqItem[]
  supplier: FaqItem[]
}

export const FAQ: FaqContent = {
  restaurant: [
    {
      q: '上線需要多久？',
      a: '基本下單與驗收功能可即時開通使用。若需匯入既有品項主檔、設定門市與權限，視導入情況通常數天至數週可完成。',
    },
    {
      q: '需要哪些 ERP 相容條件？',
      a: 'Orderly 採 API 優先設計，只要您的 ERP 提供可存取的 API 或標準匯入／匯出介面即可串接。實際對接方式與工時視您使用的 ERP 而定。',
    },
    {
      q: '資料安全與隔離如何處理？',
      a: '各租戶資料以 tenant 邏輯隔離，存取受角色權限控管，傳輸採加密連線，重要操作留有稽核軌跡。',
    },
    {
      q: '有沒有試用或綁約？',
      a: '免費版可直接註冊使用，不需綁約。付費方案以月計費，是否提供試用與合約條件，視導入情況與洽談結果而定。',
    },
  ],
  supplier: [
    {
      q: '上線需要多久？',
      a: '受邀加入後即可開始接收與確認訂單。出貨追蹤與對帳協作的完整設定，視導入情況通常數天內可完成。',
    },
    {
      q: '需要哪些 ERP 相容條件？',
      a: '同樣採 API 優先，可與您現有的進銷存或出貨系統串接；若暫無 API，亦可透過標準匯入介面對接。實際整合方式視您的系統而定。',
    },
    {
      q: '資料安全與隔離如何處理？',
      a: '您與各餐廳的往來資料以租戶隔離，僅授權對象可存取對應訂單與對帳資料，並保留完整操作紀錄。',
    },
    {
      q: '有沒有試用或綁約？',
      a: '受邀供應商可免費使用核心訂單與對帳協作功能。進階功能與合約條件視合作範圍而定。',
    },
  ],
}

// ---------------------------------------------------------------------------
// 導覽與頁尾
// ---------------------------------------------------------------------------

export interface NavLink {
  label: string
  href: string
}

export const NAV_LINKS: NavLink[] = [
  { label: '產品', href: '#features' },
  { label: '方案', href: '#roles' },
  { label: '定價', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export interface FooterColumn {
  title: string
  links: NavLink[]
}

export const FOOTER: FooterColumn[] = [
  {
    title: '產品',
    links: [
      { label: '功能', href: '#features' },
      { label: 'AI 對帳', href: '#reconciliation' },
      { label: '定價', href: '#pricing' },
    ],
  },
  {
    title: '方案',
    links: [
      { label: '餐廳', href: '/restaurant' },
      { label: '供應商', href: '/supplier' },
      { label: '平台', href: '/platform' },
    ],
  },
  {
    title: '公司',
    links: [
      { label: '聯絡我們', href: '/contact' },
      { label: '隱私權政策', href: '/privacy' },
      { label: '服務條款', href: '/terms' },
    ],
  },
]
