"""
Migration Safety Script
Ensures safe database migrations with proper validation and rollback
"""
import logging
from typing import Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
import json
from datetime import datetime
from pathlib import Path
import os
from urllib.parse import quote

logger = logging.getLogger(__name__)

class MigrationSafetyManager:
    """Manages safe database migrations with validation and rollback capability"""
    
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
        self.backup_dir = Path("backups/migrations")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def create_backup(self, table_name: str) -> str:
        """Create a backup of table data before migration"""
        backup_file = self.backup_dir / f"{table_name}_{datetime.now().isoformat()}.json"
        
        with Session(self.engine) as session:
            result = session.execute(
                text(f"SELECT * FROM {table_name}")
            ).fetchall()
            
            # Convert to JSON-serializable format
            data = [dict(row._mapping) for row in result]
            
            with open(backup_file, 'w') as f:
                json.dump(data, f, default=str)
        
        logger.info(f"Backup created: {backup_file}")
        return str(backup_file)
    
    def validate_migration(self, validation_query: str) -> bool:
        """Validate migration results against expected conditions"""
        with Session(self.engine) as session:
            try:
                result = session.execute(text(validation_query)).scalar()
                return bool(result)
            except Exception as e:
                logger.error(f"Validation failed: {e}")
                return False
    
    def rollback_with_backup(self, backup_file: str, table_name: str):
        """Rollback migration using backup data"""
        with open(backup_file, 'r') as f:
            data = json.load(f)
        
        with Session(self.engine) as session:
            try:
                # Clear current data
                session.execute(text(f"TRUNCATE TABLE {table_name} CASCADE"))
                
                # Restore from backup
                for row in data:
                    columns = ', '.join(row.keys())
                    placeholders = ', '.join([f":{k}" for k in row.keys()])
                    query = text(f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})")
                    session.execute(query, row)
                
                session.commit()
                logger.info(f"Rollback completed for {table_name}")
            except Exception as e:
                session.rollback()
                logger.error(f"Rollback failed: {e}")
                raise
    
    def rename_columns_safely(self, table_name: str, column_mappings: dict):
        """Safely rename columns with backup and validation"""
        
        # Create backup before migration
        backup_file = self.create_backup(table_name)
        
        with Session(self.engine) as session:
            try:
                # Begin transaction
                session.begin()
                
                # Rename columns
                for old_name, new_name in column_mappings.items():
                    # Check if column exists
                    check_query = text("""
                        SELECT COUNT(*) 
                        FROM information_schema.columns 
                        WHERE table_name = :table_name 
                        AND column_name = :column_name
                    """)
                    
                    exists = session.execute(
                        check_query, 
                        {"table_name": table_name, "column_name": old_name}
                    ).scalar()
                    
                    if exists:
                        rename_query = text(f"""
                            ALTER TABLE {table_name} 
                            RENAME COLUMN "{old_name}" TO {new_name}
                        """)
                        session.execute(rename_query)
                        logger.info(f"Renamed column {old_name} to {new_name} in {table_name}")
                    else:
                        logger.warning(f"Column {old_name} not found in {table_name}")
                
                # Commit transaction
                session.commit()
                logger.info(f"Successfully renamed columns in {table_name}")
                
                # Validate migration
                validation_query = f"SELECT COUNT(*) FROM {table_name}"
                if not self.validate_migration(validation_query):
                    raise Exception("Post-migration validation failed")
                
            except Exception as e:
                session.rollback()
                logger.error(f"Migration failed: {e}")
                
                # Attempt rollback
                try:
                    self.rollback_with_backup(backup_file, table_name)
                except Exception as rollback_error:
                    logger.critical(f"Rollback failed: {rollback_error}")
                
                raise e
    
    def update_indexes_safely(self, table_name: str, index_operations: list):
        """Safely update indexes"""
        
        with Session(self.engine) as session:
            try:
                for operation in index_operations:
                    operation_type = operation.get('type')
                    index_name = operation.get('name')
                    
                    if operation_type == 'drop':
                        # Check if index exists before dropping
                        check_query = text("""
                            SELECT COUNT(*) 
                            FROM pg_indexes 
                            WHERE indexname = :index_name
                        """)
                        
                        exists = session.execute(
                            check_query, 
                            {"index_name": index_name}
                        ).scalar()
                        
                        if exists:
                            drop_query = text(f"DROP INDEX IF EXISTS {index_name}")
                            session.execute(drop_query)
                            logger.info(f"Dropped index {index_name}")
                    
                    elif operation_type == 'create':
                        create_query = text(operation.get('query'))
                        session.execute(create_query)
                        logger.info(f"Created index {index_name}")
                
                session.commit()
                logger.info(f"Successfully updated indexes for {table_name}")
                
            except Exception as e:
                session.rollback()
                logger.error(f"Index update failed: {e}")
                raise

