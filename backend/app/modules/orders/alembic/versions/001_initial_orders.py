"""Initial orders tables

Revision ID: 001
Revises:
Create Date: 2025-12-10 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ENUM types
    order_status_enum = postgresql.ENUM(
        'draft', 'submitted', 'confirmed', 'preparing', 'shipped',
        'delivered', 'accepted', 'completed', 'cancelled', 'disputed',
        name='order_status',
        create_type=False
    )
    order_status_enum.create(op.get_bind(), checkfirst=True)

    payment_status_enum = postgresql.ENUM(
        'pending', 'partial', 'paid', 'overdue', 'refunded',
        name='payment_status',
        create_type=False
    )
    payment_status_enum.create(op.get_bind(), checkfirst=True)

    # Create orders table
    op.create_table(
        'orders',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),

        # 訂單識別
        sa.Column('order_number', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),

        # 關聯方
        sa.Column('restaurant_id', sa.String(36), nullable=False, index=True),
        sa.Column('supplier_id', sa.String(36), nullable=False, index=True),

        # 狀態
        sa.Column('status', order_status_enum, nullable=False, server_default='draft', index=True),
        sa.Column('payment_status', payment_status_enum, nullable=False, server_default='pending'),

        # 金額
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('tax_amount', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('discount_amount', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('shipping_fee', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=False, server_default='0'),

        # 交貨資訊
        sa.Column('delivery_date', sa.Date, nullable=False),
        sa.Column('actual_delivery_date', sa.Date, nullable=True),
        sa.Column('delivery_address', postgresql.JSONB, nullable=True),
        sa.Column('receiving_unit', sa.String(100), nullable=True),

        # 備註
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('internal_notes', sa.Text, nullable=True),

        # 調整項
        sa.Column('adjustments', postgresql.JSONB, nullable=False, server_default='[]'),

        # 審計
        sa.Column('created_by', sa.String(36), nullable=False),
        sa.Column('confirmed_by', sa.String(36), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),

        # 軟刪除
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='false'),
    )

    # Create indexes for orders
    op.create_index('ix_orders_tenant_status', 'orders', ['tenant_id', 'status'])
    op.create_index('ix_orders_restaurant_supplier', 'orders', ['restaurant_id', 'supplier_id'])
    op.create_index('ix_orders_delivery_date', 'orders', ['delivery_date'])
    op.create_index('ix_orders_created_at', 'orders', ['created_at'])

    # Create order_items table
    op.create_table(
        'order_items',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),

        sa.Column('order_id', sa.String(36), sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('sku_id', sa.String(36), nullable=True, index=True),
        sa.Column('product_id', sa.String(36), nullable=False, index=True),
        sa.Column('product_code', sa.String(50), nullable=False),
        sa.Column('product_name', sa.String(200), nullable=False),

        # 數量
        sa.Column('quantity', sa.Numeric(10, 3), nullable=False),
        sa.Column('confirmed_quantity', sa.Numeric(10, 3), nullable=True),
        sa.Column('delivered_quantity', sa.Numeric(10, 3), nullable=True),
        sa.Column('accepted_quantity', sa.Numeric(10, 3), nullable=True),

        # 價格
        sa.Column('unit_price', sa.Numeric(10, 4), nullable=False),
        sa.Column('confirmed_price', sa.Numeric(10, 4), nullable=True),
        sa.Column('line_total', sa.Numeric(12, 2), nullable=False),

        # 其他
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('is_variable_price', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('sort_order', sa.Integer, nullable=False, server_default='0'),
    )

    # Create order_status_history table
    op.create_table(
        'order_status_history',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),

        sa.Column('order_id', sa.String(36), sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('from_status', order_status_enum, nullable=True),
        sa.Column('to_status', order_status_enum, nullable=False),
        sa.Column('changed_by', sa.String(36), nullable=False),
        sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('reason', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
    )

    # Create index for status history
    op.create_index('ix_order_status_history_order_changed_at', 'order_status_history', ['order_id', 'changed_at'])

    # Create order_adjustments table
    op.create_table(
        'order_adjustments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),

        sa.Column('order_id', sa.String(36), sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('adjustment_type', sa.String(50), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('reason', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=False),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('order_adjustments')
    op.drop_table('order_status_history')
    op.drop_table('order_items')
    op.drop_table('orders')

    # Drop ENUM types
    op.execute('DROP TYPE IF EXISTS payment_status')
    op.execute('DROP TYPE IF EXISTS order_status')
