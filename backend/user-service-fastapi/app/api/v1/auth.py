from datetime import datetime, timedelta
import structlog
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
from typing import Any, Dict

# Structured logging
logger = structlog.get_logger()

from app.core.database import get_async_session
from app.models.organization import Organization, OrganizationType
from app.models.user import User
from app.models.session import Session as UserSession
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    ChangePasswordRequest,
    ChangePasswordResponse,
    SendEmailVerificationResponse,
    VerifyEmailRequest,
    VerifyEmailResponse,
    SendPhoneVerificationRequest,
    SendPhoneVerificationResponse,
    VerifyPhoneRequest,
    VerifyPhoneResponse
)
from app.services.password_service import PasswordService
from app.services.verification_service import VerificationService
from app.services.login_attempts_service import LoginAttemptsService
import httpx


router = APIRouter()

# Secure password hashing with bcrypt (cost factor 12)
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)

# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 15
JWT_REFRESH_TOKEN_EXPIRE_DAYS = 7


def _build_claims(user: User, org: Organization) -> Dict[str, Any]:
    """
    構建 JWT claims

    包含用戶基本資訊、角色權限和驗證級別
    """
    permissions = user.permissions or []

    # 計算用戶驗證級別 (0-3)
    verification_level = VerificationService.calculate_user_level(user, org)

    return {
        "sub": str(user.id),
        "email": user.email,
        "tenant_id": user.tenant_id or str(org.id),
        "org_id": str(org.id),
        "tenant_type": user.tenant_type or getattr(org, "type", None),
        "org_type": getattr(org, "type", None),
        "role": user.role,
        "permissions": permissions,
        "token_version": user.token_version,
        "status": user.status,
        "verification_level": verification_level,
    }


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict):
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


async def get_current_user_from_token(
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> User:
    """
    從 Authorization header 提取 JWT 並驗證用戶

    用於需要認證的端點
    """
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="需要認證",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = auth_header.split(" ")[1]

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

        # 驗證 token 類型
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

        # 從資料庫獲取用戶
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用戶不存在"
            )

        # 驗證 token 版本（用於撤銷所有 session）
        if user.token_version != token_version:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token 已失效，請重新登入"
            )

        # 檢查用戶狀態
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="帳號已停用"
            )

        return user

    except JWTError as e:
        logger.warning("jwt_validation_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 已過期或無效"
        )


