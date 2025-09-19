"""remove_inventory_columns

Revision ID: 9d6716ecb31e
Revises: 602514766ff3
Create Date: 2025-09-19 22:04:11.135449

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9d6716ecb31e'
down_revision = '602514766ff3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if columns exist before dropping them
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Get existing columns for product_skus table
    existing_columns = [col['name'] for col in inspector.get_columns('product_skus')]
    
    # Remove inventory-related columns from product_skus table if they exist
    if 'currentStock' in existing_columns:
        op.drop_column('product_skus', 'currentStock')
    if 'minStockLevel' in existing_columns:
        op.drop_column('product_skus', 'minStockLevel') 
    if 'maxStockLevel' in existing_columns:
        op.drop_column('product_skus', 'maxStockLevel')
    if 'isInStock' in existing_columns:
        op.drop_column('product_skus', 'isInStock')
    
    # Check if inventory_logs table exists before dropping
    existing_tables = inspector.get_table_names()
    if 'inventory_logs' in existing_tables:
        op.drop_table('inventory_logs')


def downgrade() -> None:
    # Recreate inventory columns in product_skus table
    op.add_column('product_skus', sa.Column('currentStock', sa.Integer, nullable=True, default=0))
    op.add_column('product_skus', sa.Column('minStockLevel', sa.Integer, nullable=True, default=0))
    op.add_column('product_skus', sa.Column('maxStockLevel', sa.Integer, nullable=True))
    op.add_column('product_skus', sa.Column('isInStock', sa.Boolean, nullable=False, default=True))
    
    # Recreate inventory_logs table
    op.create_table(
        'inventory_logs',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('skuId', sa.String, sa.ForeignKey('product_skus.id'), nullable=False),
        sa.Column('changeType', sa.String, nullable=False),
        sa.Column('quantity', sa.Integer, nullable=False),
        sa.Column('previousStock', sa.Integer, nullable=True),
        sa.Column('newStock', sa.Integer, nullable=True),
        sa.Column('reason', sa.String, nullable=True),
        sa.Column('reference', sa.String, nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('createdBy', sa.String, nullable=True)
    )