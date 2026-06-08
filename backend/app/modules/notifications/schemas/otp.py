"""
OTP API 請求和回應的 Pydantic 模型
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class SendEmailOTPRequest(BaseModel):
    """發送 Email OTP 請求"""
    user_id: str = Field(..., description="用戶 ID")
    email: EmailStr = Field(..., description="收件人 Email 地址")
    user_name: Optional[str] = Field(None, description="用戶名稱")
    purpose: str = Field("驗證", description="OTP 用途 (例如: 註冊、重設密碼)")


class SendEmailOTPResponse(BaseModel):
    """發送 Email OTP 回應"""
    success: bool = Field(..., description="是否成功發送")
    message: str = Field(..., description="回應訊息")
    expires_in: Optional[int] = Field(None, description="驗證碼有效秒數")
    error: Optional[str] = Field(None, description="錯誤訊息")


class VerifyOTPRequest(BaseModel):
    """驗證 OTP 請求"""
    user_id: str = Field(..., description="用戶 ID")
    otp_type: str = Field(..., description="OTP 類型 (email, sms)")
    code: str = Field(..., min_length=6, max_length=6, description="6 位數驗證碼")


class VerifyOTPResponse(BaseModel):
    """驗證 OTP 回應"""
    success: bool = Field(..., description="驗證是否成功")
    valid: bool = Field(..., description="驗證碼是否有效")
    message: str = Field(..., description="回應訊息")
    error: Optional[str] = Field(None, description="錯誤訊息")
    metadata: Optional[dict] = Field(None, description="OTP 的元數據")


class SendSMSOTPRequest(BaseModel):
    """發送 SMS OTP 請求"""
    user_id: str = Field(..., description="用戶 ID")
    phone: str = Field(..., description="接收方電話號碼")
    user_name: Optional[str] = Field(None, description="用戶名稱")
    purpose: str = Field("驗證", description="OTP 用途 (例如: 手機驗證、MFA)")


class SendSMSOTPResponse(BaseModel):
    """發送 SMS OTP 回應"""
    success: bool = Field(..., description="是否成功發送")
    message: str = Field(..., description="回應訊息")
    expires_in: Optional[int] = Field(None, description="驗證碼有效秒數")
    error: Optional[str] = Field(None, description="錯誤訊息")
