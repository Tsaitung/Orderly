"""
Token 管理端點模組
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.models.organization import Organization
from app.models.session import Session as UserSession
from app.models.user import User
from app.schemas.auth import AuthResponse

from .core import (
    JWT_ALGORITHM,
    JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    JWT_SECRET,
    _build_claims,
    create_access_token,
    create_refresh_token,
)

router = APIRouter()


@router.post("/auth/refresh", response_model=AuthResponse)
async def refresh_token_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> AuthResponse:
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
