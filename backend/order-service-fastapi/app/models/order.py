from sqlalchemy import Column, String, Date, JSON, Text, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel


class Order(BaseModel):
    __tablename__ = "orders"

    order_number = Column("orderNumber", String, unique=True, nullable=False)
    restaurant_id = Column("restaurantId", String, nullable=False, index=True)
    supplier_id = Column("supplierId", String, nullable=False, index=True)
    status = Column(String, nullable=False, default="draft")
    subtotal = Column(DECIMAL(12, 2), nullable=False)
    tax_amount = Column("taxAmount", DECIMAL(12, 2), nullable=False)
    total_amount = Column("totalAmount", DECIMAL(12, 2), nullable=False)
    delivery_date = Column("deliveryDate", Date, nullable=False)
    delivery_address = Column("deliveryAddress", JSON, nullable=True)
    notes = Column(Text, nullable=True)
    adjustments = Column(JSON, nullable=False, default=list)
    created_by = Column("createdBy", String, nullable=False)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(BaseModel):
    __tablename__ = "order_items"

    order_id = Column("orderId", String, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column("productId", String, nullable=False)
    product_code = Column("productCode", String, nullable=False)
    product_name = Column("productName", String, nullable=False)
    quantity = Column(DECIMAL(10, 3), nullable=False)
    unit_price = Column("unitPrice", DECIMAL(10, 4), nullable=False)
    line_total = Column("lineTotal", DECIMAL(12, 2), nullable=False)
    notes = Column(Text, nullable=True)

    order = relationship("Order", back_populates="items")

