"""
Billing Service Enums
基於 Database-Schema-Core.md 和 PRD-Billing-Master.md 定義
"""

from enum import Enum


class ReconciliationStatus(str, Enum):
    """對帳狀態（依 Database-Schema-Core.md:269-276）"""
    PENDING = "pending"              # 待處理
    PROCESSING = "processing"        # 處理中
    REVIEW_REQUIRED = "review_required"  # 需要審核
    APPROVED = "approved"            # 已核准
    DISPUTED = "disputed"            # 有爭議
    RESOLVED = "resolved"            # 已解決


class DiscrepancyType(str, Enum):
    """差異類型（依 Database-Schema-Core.md:361-376）"""
    NONE = "none"                    # 無差異
    QUANTITY = "quantity"            # 數量差異
    PRICE = "price"                  # 價格差異
    MISSING_ITEM = "missing_item"    # 缺漏項目
    EXTRA_ITEM = "extra_item"        # 額外項目
    DUPLICATE = "duplicate"          # 重複項目


class FeeType(str, Enum):
    """費用類型（依 PRD-Billing-Master.md:23-29）"""
    TRANSACTION_FEE = "transaction_fee"  # 交易佣金
    SUBSCRIPTION = "subscription"        # 訂閱費
    SAVINGS_SHARE = "savings_share"      # 節省分成
    PROMO = "promo"                      # 促銷費用
    FAST_PAYOUT = "fast_payout"          # 快速撥款
    OTHER = "other"                      # 其他


class PricingModel(str, Enum):
    """定價模式（依 PRD-Billing-Master.md:44-89）"""
    PERCENTAGE = "percentage"    # 百分比
    FIXED = "fixed"              # 固定金額
    TIERED = "tiered"            # 分層費率
    FORMULA = "formula"          # 公式計算


class BillingCycle(str, Enum):
    """計費週期（依 PRD-Billing-Master.md:28）"""
    PER_ORDER = "per_order"      # 每筆訂單
    DAILY = "daily"              # 每日
    WEEKLY = "weekly"            # 每週
    MONTHLY = "monthly"          # 每月
    ONE_TIME = "one_time"        # 一次性


class WhoPays(str, Enum):
    """付費方（依 PRD-Billing-Master.md:27）"""
    SUPPLIER = "supplier"        # 供應商
    RESTAURANT = "restaurant"    # 餐廳
    PLATFORM = "platform"        # 平台
    SHARED = "shared"            # 共同分擔


class SettlementTerms(str, Enum):
    """結算條款（依 PRD-Billing-Master.md:136）"""
    T_PLUS_0 = "T+0"             # 當日結算
    T_PLUS_1 = "T+1"             # 次日結算
    T_PLUS_7 = "T+7"             # 7日後結算
    WEEKLY = "weekly"            # 每週結算
    MONTHLY = "monthly"          # 每月結算


class SubscriptionPlan(str, Enum):
    """訂閱方案（依 PRD-Billing-Master.md:101-109）"""
    FREE = "free"                # 免費方案
    PRO = "pro"                  # 專業方案
    ENTERPRISE = "enterprise"    # 企業方案
