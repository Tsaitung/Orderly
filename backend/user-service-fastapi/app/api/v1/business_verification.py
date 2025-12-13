"""
營業驗證 API 端點

提供：
- POST /verification/documents - 提交驗證文件
- GET /verification/status - 取得驗證狀態
- GET /verification/pending - 取得待審核列表（管理員）
- POST /verification/review - 審核文件（管理員）
- GET /verification/expiring - 取得即將到期文件
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.database import get_async_session
from app.models.user import User
from app.services.business_verification_service import (
    BusinessVerificationService,
    DocumentType,
    VerificationStatus
)
from app.api.v1.auth import get_current_user_from_token

logger = structlog.get_logger()
router = APIRouter(prefix="/verification", tags=["Business Verification"])


# ========== Schemas ==========

class SubmitDocumentRequest(BaseModel):
    """提交文件請求"""
    document_type: str = Field(..., description="文件類型（business_license/tax_id_certificate/company_registration/food_license/other）")
    document_url: str = Field(..., description="文件 URL（已上傳）")
    document_number: Optional[str] = Field(None, description="文件編號（如統一編號）")
    issue_date: Optional[datetime] = Field(None, description="發證日期")
    expiry_date: Optional[datetime] = Field(None, description="到期日期")


class SubmitDocumentResponse(BaseModel):
    """提交文件回應"""
    success: bool
    message: str
    document_type: str
    status: str


class DocumentStatusItem(BaseModel):
    """文件狀態項目"""
    type: str
    status: str
    submitted_at: Optional[str] = None
    reviewed_at: Optional[str] = None
    rejection_reason: Optional[str] = None


class VerificationStatusResponse(BaseModel):
    """驗證狀態回應"""
    success: bool
    verification_level: int
    verified_at: Optional[datetime] = None
    documents: List[DocumentStatusItem]
    missing_documents: List[str]
    pending_documents: List[str]
    approved_documents: List[str]


class ReviewDocumentRequest(BaseModel):
    """審核文件請求"""
    organization_id: str = Field(..., description="組織 ID")
    document_type: str = Field(..., description="文件類型")
    approved: bool = Field(..., description="是否通過")
    rejection_reason: Optional[str] = Field(None, description="拒絕原因")


class ReviewDocumentResponse(BaseModel):
    """審核文件回應"""
    success: bool
    approved: bool
    all_documents_approved: bool
    verification_level: Optional[int] = None


class PendingReviewItem(BaseModel):
    """待審核項目"""
    organization_id: str
    organization_name: str
    organization_type: str
    document_type: str
    document_url: str
    document_number: Optional[str] = None
    submitted_at: Optional[str] = None
    status: str


class PendingReviewsResponse(BaseModel):
    """待審核列表回應"""
    success: bool
    count: int
    items: List[PendingReviewItem]


class ExpiringDocumentItem(BaseModel):
    """即將到期文件項目"""
    organization_id: str
    organization_name: str
    document_type: str
    expiry_date: str
    days_remaining: int
    is_expired: bool


class ExpiringDocumentsResponse(BaseModel):
    """即將到期文件列表回應"""
    success: bool
    count: int
    items: List[ExpiringDocumentItem]


# ========== Endpoints ==========

@router.post("/documents", response_model=SubmitDocumentResponse)
async def submit_document(
    request: SubmitDocumentRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    提交驗證文件

    文件類型：
    - business_license: 營業登記證
    - tax_id_certificate: 稅籍登記證
    - company_registration: 公司登記證
    - food_license: 食品業者登錄證
    - other: 其他

    **注意**: 文件需先上傳到存儲服務，此端點僅記錄文件 URL
    """
    # 驗證文件類型
    try:
        doc_type = DocumentType(request.document_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"無效的文件類型: {request.document_type}"
        )

    # 檢查用戶是否有組織
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="用戶未關聯組織")

    # 檢查權限（只有管理員可以提交）
    if not current_user.role.endswith("_admin"):
        raise HTTPException(status_code=403, detail="只有組織管理員可以提交驗證文件")

    try:
        result = await BusinessVerificationService.submit_document(
            organization_id=str(current_user.organization_id),
            document_type=doc_type,
            document_url=request.document_url,
            document_number=request.document_number,
            issue_date=request.issue_date,
            expiry_date=request.expiry_date,
            submitted_by=str(current_user.id),
            db=db
        )

        return SubmitDocumentResponse(**result)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("submit_document_error", error=str(e))
        raise HTTPException(status_code=500, detail="提交失敗")


