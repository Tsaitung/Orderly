"""
註冊端點模組
"""

from datetime import datetime, timedelta

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.models.organization import Organization
from app.models.session import Session as UserSession
from app.models.user import User
from app.schemas.auth import AuthResponse, RegisterRequest
from app.services.password_service import PasswordService

from .core import (
    JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    _build_claims,
    create_access_token,
    create_refresh_token,
)

logger = structlog.get_logger()

router = APIRouter()


@router.post("/auth/register", response_model=AuthResponse)
async def register(
    payload: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> AuthResponse:
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
