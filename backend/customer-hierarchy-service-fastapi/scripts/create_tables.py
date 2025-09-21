#!/usr/bin/env python3
"""
Manual table creation script for Customer Hierarchy Service
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from app.core.config import settings
from app.models import CustomerGroup, CustomerCompany, CustomerLocation, BusinessUnit, CustomerMigrationLog
from app.models.base import Base
import structlog

logger = structlog.get_logger(__name__)


def create_tables():
    """Create tables using sync engine"""
    try:
        # Create sync engine
        engine = create_engine(settings.database_url_sync, echo=True)
        
        logger.info("Creating tables...")
        logger.info(f"Models registered: {list(Base.metadata.tables.keys())}")
        
        # Create all tables
        Base.metadata.create_all(engine)
        
        logger.info("Tables created successfully!")
        
        # List created tables
        from sqlalchemy import inspect
        inspector = inspect(engine)
        created_tables = inspector.get_table_names()
        logger.info(f"Tables in database: {created_tables}")
        
        return True
        
    except Exception as e:
        logger.error(f"Table creation failed: {str(e)}")
        return False


if __name__ == "__main__":
    success = create_tables()
    if success:
        print("✅ Tables created successfully!")
    else:
        print("❌ Table creation failed")
        sys.exit(1)