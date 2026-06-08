"""
Reconciliation Models
基於 Database-Schema-Core.md:264-388 的對帳引擎設計
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from uuid import uuid4

from sqlalchemy import (
    Column, String, Boolean, DateTime, Date, ForeignKey,
    Numeric, Text, JSON, Integer, Index, Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column

from .base import Base
from .enums import ReconciliationStatus, DiscrepancyType


class Reconciliation(Base):
    """對帳記錄表（依 Database-Schema-Core.md:278-326）"""

    __tablename__ = "reconciliations"

    # Primary key
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))

    # Unique identifier
    reconciliation_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    # Period
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)

    # 多租戶關係 (tenant_id as restaurant_id)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
    restaurant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
    supplier_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)

    # Status
    status: Mapped[ReconciliationStatus] = mapped_column(
        SQLEnum(ReconciliationStatus, name="reconciliation_status", create_type=False),
        default=ReconciliationStatus.PENDING,
        nullable=False
    )

    # 對帳匯總數據 (JSONB)
    summary: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    # Summary structure:
    # {
    #   "total_orders": int,
    #   "total_items": int,
    #   "total_amount": decimal,
    #   "matched_amount": decimal,
    #   "discrepancy_amount": decimal,
    #   "accuracy_rate": decimal,
    #   "discrepancy_breakdown": {...}
    # }

    # 統計欄位
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    total_items: Mapped[int] = mapped_column(Integer, default=0)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    matched_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    discrepancy_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))

    # 對帳品質指標
    confidence_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), nullable=True)
    auto_approved: Mapped[bool] = mapped_column(Boolean, default=False)

    # 審核資訊
    reviewed_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 爭議處理
    dispute_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # 審計欄位
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), nullable=True)

    # Relationships
    items: Mapped[List["ReconciliationItem"]] = relationship(
        "ReconciliationItem",
        back_populates="reconciliation",
        cascade="all, delete-orphan"
    )

    # Indexes (依 Database-Schema-Core.md:321-325)
    __table_args__ = (
        Index("idx_reconciliations_restaurant_supplier", "restaurant_id", "supplier_id"),
        Index("idx_reconciliations_period", "restaurant_id", "supplier_id", "period_start", "period_end"),
        Index("idx_reconciliations_status", "status"),
        Index("idx_reconciliations_confidence", "confidence_score", postgresql_where="confidence_score IS NOT NULL"),
        Index("idx_reconciliations_auto_approved", "auto_approved", postgresql_where="auto_approved = true"),
        Index("idx_reconciliations_tenant", "tenant_id"),
    )

    def __repr__(self) -> str:
        return f"<Reconciliation {self.reconciliation_number} ({self.status.value})>"


class ReconciliationItem(Base):
    """對帳明細表（依 Database-Schema-Core.md:344-388）"""

    __tablename__ = "reconciliation_items"

    # Primary key
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))

    # Foreign keys
    reconciliation_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("reconciliations.id", ondelete="CASCADE"),
        nullable=False
    )
    order_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), nullable=True)  # 訂單 ID（跨服務引用）

    # 商品資訊
    product_code: Mapped[str] = mapped_column(String(100), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=True)
    sku_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # 數量與金額
    expected_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    actual_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    quantity_difference: Mapped[Decimal] = mapped_column(Numeric(15, 3), default=Decimal("0"))

    expected_price: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    actual_price: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    price_difference: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"))

    expected_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    actual_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    amount_difference: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"))

    # 差異資訊
    discrepancy_type: Mapped[Optional[DiscrepancyType]] = mapped_column(
        SQLEnum(DiscrepancyType, name="discrepancy_type", create_type=False),
        nullable=True
    )
    discrepancy_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 匹配與審核
    is_matched: Mapped[bool] = mapped_column(Boolean, default=False)
    match_confidence: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), nullable=True)
    manually_adjusted: Mapped[bool] = mapped_column(Boolean, default=False)
    adjustment_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 審計欄位
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    reconciliation: Mapped["Reconciliation"] = relationship(
        "Reconciliation",
        back_populates="items"
    )

    # Indexes (依 Database-Schema-Core.md:385-387)
    __table_args__ = (
        Index("idx_reconciliation_items_reconciliation", "reconciliation_id"),
        Index("idx_reconciliation_items_order", "order_id"),
        Index("idx_reconciliation_items_discrepancy", "discrepancy_type", postgresql_where="discrepancy_type IS NOT NULL"),
        Index("idx_reconciliation_items_product", "product_code"),
    )

    def __repr__(self) -> str:
        return f"<ReconciliationItem {self.product_code} qty:{self.expected_quantity}/{self.actual_quantity}>"


class BillingPeriod(Base):
    """計費週期表（管理對帳週期設定）"""

    __tablename__ = "billing_periods"

    # Primary key
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))

    # 多租戶
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
    restaurant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
    supplier_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)

    # 週期定義
    period_name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "2025-12 月結"
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)

    # 狀態
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), nullable=True)

    # 匯總數據
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"))
    reconciliation_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("reconciliations.id", ondelete="SET NULL"),
        nullable=True
    )

    # 審計欄位
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_billing_periods_tenant", "tenant_id"),
        Index("idx_billing_periods_relationship", "restaurant_id", "supplier_id"),
        Index("idx_billing_periods_dates", "period_start", "period_end"),
    )

    def __repr__(self) -> str:
        return f"<BillingPeriod {self.period_name} ({self.period_start} - {self.period_end})>"


class FeeConfig(Base):
    """費率配置表（依 PRD-Billing-Master.md 費用行項結構）"""

    __tablename__ = "fee_configs"

    # Primary key
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))

    # 適用對象
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
    supplier_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), nullable=True)  # NULL = 全平台
    restaurant_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), nullable=True)  # NULL = 全平台

    # 費用定義
    fee_type: Mapped[str] = mapped_column(String(50), nullable=False)  # transaction_fee, subscription, etc.
    pricing_model: Mapped[str] = mapped_column(String(50), nullable=False)  # percentage, fixed, tiered, formula
    who_pays: Mapped[str] = mapped_column(String(50), nullable=False)  # supplier, restaurant, platform, shared

    # 費率值
    value: Mapped[Decimal] = mapped_column(Numeric(15, 6), nullable=True)  # 用於 percentage, fixed
    value_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # 用於 tiered, formula

    # 計費週期
    billing_cycle: Mapped[str] = mapped_column(String(50), default="per_order")

    # 生效期間
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # 狀態
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # 審計欄位
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), nullable=True)

    __table_args__ = (
        Index("idx_fee_configs_tenant", "tenant_id"),
        Index("idx_fee_configs_supplier", "supplier_id"),
        Index("idx_fee_configs_active", "is_active", "effective_from"),
    )

    def __repr__(self) -> str:
        return f"<FeeConfig {self.fee_type} {self.pricing_model} ({self.value})>"
