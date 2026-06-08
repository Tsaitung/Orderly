"""
MFA (Multi-Factor Authentication) API 端點

提供：
- POST /auth/mfa/enable - 啟用 MFA
- POST /auth/mfa/verify-setup - 驗證 MFA 設置
- POST /auth/mfa/verify - 驗證 MFA（登入時）
- POST /auth/mfa/disable - 停用 MFA
- GET /auth/mfa/status - 獲取 MFA 狀態
- POST /auth/mfa/backup-codes - 重新生成備份碼
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from jose import jwt
import os
import structlog

from app.modules.users.core.database import get_async_session
from app.modules.users.api.v1.auth.core import (
    JWT_REFRESH_TOKEN_EXPIRE_DAYS as CORE_JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    _build_claims as build_auth_claims,
    create_access_token as create_core_access_token,
    create_refresh_token as create_core_refresh_token,
)
from app.modules.users.models.audit_log import AuditEventResult, AuditLog
from app.modules.users.models.user import User
from app.modules.users.models.organization import Organization
from app.modules.users.models.session import Session as UserSession
from app.modules.users.schemas.auth import (
    MFAEnableRequest,
    MFAEnableResponse,
    MFAVerifySetupRequest,
    MFAVerifySetupResponse,
    MFAVerifyRequest,
    MFAVerifyResponse,
    MFADisableRequest,
    MFADisableResponse,
    MFAStatusResponse,
    MFABackupCodesResponse
)
from app.modules.users.services.mfa_service import MFAService
from app.modules.users.services.verification_service import VerificationService

logger = structlog.get_logger()

router = APIRouter(prefix="/auth/mfa", tags=["MFA"])

# JWT 配置
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 15
JWT_REFRESH_TOKEN_EXPIRE_DAYS = 7
MFA_CHALLENGE_EXPIRE_MINUTES = 5
PLATFORM_ROLES = {"platform_admin", "platform_support", "super_admin"}
PLATFORM_AUTH_MAX_ACTIVE_SESSIONS = 3


def _is_platform_user(user: User) -> bool:
    return str(user.role) in PLATFORM_ROLES


async def _platform_active_session_count(db: AsyncSession, user: User) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(UserSession)
        .where(
            UserSession.user_id == str(user.id),
            UserSession.expires_at > datetime.utcnow(),
        )
    )
    return int(result.scalar_one() or 0)


async def get_current_user_from_token(
    request: Request,
    db: AsyncSession
) -> User:
    """從 Authorization header 提取 JWT 並驗證用戶"""
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="需要認證",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = auth_header.split(" ")[1]

    try:
        from jose import JWTError
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="無效的 token 類型"
            )

        user_id = payload.get("sub")
        token_version = payload.get("token_version", 0)

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="無效的 token"
            )

        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用戶不存在"
            )

        if user.token_version != token_version:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token 已失效"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="帳號已停用"
            )

        return user

    except Exception as e:
        logger.warning("jwt_validation_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 已過期或無效"
        )


def _build_claims(user: User, org: Organization) -> dict:
    """構建 JWT claims"""
    permissions = user.permissions or []
    verification_level = VerificationService.calculate_user_level(user, org)

    return {
        "sub": str(user.id),
        "email": user.email,
        "tenant_id": user.tenant_id or str(org.id),
        "org_id": str(org.id),
        "role": user.role,
        "permissions": permissions,
        "token_version": user.token_version,
        "verification_level": verification_level,
    }


def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(data: dict):
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_mfa_challenge_token(user_id: str, email: str) -> str:
    """創建 MFA 挑戰 token"""
    data = {
        "sub": user_id,
        "email": email,
        "type": "mfa_challenge",
        "exp": datetime.utcnow() + timedelta(minutes=MFA_CHALLENGE_EXPIRE_MINUTES)
    }
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_mfa_challenge_token(token: str) -> dict:
    """驗證 MFA 挑戰 token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "mfa_challenge":
            return None
        return payload
    except Exception:
        return None


