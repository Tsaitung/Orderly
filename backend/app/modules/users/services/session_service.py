"""
Session 管理服務

提供：
- Session 追蹤（Redis 存儲）
- 列出活躍 Session
- 終止特定 Session
- 終止所有 Session（登出所有裝置）
- Session 資訊（裝置、IP、最後活動時間）
"""

import os
import json
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from user_agents import parse as parse_user_agent
import structlog

logger = structlog.get_logger()

# Redis 配置
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
SESSION_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 天
SESSION_PREFIX = "session:"
USER_SESSIONS_PREFIX = "user_sessions:"


class SessionService:
    """Session 管理服務"""

    def __init__(self, redis_client=None):
        """
        初始化 Session 服務

        Args:
            redis_client: Redis 客戶端（可選，如果不提供則創建新的）
        """
        self.redis = redis_client
        self._own_redis = False

    async def connect(self):
        """連接 Redis"""
        if self.redis is None:
            import redis.asyncio as redis_lib
            self.redis = await redis_lib.from_url(
                REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            self._own_redis = True
            logger.info("session_service_connected")

    async def close(self):
        """關閉 Redis 連接"""
        if self._own_redis and self.redis:
            await self.redis.close()
            self.redis = None
            logger.info("session_service_closed")

    async def create_session(
        self,
        user_id: str,
        access_token_jti: str,
        refresh_token_jti: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        device_info: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        創建新的 Session

        Args:
            user_id: 用戶 ID
            access_token_jti: Access Token JTI
            refresh_token_jti: Refresh Token JTI
            user_agent: User Agent 字串
            ip_address: IP 地址
            device_info: 額外的裝置資訊

        Returns:
            Session 資訊
        """
        if not self.redis:
            await self.connect()

        session_id = str(uuid.uuid4())
        now = datetime.utcnow()

        # 解析 User Agent
        device_name = "Unknown Device"
        browser = "Unknown"
        os_name = "Unknown"

        if user_agent:
            try:
                ua = parse_user_agent(user_agent)
                browser = f"{ua.browser.family} {ua.browser.version_string}"
                os_name = f"{ua.os.family} {ua.os.version_string}"
                device_name = f"{browser} on {os_name}"
            except Exception:
                pass

        session_data = {
            "session_id": session_id,
            "user_id": user_id,
            "access_token_jti": access_token_jti,
            "refresh_token_jti": refresh_token_jti,
            "user_agent": user_agent,
            "ip_address": ip_address,
            "device_name": device_name,
            "browser": browser,
            "os": os_name,
            "device_info": device_info or {},
            "created_at": now.isoformat(),
            "last_activity": now.isoformat(),
            "is_active": True
        }

        # 儲存 Session
        session_key = f"{SESSION_PREFIX}{session_id}"
        await self.redis.setex(
            session_key,
            SESSION_TTL_SECONDS,
            json.dumps(session_data)
        )

        # 將 Session ID 添加到用戶的 Session 列表
        user_sessions_key = f"{USER_SESSIONS_PREFIX}{user_id}"
        await self.redis.sadd(user_sessions_key, session_id)
        await self.redis.expire(user_sessions_key, SESSION_TTL_SECONDS)

        # 建立 JTI 到 Session 的映射（用於快速查找）
        await self.redis.setex(
            f"jti_session:{access_token_jti}",
            SESSION_TTL_SECONDS,
            session_id
        )

        logger.info(
            "session_created",
            session_id=session_id[:8],
            user_id=user_id[:8],
            device_name=device_name
        )

        return session_data

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """取得 Session 資訊"""
        if not self.redis:
            await self.connect()

        session_key = f"{SESSION_PREFIX}{session_id}"
        data = await self.redis.get(session_key)

        if not data:
            return None

        return json.loads(data)

    async def get_session_by_jti(self, jti: str) -> Optional[Dict[str, Any]]:
        """透過 JTI 取得 Session"""
        if not self.redis:
            await self.connect()

        session_id = await self.redis.get(f"jti_session:{jti}")
        if not session_id:
            return None

        return await self.get_session(session_id)

    async def update_activity(self, session_id: str) -> bool:
        """更新 Session 最後活動時間"""
        if not self.redis:
            await self.connect()

        session = await self.get_session(session_id)
        if not session:
            return False

        session["last_activity"] = datetime.utcnow().isoformat()

        session_key = f"{SESSION_PREFIX}{session_id}"
        ttl = await self.redis.ttl(session_key)

        await self.redis.setex(
            session_key,
            max(ttl, 3600),  # 至少保留 1 小時
            json.dumps(session)
        )

        return True

    async def list_user_sessions(
        self,
        user_id: str,
        current_session_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        列出用戶的所有活躍 Session

        Args:
            user_id: 用戶 ID
            current_session_id: 當前 Session ID（用於標記）

        Returns:
            Session 列表
        """
        if not self.redis:
            await self.connect()

        user_sessions_key = f"{USER_SESSIONS_PREFIX}{user_id}"
        session_ids = await self.redis.smembers(user_sessions_key)

        sessions = []
        expired_ids = []

        for session_id in session_ids:
            session = await self.get_session(session_id)

            if session:
                # 標記是否為當前 Session
                session["is_current"] = (session_id == current_session_id)
                sessions.append({
                    "id": session["session_id"],
                    "device_name": session.get("device_name", "Unknown"),
                    "browser": session.get("browser", "Unknown"),
                    "os": session.get("os", "Unknown"),
                    "ip_address": session.get("ip_address"),
                    "created_at": session.get("created_at"),
                    "last_activity": session.get("last_activity"),
                    "is_current": session["is_current"]
                })
            else:
                # Session 已過期
                expired_ids.append(session_id)

        # 清理過期的 Session ID
        if expired_ids:
            await self.redis.srem(user_sessions_key, *expired_ids)

        # 按最後活動時間排序
        sessions.sort(
            key=lambda x: x.get("last_activity", ""),
            reverse=True
        )

        return sessions

    async def terminate_session(
        self,
        session_id: str,
        user_id: str
    ) -> bool:
        """
        終止指定 Session

        Args:
            session_id: 要終止的 Session ID
            user_id: 用戶 ID（用於驗證）

        Returns:
            是否成功終止
        """
        if not self.redis:
            await self.connect()

        session = await self.get_session(session_id)

        if not session:
            return False

        # 驗證 Session 屬於該用戶
        if session.get("user_id") != user_id:
            logger.warning(
                "session_terminate_unauthorized",
                session_id=session_id[:8],
                user_id=user_id[:8]
            )
            return False

        # 刪除 Session
        session_key = f"{SESSION_PREFIX}{session_id}"
        await self.redis.delete(session_key)

        # 從用戶 Session 列表移除
        user_sessions_key = f"{USER_SESSIONS_PREFIX}{user_id}"
        await self.redis.srem(user_sessions_key, session_id)

        # 將 Token 加入黑名單
        if session.get("access_token_jti"):
            await self.blacklist_token(session["access_token_jti"])

        if session.get("refresh_token_jti"):
            await self.blacklist_token(session["refresh_token_jti"])

        logger.info(
            "session_terminated",
            session_id=session_id[:8],
            user_id=user_id[:8]
        )

        return True

    async def terminate_all_sessions(
        self,
        user_id: str,
        except_session_id: Optional[str] = None
    ) -> int:
        """
        終止用戶的所有 Session

        Args:
            user_id: 用戶 ID
            except_session_id: 保留的 Session ID（通常是當前 Session）

        Returns:
            終止的 Session 數量
        """
        if not self.redis:
            await self.connect()

        user_sessions_key = f"{USER_SESSIONS_PREFIX}{user_id}"
        session_ids = await self.redis.smembers(user_sessions_key)

        terminated_count = 0

        for session_id in session_ids:
            if session_id == except_session_id:
                continue

            session = await self.get_session(session_id)

            if session:
                # 將 Token 加入黑名單
                if session.get("access_token_jti"):
                    await self.blacklist_token(session["access_token_jti"])

                if session.get("refresh_token_jti"):
                    await self.blacklist_token(session["refresh_token_jti"])

            # 刪除 Session
            session_key = f"{SESSION_PREFIX}{session_id}"
            await self.redis.delete(session_key)
            await self.redis.srem(user_sessions_key, session_id)

            terminated_count += 1

        logger.info(
            "all_sessions_terminated",
            user_id=user_id[:8],
            count=terminated_count,
            preserved=except_session_id[:8] if except_session_id else None
        )

        return terminated_count

    async def blacklist_token(self, jti: str, ttl: int = 3600) -> None:
        """
        將 Token JTI 加入黑名單

        Args:
            jti: Token JTI
            ttl: 黑名單保留時間（秒）
        """
        if not self.redis:
            await self.connect()

        await self.redis.setex(f"blacklist:{jti}", ttl, "revoked")

    async def is_token_blacklisted(self, jti: str) -> bool:
        """檢查 Token 是否在黑名單中"""
        if not self.redis:
            await self.connect()

        return await self.redis.exists(f"blacklist:{jti}") > 0

    async def get_active_session_count(self, user_id: str) -> int:
        """取得用戶的活躍 Session 數量"""
        if not self.redis:
            await self.connect()

        sessions = await self.list_user_sessions(user_id)
        return len(sessions)


# 單例實例
session_service = SessionService()
