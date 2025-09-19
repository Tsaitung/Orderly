"""fix SKU column naming consistency to snake_case

Revision ID: fix_sku_column_naming_manual
Revises: eee366349101
Create Date: 2025-09-19 23:40:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fix_sku_column_naming_manual'
down_revision = 'eee366349101'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Rename columns from camelCase to snake_case for consistency"""
    
    # Rename columns in product_skus table
    try:
        # Check if old columns exist before renaming
        op.execute("""
            DO $$
            BEGIN
                -- Rename SKU columns if they exist
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'skuCode') THEN
                    ALTER TABLE product_skus RENAME COLUMN "skuCode" TO sku_code;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'productId') THEN
                    ALTER TABLE product_skus RENAME COLUMN "productId" TO product_id;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'packagingType') THEN
                    ALTER TABLE product_skus RENAME COLUMN "packagingType" TO packaging_type;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'packagingSize') THEN
                    ALTER TABLE product_skus RENAME COLUMN "packagingSize" TO packaging_size;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'qualityGrade') THEN
                    ALTER TABLE product_skus RENAME COLUMN "qualityGrade" TO quality_grade;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'processingMethod') THEN
                    ALTER TABLE product_skus RENAME COLUMN "processingMethod" TO processing_method;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'packagingMaterial') THEN
                    ALTER TABLE product_skus RENAME COLUMN "packagingMaterial" TO packaging_material;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'basePrice') THEN
                    ALTER TABLE product_skus RENAME COLUMN "basePrice" TO base_price;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'pricingUnit') THEN
                    ALTER TABLE product_skus RENAME COLUMN "pricingUnit" TO pricing_unit;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'originCountry') THEN
                    ALTER TABLE product_skus RENAME COLUMN "originCountry" TO origin_country;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'originRegion') THEN
                    ALTER TABLE product_skus RENAME COLUMN "originRegion" TO origin_region;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'weightGrams') THEN
                    ALTER TABLE product_skus RENAME COLUMN "weightGrams" TO weight_grams;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'minimumOrderQuantity') THEN
                    ALTER TABLE product_skus RENAME COLUMN "minimumOrderQuantity" TO minimum_order_quantity;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'batchNumber') THEN
                    ALTER TABLE product_skus RENAME COLUMN "batchNumber" TO batch_number;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'expiryDate') THEN
                    ALTER TABLE product_skus RENAME COLUMN "expiryDate" TO expiry_date;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'isActive') THEN
                    ALTER TABLE product_skus RENAME COLUMN "isActive" TO is_active;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'metadata') THEN
                    ALTER TABLE product_skus RENAME COLUMN "metadata" TO meta_data;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'createdBy') THEN
                    ALTER TABLE product_skus RENAME COLUMN "createdBy" TO created_by;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'updatedBy') THEN
                    ALTER TABLE product_skus RENAME COLUMN "updatedBy" TO updated_by;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'createdAt') THEN
                    ALTER TABLE product_skus RENAME COLUMN "createdAt" TO created_at;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'updatedAt') THEN
                    ALTER TABLE product_skus RENAME COLUMN "updatedAt" TO updated_at;
                END IF;
            END $$;
        """)
        
        # Drop old indexes and create new ones
        op.execute("DROP INDEX IF EXISTS product_skus_skuCode_key")
        op.execute("DROP INDEX IF EXISTS product_skus_productId_idx") 
        op.execute("DROP INDEX IF EXISTS product_skus_isActive_idx")
        
        # Create new indexes with snake_case names
        op.create_index('ix_product_skus_sku_code', 'product_skus', ['sku_code'], unique=True)
        op.create_index('ix_product_skus_product_id', 'product_skus', ['product_id'])
        op.create_index('ix_product_skus_is_active', 'product_skus', ['is_active'])
        
    except Exception as e:
        print(f"Error in product_skus migration: {e}")
    
    # Rename columns in supplier_skus table if it exists
    try:
        op.execute("""
            DO $$
            BEGIN
                -- Check if supplier_skus table exists
                IF EXISTS (SELECT 1 FROM information_schema.tables 
                          WHERE table_name = 'supplier_skus') THEN
                    
                    -- Rename supplier_skus columns
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'skuId') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "skuId" TO sku_id;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'supplierId') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "supplierId" TO supplier_id;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'supplierSkuCode') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "supplierSkuCode" TO supplier_sku_code;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'supplierNameForProduct') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "supplierNameForProduct" TO supplier_name_for_product;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'supplierPrice') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "supplierPrice" TO supplier_price;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'bulkDiscountThreshold') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "bulkDiscountThreshold" TO bulk_discount_threshold;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'bulkDiscountRate') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "bulkDiscountRate" TO bulk_discount_rate;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'pricingTiers') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "pricingTiers" TO pricing_tiers;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'leadTimeDays') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "leadTimeDays" TO lead_time_days;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'minimumOrderQuantity') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "minimumOrderQuantity" TO minimum_order_quantity;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'availabilityStatus') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "availabilityStatus" TO availability_status;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'supplierQualityGrade') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "supplierQualityGrade" TO supplier_quality_grade;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'contractStartDate') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "contractStartDate" TO contract_start_date;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'contractEndDate') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "contractEndDate" TO contract_end_date;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'isActive') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "isActive" TO is_active;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'isPreferred') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "isPreferred" TO is_preferred;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'qualityScore') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "qualityScore" TO quality_score;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'deliveryScore') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "deliveryScore" TO delivery_score;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'serviceScore') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "serviceScore" TO service_score;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'createdBy') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "createdBy" TO created_by;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'updatedBy') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "updatedBy" TO updated_by;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'createdAt') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "createdAt" TO created_at;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'supplier_skus' AND column_name = 'updatedAt') THEN
                        ALTER TABLE supplier_skus RENAME COLUMN "updatedAt" TO updated_at;
                    END IF;
                END IF;
            END $$;
        """)
    except Exception as e:
        print(f"Error in supplier_skus migration: {e}")


