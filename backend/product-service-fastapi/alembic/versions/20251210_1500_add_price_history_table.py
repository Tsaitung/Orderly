"""Add price_history table for tracking SKU price changes

Revision ID: add_price_history
Revises: f2fcfbdc3a33
Create Date: 2025-12-10 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'add_price_history'
down_revision: Union[str, None] = 'f2fcfbdc3a33'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create price_history table"""

    # Create price_type enum
    op.execute("CREATE TYPE pricetype AS ENUM ('base', 'selling', 'cost', 'promotional')")

    op.create_table('price_history',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('skuId', sa.String(), nullable=False),
        sa.Column('supplierId', sa.String(), nullable=True),

        # Price information
        sa.Column('oldPrice', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('newPrice', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('priceType', postgresql.ENUM('base', 'selling', 'cost', 'promotional', name='pricetype', create_type=False), nullable=False, server_default='base'),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='TWD'),

        # Change information
        sa.Column('changeReason', sa.Text(), nullable=True),
        sa.Column('changedBy', sa.String(length=36), nullable=True),
        sa.Column('changedAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),

        # Effective period
        sa.Column('effectiveFrom', sa.DateTime(timezone=True), nullable=True),
        sa.Column('effectiveTo', sa.DateTime(timezone=True), nullable=True),

        # Percentage change (calculated)
        sa.Column('changePercent', sa.Float(), nullable=True),

        # Audit fields
        sa.Column('createdAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['skuId'], ['product_skus.id'], ondelete='CASCADE'),
    )

    # Create indexes for efficient querying
    op.create_index('ix_price_history_sku_id', 'price_history', ['skuId'], unique=False)
    op.create_index('ix_price_history_supplier_id', 'price_history', ['supplierId'], unique=False)
    op.create_index('ix_price_history_changed_at', 'price_history', ['changedAt'], unique=False)
    op.create_index('ix_price_history_sku_changed_at', 'price_history', ['skuId', 'changedAt'], unique=False)
    op.create_index('ix_price_history_supplier_changed_at', 'price_history', ['supplierId', 'changedAt'], unique=False)


def downgrade() -> None:
    """Drop price_history table"""
    op.drop_index('ix_price_history_supplier_changed_at', table_name='price_history')
    op.drop_index('ix_price_history_sku_changed_at', table_name='price_history')
    op.drop_index('ix_price_history_changed_at', table_name='price_history')
    op.drop_index('ix_price_history_supplier_id', table_name='price_history')
    op.drop_index('ix_price_history_sku_id', table_name='price_history')
    op.drop_table('price_history')
    op.execute('DROP TYPE IF EXISTS pricetype')
