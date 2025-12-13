"""
OAuth 服務

支援 Line 和 Google OAuth 2.0 登入整合

環境變數配置：
- LINE_CHANNEL_ID: Line Login Channel ID
- LINE_CHANNEL_SECRET: Line Login Channel Secret
- LINE_REDIRECT_URI: Line OAuth 回調 URL

- GOOGLE_CLIENT_ID: Google OAuth Client ID
- GOOGLE_CLIENT_SECRET: Google OAuth Client Secret
- GOOGLE_REDIRECT_URI: Google OAuth 回調 URL
"""

import os
import secrets
import hashlib
import base64
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import httpx
import structlog
from urllib.parse import urlencode

logger = structlog.get_logger()


# OAuth 配置
LINE_CHANNEL_ID = os.getenv("LINE_CHANNEL_ID")
LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")
LINE_REDIRECT_URI = os.getenv("LINE_REDIRECT_URI", "http://localhost:3000/auth/callback/line")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/callback/google")


class OAuthService:
    """OAuth 整合服務"""

    # OAuth 端點
    LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize"
    LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token"
    LINE_PROFILE_URL = "https://api.line.me/v2/profile"
    LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify"

    GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

    # State 有效期（秒）
    STATE_EXPIRY = 600  # 10 分鐘

    def __init__(self, redis_client=None):
        """初始化 OAuth 服務"""
        self.redis = redis_client
        self._http_client = None

    @property
    def http_client(self) -> httpx.AsyncClient:
        """取得 HTTP 客戶端"""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=30.0)
        return self._http_client

    async def close(self):
        """關閉 HTTP 客戶端"""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None

    # ========== Line OAuth ==========

    def is_line_available(self) -> bool:
        """檢查 Line OAuth 是否可用"""
        return bool(LINE_CHANNEL_ID and LINE_CHANNEL_SECRET)

    async def get_line_authorization_url(self, redirect_uri: Optional[str] = None) -> Dict[str, str]:
        """
        取得 Line 授權 URL

        Returns:
            {
                "authorization_url": str,
                "state": str,
                "code_verifier": str (for PKCE)
            }
        """
        if not self.is_line_available():
            raise ValueError("Line OAuth 未配置")

        # 生成 state（防止 CSRF）
        state = secrets.token_urlsafe(32)

        # 生成 PKCE code_verifier 和 code_challenge
        code_verifier = secrets.token_urlsafe(64)
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).decode().rstrip("=")

        # 儲存 state 和 code_verifier（用於驗證回調）
        if self.redis:
            state_data = {
                "provider": "line",
                "code_verifier": code_verifier,
                "created_at": datetime.utcnow().isoformat()
            }
            await self.redis.setex(
                f"oauth:state:{state}",
                self.STATE_EXPIRY,
                str(state_data)
            )

        # 構建授權 URL
        params = {
            "response_type": "code",
            "client_id": LINE_CHANNEL_ID,
            "redirect_uri": redirect_uri or LINE_REDIRECT_URI,
            "state": state,
            "scope": "profile openid email",
            "code_challenge": code_challenge,
            "code_challenge_method": "S256"
        }

        authorization_url = f"{self.LINE_AUTH_URL}?{urlencode(params)}"

        logger.info("line_auth_url_generated", state=state[:8])

        return {
            "authorization_url": authorization_url,
            "state": state,
            "code_verifier": code_verifier
        }

    async def exchange_line_code(
        self,
        code: str,
        state: str,
        code_verifier: Optional[str] = None,
        redirect_uri: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        用授權碼換取 Line Access Token

        Args:
            code: 授權碼
            state: state 參數
            code_verifier: PKCE code_verifier（可選）
            redirect_uri: 回調 URL

        Returns:
            {
                "access_token": str,
                "token_type": str,
                "refresh_token": str,
                "expires_in": int,
                "scope": str,
                "id_token": str
            }
        """
        if not self.is_line_available():
            raise ValueError("Line OAuth 未配置")

        # 驗證 state（如果有 Redis）
        if self.redis:
            state_data = await self.redis.get(f"oauth:state:{state}")
            if not state_data:
                raise ValueError("Invalid or expired state")
            await self.redis.delete(f"oauth:state:{state}")

        # 準備請求參數
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri or LINE_REDIRECT_URI,
            "client_id": LINE_CHANNEL_ID,
            "client_secret": LINE_CHANNEL_SECRET,
        }

        if code_verifier:
            data["code_verifier"] = code_verifier

        # 換取 token
        response = await self.http_client.post(
            self.LINE_TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        if response.status_code != 200:
            logger.error(
                "line_token_exchange_failed",
                status=response.status_code,
                error=response.text
            )
            raise ValueError(f"Line token exchange failed: {response.text}")

        token_data = response.json()
        logger.info("line_token_exchanged")

        return token_data

    async def get_line_profile(self, access_token: str) -> Dict[str, Any]:
        """
        取得 Line 用戶資料

        Returns:
            {
                "userId": str,
                "displayName": str,
                "pictureUrl": str (optional),
                "statusMessage": str (optional)
            }
        """
        response = await self.http_client.get(
            self.LINE_PROFILE_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if response.status_code != 200:
            logger.error(
                "line_profile_fetch_failed",
                status=response.status_code
            )
            raise ValueError("Failed to fetch Line profile")

        profile = response.json()
        logger.info("line_profile_fetched", user_id=profile.get("userId", "")[:8])

        return profile

    # ========== Google OAuth ==========

    def is_google_available(self) -> bool:
        """檢查 Google OAuth 是否可用"""
        return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)

    async def get_google_authorization_url(self, redirect_uri: Optional[str] = None) -> Dict[str, str]:
        """
        取得 Google 授權 URL

        Returns:
            {
                "authorization_url": str,
                "state": str
            }
        """
        if not self.is_google_available():
            raise ValueError("Google OAuth 未配置")

        # 生成 state
        state = secrets.token_urlsafe(32)

        # 儲存 state
        if self.redis:
            state_data = {
                "provider": "google",
                "created_at": datetime.utcnow().isoformat()
            }
            await self.redis.setex(
                f"oauth:state:{state}",
                self.STATE_EXPIRY,
                str(state_data)
            )

        # 構建授權 URL
        params = {
            "response_type": "code",
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri or GOOGLE_REDIRECT_URI,
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",  # 取得 refresh_token
            "prompt": "consent"  # 強制顯示同意畫面
        }

        authorization_url = f"{self.GOOGLE_AUTH_URL}?{urlencode(params)}"

        logger.info("google_auth_url_generated", state=state[:8])

        return {
            "authorization_url": authorization_url,
            "state": state
        }

    async def exchange_google_code(
        self,
        code: str,
        state: str,
        redirect_uri: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        用授權碼換取 Google Access Token

        Returns:
            {
                "access_token": str,
                "token_type": str,
                "expires_in": int,
                "refresh_token": str (optional),
                "scope": str,
                "id_token": str
            }
        """
        if not self.is_google_available():
            raise ValueError("Google OAuth 未配置")

        # 驗證 state
        if self.redis:
            state_data = await self.redis.get(f"oauth:state:{state}")
            if not state_data:
                raise ValueError("Invalid or expired state")
            await self.redis.delete(f"oauth:state:{state}")

        # 換取 token
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri or GOOGLE_REDIRECT_URI,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
        }

        response = await self.http_client.post(
            self.GOOGLE_TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        if response.status_code != 200:
            logger.error(
                "google_token_exchange_failed",
                status=response.status_code,
                error=response.text
            )
            raise ValueError(f"Google token exchange failed: {response.text}")

        token_data = response.json()
        logger.info("google_token_exchanged")

        return token_data

    async def get_google_userinfo(self, access_token: str) -> Dict[str, Any]:
        """
        取得 Google 用戶資料

        Returns:
            {
                "id": str,
                "email": str,
                "verified_email": bool,
                "name": str,
                "given_name": str,
                "family_name": str,
                "picture": str,
                "locale": str
            }
        """
        response = await self.http_client.get(
            self.GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if response.status_code != 200:
            logger.error(
                "google_userinfo_fetch_failed",
                status=response.status_code
            )
            raise ValueError("Failed to fetch Google user info")

        userinfo = response.json()
        logger.info("google_userinfo_fetched", email=userinfo.get("email", "")[:5] + "***")

        return userinfo

    # ========== 通用方法 ==========

    def get_available_providers(self) -> Dict[str, bool]:
        """取得可用的 OAuth 提供者"""
        return {
            "line": self.is_line_available(),
            "google": self.is_google_available()
        }

    async def handle_oauth_callback(
        self,
        provider: str,
        code: str,
        state: str,
        code_verifier: Optional[str] = None,
        redirect_uri: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        統一處理 OAuth 回調

        Returns:
            {
                "provider": str,
                "provider_user_id": str,
                "email": str (optional),
                "name": str,
                "avatar_url": str (optional),
                "access_token": str,
                "refresh_token": str (optional),
                "raw_profile": dict
            }
        """
        if provider == "line":
            # 換取 token
            token_data = await self.exchange_line_code(
                code=code,
                state=state,
                code_verifier=code_verifier,
                redirect_uri=redirect_uri
            )

            # 取得用戶資料
            profile = await self.get_line_profile(token_data["access_token"])

            return {
                "provider": "line",
                "provider_user_id": profile["userId"],
                "email": None,  # Line 不一定提供 email
                "name": profile["displayName"],
                "avatar_url": profile.get("pictureUrl"),
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "raw_profile": profile
            }

        elif provider == "google":
            # 換取 token
            token_data = await self.exchange_google_code(
                code=code,
                state=state,
                redirect_uri=redirect_uri
            )

            # 取得用戶資料
            userinfo = await self.get_google_userinfo(token_data["access_token"])

            return {
                "provider": "google",
                "provider_user_id": userinfo["id"],
                "email": userinfo.get("email"),
                "name": userinfo.get("name"),
                "avatar_url": userinfo.get("picture"),
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "raw_profile": userinfo
            }

        else:
            raise ValueError(f"Unsupported OAuth provider: {provider}")


# 單例實例
oauth_service = OAuthService()
