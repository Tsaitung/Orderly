"""add_pricing_method_to_products_and_skus

Revision ID: 74aed7eff66f
Revises: 004_add_sku_upload_tables
Create Date: 2025-09-20 14:01:49.726455

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '74aed7eff66f'
down_revision = '004_add_sku_upload_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add pricing_method to products table
    op.add_column('products', sa.Column('pricingMethod', sa.Enum('BY_WEIGHT', 'BY_ITEM', name='pricingmethod'), 
                                       server_default='BY_ITEM', nullable=False))
    
    # Add pricing-related columns to product_skus table
    op.add_column('product_skus', sa.Column('pricingMethod', sa.Enum('BY_WEIGHT', 'BY_ITEM', name='pricingmethod'), 
                                           nullable=True))
    op.add_column('product_skus', sa.Column('unitPrice', sa.Float(), nullable=True))
    op.add_column('product_skus', sa.Column('minOrderQuantity', sa.Float(), 
                                           server_default='1.0', nullable=False))
    op.add_column('product_skus', sa.Column('quantityIncrement', sa.Float(), 
                                           server_default='1.0', nullable=False))


def downgrade() -> None:
    # Remove columns from product_skus table
    op.drop_column('product_skus', 'quantityIncrement')
    op.drop_column('product_skus', 'minOrderQuantity')
    op.drop_column('product_skus', 'unitPrice')
    op.drop_column('product_skus', 'pricingMethod')
    
    # Remove column from products table
    op.drop_column('products', 'pricingMethod')
    
    # Drop the enum type
    sa.Enum(name='pricingmethod').drop(op.get_bind())