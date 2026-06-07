"""
Promotion Pydantic schemas
促銷價格管理 Schema
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.modules.products.models.promotion import DiscountType, PromotionStatus


class PromotionCreateRequest(BaseModel):
    """促銷創建請求"""
    name: str = Field(..., min_length=1, max_length=200, description="促銷名稱")
    description: Optional[str] = Field(None, description="促銷描述")
    code: Optional[str] = Field(None, max_length=50, description="促銷代碼")
    skuId: str = Field(..., description="SKU ID")
    productId: Optional[str] = Field(None, description="產品 ID")
    discountType: DiscountType = Field(DiscountType.PERCENTAGE, description="折扣類型")
    discountValue: float = Field(..., gt=0, description="折扣值")
    startDate: datetime = Field(..., description="開始時間")
    endDate: Optional[datetime] = Field(None, description="結束時間")
    maxQuantity: Optional[int] = Field(None, ge=1, description="最大銷售數量")
    minPurchaseQuantity: Optional[int] = Field(None, ge=1, description="最低購買數量")
    priority: int = Field(0, description="優先級")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "夏季特賣",
                "skuId": "sku-001",
                "discountType": "percentage",
                "discountValue": 0.2,
                "startDate": "2025-12-10T00:00:00Z",
                "endDate": "2025-12-31T23:59:59Z"
            }
        }


class PromotionUpdateRequest(BaseModel):
    """促銷更新請求"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    code: Optional[str] = Field(None, max_length=50)
    discountType: Optional[DiscountType] = None
    discountValue: Optional[float] = Field(None, gt=0)
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    maxQuantity: Optional[int] = Field(None, ge=1)
    minPurchaseQuantity: Optional[int] = Field(None, ge=1)
    status: Optional[PromotionStatus] = None
    isActive: Optional[bool] = None
    priority: Optional[int] = None


class PromotionResponse(BaseModel):
    """促銷響應"""
    id: str
    tenantId: Optional[str] = None
    name: str
    description: Optional[str] = None
    code: Optional[str] = None
    skuId: str
    productId: Optional[str] = None
    discountType: DiscountType
    discountValue: float
    promotionalPrice: Optional[float] = None
    originalPrice: Optional[float] = None
    startDate: datetime
    endDate: Optional[datetime] = None
    maxQuantity: Optional[int] = None
    soldQuantity: int = 0
    minPurchaseQuantity: Optional[int] = None
    status: PromotionStatus
    isActive: bool
    priority: int
    isValid: bool = False
    remainingQuantity: Optional[int] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class PromotionListResponse(BaseModel):
    """促銷列表響應"""
    success: bool = True
    data: List[PromotionResponse]
    pagination: dict


class PromotionDetailResponse(BaseModel):
    """單一促銷響應"""
    success: bool = True
    data: PromotionResponse


class PromotionCreateResponse(BaseModel):
    """促銷創建響應"""
    success: bool = True
    message: str
    data: PromotionResponse


class PromotionUpdateResponse(BaseModel):
    """促銷更新響應"""
    success: bool = True
    message: str
    data: PromotionResponse


class PromotionDeleteResponse(BaseModel):
    """促銷刪除響應"""
    success: bool = True
    message: str
    deletedId: str
