"""
Order and OrderItem Models
訂單與訂單項目資料模型
"""
from sqlalchemy import Column, String, Date, JSON, Text, DECIMAL, ForeignKey, Enum, Boolean, Integer, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import BaseModel
from .enums import OrderStatus, PaymentStatus


class Order(BaseModel):
    """
    訂單主表

    Attributes:
        order_number: 訂單編號（唯一）
        tenant_id: 租戶 ID（多租戶隔離）
        restaurant_id: 餐廳 ID
        supplier_id: 供應商 ID
        status: 訂單狀態（使用 OrderStatus enum）
        payment_status: 付款狀態
        subtotal: 小計
        tax_amount: 稅額
        discount_amount: 折扣金額
        shipping_fee: 運費
        total_amount: 總金額
        delivery_date: 預計交貨日期
        actual_delivery_date: 實際交貨日期
        delivery_address: 配送地址（JSON）
        receiving_unit: 收貨單位
        notes: 備註
        internal_notes: 內部備註（供應商）
        adjustments: 調整項（JSON）
        created_by: 創建者 ID
        confirmed_by: 確認者 ID
        confirmed_at: 確認時間
    """
    __tablename__ = "orders"

    # 訂單識別
    order_number = Column("order_number", String(50), unique=True, nullable=False, index=True)
    tenant_id = Column("tenant_id", String(36), nullable=False, index=True)

    # 關聯方
    restaurant_id = Column("restaurant_id", String(36), nullable=False, index=True)
    supplier_id = Column("supplier_id", String(36), nullable=False, index=True)

    # 狀態
    status = Column(
        Enum(OrderStatus, name="order_status", create_type=False),
        nullable=False,
        default=OrderStatus.DRAFT,
        index=True
    )
    payment_status = Column(
        Enum(PaymentStatus, name="payment_status", create_type=False),
        nullable=False,
        default=PaymentStatus.PENDING
    )

    # 金額
    subtotal = Column(DECIMAL(12, 2), nullable=False, default=0)
    tax_amount = Column("tax_amount", DECIMAL(12, 2), nullable=False, default=0)
    discount_amount = Column("discount_amount", DECIMAL(12, 2), nullable=False, default=0)
    shipping_fee = Column("shipping_fee", DECIMAL(12, 2), nullable=False, default=0)
    total_amount = Column("total_amount", DECIMAL(12, 2), nullable=False, default=0)

    # 交貨資訊
    delivery_date = Column("delivery_date", Date, nullable=False)
    actual_delivery_date = Column("actual_delivery_date", Date, nullable=True)
    delivery_address = Column("delivery_address", JSON, nullable=True)
    receiving_unit = Column("receiving_unit", String(100), nullable=True)

    # 備註
    notes = Column(Text, nullable=True)
    internal_notes = Column("internal_notes", Text, nullable=True)

    # 調整項（折扣、運費調整等）
    adjustments = Column(JSON, nullable=False, default=list)

    # 審計
    created_by = Column("created_by", String(36), nullable=False)
    confirmed_by = Column("confirmed_by", String(36), nullable=True)
    confirmed_at = Column("confirmed_at", DateTime(timezone=True), nullable=True)

    # 是否已刪除（軟刪除）
    is_deleted = Column("is_deleted", Boolean, nullable=False, default=False)

    # 關聯
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="selectin")
    status_history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan", lazy="selectin")

    def __repr__(self):
        return f"<Order(id={self.id}, order_number={self.order_number}, status={self.status})>"


class OrderItem(BaseModel):
    """
    訂單項目

    Attributes:
        order_id: 訂單 ID
        sku_id: SKU ID
        product_id: 產品 ID
        product_code: 產品代碼
        product_name: 產品名稱
        quantity: 數量
        confirmed_quantity: 確認數量（供應商確認）
        delivered_quantity: 實際交貨數量
        accepted_quantity: 驗收數量
        unit_price: 單價
        confirmed_price: 確認價格（時價商品）
        line_total: 行總計
        notes: 備註
        is_variable_price: 是否為時價商品
    """
    __tablename__ = "order_items"

    order_id = Column("order_id", String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    sku_id = Column("sku_id", String(36), nullable=True, index=True)
    product_id = Column("product_id", String(36), nullable=False, index=True)
    product_code = Column("product_code", String(50), nullable=False)
    product_name = Column("product_name", String(200), nullable=False)

    # 數量
    quantity = Column(DECIMAL(10, 3), nullable=False)
    confirmed_quantity = Column("confirmed_quantity", DECIMAL(10, 3), nullable=True)
    delivered_quantity = Column("delivered_quantity", DECIMAL(10, 3), nullable=True)
    accepted_quantity = Column("accepted_quantity", DECIMAL(10, 3), nullable=True)

    # 價格
    unit_price = Column("unit_price", DECIMAL(10, 4), nullable=False)
    confirmed_price = Column("confirmed_price", DECIMAL(10, 4), nullable=True)
    line_total = Column("line_total", DECIMAL(12, 2), nullable=False)

    # 備註
    notes = Column(Text, nullable=True)

    # 時價商品標記
    is_variable_price = Column("is_variable_price", Boolean, nullable=False, default=False)

    # 排序
    sort_order = Column("sort_order", Integer, nullable=False, default=0)

    # 關聯
    order = relationship("Order", back_populates="items")

    def __repr__(self):
        return f"<OrderItem(id={self.id}, product_name={self.product_name}, quantity={self.quantity})>"


class OrderStatusHistory(BaseModel):
    """
    訂單狀態變更歷史

    Attributes:
        order_id: 訂單 ID
        from_status: 原狀態
        to_status: 新狀態
        changed_by: 變更者 ID
        changed_at: 變更時間
        reason: 變更原因
        notes: 備註
    """
    __tablename__ = "order_status_history"

    order_id = Column("order_id", String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(
        "from_status",
        Enum(OrderStatus, name="order_status", create_type=False),
        nullable=True
    )
    to_status = Column(
        "to_status",
        Enum(OrderStatus, name="order_status", create_type=False),
        nullable=False
    )
    changed_by = Column("changed_by", String(36), nullable=False)
    changed_at = Column("changed_at", DateTime(timezone=True), server_default=func.now(), nullable=False)
    reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # 關聯
    order = relationship("Order", back_populates="status_history")

    def __repr__(self):
        return f"<OrderStatusHistory(order_id={self.order_id}, {self.from_status} -> {self.to_status})>"


class OrderAdjustment(BaseModel):
    """
    訂單調整項

    Attributes:
        order_id: 訂單 ID
        type: 調整類型
        amount: 調整金額
        reason: 調整原因
        created_by: 創建者 ID
    """
    __tablename__ = "order_adjustments"

    order_id = Column("order_id", String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    adjustment_type = Column("adjustment_type", String(50), nullable=False)
    amount = Column(DECIMAL(12, 2), nullable=False)
    reason = Column(Text, nullable=True)
    created_by = Column("created_by", String(36), nullable=False)
    is_active = Column("is_active", Boolean, nullable=False, default=True)

    def __repr__(self):
        return f"<OrderAdjustment(order_id={self.order_id}, type={self.adjustment_type}, amount={self.amount})>"