@router.post("/enable", response_model=MFAEnableResponse)
async def enable_mfa(
    payload: MFAEnableRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    啟用 MFA

    1. 驗證使用者 access token
    2. 生成 TOTP 密鑰和 QR Code
    3. 生成備份碼
    4. 返回設置資訊（用戶需要完成驗證才會真正啟用）
    """
    try:
        current_user = await get_current_user_from_token(request, db)

        # 檢查是否已啟用
        if current_user.mfa_enabled:
            return MFAEnableResponse(
                success=False,
                message="MFA 已經啟用",
                error="MFA already enabled"
            )

        # 生成 MFA 設置
        setup = MFAService.setup_mfa_for_user(
            current_user.email or current_user.display_name or str(current_user.id)
        )

        logger.info(
            "mfa_enable_initiated",
            user_id=str(current_user.id),
            email=current_user.email
        )

        return MFAEnableResponse(
            success=True,
            message="請使用驗證器 App 掃描 QR Code，然後輸入驗證碼完成設置",
            qr_code=setup["qr_code"],
            secret=setup["secret"],  # 用於手動輸入
            backup_codes=setup["backup_codes"]
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error("mfa_enable_error", error=str(e))
        return MFAEnableResponse(
            success=False,
            message="啟用 MFA 失敗",
            error=str(e)
        )


@router.post("/verify-setup", response_model=MFAVerifySetupResponse)
async def verify_mfa_setup(
    payload: MFAVerifySetupRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    驗證 MFA 設置

    用戶掃描 QR Code 後，輸入驗證碼確認設置正確
    """
    try:
        current_user = await get_current_user_from_token(request, db)

        # 檢查是否已啟用
        if current_user.mfa_enabled:
            return MFAVerifySetupResponse(
                success=False,
                message="MFA 已經啟用",
                error="MFA already enabled"
            )

        # 驗證 TOTP 碼
        if not MFAService.verify_totp(payload.secret, payload.code):
            return MFAVerifySetupResponse(
                success=False,
                message="驗證碼錯誤，請確認 App 顯示的驗證碼",
                error="Invalid TOTP code"
            )

        # 生成備份碼並啟用 MFA
        backup_codes = MFAService.generate_backup_codes()
        success = await MFAService.enable_mfa(
            current_user,
            payload.secret,
            backup_codes,
            db
        )

        if not success:
            return MFAVerifySetupResponse(
                success=False,
                message="啟用 MFA 失敗",
                error="Failed to enable MFA"
            )

        logger.info(
            "mfa_enabled",
            user_id=str(current_user.id),
            email=current_user.email
        )

        return MFAVerifySetupResponse(
            success=True,
            message="MFA 已成功啟用"
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error("mfa_verify_setup_error", error=str(e))
        return MFAVerifySetupResponse(
            success=False,
            message="驗證失敗",
            error=str(e)
        )


@router.post("/verify", response_model=MFAVerifyResponse)
async def verify_mfa(
    payload: MFAVerifyRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    驗證 MFA（登入時使用）

    需要先獲取 MFA challenge token（從登入端點返回）
    """
    try:
        # 從 Authorization header 獲取 challenge token
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="需要 MFA challenge token"
            )

        challenge_token = auth_header.split(" ")[1]
        challenge_data = verify_mfa_challenge_token(challenge_token)

        if not challenge_data:
            return MFAVerifyResponse(
                success=False,
                message="MFA 挑戰已過期，請重新登入",
                error="Invalid or expired challenge token"
            )

        # 獲取用戶
        user_id = challenge_data["sub"]
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user or not user.mfa_enabled or user.status != "active" or not user.is_active:
            return MFAVerifyResponse(
                success=False,
                message="用戶不存在、已停用或未啟用 MFA",
                error="Invalid user, inactive user, or MFA not enabled"
            )

        # 驗證碼
        valid = False
        backup_codes_remaining = None

        if payload.use_backup:
            # 使用備份碼
            result = await MFAService.use_backup_code(user, payload.code, db)
            valid = result["valid"]
            backup_codes_remaining = len(result["remaining_codes"])
        else:
            # 使用 TOTP
            valid = MFAService.verify_totp(user.mfa_secret, payload.code)

        if not valid:
            return MFAVerifyResponse(
                success=False,
                message="驗證碼錯誤",
                error="Invalid code"
            )

        # 獲取組織並生成 token
        result = await db.execute(
            select(Organization).where(Organization.id == user.organization_id)
        )
        org = result.scalar_one_or_none()
        if not org:
            return MFAVerifyResponse(
                success=False,
                message="使用者缺少組織",
                error="Organization not found"
            )

        if _is_platform_user(user):
            active_sessions = await _platform_active_session_count(db, user)
            if active_sessions >= PLATFORM_AUTH_MAX_ACTIVE_SESSIONS:
                db.add(
                    AuditLog(
                        event_type="OAUTH_LOGIN",
                        event_result=AuditEventResult.BLOCKED.value,
                        action="platform_mfa_session_limit",
                        entity_type="AUTH",
                        entity_id=str(user.id),
                        user_id=str(user.id),
                        user_email=user.email,
                        organization_id=str(user.organization_id),
                        event_metadata={"active_sessions": active_sessions},
                        created_at=datetime.utcnow(),
                    )
                )
                await db.commit()
                return MFAVerifyResponse(
                    success=False,
                    message="平台帳號已達同時登入上限",
                    error="Session limit exceeded"
                )

        claims = build_auth_claims(user, org)
        access_token = create_core_access_token(claims)
        refresh_token = create_core_refresh_token({"sub": str(user.id), "token_version": user.token_version})

        # 更新登入時間
        user.last_login_at = datetime.utcnow()
        if _is_platform_user(user):
            user.failed_login_attempts = 0
            user.locked_until = None
        db.add(
            UserSession(
                user_id=str(user.id),
                token=refresh_token,
                expires_at=datetime.utcnow() + timedelta(days=CORE_JWT_REFRESH_TOKEN_EXPIRE_DAYS),
            )
        )
        await db.commit()

        logger.info(
            "mfa_verify_success",
            user_id=str(user.id),
            method="backup" if payload.use_backup else "totp"
        )

        return MFAVerifyResponse(
            success=True,
            message="MFA 驗證成功",
            token=access_token,
            refresh_token=refresh_token,
            user={
                "id": str(user.id),
                "email": user.email,
                "role": user.role,
                "verification_level": claims["verification_level"]
            },
            backup_codes_remaining=backup_codes_remaining
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error("mfa_verify_error", error=str(e))
        return MFAVerifyResponse(
            success=False,
            message="MFA 驗證失敗",
            error=str(e)
        )


@router.post("/disable", response_model=MFADisableResponse)
async def disable_mfa(
    payload: MFADisableRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    停用 MFA

    需要當前 TOTP 碼（或備份碼）確認
    """
    try:
        current_user = await get_current_user_from_token(request, db)

        # 檢查是否已啟用
        if not current_user.mfa_enabled:
            return MFADisableResponse(
                success=False,
                message="MFA 未啟用",
                error="MFA not enabled"
            )

        # 驗證 TOTP 碼或備份碼
        valid = MFAService.verify_totp(current_user.mfa_secret, payload.code)
        if not valid:
            # 嘗試備份碼
            result = MFAService.verify_backup_code(
                payload.code,
                current_user.mfa_backup_codes or []
            )
            valid = result["valid"]

        if not valid:
            return MFADisableResponse(
                success=False,
                message="驗證碼錯誤",
                error="Invalid code"
            )

        # 停用 MFA
        success = await MFAService.disable_mfa(current_user, db)

        if not success:
            return MFADisableResponse(
                success=False,
                message="停用 MFA 失敗",
                error="Failed to disable MFA"
            )

        logger.info(
            "mfa_disabled",
            user_id=str(current_user.id),
            email=current_user.email
        )

        return MFADisableResponse(
            success=True,
            message="MFA 已停用"
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error("mfa_disable_error", error=str(e))
        return MFADisableResponse(
            success=False,
            message="停用 MFA 失敗",
            error=str(e)
        )


@router.get("/status", response_model=MFAStatusResponse)
async def get_mfa_status(
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """獲取 MFA 狀態"""
    try:
        current_user = await get_current_user_from_token(request, db)

        status = MFAService.get_mfa_status(current_user)

        return MFAStatusResponse(
            enabled=status["enabled"],
            method=status["method"],
            backup_codes_remaining=status["backup_codes_remaining"],
            enforced_at=status["enforced_at"]
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error("mfa_status_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="獲取 MFA 狀態失敗"
        )


@router.post("/backup-codes", response_model=MFABackupCodesResponse)
async def regenerate_backup_codes(
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    重新生成備份碼

    注意：舊的備份碼會失效
    """
    try:
        current_user = await get_current_user_from_token(request, db)

        if not current_user.mfa_enabled:
            return MFABackupCodesResponse(
                success=False,
                message="MFA 未啟用",
                error="MFA not enabled"
            )

        new_codes = await MFAService.regenerate_backup_codes(current_user, db)

        if not new_codes:
            return MFABackupCodesResponse(
                success=False,
                message="生成備份碼失敗",
                error="Failed to regenerate backup codes"
            )

        logger.info(
            "mfa_backup_codes_regenerated",
            user_id=str(current_user.id)
        )

        return MFABackupCodesResponse(
            success=True,
            message="備份碼已重新生成，請妥善保存",
            backup_codes=new_codes
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error("mfa_backup_codes_error", error=str(e))
        return MFABackupCodesResponse(
            success=False,
            message="生成備份碼失敗",
            error=str(e)
        )
