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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    success: bool
    message: str
    error: str | None = None


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str


class ResetPasswordResponse(BaseModel):
    success: bool
    message: str
    error: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ChangePasswordResponse(BaseModel):
    success: bool
    message: str
    error: str | None = None


class SendEmailVerificationRequest(BaseModel):
    """發送 Email 驗證碼請求"""
    pass  # 用戶已登入，從 JWT 獲取資訊


class SendEmailVerificationResponse(BaseModel):
    success: bool
    message: str
    expires_in: int | None = None
    error: str | None = None


class VerifyEmailRequest(BaseModel):
    """驗證 Email OTP 請求"""
    otp_code: str


class VerifyEmailResponse(BaseModel):
    success: bool
    message: str
    verification_level: int | None = None
    error: str | None = None


class SendPhoneVerificationRequest(BaseModel):
    """發送手機驗證碼請求"""
    phone: str


class SendPhoneVerificationResponse(BaseModel):
    success: bool
    message: str
    expires_in: int | None = None
    error: str | None = None


class VerifyPhoneRequest(BaseModel):
    """驗證手機 OTP 請求"""
    otp_code: str


class VerifyPhoneResponse(BaseModel):
    success: bool
    message: str
    verification_level: int | None = None
    error: str | None = None


# ============================================================================
# MFA Schemas
# ============================================================================

class MFAEnableRequest(BaseModel):
    """啟用 MFA 請求（需要密碼確認）"""
    password: str


class MFAEnableResponse(BaseModel):
    """啟用 MFA 回應（返回 QR Code 和備份碼）"""
    success: bool
    message: str
    qr_code: str | None = None
    secret: str | None = None  # 手動輸入用
    backup_codes: list[str] | None = None
    error: str | None = None


class MFAVerifySetupRequest(BaseModel):
    """驗證 MFA 設置請求"""
    code: str
    secret: str  # 臨時存儲的密鑰


class MFAVerifySetupResponse(BaseModel):
    """驗證 MFA 設置回應"""
    success: bool
    message: str
    error: str | None = None


class MFAVerifyRequest(BaseModel):
    """MFA 驗證請求（登入時）"""
    code: str
    use_backup: bool = False  # 是否使用備份碼


class MFAVerifyResponse(BaseModel):
    """MFA 驗證回應"""
    success: bool
    message: str
    token: str | None = None
    refresh_token: str | None = None
    user: dict | None = None
    backup_codes_remaining: int | None = None
    error: str | None = None


class MFADisableRequest(BaseModel):
    """停用 MFA 請求"""
    password: str
    code: str  # 當前 TOTP 碼或備份碼


class MFADisableResponse(BaseModel):
    """停用 MFA 回應"""
    success: bool
    message: str
    error: str | None = None


class MFAStatusResponse(BaseModel):
    """MFA 狀態回應"""
    enabled: bool
    method: str | None = None
    backup_codes_remaining: int = 0
    enforced_at: datetime | None = None


class MFABackupCodesResponse(BaseModel):
    """重新生成備份碼回應"""
    success: bool
    message: str
    backup_codes: list[str] | None = None
    error: str | None = None


class MFAChallengeResponse(BaseModel):
    """MFA 挑戰回應（登入時需要 MFA）"""
    requires_mfa: bool = True
    challenge_token: str
    mfa_method: str
    message: str

