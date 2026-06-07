from sqlalchemy import Column, String, Date, JSON, Text, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel


class Acceptance(BaseModel):
    __tablename__ = "acceptances"

    order_id = Column("orderId", String, nullable=False)
    restaurant_id = Column("restaurantId", String, nullable=False)
    supplier_id = Column("supplierId", String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    accepted_date = Column("acceptedDate", Date, nullable=True)
    notes = Column(Text, nullable=True)
    discrepancies = Column(JSON, nullable=False, default=list)


class AcceptanceItem(BaseModel):
    __tablename__ = "acceptance_items"

    acceptance_id = Column("acceptanceId", String, ForeignKey("acceptances.id"), nullable=False)
    product_code = Column("productCode", String, nullable=False)
    product_name = Column("productName", String, nullable=False)
    delivered_qty = Column("deliveredQty", String, nullable=False)
    accepted_qty = Column("acceptedQty", String, nullable=False)
    unit = Column(String, nullable=True)
    reason = Column(String, nullable=True)

