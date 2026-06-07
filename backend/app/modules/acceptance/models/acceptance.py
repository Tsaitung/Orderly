from sqlalchemy import Column, String, Date, JSON, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
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

    # acceptances.id (parent PK) is UUID; this FK was declared String, which
    # cannot build a varchar->uuid FK. Align to the migration's UUID.
    acceptance_id = Column("acceptanceId", UUID(as_uuid=True), ForeignKey("acceptances.id"), nullable=False)
    product_code = Column("productCode", String, nullable=False)
    product_name = Column("productName", String, nullable=False)
    delivered_qty = Column("deliveredQty", String, nullable=False)
    accepted_qty = Column("acceptedQty", String, nullable=False)
    unit = Column(String, nullable=True)
    reason = Column(String, nullable=True)

