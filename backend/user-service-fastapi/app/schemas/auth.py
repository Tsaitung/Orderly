from datetime import datetime
from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    organizationName: str
    organizationType: str  # restaurant | supplier


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SessionPayload(BaseModel):
    userId: str
    email: EmailStr
    organizationId: str
    role: str
    organizationType: str
    exp: int
    iat: int


class AuthResponse(BaseModel):
    success: bool
    token: str | None = None
    refresh_token: str | None = None
    user: dict | None = None
    error: str | None = None
    timestamp: datetime | None = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    firstName: str
    lastName: str
    phone: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int | None = None

