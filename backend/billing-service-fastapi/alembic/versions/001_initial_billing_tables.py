"""Initial billing tables - reconciliations, billing_periods, fee_configs

Revision ID: 001_initial_billing
Revises: None
Create Date: 2025-12-10

基於 Database-Schema-Core.md:264-388 和 PRD-Billing-Master.md 創建
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_billing'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 創建 ENUM 類型
    reconciliation_status = postgresql.ENUM(
        'pending', 'processing', 'review_required', 'approved', 'disputed', 'resolved',
        name='reconciliation_status',
        create_type=True
    )
    reconciliation_status.create(op.get_bind(), checkfirst=True)

    discrepancy_type = postgresql.ENUM(
        'none', 'quantity', 'price', 'missing_item', 'extra_item', 'duplicate',
        name='discrepancy_type',
        create_type=True
    )
    discrepancy_type.create(op.get_bind(), checkfirst=True)

    # 1. 創建 reconciliations 表（對帳記錄）
    op.create_table(
        'reconciliations',
        sa.Column('id', postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column('reconciliation_number', sa.String(50), unique=True, nullable=False),

        # Period
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),

        # Multi-tenant
        sa.Column('tenant_id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('restaurant_id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('supplier_id', postgresql.UUID(as_uuid=False), nullable=False),

        # Status
        sa.Column('status', postgresql.ENUM(
            'pending', 'processing', 'review_required', 'approved', 'disputed', 'resolved',
            name='reconciliation_status', create_type=False
        ), nullable=False, server_default='pending'),

        # Summary (JSONB)
        sa.Column('summary', postgresql.JSONB(), nullable=False, server_default='{}'),

        # Statistics
        sa.Column('total_orders', sa.Integer(), server_default='0'),
        sa.Column('total_items', sa.Integer(), server_default='0'),
        sa.Column('total_amount', sa.Numeric(15, 2), server_default='0.00'),
        sa.Column('matched_amount', sa.Numeric(15, 2), server_default='0.00'),
        sa.Column('discrepancy_amount', sa.Numeric(15, 2), server_default='0.00'),

        # Quality metrics
        sa.Column('confidence_score', sa.Numeric(5, 4), nullable=True),
        sa.Column('auto_approved', sa.Boolean(), server_default='false'),

        # Review info
        sa.Column('reviewed_by', postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('review_notes', sa.Text(), nullable=True),

        # Dispute handling
        sa.Column('dispute_reason', sa.Text(), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('resolved_by', postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),

        # Audit
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by', postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column('updated_by', postgresql.UUID(as_uuid=False), nullable=True),
    )

    # 創建索引（依 Database-Schema-Core.md:321-325）
    op.create_index('idx_reconciliations_tenant', 'reconciliations', ['tenant_id'])
    op.create_index('idx_reconciliations_restaurant_supplier', 'reconciliations', ['restaurant_id', 'supplier_id'])
    op.create_index('idx_reconciliations_period', 'reconciliations', ['restaurant_id', 'supplier_id', 'period_start', 'period_end'])
    op.create_index('idx_reconciliations_status', 'reconciliations', ['status'])
    op.create_index('idx_reconciliations_confidence', 'reconciliations', ['confidence_score'], postgresql_where=sa.text('confidence_score IS NOT NULL'))
    op.create_index('idx_reconciliations_auto_approved', 'reconciliations', ['auto_approved'], postgresql_where=sa.text('auto_approved = true'))

    # 2. 創建 reconciliation_items 表（對帳明細）
    op.create_table(
        'reconciliation_items',
        sa.Column('id', postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column('reconciliation_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('reconciliations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('order_id', postgresql.UUID(as_uuid=False), nullable=True),

        # Product info
        sa.Column('product_code', sa.String(100), nullable=False),
        sa.Column('product_name', sa.String(255), nullable=True),
        sa.Column('sku_code', sa.String(100), nullable=True),

        # Quantities
        sa.Column('expected_quantity', sa.Numeric(15, 3), nullable=False),
        sa.Column('actual_quantity', sa.Numeric(15, 3), nullable=False),
        sa.Column('quantity_difference', sa.Numeric(15, 3), server_default='0'),

        # Prices
        sa.Column('expected_price', sa.Numeric(15, 2), nullable=False),
        sa.Column('actual_price', sa.Numeric(15, 2), nullable=False),
        sa.Column('price_difference', sa.Numeric(15, 2), server_default='0'),

        # Amounts
        sa.Column('expected_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('actual_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('amount_difference', sa.Numeric(15, 2), server_default='0'),

        # Discrepancy
        sa.Column('discrepancy_type', postgresql.ENUM(
            'none', 'quantity', 'price', 'missing_item', 'extra_item', 'duplicate',
            name='discrepancy_type', create_type=False
        ), nullable=True),
        sa.Column('discrepancy_notes', sa.Text(), nullable=True),

        # Matching
        sa.Column('is_matched', sa.Boolean(), server_default='false'),
        sa.Column('match_confidence', sa.Numeric(5, 4), nullable=True),
        sa.Column('manually_adjusted', sa.Boolean(), server_default='false'),
        sa.Column('adjustment_reason', sa.Text(), nullable=True),

        # Audit
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # 創建索引（依 Database-Schema-Core.md:385-387）
    op.create_index('idx_reconciliation_items_reconciliation', 'reconciliation_items', ['reconciliation_id'])
    op.create_index('idx_reconciliation_items_order', 'reconciliation_items', ['order_id'])
    op.create_index('idx_reconciliation_items_discrepancy', 'reconciliation_items', ['discrepancy_type'], postgresql_where=sa.text('discrepancy_type IS NOT NULL'))
    op.create_index('idx_reconciliation_items_product', 'reconciliation_items', ['product_code'])

    # 3. 創建 billing_periods 表（計費週期）
    op.create_table(
        'billing_periods',
        sa.Column('id', postgresql.UUID(as_uuid=False), primary_key=True),

        # Multi-tenant
        sa.Column('tenant_id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('restaurant_id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('supplier_id', postgresql.UUID(as_uuid=False), nullable=False),

        # Period definition
        sa.Column('period_name', sa.String(100), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),

        # Status
        sa.Column('is_closed', sa.Boolean(), server_default='false'),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_by', postgresql.UUID(as_uuid=False), nullable=True),

        # Summary
        sa.Column('total_orders', sa.Integer(), server_default='0'),
        sa.Column('total_amount', sa.Numeric(15, 2), server_default='0.00'),
        sa.Column('reconciliation_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('reconciliations.id', ondelete='SET NULL'), nullable=True),

        # Audit
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_index('idx_billing_periods_tenant', 'billing_periods', ['tenant_id'])
    op.create_index('idx_billing_periods_relationship', 'billing_periods', ['restaurant_id', 'supplier_id'])
    op.create_index('idx_billing_periods_dates', 'billing_periods', ['period_start', 'period_end'])

    # 4. 創建 fee_configs 表（費率配置）
    op.create_table(
        'fee_configs',
        sa.Column('id', postgresql.UUID(as_uuid=False), primary_key=True),

        # Scope
        sa.Column('tenant_id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('supplier_id', postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column('restaurant_id', postgresql.UUID(as_uuid=False), nullable=True),

        # Fee definition
        sa.Column('fee_type', sa.String(50), nullable=False),
        sa.Column('pricing_model', sa.String(50), nullable=False),
        sa.Column('who_pays', sa.String(50), nullable=False),

        # Value
        sa.Column('value', sa.Numeric(15, 6), nullable=True),
        sa.Column('value_json', postgresql.JSONB(), nullable=True),

        # Billing cycle
        sa.Column('billing_cycle', sa.String(50), server_default='per_order'),

        # Validity
        sa.Column('effective_from', sa.Date(), nullable=False),
        sa.Column('effective_to', sa.Date(), nullable=True),

        # Status
        sa.Column('is_active', sa.Boolean(), server_default='true'),

        # Audit
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by', postgresql.UUID(as_uuid=False), nullable=True),
    )

    op.create_index('idx_fee_configs_tenant', 'fee_configs', ['tenant_id'])
    op.create_index('idx_fee_configs_supplier', 'fee_configs', ['supplier_id'])
    op.create_index('idx_fee_configs_active', 'fee_configs', ['is_active', 'effective_from'])


def downgrade() -> None:
    # 刪除表
    op.drop_table('fee_configs')
    op.drop_table('billing_periods')
    op.drop_table('reconciliation_items')
    op.drop_table('reconciliations')

    # 刪除 ENUM 類型
    op.execute('DROP TYPE IF EXISTS discrepancy_type')
    op.execute('DROP TYPE IF EXISTS reconciliation_status')
