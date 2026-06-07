"""add customer_prices table

Revision ID: 20251210_2300
Revises: 20251210_2200
Create Date: 2025-12-10

創建 customer_prices 表，用於管理客戶專屬價格
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251210_2300'
down_revision = '20251210_2200'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """創建 customer_prices 表"""
    op.create_table(
        'customer_prices',
        # 基礎欄位
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),

        # 多租戶隔離
        sa.Column('tenant_id', sa.String(36), nullable=True),

        # 客戶資訊
        sa.Column('customer_id', sa.String(36), nullable=False),
        sa.Column('customer_name', sa.String(200), nullable=True),

        # SKU 關聯
        sa.Column('sku_id', sa.String(36), sa.ForeignKey('product_skus.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', sa.String(36), sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=True, index=True),

        # 價格設定
        sa.Column('special_price', sa.Float(), nullable=False),
        sa.Column('original_price', sa.Float(), nullable=True),
        sa.Column('discount_rate', sa.Float(), nullable=True),

        # 合約資訊
        sa.Column('contract_number', sa.String(100), nullable=True),
        sa.Column('agreement_notes', sa.Text(), nullable=True),

        # 生效期
        sa.Column('effective_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('effective_to', sa.DateTime(timezone=True), nullable=True),

        # 數量限制
        sa.Column('min_quantity', sa.Integer(), nullable=True),
        sa.Column('max_quantity', sa.Integer(), nullable=True),

        # 狀態
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='0'),

        # 審計
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('updated_by', sa.String(36), nullable=True),
        sa.Column('approved_by', sa.String(36), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
    )

    # 創建索引
    op.create_index('ix_customer_prices_tenant_id', 'customer_prices', ['tenant_id'])
    op.create_index('ix_customer_prices_customer_id', 'customer_prices', ['customer_id'])
    op.create_index('ix_customer_prices_sku_id', 'customer_prices', ['sku_id'])
    op.create_index('ix_customer_prices_dates', 'customer_prices', ['effective_from', 'effective_to'])
    op.create_index('ix_customer_prices_customer_sku', 'customer_prices', ['customer_id', 'sku_id'])
    op.create_index('ix_customer_prices_active', 'customer_prices', ['tenant_id', 'customer_id', 'is_active'])


def downgrade() -> None:
    """移除 customer_prices 表"""
    op.drop_index('ix_customer_prices_active', table_name='customer_prices')
    op.drop_index('ix_customer_prices_customer_sku', table_name='customer_prices')
    op.drop_index('ix_customer_prices_dates', table_name='customer_prices')
    op.drop_index('ix_customer_prices_sku_id', table_name='customer_prices')
    op.drop_index('ix_customer_prices_customer_id', table_name='customer_prices')
    op.drop_index('ix_customer_prices_tenant_id', table_name='customer_prices')
    op.drop_table('customer_prices')
