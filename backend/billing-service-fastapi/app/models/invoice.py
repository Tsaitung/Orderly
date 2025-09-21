from sqlalchemy import Column, String, Date, DECIMAL, JSON
from .base import BaseModel


class Invoice(BaseModel):
    __tablename__ = "invoices"

    invoice_number = Column("invoiceNumber", String, unique=True, nullable=False)
    organization_id = Column("organizationId", String, nullable=False)
    order_id = Column("orderId", String, nullable=True)
    status = Column(String, nullable=False, default="draft")
    issue_date = Column("issueDate", Date, nullable=True)
    due_date = Column("dueDate", Date, nullable=True)
    subtotal = Column(DECIMAL(12, 2), nullable=False, default=0)
    tax_amount = Column("taxAmount", DECIMAL(12, 2), nullable=False, default=0)
    total_amount = Column("totalAmount", DECIMAL(12, 2), nullable=False, default=0)
    custom_metadata = Column("metadata", JSON, nullable=False, default=dict)