def downgrade() -> None:
    """Revert column names back to camelCase"""
    
    # Revert product_skus table
    try:
        op.execute("""
            DO $$
            BEGIN
                -- Revert SKU columns back to camelCase
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'sku_code') THEN
                    ALTER TABLE product_skus RENAME COLUMN sku_code TO "skuCode";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'product_id') THEN
                    ALTER TABLE product_skus RENAME COLUMN product_id TO "productId";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'packaging_type') THEN
                    ALTER TABLE product_skus RENAME COLUMN packaging_type TO "packagingType";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'packaging_size') THEN
                    ALTER TABLE product_skus RENAME COLUMN packaging_size TO "packagingSize";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'quality_grade') THEN
                    ALTER TABLE product_skus RENAME COLUMN quality_grade TO "qualityGrade";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'processing_method') THEN
                    ALTER TABLE product_skus RENAME COLUMN processing_method TO "processingMethod";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'packaging_material') THEN
                    ALTER TABLE product_skus RENAME COLUMN packaging_material TO "packagingMaterial";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'base_price') THEN
                    ALTER TABLE product_skus RENAME COLUMN base_price TO "basePrice";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'pricing_unit') THEN
                    ALTER TABLE product_skus RENAME COLUMN pricing_unit TO "pricingUnit";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'origin_country') THEN
                    ALTER TABLE product_skus RENAME COLUMN origin_country TO "originCountry";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'origin_region') THEN
                    ALTER TABLE product_skus RENAME COLUMN origin_region TO "originRegion";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'weight_grams') THEN
                    ALTER TABLE product_skus RENAME COLUMN weight_grams TO "weightGrams";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'minimum_order_quantity') THEN
                    ALTER TABLE product_skus RENAME COLUMN minimum_order_quantity TO "minimumOrderQuantity";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'batch_number') THEN
                    ALTER TABLE product_skus RENAME COLUMN batch_number TO "batchNumber";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'expiry_date') THEN
                    ALTER TABLE product_skus RENAME COLUMN expiry_date TO "expiryDate";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'is_active') THEN
                    ALTER TABLE product_skus RENAME COLUMN is_active TO "isActive";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'meta_data') THEN
                    ALTER TABLE product_skus RENAME COLUMN meta_data TO "metadata";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'created_by') THEN
                    ALTER TABLE product_skus RENAME COLUMN created_by TO "createdBy";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'updated_by') THEN
                    ALTER TABLE product_skus RENAME COLUMN updated_by TO "updatedBy";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'created_at') THEN
                    ALTER TABLE product_skus RENAME COLUMN created_at TO "createdAt";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'product_skus' AND column_name = 'updated_at') THEN
                    ALTER TABLE product_skus RENAME COLUMN updated_at TO "updatedAt";
                END IF;
            END $$;
        """)
        
        # Restore old indexes
        op.execute("DROP INDEX IF EXISTS ix_product_skus_sku_code")
        op.execute("DROP INDEX IF EXISTS ix_product_skus_product_id")
        op.execute("DROP INDEX IF EXISTS ix_product_skus_is_active")
        
        op.create_index('product_skus_skuCode_key', 'product_skus', ['skuCode'], unique=True)
        op.create_index('product_skus_productId_idx', 'product_skus', ['productId'])
        op.create_index('product_skus_isActive_idx', 'product_skus', ['isActive'])
        
    except Exception as e:
        print(f"Error in product_skus downgrade: {e}")