@router.post("/auth/register", response_model=AuthResponse)
async def register(
    payload: RegisterRequest, 
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    # Log registration attempt
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get('user-agent', 'unknown')
    
    logger.info(
        "user_registration_attempt",
        email=payload.email,
        organization_type=payload.organizationType,
        client_ip=client_ip,
        user_agent=user_agent
    )

    # Validate password strength using PasswordService (PRD requirement: 12+ chars)
    password_validation = PasswordService.validate_strength(
        password=payload.password,
        user_email=payload.email,
        org_name=payload.organizationName
    )

    if not password_validation["valid"]:
        logger.warn(
            "user_registration_weak_password",
            email=payload.email,
            client_ip=client_ip,
            errors=password_validation["errors"],
            strength_score=password_validation["strength_score"]
        )
        # Return the first error message
        return AuthResponse(success=False, error=password_validation["errors"][0])
    
    # Check existing user
    res = await db.execute(select(User).where(User.email == payload.email.lower()))
    if res.scalar_one_or_none():
        logger.warn(
            "user_registration_duplicate_email",
            email=payload.email,
            client_ip=client_ip
        )
        return AuthResponse(success=False, error="Email already registered")

    try:
        # Create organization (use string value for PostgreSQL native enum)
        org_type_str = payload.organizationType.lower()
        org = Organization(
            name=payload.organizationName.strip(),
            type=org_type_str
        )
        db.add(org)
        await db.flush()

        # Create user with secure password hashing (bcrypt cost 12)
        hashed_password = PasswordService.hash_password(payload.password)
        display_name = payload.email.split("@")[0] if "@" in payload.email else payload.email
        user = User(
            email=payload.email.lower().strip(),
            password_hash=hashed_password,
            organization_id=str(org.id),
            tenant_id=str(org.id),
            tenant_type=org_type_str,  # Use string value for tenant_type
            role="restaurant_admin" if payload.organizationType == "restaurant" else "supplier_admin",
            permissions=[],
            status="active",
            display_name=display_name,
        )
        db.add(user)
        await db.flush()

        # Create JWT tokens instead of simple tokens
        claims = _build_claims(user, org)
        access_token = create_access_token(data=claims)
        refresh_token = create_refresh_token(data={"sub": str(user.id), "token_version": user.token_version})
        
        # Store session for tracking
        expires = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        session = UserSession(
            user_id=str(user.id),
            token=refresh_token,
            expires_at=expires
        )
        db.add(session)
        await db.commit()
        
        logger.info(
            "user_registration_success",
            user_id=str(user.id),
            email=user.email,
            organization_id=str(org.id),
            client_ip=client_ip
        )
        
    except Exception as e:
        await db.rollback()
        logger.error(
            "user_registration_error",
            email=payload.email,
            error=str(e),
            client_ip=client_ip
        )
        raise HTTPException(status_code=500, detail="Registration failed")

    return AuthResponse(
        success=True,
        token=access_token,
        refresh_token=refresh_token,
        user={
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "permissions": user.permissions or [],
            "tenant": {
                "id": user.tenant_id or str(org.id),
                "type": user.tenant_type or org.type,
            },
            "organization": {
                "id": str(org.id),
                "name": org.name,
                "type": org.type
            },
        },
        timestamp=datetime.utcnow(),
    )


@router.post("/auth/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    # Log login attempt
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get('user-agent', 'unknown')

    logger.info(
        "user_login_attempt",
        email=payload.email,
        client_ip=client_ip,
        user_agent=user_agent
    )

    # Get user with case-insensitive email lookup
    res = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = res.scalar_one_or_none()

    if not user or not user.password_hash:
        logger.warn(
            "user_login_failed_user_not_found",
            email=payload.email,
            client_ip=client_ip
        )
        return AuthResponse(success=False, error="Invalid credentials")

    # 檢查帳號是否被鎖定
    lockout_status = await LoginAttemptsService.check_lockout(user, db)
    if lockout_status["locked"]:
        logger.warn(
            "user_login_blocked_account_locked",
            email=payload.email,
            user_id=str(user.id),
            client_ip=client_ip,
            locked_until=lockout_status["locked_until"].isoformat()
        )
        return AuthResponse(
            success=False,
            error=lockout_status["message"]
        )

    if not PasswordService.verify_password(payload.password, user.password_hash):
        # 記錄登入失敗嘗試
        attempt_result = await LoginAttemptsService.record_failed_attempt(
            user=user,
            db=db,
            ip_address=client_ip,
            user_agent=user_agent,
            reason="Invalid password"
        )

        logger.warn(
            "user_login_failed_invalid_password",
            email=payload.email,
            user_id=str(user.id),
            client_ip=client_ip,
            failed_attempts=user.failed_login_attempts,
            locked=attempt_result["locked"]
        )

        # 如果帳號被鎖定，返回鎖定訊息
        if attempt_result["locked"]:
            return AuthResponse(
                success=False,
                error=attempt_result["message"]
            )

        # 返回錯誤訊息（可選：包含剩餘嘗試次數）
        error_msg = "Invalid credentials"
        if attempt_result["attempts_remaining"] and attempt_result["attempts_remaining"] <= 3:
            error_msg = f"Invalid credentials. {attempt_result['attempts_remaining']} attempts remaining before lockout."

        return AuthResponse(success=False, error=error_msg)

    # Load organization
    org_res = await db.execute(select(Organization).where(Organization.id == user.organization_id))
    org = org_res.scalar_one_or_none()

    if not org:
        logger.error(
            "user_login_organization_not_found",
            user_id=str(user.id),
            organization_id=user.organization_id,
            client_ip=client_ip
        )
        return AuthResponse(success=False, error="Account configuration error")

    # 檢查是否啟用 MFA
    if getattr(user, 'mfa_enabled', False) and user.mfa_enabled:
        # 生成 MFA challenge token
        mfa_challenge_data = {
            "sub": str(user.id),
            "email": user.email,
            "type": "mfa_challenge",
            "exp": datetime.utcnow() + timedelta(minutes=5)
        }
        challenge_token = jwt.encode(mfa_challenge_data, JWT_SECRET, algorithm=JWT_ALGORITHM)

        logger.info(
            "user_login_mfa_required",
            user_id=str(user.id),
            email=user.email,
            client_ip=client_ip
        )

        # 返回需要 MFA 的響應
        return AuthResponse(
            success=True,
            error=None,
            user={
                "id": str(user.id),
                "email": user.email,
                "requires_mfa": True,
                "mfa_method": getattr(user, 'mfa_method', 'totp'),
                "challenge_token": challenge_token
            },
            timestamp=datetime.utcnow()
        )

    try:
        # 登入成功，重置失敗計數
        await LoginAttemptsService.record_successful_login(
            user=user,
            db=db,
            ip_address=client_ip,
            user_agent=user_agent
        )

        # Create JWT tokens (只有在不需要 MFA 時才發放)
        claims = _build_claims(user, org)
        access_token = create_access_token(data=claims)
        refresh_token = create_refresh_token(data={"sub": str(user.id), "token_version": user.token_version})

        # Store/update session
        expires = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        session = UserSession(
            user_id=str(user.id),
            token=refresh_token,
            expires_at=expires
        )
        db.add(session)
        await db.commit()

        logger.info(
            "user_login_success",
            user_id=str(user.id),
            email=user.email,
            organization_id=str(org.id),
            client_ip=client_ip
        )

    except Exception as e:
        logger.error(
            "user_login_session_error",
            user_id=str(user.id),
            error=str(e),
            client_ip=client_ip
        )
        raise HTTPException(status_code=500, detail="Login failed")

    return AuthResponse(
        success=True,
        token=access_token,
        refresh_token=refresh_token,
        user={
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "permissions": user.permissions or [],
            "tenant": {
                "id": user.tenant_id or str(org.id),
                "type": user.tenant_type or org.type,
            },
            "organization": {
                "id": str(org.id),
                "name": org.name,
                "type": org.type
            },
        },
        timestamp=datetime.utcnow(),
    )


@router.post("/auth/refresh", response_model=AuthResponse)
async def refresh_token_endpoint(request: Request, db: AsyncSession = Depends(get_async_session)):
    """Exchange a valid refresh token for a new access token (and a rotated refresh token)."""
    # Allow refresh token via Authorization: Bearer <token> or JSON body { refresh_token }
    auth = request.headers.get("authorization", "")
    refresh_token = None
    if auth.lower().startswith("bearer "):
        refresh_token = auth.split(" ", 1)[1].strip()
    if not refresh_token:
        try:
            payload = await request.json()
            refresh_token = payload.get("refresh_token")
        except Exception:
            refresh_token = None

    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing refresh token")

    # Verify JWT
    try:
        payload = jwt.decode(refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token type")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # Validate session exists
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    token_version = payload.get("token_version")
    if token_version is not None and token_version != user.token_version:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    # Issue new tokens
    org_res = await db.execute(select(Organization).where(Organization.id == user.organization_id))
    org = org_res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organization missing")

    claims = _build_claims(user, org)
    access = create_access_token(claims)
    new_refresh = create_refresh_token({"sub": str(user.id), "token_version": user.token_version})

    # Persist rotated refresh session
    expires = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    session = UserSession(
        user_id=str(user.id),
        token=new_refresh,
        expires_at=expires
    )
    db.add(session)
    await db.commit()

    return AuthResponse(
        success=True,
        token=access,
        refresh_token=new_refresh,
        user={
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "permissions": user.permissions or [],
            "tenant": {
                "id": user.tenant_id or str(org.id),
                "type": user.tenant_type or org.type,
            },
            "organization": {
                "id": str(org.id),
                "name": org.name,
                "type": org.type
            },
        },
        timestamp=datetime.utcnow(),
    )


@router.post("/auth/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    忘記密碼 - 發送 OTP 驗證碼到 Email
    
    流程：
    1. 驗證用戶 Email 是否存在
    2. 生成 OTP 驗證碼
    3. 調用 Notification Service 發送郵件
    4. 返回成功訊息（不透露用戶是否存在）
    """
    client_ip = request.client.host if request.client else "unknown"
    
    logger.info(
        "forgot_password_request",
        email=payload.email,
        client_ip=client_ip
    )
    
    # 查找用戶
    res = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = res.scalar_one_or_none()
    
    if not user:
        # 安全考量：不透露用戶是否存在，統一返回成功訊息
        logger.warn(
            "forgot_password_user_not_found",
            email=payload.email,
            client_ip=client_ip
        )
        return ForgotPasswordResponse(
            success=True,
            message="如果該 Email 已註冊，您將收到密碼重設驗證碼"
        )
    
    # 調用 Notification Service 發送 OTP
    notification_service_url = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:3006")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{notification_service_url}/otp/send-email",
                json={
                    "user_id": str(user.id),
                    "email": user.email,
                    "user_name": user.display_name or user.email.split("@")[0],
                    "purpose": "密碼重設"
                }
            )
            
            if response.status_code != 200:
                logger.error(
                    "forgot_password_otp_send_failed",
                    user_id=str(user.id),
                    status_code=response.status_code,
                    response=response.text
                )
                return ForgotPasswordResponse(
                    success=False,
                    message="發送驗證碼失敗，請稍後再試",
                    error="OTP service error"
                )
        
        logger.info(
            "forgot_password_otp_sent",
            user_id=str(user.id),
            email=user.email
        )
        
        return ForgotPasswordResponse(
            success=True,
            message="密碼重設驗證碼已發送到您的 Email"
        )
        
    except Exception as e:
        logger.error(
            "forgot_password_error",
            email=payload.email,
            error=str(e)
        )
        return ForgotPasswordResponse(
            success=False,
            message="發送驗證碼失敗，請稍後再試",
            error=str(e)
        )


@router.post("/auth/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    重設密碼
    
    流程：
    1. 驗證 OTP 驗證碼
    2. 驗證新密碼強度
    3. 檢查密碼歷史（防止重複使用）
    4. 更新密碼
    5. 使所有 session 失效（強制重新登入）
    """
    client_ip = request.client.host if request.client else "unknown"
    
    logger.info(
        "reset_password_request",
        email=payload.email,
        client_ip=client_ip
    )
    
    # 查找用戶
    res = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = res.scalar_one_or_none()
    
    if not user:
        logger.warn(
            "reset_password_user_not_found",
            email=payload.email,
            client_ip=client_ip
        )
        return ResetPasswordResponse(
            success=False,
            message="重設密碼失敗",
            error="用戶不存在"
        )
    
    # 驗證 OTP
    notification_service_url = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:3006")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            otp_response = await client.post(
                f"{notification_service_url}/otp/verify",
                json={
                    "user_id": str(user.id),
                    "otp_type": "email",
                    "code": payload.otp_code
                }
            )
            
            if otp_response.status_code != 200:
                logger.error(
                    "reset_password_otp_verify_failed",
                    user_id=str(user.id),
                    status_code=otp_response.status_code
                )
                return ResetPasswordResponse(
                    success=False,
                    message="驗證失敗，請重試",
                    error="OTP verification service error"
                )
            
            otp_result = otp_response.json()
            
            if not otp_result.get("valid"):
                logger.warn(
                    "reset_password_invalid_otp",
                    user_id=str(user.id),
                    error=otp_result.get("error")
                )
                return ResetPasswordResponse(
                    success=False,
                    message="驗證碼無效或已過期",
                    error=otp_result.get("error")
                )
        
        # OTP 驗證成功，驗證新密碼強度
        password_validation = PasswordService.validate_strength(
            password=payload.new_password,
            user_email=user.email,
            org_name=None  # 密碼重設時不需要檢查組織名稱
        )
        
        if not password_validation["valid"]:
            logger.warn(
                "reset_password_weak_password",
                user_id=str(user.id),
                errors=password_validation["errors"]
            )
            return ResetPasswordResponse(
                success=False,
                message=password_validation["errors"][0],
                error="Weak password"
            )
        
        # 檢查密碼歷史
        password_history_check = await PasswordService.check_password_history(
            user_id=str(user.id),
            new_password=payload.new_password,
            db=db
        )
        
        if not password_history_check["allowed"]:
            logger.warn(
                "reset_password_reused_password",
                user_id=str(user.id)
            )
            return ResetPasswordResponse(
                success=False,
                message=password_history_check["error"],
                error="Password reuse"
            )
        
        # 更新密碼
        user.password_hash = PasswordService.hash_password(payload.new_password)
        user.password_changed_at = datetime.utcnow()
        
        # 增加 token_version 使所有現有 session 失效
        user.token_version += 1
        
        await db.commit()
        
        logger.info(
            "reset_password_success",
            user_id=str(user.id),
            email=user.email,
            client_ip=client_ip
        )
        
        return ResetPasswordResponse(
            success=True,
            message="密碼重設成功，請使用新密碼登入"
        )
        
    except Exception as e:
        await db.rollback()
        logger.error(
            "reset_password_error",
            email=payload.email,
            error=str(e)
        )
        return ResetPasswordResponse(
            success=False,
            message="重設密碼失敗，請稍後再試",
            error=str(e)
        )


@router.put("/auth/change-password", response_model=ChangePasswordResponse)
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    修改密碼（需要登入）

    與重設密碼的差異：
    - 需要提供當前密碼
    - 需要 JWT 認證
    - 不需要 OTP

    流程：
    1. 驗證 JWT token
    2. 驗證當前密碼
    3. 驗證新密碼強度
    4. 檢查新密碼不與舊密碼相同
    5. 更新密碼
    """
    try:
        # 1. 驗證 JWT 並取得當前用戶
        current_user = await get_current_user_from_token(request, db)

        logger.info(
            "change_password_attempt",
            user_id=str(current_user.id),
            email=current_user.email
        )

        # 2. 驗證當前密碼
        if not pwd_context.verify(payload.current_password, current_user.password_hash):
            logger.warning(
                "change_password_wrong_current",
                user_id=str(current_user.id)
            )
            return ChangePasswordResponse(
                success=False,
                message="當前密碼錯誤",
                error="Current password is incorrect"
            )

        # 3. 驗證新密碼強度
        validation = PasswordService.validate_strength(
            payload.new_password,
            user_email=current_user.email
        )

        if not validation["valid"]:
            return ChangePasswordResponse(
                success=False,
                message=validation["errors"][0] if validation["errors"] else "密碼強度不足",
                error="Password validation failed"
            )

        # 4. 檢查新密碼不與當前密碼相同
        if pwd_context.verify(payload.new_password, current_user.password_hash):
            return ChangePasswordResponse(
                success=False,
                message="新密碼不能與當前密碼相同",
                error="New password cannot be the same as current password"
            )

        # 5. 更新密碼
        new_hash = PasswordService.hash_password(payload.new_password)
        current_user.password_hash = new_hash
        current_user.password_changed_at = datetime.utcnow()

        # 可選：增加 token_version 使其他設備的 session 失效
        # current_user.token_version += 1

        await db.commit()

        logger.info(
            "change_password_success",
            user_id=str(current_user.id),
            email=current_user.email
        )

        return ChangePasswordResponse(
            success=True,
            message="密碼修改成功"
        )

    except HTTPException:
        # 重新拋出認證錯誤
        raise

    except Exception as e:
        await db.rollback()
        logger.error(
            "change_password_error",
            error=str(e)
        )
        return ChangePasswordResponse(
            success=False,
            message="密碼修改失敗，請稍後再試",
            error=str(e)
        )


# ============================================================================
# Email 驗證端點
# ============================================================================

@router.post("/auth/send-email-verification", response_model=SendEmailVerificationResponse)
async def send_email_verification(
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    發送 Email 驗證碼（需要登入）

    流程：
    1. 驗證 JWT token
    2. 檢查 Email 是否已驗證
    3. 調用 Notification Service 發送 OTP
    """
    try:
        # 1. 驗證 JWT 並取得當前用戶
        current_user = await get_current_user_from_token(request, db)

        # 2. 檢查是否已驗證
        if current_user.email_verified:
            return SendEmailVerificationResponse(
                success=False,
                message="Email 已經驗證過了",
                error="Email already verified"
            )

        # 3. 調用 Notification Service 發送 OTP
        notification_service_url = os.getenv(
            "NOTIFICATION_SERVICE_URL",
            "http://localhost:3006"
        )

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{notification_service_url}/otp/send-email",
                json={
                    "user_id": str(current_user.id),
                    "email": current_user.email,
                    "purpose": "Email 驗證"
                }
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    logger.info(
                        "email_verification_otp_sent",
                        user_id=str(current_user.id),
                        email=current_user.email
                    )
                    return SendEmailVerificationResponse(
                        success=True,
                        message=f"驗證碼已發送到 {current_user.email}",
                        expires_in=data.get("expires_in", 600)
                    )

            logger.error(
                "email_verification_otp_send_failed",
                user_id=str(current_user.id),
                status_code=response.status_code
            )
            return SendEmailVerificationResponse(
                success=False,
                message="發送驗證碼失敗，請稍後再試",
                error="Failed to send OTP"
            )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            "send_email_verification_error",
            error=str(e)
        )
        return SendEmailVerificationResponse(
            success=False,
            message="發送驗證碼失敗，請稍後再試",
            error=str(e)
        )


@router.post("/auth/verify-email", response_model=VerifyEmailResponse)
async def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    驗證 Email OTP（需要登入）

    流程：
    1. 驗證 JWT token
    2. 調用 Notification Service 驗證 OTP
    3. 更新用戶 email_verified 狀態
    4. 更新驗證級別
    """
    try:
        # 1. 驗證 JWT 並取得當前用戶
        current_user = await get_current_user_from_token(request, db)

        # 檢查是否已驗證
        if current_user.email_verified:
            return VerifyEmailResponse(
                success=True,
                message="Email 已經驗證過了",
                verification_level=VerificationService.calculate_user_level(current_user)
            )

        # 2. 調用 Notification Service 驗證 OTP
        notification_service_url = os.getenv(
            "NOTIFICATION_SERVICE_URL",
            "http://localhost:3006"
        )

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{notification_service_url}/otp/verify",
                json={
                    "user_id": str(current_user.id),
                    "otp_type": "email",
                    "code": payload.otp_code
                }
            )

            if response.status_code != 200:
                return VerifyEmailResponse(
                    success=False,
                    message="驗證服務暫時不可用",
                    error="Verification service unavailable"
                )

            data = response.json()

            if not data.get("valid"):
                return VerifyEmailResponse(
                    success=False,
                    message="驗證碼錯誤或已過期",
                    error=data.get("error", "Invalid OTP")
                )

        # 3. 更新用戶 email_verified 狀態
        current_user.email_verified = True
        current_user.email_verified_at = datetime.utcnow()

        # 4. 更新驗證級別
        # 獲取用戶的組織
        result = await db.execute(
            select(Organization).where(Organization.id == current_user.organization_id)
        )
        org = result.scalar_one_or_none()

        new_level = VerificationService.calculate_user_level(current_user, org)
        if hasattr(current_user, 'verification_level'):
            current_user.verification_level = new_level

        await db.commit()

        logger.info(
            "email_verified_successfully",
            user_id=str(current_user.id),
            email=current_user.email,
            verification_level=new_level
        )

        return VerifyEmailResponse(
            success=True,
            message="Email 驗證成功",
            verification_level=new_level
        )

    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.error(
            "verify_email_error",
            error=str(e)
        )
        return VerifyEmailResponse(
            success=False,
            message="驗證失敗，請稍後再試",
            error=str(e)
        )


# ============================================================================
# 手機驗證端點
# ============================================================================

@router.post("/auth/send-phone-verification", response_model=SendPhoneVerificationResponse)
async def send_phone_verification(
    payload: SendPhoneVerificationRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    發送手機驗證碼（需要登入）

    流程：
    1. 驗證 JWT token
    2. 檢查 Email 是否已驗證（前置條件）
    3. 更新用戶手機號碼
    4. 調用 Notification Service 發送 SMS OTP
    """
    try:
        # 1. 驗證 JWT 並取得當前用戶
        current_user = await get_current_user_from_token(request, db)

        # 2. 檢查前置條件：Email 必須先驗證
        if not current_user.email_verified:
            return SendPhoneVerificationResponse(
                success=False,
                message="請先完成 Email 驗證",
                error="Email verification required"
            )

        # 檢查手機是否已驗證
        if hasattr(current_user, 'phone_verified') and current_user.phone_verified:
            if current_user.phone == payload.phone:
                return SendPhoneVerificationResponse(
                    success=False,
                    message="此手機號碼已經驗證過了",
                    error="Phone already verified"
                )

        # 3. 更新用戶手機號碼
        current_user.phone = payload.phone

        # 4. 調用 Notification Service 發送 SMS OTP
        notification_service_url = os.getenv(
            "NOTIFICATION_SERVICE_URL",
            "http://localhost:3006"
        )

        # 注意：SMS OTP 端點可能尚未實現
        # 這裡先使用 email OTP 的結構，實際需要 SMS 服務
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{notification_service_url}/otp/send-sms",
                    json={
                        "user_id": str(current_user.id),
                        "phone": payload.phone,
                        "purpose": "手機驗證"
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        await db.commit()
                        logger.info(
                            "phone_verification_otp_sent",
                            user_id=str(current_user.id),
                            phone=payload.phone
                        )
                        return SendPhoneVerificationResponse(
                            success=True,
                            message=f"驗證碼已發送到 {payload.phone}",
                            expires_in=data.get("expires_in", 600)
                        )

        except httpx.ConnectError:
            # SMS 服務尚未實現，暫時回傳提示
            await db.commit()  # 仍然保存手機號碼
            return SendPhoneVerificationResponse(
                success=False,
                message="SMS 服務尚未啟用，請聯繫客服",
                error="SMS service not available"
            )

        return SendPhoneVerificationResponse(
            success=False,
            message="發送驗證碼失敗，請稍後再試",
            error="Failed to send SMS OTP"
        )

    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.error(
            "send_phone_verification_error",
            error=str(e)
        )
        return SendPhoneVerificationResponse(
            success=False,
            message="發送驗證碼失敗，請稍後再試",
            error=str(e)
        )


@router.post("/auth/verify-phone", response_model=VerifyPhoneResponse)
async def verify_phone(
    payload: VerifyPhoneRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    驗證手機 OTP（需要登入）

    流程：
    1. 驗證 JWT token
    2. 調用 Notification Service 驗證 OTP
    3. 更新用戶 phone_verified 狀態
    4. 更新驗證級別
    """
    try:
        # 1. 驗證 JWT 並取得當前用戶
        current_user = await get_current_user_from_token(request, db)

        # 檢查是否有手機號碼
        if not current_user.phone:
            return VerifyPhoneResponse(
                success=False,
                message="請先設定手機號碼",
                error="Phone number not set"
            )

        # 檢查是否已驗證
        if hasattr(current_user, 'phone_verified') and current_user.phone_verified:
            return VerifyPhoneResponse(
                success=True,
                message="手機已經驗證過了",
                verification_level=VerificationService.calculate_user_level(current_user)
            )

        # 2. 調用 Notification Service 驗證 OTP
        notification_service_url = os.getenv(
            "NOTIFICATION_SERVICE_URL",
            "http://localhost:3006"
        )

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{notification_service_url}/otp/verify",
                    json={
                        "user_id": str(current_user.id),
                        "otp_type": "sms",
                        "code": payload.otp_code
                    }
                )

                if response.status_code != 200:
                    return VerifyPhoneResponse(
                        success=False,
                        message="驗證服務暫時不可用",
                        error="Verification service unavailable"
                    )

                data = response.json()

                if not data.get("valid"):
                    return VerifyPhoneResponse(
                        success=False,
                        message="驗證碼錯誤或已過期",
                        error=data.get("error", "Invalid OTP")
                    )

        except httpx.ConnectError:
            return VerifyPhoneResponse(
                success=False,
                message="驗證服務暫時不可用",
                error="Verification service unavailable"
            )

        # 3. 更新用戶 phone_verified 狀態
        current_user.phone_verified = True
        current_user.phone_verified_at = datetime.utcnow()

        # 4. 更新驗證級別
        result = await db.execute(
            select(Organization).where(Organization.id == current_user.organization_id)
        )
        org = result.scalar_one_or_none()

        new_level = VerificationService.calculate_user_level(current_user, org)
        if hasattr(current_user, 'verification_level'):
            current_user.verification_level = new_level

        await db.commit()

        logger.info(
            "phone_verified_successfully",
            user_id=str(current_user.id),
            phone=current_user.phone,
            verification_level=new_level
        )

        return VerifyPhoneResponse(
            success=True,
            message="手機驗證成功",
            verification_level=new_level
        )

    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.error(
            "verify_phone_error",
            error=str(e)
        )
        return VerifyPhoneResponse(
            success=False,
            message="驗證失敗，請稍後再試",
            error=str(e)
        )


# ============================================================================
# 登入嘗試管理端點
# ============================================================================

@router.get("/auth/login-stats")
async def get_login_stats(
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    取得當前用戶的登入統計（需要登入）

    返回：
    - 失敗嘗試次數
    - 是否被鎖定
    - 鎖定時間
    - 最後登入時間
    """
    try:
        current_user = await get_current_user_from_token(request, db)
        stats = await LoginAttemptsService.get_login_stats(current_user)

        return {
            "success": True,
            "data": stats
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error("get_login_stats_error", error=str(e))
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/auth/admin/unlock-account/{user_id}")
async def admin_unlock_account(
    user_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    管理員手動解鎖用戶帳號

    需要：
    - 管理員權限（platform_admin 或 super_admin 角色）

    流程：
    1. 驗證管理員身份
    2. 解鎖目標用戶帳號
    3. 記錄審計日誌
    """
    client_ip = request.client.host if request.client else "unknown"

    try:
        # 驗證管理員身份
        admin_user = await get_current_user_from_token(request, db)

        # 檢查管理員權限
        admin_roles = ["platform_admin", "super_admin"]
        if admin_user.role not in admin_roles:
            logger.warn(
                "admin_unlock_unauthorized",
                admin_user_id=str(admin_user.id),
                admin_role=admin_user.role,
                target_user_id=user_id
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="需要管理員權限"
            )

        # 查找目標用戶
        result = await db.execute(select(User).where(User.id == user_id))
        target_user = result.scalar_one_or_none()

        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )

        # 執行解鎖
        unlock_result = await LoginAttemptsService.admin_unlock_account(
            user=target_user,
            db=db,
            admin_user_id=str(admin_user.id),
            ip_address=client_ip
        )

        return {
            "success": unlock_result["success"],
            "message": unlock_result["message"],
            "data": {
                "user_id": user_id,
                "unlocked_by": str(admin_user.id),
                "unlocked_at": datetime.utcnow().isoformat()
            }
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            "admin_unlock_account_error",
            user_id=user_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="解鎖失敗"
        )


@router.get("/auth/admin/user/{user_id}/login-stats")
async def admin_get_user_login_stats(
    user_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    管理員查看特定用戶的登入統計

    需要管理員權限
    """
    try:
        # 驗證管理員身份
        admin_user = await get_current_user_from_token(request, db)

        admin_roles = ["platform_admin", "super_admin"]
        if admin_user.role not in admin_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="需要管理員權限"
            )

        # 查找目標用戶
        result = await db.execute(select(User).where(User.id == user_id))
        target_user = result.scalar_one_or_none()

        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )

        stats = await LoginAttemptsService.get_login_stats(target_user)

        return {
            "success": True,
            "data": {
                "user_id": user_id,
                "email": target_user.email,
                **stats
            }
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            "admin_get_user_login_stats_error",
            user_id=user_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="查詢失敗"
        )
