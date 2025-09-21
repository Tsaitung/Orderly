#!/usr/bin/env python3
"""
Create SKU upload tables manually
"""
import asyncio
import sys
import os

# Add the project directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.ext.asyncio import create_async_engine
from app.models.sku_upload import SKUUpload, SKUUploadItem, SKUUploadAuditLog, SKUCodeSequence
from app.models.base import Base

async def create_tables():
    try:
        engine = create_async_engine('postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly')
        async with engine.begin() as conn:
            # Create only the new tables
            await conn.run_sync(Base.metadata.create_all, tables=[
                SKUUpload.__table__,
                SKUUploadItem.__table__,
                SKUUploadAuditLog.__table__,
                SKUCodeSequence.__table__
            ])
        print('✅ SKU upload tables created successfully!')
        return True
    except Exception as e:
        print(f'❌ Error creating tables: {e}')
        return False
    finally:
        await engine.dispose()

if __name__ == '__main__':
    success = asyncio.run(create_tables())
    sys.exit(0 if success else 1)