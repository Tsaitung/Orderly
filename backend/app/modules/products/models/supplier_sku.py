"""
SupplierSKU SQLAlchemy model
供應商 SKU 關聯模型（獨立檔案避免衝突）
"""
from decimal import Decimal
from sqlalchemy import Column, String, Boolean, JSON, ForeignKey, Integer, Numeric, DateTime
from sqlalchemy.orm import relationship
from .base import BaseModel


class SupplierSKU(BaseModel):
    """
    Multi-supplier SKU mapping
    支援多供應商對應與差異化定價
    """
    __tablename__ = "supplier_skus"

    # Foreign keys
    sku_id = Column(String, ForeignKey("product_skus.id"), nullable=False)
    supplier_id = Column(
        String,
        ForeignKey("organizations.id", name="fk_supplier_skus_supplier_id_organizations"),
        nullable=False,
        index=True,
    )

    # Supplier-specific information
    supplier_sku_code = Column(String, nullable=False)  # 供應商內部SKU代碼
    supplier_name_for_product = Column(String, nullable=True)  # 供應商產品名稱

    # Pricing
    supplier_price = Column(Numeric(10, 4), nullable=False)
    bulk_discount_threshold = Column(Integer, nullable=True)
    bulk_discount_rate = Column(Numeric(5, 4), nullable=True)  # 0.1000 = 10%

    # Enhanced pricing tiers (JSON format for flexibility)
    pricing_tiers = Column(JSON, default=[], nullable=False)
    # Example: [{"min_qty": 100, "price": 9.50}, {"min_qty": 500, "price": 9.00}]

    # Supply information
    lead_time_days = Column(Integer, default=1, nullable=False)
    minimum_order_quantity = Column(Integer, default=1, nullable=False)
    availability_status = Column(String, default="available", nullable=False)

    # Quality & Certifications
    supplier_quality_grade = Column(String, nullable=True)
    certifications = Column(JSON, default=[], nullable=False)

    # Contract information
    contract_start_date = Column(DateTime(timezone=True), nullable=True)
    contract_end_date = Column(DateTime(timezone=True), nullable=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_preferred = Column(Boolean, default=False, nullable=False)  # 是否優先供應商

    # Performance metrics
    quality_score = Column(Numeric(3, 2), nullable=True)  # 0.00-5.00
    delivery_score = Column(Numeric(3, 2), nullable=True)  # 0.00-5.00
    service_score = Column(Numeric(3, 2), nullable=True)   # 0.00-5.00

    # Audit
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # Unique constraint
    __table_args__ = (
        {"comment": "Multi-supplier SKU mapping with differential pricing"}
    )

    def __repr__(self):
        return f"<SupplierSKU(sku_id={self.sku_id}, supplier_id={self.supplier_id}, price={self.supplier_price})>"

    @property
    def overall_score(self) -> float:
        """計算綜合評分"""
        scores = [s for s in [self.quality_score, self.delivery_score, self.service_score] if s is not None]
        return sum(float(s) for s in scores) / len(scores) if scores else 0.0

    @property
    def effective_price(self) -> Decimal:
        """根據數量計算有效價格"""
        return self.supplier_price
