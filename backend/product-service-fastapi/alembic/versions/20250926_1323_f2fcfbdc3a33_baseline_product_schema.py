"""baseline product schema

Revision ID: f2fcfbdc3a33
Revises: 
Create Date: 2025-09-26 13:23:02.316487

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f2fcfbdc3a33'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create ENUM types first (check if exists before creating)
    connection = op.get_bind()
    
    # Check and create skutype
    result = connection.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'skutype'"))
    if not result.fetchone():
        op.execute("CREATE TYPE skutype AS ENUM ('STANDARD', 'VARIANT', 'BUNDLE', 'CUSTOM')")
    
    # Check and create creatortype
    result = connection.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'creatortype'"))
    if not result.fetchone():
        op.execute("CREATE TYPE creatortype AS ENUM ('SYSTEM', 'PLATFORM', 'SUPPLIER', 'RESTAURANT')")
    
    # Check and create approvalstatus
    result = connection.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'approvalstatus'"))
    if not result.fetchone():
        op.execute("CREATE TYPE approvalstatus AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DRAFT')")
    
    # Check and create pricingmethod
    result = connection.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'pricingmethod'"))
    if not result.fetchone():
        op.execute("CREATE TYPE pricingmethod AS ENUM ('UNIT', 'BULK', 'TIERED', 'VOLUME')")
    
    # Create product_categories table
    op.create_table('product_categories',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('nameEn', sa.String(), nullable=True),
        sa.Column('parentId', sa.String(), nullable=True),
        sa.Column('level', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('sortOrder', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('isActive', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('createdAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.ForeignKeyConstraint(['parentId'], ['product_categories.id'], ),
    )
    op.create_index(op.f('ix_product_categories_code'), 'product_categories', ['code'], unique=False)
    op.create_index(op.f('ix_product_categories_parentId'), 'product_categories', ['parentId'], unique=False)
    
    # Create products table
    op.create_table('products',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('categoryId', sa.String(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('nameEn', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('descriptionEn', sa.String(), nullable=True),
        sa.Column('images', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('tags', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('unitOfMeasure', sa.String(), nullable=False),
        sa.Column('isActive', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('createdAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('supplierId', sa.String(), nullable=True),
        sa.Column('supplierProductId', sa.String(), nullable=True),
        sa.Column('originCountry', sa.String(), nullable=True),
        sa.Column('originRegion', sa.String(), nullable=True),
        sa.Column('minStock', sa.Integer(), nullable=True),
        sa.Column('maxStock', sa.Integer(), nullable=True),
        sa.Column('leadTimeDays', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(), nullable=True, server_default='active'),
        sa.Column('allergens', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('nutritionalInfo', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('certifications', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.ForeignKeyConstraint(['categoryId'], ['product_categories.id'], ),
    )
    op.create_index(op.f('ix_products_code'), 'products', ['code'], unique=False)
    op.create_index(op.f('ix_products_categoryId'), 'products', ['categoryId'], unique=False)
    op.create_index(op.f('ix_products_supplierId'), 'products', ['supplierId'], unique=False)
    
    # Create product_skus table
    op.create_table('product_skus',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('productId', sa.String(), nullable=False),
        sa.Column('skuCode', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('variant', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('stockQuantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reservedQuantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('minStock', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('maxStock', sa.Integer(), nullable=True),
        sa.Column('weight', sa.Float(), nullable=True),
        sa.Column('dimensions', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('packageType', sa.String(), nullable=True),
        sa.Column('shelfLifeDays', sa.Integer(), nullable=True),
        sa.Column('storageConditions', sa.String(), nullable=True),
        sa.Column('batchTrackingEnabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('isActive', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('type', postgresql.ENUM('STANDARD', 'VARIANT', 'BUNDLE', 'CUSTOM', name='skutype', create_type=False), nullable=False, server_default='STANDARD'),
        sa.Column('creator_type', postgresql.ENUM('SYSTEM', 'PLATFORM', 'SUPPLIER', 'RESTAURANT', name='creatortype', create_type=False), nullable=False, server_default='SYSTEM'),
        sa.Column('creator_id', sa.String(length=36), nullable=True),
        sa.Column('standard_info', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('approval_status', postgresql.ENUM('PENDING', 'APPROVED', 'REJECTED', 'DRAFT', name='approvalstatus', create_type=False), nullable=False, server_default='DRAFT'),
        sa.Column('approved_by', sa.String(length=36), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('pricingMethod', postgresql.ENUM('UNIT', 'BULK', 'TIERED', 'VOLUME', name='pricingmethod', create_type=False), nullable=True),
        sa.Column('pricingUnit', sa.String(), nullable=False, server_default='unit'),
        sa.Column('unitPrice', sa.Float(), nullable=True),
        sa.Column('minOrderQuantity', sa.Float(), nullable=True),
        sa.Column('quantityIncrement', sa.Float(), nullable=True),
        sa.Column('originCountry', sa.String(), nullable=True),
        sa.Column('originRegion', sa.String(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('skuCode'),
        sa.ForeignKeyConstraint(['productId'], ['products.id'], ),
    )
    op.create_index(op.f('ix_product_skus_skuCode'), 'product_skus', ['skuCode'], unique=False)
    op.create_index(op.f('ix_product_skus_productId'), 'product_skus', ['productId'], unique=False)
    
    # Create supplier_product_skus table
    op.create_table('supplier_product_skus',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('supplierId', sa.String(), nullable=False),
        sa.Column('productSkuId', sa.String(), nullable=False),
        sa.Column('supplierSkuCode', sa.String(), nullable=True),
        sa.Column('unitPrice', sa.Float(), nullable=False),
        sa.Column('minOrderQuantity', sa.Float(), nullable=False, server_default='1'),
        sa.Column('leadTimeDays', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('isActive', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['productSkuId'], ['product_skus.id'], ),
    )
    op.create_index(op.f('ix_supplier_product_skus_supplierId'), 'supplier_product_skus', ['supplierId'], unique=False)
    op.create_index(op.f('ix_supplier_product_skus_productSkuId'), 'supplier_product_skus', ['productSkuId'], unique=False)
    
    # Create sku_code_sequences table
    op.create_table('sku_code_sequences',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('prefix', sa.String(), nullable=False),
        sa.Column('current_sequence', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('category')
    )


def downgrade() -> None:
    op.drop_table('sku_code_sequences')
    op.drop_table('supplier_product_skus')
    op.drop_table('product_skus')
    op.drop_table('products')
    op.drop_table('product_categories')
    op.execute('DROP TYPE IF EXISTS skutype')
    op.execute('DROP TYPE IF EXISTS creatortype')
    op.execute('DROP TYPE IF EXISTS approvalstatus')
    op.execute('DROP TYPE IF EXISTS pricingmethod')