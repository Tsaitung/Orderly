"""Add SKU management tables: product_skus, product_allergens, product_nutrition, supplier_skus

Revision ID: 602514766ff3
Revises: 6ac9bcef1ff3
Create Date: 2025-09-19 21:33:34.921169

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '602514766ff3'
down_revision = '6ac9bcef1ff3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types first
    op.execute("""
        CREATE TYPE packagingtype AS ENUM ('bulk', '500g', '1kg', '5kg', 'custom');
        CREATE TYPE qualitygrade AS ENUM ('A', 'B', 'PROC');
        CREATE TYPE processingmethod AS ENUM ('RAW', 'WASH', 'CUT', 'FROZ');
        CREATE TYPE packagingmaterial AS ENUM ('VAC', 'BOX', 'CARD', 'PBAG');
        CREATE TYPE allergentype AS ENUM ('gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'dairy', 'nuts', 'celery', 'mustard', 'sesame', 'sulfites', 'lupin', 'molluscs');
        CREATE TYPE allergenrisklevel AS ENUM ('0', '1', '2', '3');
    """)
    
    # Create product_skus table
    op.create_table('product_skus',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('skuCode', sa.String(), nullable=False),
        sa.Column('productId', sa.String(), nullable=False),
        sa.Column('packagingType', sa.Enum('bulk', '500g', '1kg', '5kg', 'custom', name='packagingtype'), nullable=False),
        sa.Column('packagingSize', sa.String(), nullable=True),
        sa.Column('qualityGrade', sa.Enum('A', 'B', 'PROC', name='qualitygrade'), nullable=False),
        sa.Column('processingMethod', sa.Enum('RAW', 'WASH', 'CUT', 'FROZ', name='processingmethod'), nullable=False),
        sa.Column('packagingMaterial', sa.Enum('VAC', 'BOX', 'CARD', 'PBAG', name='packagingmaterial'), nullable=False),
        sa.Column('basePrice', sa.Numeric(precision=10, scale=4), nullable=False),
        sa.Column('currentStock', sa.Integer(), nullable=False, default=0),
        sa.Column('minStockLevel', sa.Integer(), nullable=False, default=0),
        sa.Column('maxStockLevel', sa.Integer(), nullable=True),
        sa.Column('weightGrams', sa.Integer(), nullable=True),
        sa.Column('dimensions', sa.JSON(), nullable=False, default={}),
        sa.Column('minimumOrderQuantity', sa.Integer(), nullable=False, default=1),
        sa.Column('batchNumber', sa.String(), nullable=True),
        sa.Column('expiryDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('isActive', sa.Boolean(), nullable=False, default=True),
        sa.Column('isInStock', sa.Boolean(), nullable=False, default=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=False, default={}),
        sa.Column('createdBy', sa.String(), nullable=True),
        sa.Column('updatedBy', sa.String(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['productId'], ['products.id'], ),
        sa.UniqueConstraint('skuCode')
    )
    
    # Create indexes for product_skus
    op.create_index('ix_product_skus_skuCode', 'product_skus', ['skuCode'])
    op.create_index('ix_product_skus_productId', 'product_skus', ['productId'])
    op.create_index('ix_product_skus_isActive', 'product_skus', ['isActive'])
    
    # Create product_allergens table
    op.create_table('product_allergens',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('skuId', sa.String(), nullable=False),
        sa.Column('allergenType', sa.Enum('gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'dairy', 'nuts', 'celery', 'mustard', 'sesame', 'sulfites', 'lupin', 'molluscs', name='allergentype'), nullable=False),
        sa.Column('riskLevel', sa.Enum('0', '1', '2', '3', name='allergenrisklevel'), nullable=False),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('crossContaminationRisk', sa.Boolean(), nullable=False, default=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('isActive', sa.Boolean(), nullable=False, default=True),
        sa.Column('createdBy', sa.String(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['skuId'], ['product_skus.id'], ),
    )
    
    # Create indexes for product_allergens
    op.create_index('ix_product_allergens_skuId', 'product_allergens', ['skuId'])
    op.create_index('ix_product_allergens_allergenType', 'product_allergens', ['allergenType'])
    
    # Create product_nutrition table
    op.create_table('product_nutrition',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('productId', sa.String(), nullable=False),
        sa.Column('caloriesPer100g', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('proteinG', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('fatG', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('carbsG', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('fiberG', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('sugarG', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('sodiumMg', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('calciumMg', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('ironMg', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('vitaminCMg', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('nutritionClaims', sa.JSON(), nullable=False, default=[]),
        sa.Column('isVerified', sa.Boolean(), nullable=False, default=False),
        sa.Column('verifiedBy', sa.String(), nullable=True),
        sa.Column('verifiedAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('dataSource', sa.String(), nullable=True),
        sa.Column('labReportUrl', sa.String(), nullable=True),
        sa.Column('createdBy', sa.String(), nullable=True),
        sa.Column('updatedBy', sa.String(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['productId'], ['products.id'], ),
    )
    
    # Create indexes for product_nutrition
    op.create_index('ix_product_nutrition_productId', 'product_nutrition', ['productId'])
    op.create_index('ix_product_nutrition_isVerified', 'product_nutrition', ['isVerified'])
    
    # Create supplier_skus table
    op.create_table('supplier_skus',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('skuId', sa.String(), nullable=False),
        sa.Column('supplierId', sa.String(), nullable=False),
        sa.Column('supplierSkuCode', sa.String(), nullable=False),
        sa.Column('supplierNameForProduct', sa.String(), nullable=True),
        sa.Column('supplierPrice', sa.Numeric(precision=10, scale=4), nullable=False),
        sa.Column('bulkDiscountThreshold', sa.Integer(), nullable=True),
        sa.Column('bulkDiscountRate', sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column('leadTimeDays', sa.Integer(), nullable=False, default=1),
        sa.Column('minimumOrderQuantity', sa.Integer(), nullable=False, default=1),
        sa.Column('availabilityStatus', sa.String(), nullable=False, default='available'),
        sa.Column('supplierQualityGrade', sa.String(), nullable=True),
        sa.Column('certifications', sa.JSON(), nullable=False, default=[]),
        sa.Column('contractStartDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('contractEndDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('isActive', sa.Boolean(), nullable=False, default=True),
        sa.Column('isPreferred', sa.Boolean(), nullable=False, default=False),
        sa.Column('qualityScore', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('deliveryScore', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('serviceScore', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('createdBy', sa.String(), nullable=True),
        sa.Column('updatedBy', sa.String(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['skuId'], ['product_skus.id'], ),
    )
    
    # Create indexes for supplier_skus
    op.create_index('ix_supplier_skus_skuId', 'supplier_skus', ['skuId'])
    op.create_index('ix_supplier_skus_supplierId', 'supplier_skus', ['supplierId'])
    op.create_index('ix_supplier_skus_isActive', 'supplier_skus', ['isActive'])
    op.create_index('ix_supplier_skus_isPreferred', 'supplier_skus', ['isPreferred'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('supplier_skus')
    op.drop_table('product_nutrition')
    op.drop_table('product_allergens')
    op.drop_table('product_skus')
    
    # Drop enum types
    op.execute("""
        DROP TYPE IF EXISTS packagingtype;
        DROP TYPE IF EXISTS qualitygrade;
        DROP TYPE IF EXISTS processingmethod;
        DROP TYPE IF EXISTS packagingmaterial;
        DROP TYPE IF EXISTS allergentype;
        DROP TYPE IF EXISTS allergenrisklevel;
    """)