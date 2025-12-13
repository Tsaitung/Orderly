"""Add product_images table for managing product images

Revision ID: add_product_images
Revises: add_price_history
Create Date: 2025-12-10 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_product_images'
down_revision: Union[str, None] = 'add_price_history'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create product_images table"""

    op.create_table('product_images',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('productId', sa.String(), nullable=False),

        # Image information
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('thumbnailUrl', sa.String(length=500), nullable=True),
        sa.Column('originalFilename', sa.String(length=255), nullable=True),
        sa.Column('fileSize', sa.Integer(), nullable=True),
        sa.Column('mimeType', sa.String(length=50), nullable=True),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),

        # Management fields
        sa.Column('displayOrder', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('isPrimary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('altText', sa.String(length=255), nullable=True),

        # Audit fields
        sa.Column('uploadedBy', sa.String(length=36), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['productId'], ['products.id'], ondelete='CASCADE'),
    )

    # Create indexes
    op.create_index('ix_product_images_product_id', 'product_images', ['productId'], unique=False)
    op.create_index('ix_product_images_display_order', 'product_images', ['productId', 'displayOrder'], unique=False)


def downgrade() -> None:
    """Drop product_images table"""
    op.drop_index('ix_product_images_display_order', table_name='product_images')
    op.drop_index('ix_product_images_product_id', table_name='product_images')
    op.drop_table('product_images')
