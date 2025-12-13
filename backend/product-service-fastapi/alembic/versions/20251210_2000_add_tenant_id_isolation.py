"""add tenant_id isolation for multi-tenancy

Revision ID: 20251210_2000
Revises: 20251210_1600_search_optimization
Create Date: 2025-12-10

多租戶隔離：為 products 和 product_skus 表添加 tenant_id 欄位
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251210_2000'
down_revision = 'search_optimization'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    添加 tenant_id 欄位到 products 和 product_skus 表
    使用可空欄位以支援現有資料遷移
    """
    # Products 表添加 tenant_id
    op.add_column(
        'products',
        sa.Column('tenant_id', sa.String(36), nullable=True, index=True, comment='租戶ID（組織ID）')
    )

    # Product SKUs 表添加 tenant_id
    op.add_column(
        'product_skus',
        sa.Column('tenant_id', sa.String(36), nullable=True, index=True, comment='租戶ID（組織ID）')
    )

    # 創建索引以優化查詢效能
    op.create_index(
        'ix_products_tenant_id',
        'products',
        ['tenant_id'],
        unique=False
    )

    op.create_index(
        'ix_product_skus_tenant_id',
        'product_skus',
        ['tenant_id'],
        unique=False
    )

    # 創建複合索引：tenant_id + is_active（常見查詢模式）
    op.create_index(
        'ix_products_tenant_active',
        'products',
        ['tenant_id', 'isActive'],
        unique=False
    )

    op.create_index(
        'ix_product_skus_tenant_active',
        'product_skus',
        ['tenant_id', 'isActive'],
        unique=False
    )


def downgrade() -> None:
    """移除 tenant_id 欄位"""
    # 移除索引
    op.drop_index('ix_product_skus_tenant_active', table_name='product_skus')
    op.drop_index('ix_products_tenant_active', table_name='products')
    op.drop_index('ix_product_skus_tenant_id', table_name='product_skus')
    op.drop_index('ix_products_tenant_id', table_name='products')

    # 移除欄位
    op.drop_column('product_skus', 'tenant_id')
    op.drop_column('products', 'tenant_id')
