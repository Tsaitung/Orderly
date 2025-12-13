"""
Order Schemas
訂單 Pydantic Schema 定義
"""
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict

from app.models.enums import OrderStatus, PaymentStatus
from .order_item import OrderItemCreate, OrderItemResponse


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase"""
    components = string.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


class DeliveryAddress(BaseModel):
    """配送地址 Schema"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    address_line1: str = Field(..., description="地址第一行")
    address_line2: Optional[str] = Field(None, description="地址第二行")
    city: Optional[str] = Field(None, description="城市")
    district: Optional[str] = Field(None, description="區域")
    postal_code: Optional[str] = Field(None, description="郵遞區號")
    contact_name: Optional[str] = Field(None, description="聯絡人")
    contact_phone: Optional[str] = Field(None, description="聯絡電話")
    notes: Optional[str] = Field(None, description="配送備註")


class OrderBase(BaseModel):
    """訂單基礎 Schema"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    supplier_id: str = Field(..., description="供應商 ID")
    delivery_date: date = Field(..., description="預計交貨日期")
    delivery_address: Optional[Dict[str, Any]] = Field(None, description="配送地址")
    receiving_unit: Optional[str] = Field(None, max_length=100, description="收貨單位")
    notes: Optional[str] = Field(None, description="備註")


class OrderCreate(OrderBase):
    """創建訂單的請求 Schema"""
    restaurant_id: Optional[str] = Field(None, description="餐廳 ID（可從 header 取得）")
    items: List[OrderItemCreate] = Field(..., min_length=1, description="訂單項目（至少一項）")

    @field_validator('items')
    @classmethod
    def validate_items(cls, v):
        if not v or len(v) == 0:
            raise ValueError('訂單必須包含至少一個項目')
        return v


class OrderUpdate(BaseModel):
    """更新訂單的請求 Schema"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    delivery_date: Optional[date] = Field(None, description="預計交貨日期")
    delivery_address: Optional[Dict[str, Any]] = Field(None, description="配送地址")
    receiving_unit: Optional[str] = Field(None, max_length=100, description="收貨單位")
    notes: Optional[str] = Field(None, description="備註")


class OrderStatusUpdate(BaseModel):
    """更新訂單狀態的請求 Schema"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    status: OrderStatus = Field(..., description="目標狀態")
    reason: Optional[str] = Field(None, description="狀態變更原因")
    notes: Optional[str] = Field(None, description="備註")


class ConfirmedItem(BaseModel):
    """供應商確認的項目"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    item_id: str = Field(..., description="訂單項目 ID")
    confirmed_quantity: Decimal = Field(..., ge=0, description="確認數量")
    confirmed_price: Optional[Decimal] = Field(None, ge=0, description="確認價格（時價商品必填）")

    @field_validator('confirmed_quantity', 'confirmed_price', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is not None:
            return Decimal(str(v))
        return v


class OrderConfirmRequest(BaseModel):
    """供應商確認訂單的請求 Schema"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    confirmed_items: List[ConfirmedItem] = Field(..., description="確認的項目")
    estimated_delivery_time: Optional[str] = Field(None, description="預計送達時間")
    internal_notes: Optional[str] = Field(None, description="內部備註")
    notes: Optional[str] = Field(None, description="給餐廳的備註")


class OrderStatusHistoryResponse(BaseModel):
    """訂單狀態歷史響應 Schema"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    id: str
    order_id: str
    from_status: Optional[OrderStatus] = None
    to_status: OrderStatus
    changed_by: str
    changed_at: datetime
    reason: Optional[str] = None
    notes: Optional[str] = None


class OrderResponse(BaseModel):
    """訂單響應 Schema"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    id: str
    order_number: str
    tenant_id: str
    restaurant_id: str
    supplier_id: str
    status: OrderStatus
    status_display: Optional[str] = None
    payment_status: PaymentStatus
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    shipping_fee: Decimal
    total_amount: Decimal
    delivery_date: date
    actual_delivery_date: Optional[date] = None
    delivery_address: Optional[Dict[str, Any]] = None
    receiving_unit: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    adjustments: List[Dict[str, Any]] = []
    created_by: str
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    is_deleted: bool = False
    items: List[OrderItemResponse] = []
    status_history: List[OrderStatusHistoryResponse] = []
    created_at: datetime
    updated_at: datetime

    @model_validator(mode='after')
    def add_status_display(self):
        """添加狀態顯示名稱"""
        from app.services.order_state_machine import OrderStateMachine
        if self.status:
            self.status_display = OrderStateMachine.get_status_display(self.status)
        return self


class OrderListResponse(BaseModel):
    """訂單列表響應 Schema"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    success: bool = True
    data: List[OrderResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class OrderAdjustmentCreate(BaseModel):
    """創建訂單調整項的請求 Schema"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    adjustment_type: str = Field(..., description="調整類型")
    amount: Decimal = Field(..., description="調整金額")
    reason: Optional[str] = Field(None, description="調整原因")

    @field_validator('amount', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is not None:
            return Decimal(str(v))
        return v


class OrderAdjustmentResponse(BaseModel):
    """訂單調整項響應 Schema"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    id: str
    order_id: str
    adjustment_type: str
    amount: Decimal
    reason: Optional[str] = None
    created_by: str
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class OrderStatsResponse(BaseModel):
    """訂單統計響應 Schema"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    total_orders: int
    total_amount: Decimal
    by_status: Dict[str, int]
    by_payment_status: Dict[str, int]
    average_order_value: Decimal
    period_start: Optional[date] = None
    period_end: Optional[date] = None
