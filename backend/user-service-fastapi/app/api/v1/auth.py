from datetime import datetime, timedelta
import secrets
import structlog
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from jose import JWTError, jwt
import os

# Structured logging
logger = structlog.get_logger()

from app.core.database import get_async_session
from app.models.organization import Organization
from app.models.user import User
from app.models.session import Session as UserSession
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse


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


def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
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


@router.post("/auth/register", response_model=AuthResponse)
async def register(
    payload: RegisterRequest, 
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    # Log registration attempt
    client_ip = getattr(request, 'client', {}).host if hasattr(request, 'client') else 'unknown'
    user_agent = request.headers.get('user-agent', 'unknown')
    
    logger.info(
        "user_registration_attempt",
        email=payload.email,
        organization_type=payload.organizationType,
        client_ip=client_ip,
        user_agent=user_agent
    )

    # Validate input (additional security)
    if len(payload.password) < 8:
        logger.warn(
            "user_registration_weak_password",
            email=payload.email,
            client_ip=client_ip
        )
        return AuthResponse(success=False, error="Password must be at least 8 characters")
    
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
        # Create organization
        org = Organization(
            name=payload.organizationName.strip(),
            type=payload.organizationType
        )
        db.add(org)
        await db.flush()

        # Create user with secure password hashing
        hashed_password = pwd_context.hash(payload.password)
        user = User(
            email=payload.email.lower().strip(),
            password_hash=hashed_password,
            organization_id=str(org.id),
            role="restaurant_admin" if payload.organizationType == "restaurant" else "supplier_admin"
        )
        db.add(user)
        await db.flush()

        # Create JWT tokens instead of simple tokens
        access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
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
    client_ip = getattr(request, 'client', {}).host if hasattr(request, 'client') else 'unknown'
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

    if not pwd_context.verify(payload.password, user.password_hash):
        logger.warn(
            "user_login_failed_invalid_password",
            email=payload.email,
            user_id=str(user.id),
            client_ip=client_ip
        )
        return AuthResponse(success=False, error="Invalid credentials")

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

    try:
        # Create JWT tokens
        access_token = create_access_token(data={
            "sub": str(user.id),
            "email": user.email,
            "org_id": str(org.id),
            "org_type": org.type,
            "role": user.role
        })
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
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
            "organization": {
                "id": str(org.id),
                "name": org.name,
                "type": org.type
            },
        },
        timestamp=datetime.utcnow(),
    )


def create_access_token(data: dict):
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
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

    # Issue new tokens
    org_res = await db.execute(select(Organization).where(Organization.id == user.organization_id))
    org = org_res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organization missing")

    access = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "org_id": str(org.id),
        "org_type": org.type,
        "role": user.role
    })
    new_refresh = create_refresh_token({"sub": str(user.id)})

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
            "organization": {
                "id": str(org.id),
                "name": org.name,
                "type": org.type
            },
        },
        timestamp=datetime.utcnow(),
    )