@router.get("/status", response_model=VerificationStatusResponse)
async def get_verification_status(
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    取得當前組織的驗證狀態

    返回：
    - 當前驗證級別
    - 已提交的文件及其狀態
    - 缺少的必要文件
    - 待審核的文件
    """
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="用戶未關聯組織")

    try:
        status = await BusinessVerificationService.get_verification_status(
            organization_id=str(current_user.organization_id),
            db=db
        )

        return VerificationStatusResponse(
            success=True,
            verification_level=status["verification_level"],
            verified_at=status.get("verified_at"),
            documents=[DocumentStatusItem(**d) for d in status["documents"]],
            missing_documents=status["missing_documents"],
            pending_documents=status["pending_documents"],
            approved_documents=status["approved_documents"]
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("get_verification_status_error", error=str(e))
        raise HTTPException(status_code=500, detail="查詢失敗")


@router.get("/pending", response_model=PendingReviewsResponse)
async def get_pending_reviews(
    limit: int = 50,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    取得待審核的文件列表

    **權限**: 只有 platform_admin 和 super_admin 可以查看
    """
    # 權限檢查
    if current_user.role not in ["platform_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="權限不足")

    try:
        items = await BusinessVerificationService.get_pending_reviews(
            db=db,
            limit=limit
        )

        return PendingReviewsResponse(
            success=True,
            count=len(items),
            items=[PendingReviewItem(**item) for item in items]
        )

    except Exception as e:
        logger.error("get_pending_reviews_error", error=str(e))
        raise HTTPException(status_code=500, detail="查詢失敗")


@router.post("/review", response_model=ReviewDocumentResponse)
async def review_document(
    request: ReviewDocumentRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    審核驗證文件

    **權限**: 只有 platform_admin 和 super_admin 可以審核

    審核通過所有必要文件後，組織的驗證級別會自動升級到 3
    """
    # 權限檢查
    if current_user.role not in ["platform_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="權限不足")

    # 驗證文件類型
    try:
        doc_type = DocumentType(request.document_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"無效的文件類型: {request.document_type}"
        )

    # 拒絕時必須提供原因
    if not request.approved and not request.rejection_reason:
        raise HTTPException(status_code=400, detail="拒絕時必須提供原因")

    try:
        result = await BusinessVerificationService.review_document(
            organization_id=request.organization_id,
            document_type=doc_type,
            approved=request.approved,
            reviewer_id=str(current_user.id),
            rejection_reason=request.rejection_reason,
            db=db
        )

        return ReviewDocumentResponse(**result)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("review_document_error", error=str(e))
        raise HTTPException(status_code=500, detail="審核失敗")


@router.get("/expiring", response_model=ExpiringDocumentsResponse)
async def get_expiring_documents(
    days_before: int = 30,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    取得即將到期的文件列表

    **權限**: 只有 platform_admin 和 super_admin 可以查看全部
    一般用戶只能查看自己組織的

    Args:
        days_before: 提前幾天顯示（預設 30 天）
    """
    try:
        items = await BusinessVerificationService.check_expiring_documents(
            db=db,
            days_before=days_before
        )

        # 非管理員只能看自己組織的
        if current_user.role not in ["platform_admin", "super_admin"]:
            org_id = str(current_user.organization_id) if current_user.organization_id else None
            items = [item for item in items if item["organization_id"] == org_id]

        return ExpiringDocumentsResponse(
            success=True,
            count=len(items),
            items=[ExpiringDocumentItem(**item) for item in items]
        )

    except Exception as e:
        logger.error("get_expiring_documents_error", error=str(e))
        raise HTTPException(status_code=500, detail="查詢失敗")


@router.get("/document-types")
async def get_document_types():
    """
    取得可用的文件類型列表
    """
    return {
        "success": True,
        "document_types": [
            {
                "type": DocumentType.BUSINESS_LICENSE.value,
                "name": "營業登記證",
                "required": True
            },
            {
                "type": DocumentType.TAX_ID_CERTIFICATE.value,
                "name": "稅籍登記證",
                "required": True
            },
            {
                "type": DocumentType.COMPANY_REGISTRATION.value,
                "name": "公司登記證",
                "required": False
            },
            {
                "type": DocumentType.FOOD_LICENSE.value,
                "name": "食品業者登錄證",
                "required": False
            },
            {
                "type": DocumentType.OTHER.value,
                "name": "其他",
                "required": False
            }
        ]
    }
