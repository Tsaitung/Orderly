"""
OTP (一次性密碼) 服務

使用 Redis 存儲和管理 OTP 驗證碼：
- 6 位數字驗證碼
- 10 分鐘有效期
- 5 次驗證嘗試限制
- 支援 Email 和 SMS OTP
"""

import secrets
import json
from datetime import datetime, timedelta
from typing import Dict, Optional
from redis import asyncio as aioredis
import structlog

logger = structlog.get_logger()


class OTPService:
    """OTP 生成和驗證服務"""

    OTP_LENGTH = 6
    OTP_TTL_SECONDS = 600  # 10 分鐘
    MAX_ATTEMPTS = 5

    def __init__(self, redis_url: str):
        """
        初始化 OTP 服務

        Args:
            redis_url: Redis 連接 URL (例如: redis://localhost:6379/0)
        """
        self.redis_url = redis_url
        self.redis: Optional[aioredis.Redis] = None

    async def connect(self):
        """建立 Redis 連接"""
        try:
            self.redis = await aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            # 測試連接
            await self.redis.ping()
            logger.info("otp_service_redis_connected", redis_url=self.redis_url)
        except Exception as e:
            logger.error("otp_service_redis_connection_failed", error=str(e))
            raise

    async def close(self):
        """關閉 Redis 連接"""
        if self.redis:
            await self.redis.close()
            logger.info("otp_service_redis_disconnected")

    async def generate_otp(
        self,
        user_id: str,
        otp_type: str,
        metadata: Optional[Dict] = None
    ) -> str:
        """
        生成 6 位數 OTP 驗證碼

        Args:
            user_id: 用戶 ID
            otp_type: OTP 類型 (email, sms, phone)
            metadata: 額外的元數據 (例如: email 地址)

        Returns:
            6 位數 OTP 驗證碼

        Raises:
            Exception: 如果 Redis 連接失敗
        """
        if not self.redis:
            raise Exception("Redis connection not established")

        # 生成 6 位隨機數字
        code = ''.join([str(secrets.randbelow(10)) for _ in range(self.OTP_LENGTH)])

        # Redis key 格式: otp:{type}:{user_id}
        redis_key = f"otp:{otp_type}:{user_id}"

        # 存儲 OTP 資料
        otp_data = {
            "code": code,
            "attempts": 0,
            "created_at": datetime.utcnow().isoformat(),
            "metadata": metadata or {}
        }

        try:
            # 設定 OTP，10 分鐘後過期
            await self.redis.setex(
                redis_key,
                self.OTP_TTL_SECONDS,
                json.dumps(otp_data)
            )

            logger.info(
                "otp_generated",
                user_id=user_id,
                otp_type=otp_type,
                ttl_seconds=self.OTP_TTL_SECONDS
            )

            return code

        except Exception as e:
            logger.error(
                "otp_generation_failed",
                user_id=user_id,
                otp_type=otp_type,
                error=str(e)
            )
            raise

    async def verify_otp(
        self,
        user_id: str,
        otp_type: str,
        code: str
    ) -> Dict[str, any]:
        """
        驗證 OTP 驗證碼

        Args:
            user_id: 用戶 ID
            otp_type: OTP 類型
            code: 要驗證的 OTP 驗證碼

        Returns:
            Dict with:
                - valid (bool): 驗證碼是否有效
                - error (str): 錯誤訊息（如果無效）
                - metadata (dict): OTP 的元數據（如果有效）
        """
        if not self.redis:
            raise Exception("Redis connection not established")

        redis_key = f"otp:{otp_type}:{user_id}"

        try:
            # 取得 OTP 資料
            data = await self.redis.get(redis_key)

            if not data:
                logger.warn(
                    "otp_not_found_or_expired",
                    user_id=user_id,
                    otp_type=otp_type
                )
                return {
                    "valid": False,
                    "error": "驗證碼已過期或不存在",
                    "metadata": None
                }

            otp_data = json.loads(data)

            # 檢查嘗試次數
            if otp_data["attempts"] >= self.MAX_ATTEMPTS:
                await self.redis.delete(redis_key)
                logger.warn(
                    "otp_max_attempts_exceeded",
                    user_id=user_id,
                    otp_type=otp_type,
                    attempts=otp_data["attempts"]
                )
                return {
                    "valid": False,
                    "error": f"驗證嘗試次數過多 ({self.MAX_ATTEMPTS} 次)，請重新獲取驗證碼",
                    "metadata": None
                }

            # 驗證碼比對
            if otp_data["code"] != code:
                # 增加嘗試次數
                otp_data["attempts"] += 1
                ttl = await self.redis.ttl(redis_key)
                await self.redis.setex(redis_key, ttl, json.dumps(otp_data))

                remaining_attempts = self.MAX_ATTEMPTS - otp_data["attempts"]
                logger.warn(
                    "otp_verification_failed",
                    user_id=user_id,
                    otp_type=otp_type,
                    attempts=otp_data["attempts"],
                    remaining=remaining_attempts
                )

                return {
                    "valid": False,
                    "error": f"驗證碼錯誤，剩餘 {remaining_attempts} 次嘗試機會",
                    "metadata": None
                }

            # 驗證成功，刪除 OTP
            await self.redis.delete(redis_key)

            logger.info(
                "otp_verification_success",
                user_id=user_id,
                otp_type=otp_type
            )

            return {
                "valid": True,
                "error": None,
                "metadata": otp_data.get("metadata", {})
            }

        except Exception as e:
            logger.error(
                "otp_verification_error",
                user_id=user_id,
                otp_type=otp_type,
                error=str(e)
            )
            raise

    async def get_remaining_ttl(self, user_id: str, otp_type: str) -> int:
        """
        取得 OTP 剩餘有效時間

        Args:
            user_id: 用戶 ID
            otp_type: OTP 類型

        Returns:
            剩餘秒數，如果 OTP 不存在則返回 0
        """
        if not self.redis:
            return 0

        redis_key = f"otp:{otp_type}:{user_id}"
        try:
            ttl = await self.redis.ttl(redis_key)
            return max(0, ttl)
        except Exception:
            return 0

    async def delete_otp(self, user_id: str, otp_type: str) -> bool:
        """
        刪除 OTP（例如用戶取消操作）

        Args:
            user_id: 用戶 ID
            otp_type: OTP 類型

        Returns:
            是否成功刪除
        """
        if not self.redis:
            return False

        redis_key = f"otp:{otp_type}:{user_id}"
        try:
            result = await self.redis.delete(redis_key)
            logger.info(
                "otp_deleted",
                user_id=user_id,
                otp_type=otp_type,
                deleted=bool(result)
            )
            return bool(result)
        except Exception as e:
            logger.error(
                "otp_deletion_failed",
                user_id=user_id,
                otp_type=otp_type,
                error=str(e)
            )
            return False
