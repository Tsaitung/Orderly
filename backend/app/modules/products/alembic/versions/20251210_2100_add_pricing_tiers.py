"""add pricing_tiers to product_skus

Revision ID: 20251210_2100
Revises: 20251210_2000
Create Date: 2025-12-10

為 product_skus 表添加 pricing_tiers JSON 欄位，支援階梯定價和量價定價
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '20251210_2100'
down_revision = '20251210_2000'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    添加 pricing_tiers 欄位到 product_skus 表
    用於儲存階梯定價/量價定價的價格階層資訊
    """
    op.add_column(
        'product_skus',
        sa.Column(
            'pricing_tiers',
            postgresql.JSON(astext_type=sa.Text()),
            nullable=True,
            server_default='[]',
            comment='價格階層 JSON: [{"min_qty": 10, "price": 45.0}, {"min_qty": 50, "price": 42.0}]'
        )
    )

    # 添加批量折扣欄位
    op.add_column(
        'product_skus',
        sa.Column(
            'bulk_discount_threshold',
            sa.Integer(),
            nullable=True,
            comment='批量折扣門檻數量'
        )
    )

    op.add_column(
        'product_skus',
        sa.Column(
            'bulk_discount_rate',
            sa.Numeric(5, 4),
            nullable=True,
            comment='批量折扣率 (0.1000 = 10%)'
        )
    )


def downgrade() -> None:
    """移除定價相關欄位"""
    op.drop_column('product_skus', 'bulk_discount_rate')
    op.drop_column('product_skus', 'bulk_discount_threshold')
    op.drop_column('product_skus', 'pricing_tiers')
