"""
Supplier Invitation Pydantic schemas
Handles data validation and serialization for supplier invitation operations
"""
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, validator
from enum import Enum


class InvitationStatus(str, Enum):
    """Invitation status enumeration"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class BusinessType(str, Enum):
    """Business entity type for suppliers"""
    COMPANY = "company"
    INDIVIDUAL = "individual"


# Request schemas
class InvitationSendRequest(BaseModel):
    """Send supplier invitation request"""
    invitee_email: EmailStr = Field(..., description="供應商電子郵件")
    invitee_company_name: str = Field(..., min_length=2, max_length=100, description="供應商公司名稱")
    invitee_contact_person: Optional[str] = Field(None, max_length=50, description="聯絡人姓名")
    invitee_phone: Optional[str] = Field(None, max_length=20, description="聯絡電話")
    invitation_message: Optional[str] = Field(None, max_length=500, description="邀請訊息")
    expires_in_days: int = Field(default=30, ge=1, le=90, description="邀請有效期(天)")
    
    @validator('invitee_phone')
    def validate_phone(cls, v):
        if v and not v.replace('+', '').replace('-', '').replace(' ', '').replace('(', '').replace(')', '').isdigit():
            raise ValueError('電話號碼格式不正確')
        return v


class InvitationVerifyRequest(BaseModel):
    """Verify invitation code request"""
    code: str = Field(..., min_length=8, max_length=8, description="邀請代碼")
    
    @validator('code')
    def validate_code(cls, v):
        if not v.isalnum():
            raise ValueError('邀請代碼必須為英數字組合')
        return v.upper()


class SupplierOnboardingRequest(BaseModel):
    """Complete supplier onboarding request"""
    invitation_code: str = Field(..., min_length=8, max_length=8, description="邀請代碼")
    
    # User account information
    email: EmailStr = Field(..., description="使用者電子郵件")
    password: str = Field(..., min_length=12, description="密碼")
    first_name: str = Field(..., min_length=1, max_length=50, description="名字")
    last_name: str = Field(..., min_length=1, max_length=50, description="姓氏")
    phone: Optional[str] = Field(None, max_length=20, description="手機號碼")
    
    # Organization information
    organization_name: str = Field(..., min_length=2, max_length=100, description="機構名稱")
    business_type: BusinessType = Field(..., description="營業類型")
    tax_id: Optional[str] = Field(None, min_length=8, max_length=8, description="統一編號")
    personal_id: Optional[str] = Field(None, min_length=10, max_length=10, description="身分證字號")
    business_license_number: Optional[str] = Field(None, max_length=50, description="營業執照號碼")
    
    # Contact information
    contact_person: str = Field(..., min_length=1, max_length=50, description="聯絡人")
    contact_phone: str = Field(..., max_length=20, description="聯絡電話")
    contact_email: EmailStr = Field(..., description="聯絡信箱")
    address: Optional[str] = Field(None, max_length=200, description="營業地址")
    
    @validator('tax_id')
    def validate_tax_id(cls, v, values):
        if values.get('business_type') == BusinessType.COMPANY:
            if not v:
                raise ValueError('公司類型必須提供統一編號')
            if len(v) != 8 or not v.isdigit():
                raise ValueError('統一編號必須為8位數字')
        return v
    
    @validator('personal_id')
    def validate_personal_id(cls, v, values):
        if values.get('business_type') == BusinessType.INDIVIDUAL:
            if not v:
                raise ValueError('個人商號必須提供身分證字號')
            if len(v) != 10 or not v[0].isalpha():
                raise ValueError('身分證字號格式不正確')
        return v
    
    @validator('invitation_code')
    def validate_invitation_code(cls, v):
        return v.upper()


class SupplierProfileUpdateRequest(BaseModel):
    """Update supplier profile request"""
    organization_name: Optional[str] = Field(None, min_length=2, max_length=100)
    contact_person: Optional[str] = Field(None, min_length=1, max_length=50)
    contact_phone: Optional[str] = Field(None, max_length=20)
    contact_email: Optional[EmailStr] = None
    address: Optional[str] = Field(None, max_length=200)
    delivery_zones: Optional[list] = Field(None, description="配送區域")
    product_categories: Optional[list] = Field(None, description="產品類別")
    certifications: Optional[list] = Field(None, description="認證資料")


# Response schemas
class InvitationResponse(BaseModel):
    """Invitation response schema"""
    id: str
    code: str
    inviter_organization_name: str
    inviter_user_name: str
    invitee_email: str
    invitee_company_name: str
    invitee_contact_person: Optional[str] = None
    invitee_phone: Optional[str] = None
    status: InvitationStatus
    sent_at: datetime
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    invitation_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class InvitationDetailResponse(BaseModel):
    """Detailed invitation response for verification"""
    id: str
    code: str
    inviter_organization_name: str
    inviter_organization_type: str
    invitee_email: str
    invitee_company_name: str
    invitee_contact_person: Optional[str] = None
    status: InvitationStatus
    expires_at: datetime
    invitation_message: Optional[str] = None
    is_expired: bool
    can_be_accepted: bool
    
    class Config:
        from_attributes = True


class OrganizationResponse(BaseModel):
    """Organization response schema"""
    id: str
    name: str
    type: str
    business_type: Optional[BusinessType] = None
    business_identifier: str
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    onboarding_status: Optional[str] = None
    is_onboarding_complete: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class SupplierOnboardingResponse(BaseModel):
    """Supplier onboarding completion response"""
    success: bool = True
    user_id: str
    organization_id: str
    invitation_id: str
    access_token: str
    refresh_token: str
    organization: OrganizationResponse
    message: str = "供應商註冊成功"


# List responses
class InvitationListResponse(BaseModel):
    """Invitation list response"""
    success: bool = True
    data: list[InvitationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class InvitationSendResponse(BaseModel):
    """Send invitation response"""
    success: bool = True
    invitation_id: str
    invitation_code: str
    invitee_email: str
    expires_at: datetime
    message: str = "邀請已成功發送"


# Error response
class InvitationErrorResponse(BaseModel):
    """Invitation error response"""
    success: bool = False
    error: str
    error_code: str
    details: Optional[Dict[str, Any]] = None