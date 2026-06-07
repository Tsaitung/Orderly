"""add promotions table

Revision ID: 20251210_2200
Revises: 20251210_2100
Create Date: 2025-12-10

創建 promotions 表，用於管理促銷價格
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '20251210_2200'
down_revision = '20251210_2100'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """創建 promotions 表"""

    # 創建 ENUM 類型
    discount_type = postgresql.ENUM('percentage', 'fixed_amount', 'fixed_price', name='discounttype', create_type=False)
    discount_type.create(op.get_bind(), checkfirst=True)

    promotion_status = postgresql.ENUM('draft', 'scheduled', 'active', 'paused', 'ended', 'cancelled', name='promotionstatus', create_type=False)
    promotion_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'promotions',
        # 基礎欄位（繼承自 BaseModel）
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),

        # 多租戶隔離
        sa.Column('tenant_id', sa.String(36), nullable=True),

        # 基本資訊
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('code', sa.String(50), nullable=True, index=True),

        # 關聯
        sa.Column('sku_id', sa.String(36), sa.ForeignKey('product_skus.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', sa.String(36), sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=True, index=True),

        # 折扣設定
        sa.Column('discount_type', discount_type, nullable=False, server_default='percentage'),
        sa.Column('discount_value', sa.Float(), nullable=False),
        sa.Column('promotional_price', sa.Float(), nullable=True),
        sa.Column('original_price', sa.Float(), nullable=True),

        # 時間設定
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),

        # 數量限制
        sa.Column('max_quantity', sa.Integer(), nullable=True),
        sa.Column('sold_quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('min_purchase_quantity', sa.Integer(), nullable=True),

        # 狀態
        sa.Column('status', promotion_status, nullable=False, server_default='draft'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),

        # 優先級
        sa.Column('priority', sa.Integer(), nullable=False, server_default='0'),

        # 審計
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('updated_by', sa.String(36), nullable=True),
    )

    # 創建索引
    op.create_index('ix_promotions_tenant_id', 'promotions', ['tenant_id'])
    op.create_index('ix_promotions_sku_id', 'promotions', ['sku_id'])
    op.create_index('ix_promotions_status', 'promotions', ['status'])
    op.create_index('ix_promotions_dates', 'promotions', ['start_date', 'end_date'])
    op.create_index('ix_promotions_active', 'promotions', ['tenant_id', 'is_active', 'status'])


def downgrade() -> None:
    """移除 promotions 表"""
    op.drop_index('ix_promotions_active', table_name='promotions')
    op.drop_index('ix_promotions_dates', table_name='promotions')
    op.drop_index('ix_promotions_status', table_name='promotions')
    op.drop_index('ix_promotions_sku_id', table_name='promotions')
    op.drop_index('ix_promotions_tenant_id', table_name='promotions')
    op.drop_table('promotions')

    # 移除 ENUM 類型
    op.execute('DROP TYPE IF EXISTS promotionstatus')
    op.execute('DROP TYPE IF EXISTS discounttype')
