#!/usr/bin/env python3
"""
設定資料庫中現有用戶的密碼
"""
import asyncio
from passlib.context import CryptContext
from sqlalchemy import update
from app.core.database import AsyncSessionLocal
from app.models.user import User

# Password hashing context
pwd_context = CryptContext(
    schemes=["bcrypt"], 
    deprecated="auto",
    bcrypt__rounds=12
)

async def set_user_passwords():
    """為現有用戶設定密碼"""
    async with AsyncSessionLocal() as session:
        try:
            # 設定密碼
            password_hash = pwd_context.hash("Admin123")
            
            # 更新所有用戶的密碼
            await session.execute(
                update(User).values(password_hash=password_hash)
            )
            
            await session.commit()
            print("✅ 所有用戶密碼已設定為: Admin123")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ 設定密碼失敗: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(set_user_passwords())