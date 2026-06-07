"""
Order Service Enums
訂單服務枚舉類型定義
"""
from enum import Enum


class OrderStatus(str, Enum):
    """
    訂單狀態枚舉

    狀態流轉規則：
    draft → submitted (餐廳提交)
    submitted → confirmed | cancelled (供應商確認/拒絕)
    confirmed → preparing (開始備貨)
    preparing → shipped (出貨)
    shipped → delivered (送達)
    delivered → accepted | disputed (驗收通過/爭議)
    accepted → completed (對帳完成)
    任何狀態 → cancelled (取消，需記錄原因)
    """
    DRAFT = "draft"
    SUBMITTED = "submitted"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    ACCEPTED = "accepted"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class AdjustmentType(str, Enum):
    """訂單調整類型"""
    DISCOUNT = "discount"           # 折扣
    SHIPPING_FEE = "shipping_fee"   # 運費
    TAX_ADJUSTMENT = "tax_adjustment"  # 稅額調整
    CREDIT = "credit"               # 抵用金
    SURCHARGE = "surcharge"         # 加收費用
    OTHER = "other"                 # 其他


class PaymentStatus(str, Enum):
    """付款狀態"""
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"
    OVERDUE = "overdue"
    REFUNDED = "refunded"
