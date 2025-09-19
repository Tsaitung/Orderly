"""add_origin_pricing_fields_to_sku

Revision ID: eee366349101
Revises: 9d6716ecb31e
Create Date: 2025-09-19 22:24:33.134009

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'eee366349101'
down_revision = '9d6716ecb31e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if tables exist before modifying them
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Add new fields to product_skus table if it exists
    if 'product_skus' in existing_tables:
        op.add_column('product_skus', sa.Column('pricingUnit', sa.String(), server_default='kg', nullable=False))
        op.add_column('product_skus', sa.Column('originCountry', sa.String(), nullable=True))
        op.add_column('product_skus', sa.Column('originRegion', sa.String(), nullable=True))
    
    # Add new field to supplier_skus table if it exists
    if 'supplier_skus' in existing_tables:
        op.add_column('supplier_skus', sa.Column('pricingTiers', sa.JSON(), server_default='[]', nullable=False))


def downgrade() -> None:
    # Check if tables exist before modifying them
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Remove fields from supplier_skus table if it exists
    if 'supplier_skus' in existing_tables:
        try:
            op.drop_column('supplier_skus', 'pricingTiers')
        except:
            pass
    
    # Remove fields from product_skus table if it exists
    if 'product_skus' in existing_tables:
        try:
            op.drop_column('product_skus', 'originRegion')
            op.drop_column('product_skus', 'originCountry')
            op.drop_column('product_skus', 'pricingUnit')
        except:
            pass