def main():
    """Main migration execution"""
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        host = os.getenv("DATABASE_HOST", "localhost")
        port = os.getenv("DATABASE_PORT", "5432")
        user = os.getenv("DATABASE_USER", "orderly")
        name = os.getenv("DATABASE_NAME", "orderly")
        
        # Support multiple password environment variable names (Cloud Run compatibility)
        password = (
            os.getenv("POSTGRES_PASSWORD") or
            os.getenv("DATABASE_PASSWORD") or
            os.getenv("DB_PASSWORD") or
            "orderly_dev_password"
        )
        
        # URL encode to handle special characters
        encoded_password = quote(password, safe="")
        encoded_user = quote(user, safe="")
        
        # Check if it's a Cloud SQL Unix Socket connection
        if host.startswith("/cloudsql/"):
            database_url = f"postgresql://{encoded_user}:{encoded_password}@/{name}?host={host}"
        else:
            database_url = f"postgresql://{encoded_user}:{encoded_password}@{host}:{port}/{name}"
    
    manager = MigrationSafetyManager(database_url)
    
    # Define column mappings for SKU-related tables
    sku_column_mappings = {
        "skuCode": "sku_code",
        "productId": "product_id", 
        "packagingType": "packaging_type",
        "packagingSize": "packaging_size",
        "qualityGrade": "quality_grade",
        "processingMethod": "processing_method",
        "packagingMaterial": "packaging_material",
        "basePrice": "base_price",
        "pricingUnit": "pricing_unit",
        "originCountry": "origin_country",
        "originRegion": "origin_region",
        "weightGrams": "weight_grams",
        "minimumOrderQuantity": "minimum_order_quantity",
        "batchNumber": "batch_number",
        "expiryDate": "expiry_date",
        "isActive": "is_active",
        "createdBy": "created_by",
        "updatedBy": "updated_by"
    }
    
    supplier_sku_mappings = {
        "skuId": "sku_id",
        "supplierId": "supplier_id",
        "supplierSkuCode": "supplier_sku_code",
        "supplierNameForProduct": "supplier_name_for_product",
        "supplierPrice": "supplier_price",
        "bulkDiscountThreshold": "bulk_discount_threshold",
        "bulkDiscountRate": "bulk_discount_rate",
        "pricingTiers": "pricing_tiers",
        "leadTimeDays": "lead_time_days",
        "minimumOrderQuantity": "minimum_order_quantity",
        "availabilityStatus": "availability_status",
        "supplierQualityGrade": "supplier_quality_grade",
        "contractStartDate": "contract_start_date",
        "contractEndDate": "contract_end_date",
        "isActive": "is_active",
        "isPreferred": "is_preferred",
        "qualityScore": "quality_score",
        "deliveryScore": "delivery_score",
        "serviceScore": "service_score",
        "createdBy": "created_by",
        "updatedBy": "updated_by"
    }
    
    allergen_mappings = {
        "skuId": "sku_id",
        "allergenType": "allergen_type",
        "riskLevel": "risk_level",
        "crossContaminationRisk": "cross_contamination_risk",
        "isActive": "is_active",
        "createdBy": "created_by"
    }
    
    nutrition_mappings = {
        "productId": "product_id",
        "caloriesPer100g": "calories_per_100g",
        "proteinG": "protein_g",
        "fatG": "fat_g",
        "carbsG": "carbs_g",
        "fiberG": "fiber_g",
        "sugarG": "sugar_g",
        "sodiumMg": "sodium_mg",
        "calciumMg": "calcium_mg",
        "ironMg": "iron_mg",
        "vitaminCMg": "vitamin_c_mg",
        "nutritionClaims": "nutrition_claims",
        "isVerified": "is_verified",
        "verifiedBy": "verified_by",
        "verifiedAt": "verified_at",
        "dataSource": "data_source",
        "labReportUrl": "lab_report_url",
        "createdBy": "created_by",
        "updatedBy": "updated_by"
    }
    
    try:
        # Migrate tables
        tables_to_migrate = [
            ("product_skus", sku_column_mappings),
            ("supplier_skus", supplier_sku_mappings),
            ("product_allergens", allergen_mappings),
            ("product_nutrition", nutrition_mappings)
        ]
        
        for table_name, mappings in tables_to_migrate:
            logger.info(f"Starting migration for {table_name}")
            manager.rename_columns_safely(table_name, mappings)
            logger.info(f"Completed migration for {table_name}")
        
        logger.info("All migrations completed successfully")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
