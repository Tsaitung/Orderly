"""
Order Item Schemas
訂單項目 Pydantic Schema 定義
"""
from typing import Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase"""
    components = string.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


class OrderItemBase(BaseModel):
    """訂單項目基礎 Schema"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    product_id: str = Field(..., description="產品 ID")
    product_code: str = Field(..., max_length=50, description="產品代碼")
    product_name: str = Field(..., max_length=200, description="產品名稱")
    quantity: Decimal = Field(..., gt=0, description="數量")
    unit_price: Decimal = Field(..., ge=0, description="單價")
    notes: Optional[str] = Field(None, description="備註")
    sku_id: Optional[str] = Field(None, description="SKU ID")
    is_variable_price: bool = Field(False, description="是否為時價商品")

    @field_validator('quantity', 'unit_price', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is not None:
            return Decimal(str(v))
        return v


class OrderItemCreate(OrderItemBase):
    """創建訂單項目的請求 Schema"""
    sort_order: int = Field(0, ge=0, description="排序順序")


class OrderItemUpdate(BaseModel):
    """更新訂單項目的請求 Schema"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    quantity: Optional[Decimal] = Field(None, gt=0, description="數量")
    unit_price: Optional[Decimal] = Field(None, ge=0, description="單價")
    notes: Optional[str] = Field(None, description="備註")
    confirmed_quantity: Optional[Decimal] = Field(None, ge=0, description="確認數量")
    confirmed_price: Optional[Decimal] = Field(None, ge=0, description="確認價格")
    delivered_quantity: Optional[Decimal] = Field(None, ge=0, description="交貨數量")
    accepted_quantity: Optional[Decimal] = Field(None, ge=0, description="驗收數量")

    @field_validator('quantity', 'unit_price', 'confirmed_quantity', 'confirmed_price', 'delivered_quantity', 'accepted_quantity', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is not None:
            return Decimal(str(v))
        return v


class OrderItemResponse(BaseModel):
    """訂單項目響應 Schema"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    id: str
    order_id: str
    sku_id: Optional[str] = None
    product_id: str
    product_code: str
    product_name: str
    quantity: Decimal
    confirmed_quantity: Optional[Decimal] = None
    delivered_quantity: Optional[Decimal] = None
    accepted_quantity: Optional[Decimal] = None
    unit_price: Decimal
    confirmed_price: Optional[Decimal] = None
    line_total: Decimal
    notes: Optional[str] = None
    is_variable_price: bool = False
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime
