"""
營業驗證服務

提供：
- 營業登記文件上傳
- 文件審核狀態管理
- 驗證級別升級
- 文件到期提醒
"""

import os
import json
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, text
import structlog

from app.models.user import User

logger = structlog.get_logger()


class DocumentType(str, Enum):
    """文件類型"""
    BUSINESS_LICENSE = "business_license"  # 營業登記證
    TAX_ID_CERTIFICATE = "tax_id_certificate"  # 稅籍登記證
    COMPANY_REGISTRATION = "company_registration"  # 公司登記證
    FOOD_LICENSE = "food_license"  # 食品業者登錄證
    OTHER = "other"


class VerificationStatus(str, Enum):
    """驗證狀態"""
    PENDING = "pending"  # 待審核
    UNDER_REVIEW = "under_review"  # 審核中
    APPROVED = "approved"  # 已通過
    REJECTED = "rejected"  # 已拒絕
    EXPIRED = "expired"  # 已過期


class BusinessVerificationService:
    """營業驗證服務"""

    # 驗證級別 3 所需的文件
    REQUIRED_DOCUMENTS = [
        DocumentType.BUSINESS_LICENSE,
        DocumentType.TAX_ID_CERTIFICATE
    ]

    # 文件有效期（天）
    DOCUMENT_VALIDITY_DAYS = 365

    @staticmethod
    async def submit_document(
        organization_id: str,
        document_type: DocumentType,
        document_url: str,
        document_number: Optional[str],
        issue_date: Optional[datetime],
        expiry_date: Optional[datetime],
        submitted_by: str,
        db: AsyncSession,
        audit_service=None
    ) -> Dict[str, Any]:
        """
        提交驗證文件

        Args:
            organization_id: 組織 ID
            document_type: 文件類型
            document_url: 文件 URL（已上傳到存儲）
            document_number: 文件編號（如統編）
            issue_date: 發證日期
            expiry_date: 到期日期
            submitted_by: 提交者 ID
            db: 資料庫會話
            audit_service: 稽核服務

        Returns:
            提交結果
        """
        now = datetime.utcnow()

        # 取得組織
        result = await db.execute(
            text("SELECT * FROM organizations WHERE id = :id"),
            {"id": organization_id}
        )
        org = result.fetchone()

        if not org:
            raise ValueError("組織不存在")

        # 準備文件資料
        document_data = {
            "type": document_type.value,
            "url": document_url,
            "number": document_number,
            "issue_date": issue_date.isoformat() if issue_date else None,
            "expiry_date": expiry_date.isoformat() if expiry_date else None,
            "submitted_at": now.isoformat(),
            "submitted_by": submitted_by,
            "status": VerificationStatus.PENDING.value,
            "reviewed_at": None,
            "reviewed_by": None,
            "rejection_reason": None
        }

        # 取得現有文件
        existing_docs = []
        if hasattr(org, 'verification_documents') and org.verification_documents:
            existing_docs = org.verification_documents if isinstance(org.verification_documents, list) else json.loads(org.verification_documents or '[]')

        # 檢查是否已有相同類型的文件（替換）
        updated = False
        for i, doc in enumerate(existing_docs):
            if doc.get("type") == document_type.value:
                existing_docs[i] = document_data
                updated = True
                break

        if not updated:
            existing_docs.append(document_data)

        # 更新組織
        await db.execute(
            text("""
                UPDATE organizations
                SET verification_documents = :docs,
                    updated_at = :now
                WHERE id = :id
            """),
            {
                "docs": json.dumps(existing_docs),
                "now": now,
                "id": organization_id
            }
        )
        await db.commit()

        # 稽核日誌
        if audit_service:
            await audit_service.log({
                "event_type": "BUSINESS_DOCUMENT_SUBMITTED",
                "organization_id": organization_id,
                "document_type": document_type.value,
                "submitted_by": submitted_by
            })

        logger.info(
            "business_document_submitted",
            organization_id=organization_id[:8],
            document_type=document_type.value
        )

        return {
            "success": True,
            "message": "文件已提交，等待審核",
            "document_type": document_type.value,
            "status": VerificationStatus.PENDING.value
        }

    @staticmethod
    async def review_document(
        organization_id: str,
        document_type: DocumentType,
        approved: bool,
        reviewer_id: str,
        rejection_reason: Optional[str],
        db: AsyncSession,
        audit_service=None
    ) -> Dict[str, Any]:
        """
        審核文件

        Args:
            organization_id: 組織 ID
            document_type: 文件類型
            approved: 是否通過
            reviewer_id: 審核者 ID
            rejection_reason: 拒絕原因
            db: 資料庫會話
        """
        now = datetime.utcnow()

        # 取得組織
        result = await db.execute(
            text("SELECT * FROM organizations WHERE id = :id"),
            {"id": organization_id}
        )
        org = result.fetchone()

        if not org:
            raise ValueError("組織不存在")

        # 取得文件
        docs = []
        if hasattr(org, 'verification_documents') and org.verification_documents:
            docs = org.verification_documents if isinstance(org.verification_documents, list) else json.loads(org.verification_documents or '[]')

        # 更新指定文件
        found = False
        for doc in docs:
            if doc.get("type") == document_type.value:
                doc["status"] = VerificationStatus.APPROVED.value if approved else VerificationStatus.REJECTED.value
                doc["reviewed_at"] = now.isoformat()
                doc["reviewed_by"] = reviewer_id
                if not approved:
                    doc["rejection_reason"] = rejection_reason
                found = True
                break

        if not found:
            raise ValueError("文件不存在")

        # 檢查是否所有必要文件都已通過
        all_approved = True
        for req_type in BusinessVerificationService.REQUIRED_DOCUMENTS:
            doc_found = False
            for doc in docs:
                if doc.get("type") == req_type.value and doc.get("status") == VerificationStatus.APPROVED.value:
                    doc_found = True
                    break
            if not doc_found:
                all_approved = False
                break

        # 更新組織
        update_data = {
            "docs": json.dumps(docs),
            "now": now,
            "id": organization_id
        }

        if all_approved:
            update_data["verified_at"] = now
            update_data["verification_level"] = 3

            await db.execute(
                text("""
                    UPDATE organizations
                    SET verification_documents = :docs,
                        verified_at = :verified_at,
                        verification_level = :verification_level,
                        updated_at = :now
                    WHERE id = :id
                """),
                update_data
            )
        else:
            await db.execute(
                text("""
                    UPDATE organizations
                    SET verification_documents = :docs,
                        updated_at = :now
                    WHERE id = :id
                """),
                update_data
            )

        await db.commit()

        # 稽核日誌
        if audit_service:
            await audit_service.log({
                "event_type": "BUSINESS_DOCUMENT_REVIEWED",
                "organization_id": organization_id,
                "document_type": document_type.value,
                "approved": approved,
                "reviewer_id": reviewer_id,
                "rejection_reason": rejection_reason
            })

        logger.info(
            "business_document_reviewed",
            organization_id=organization_id[:8],
            document_type=document_type.value,
            approved=approved
        )

        return {
            "success": True,
            "approved": approved,
            "all_documents_approved": all_approved,
            "verification_level": 3 if all_approved else None
        }

    @staticmethod
    async def get_verification_status(
        organization_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        取得組織的驗證狀態

        Returns:
            {
                "verification_level": int,
                "verified_at": datetime | None,
                "documents": List[{type, status, submitted_at, ...}],
                "missing_documents": List[str],
                "pending_documents": List[str]
            }
        """
        result = await db.execute(
            text("SELECT * FROM organizations WHERE id = :id"),
            {"id": organization_id}
        )
        org = result.fetchone()

        if not org:
            raise ValueError("組織不存在")

        # 取得文件
        docs = []
        if hasattr(org, 'verification_documents') and org.verification_documents:
            docs = org.verification_documents if isinstance(org.verification_documents, list) else json.loads(org.verification_documents or '[]')

        # 分析文件狀態
        document_status = []
        submitted_types = set()
        approved_types = set()
        pending_types = set()

        for doc in docs:
            doc_type = doc.get("type")
            status = doc.get("status")

            submitted_types.add(doc_type)

            if status == VerificationStatus.APPROVED.value:
                approved_types.add(doc_type)
            elif status in [VerificationStatus.PENDING.value, VerificationStatus.UNDER_REVIEW.value]:
                pending_types.add(doc_type)

            document_status.append({
                "type": doc_type,
                "status": status,
                "submitted_at": doc.get("submitted_at"),
                "reviewed_at": doc.get("reviewed_at"),
                "rejection_reason": doc.get("rejection_reason")
            })

        # 計算缺少的文件
        missing_documents = []
        for req_type in BusinessVerificationService.REQUIRED_DOCUMENTS:
            if req_type.value not in submitted_types:
                missing_documents.append(req_type.value)

        return {
            "verification_level": getattr(org, 'verification_level', 1) or 1,
            "verified_at": getattr(org, 'verified_at', None),
            "documents": document_status,
            "missing_documents": missing_documents,
            "pending_documents": list(pending_types),
            "approved_documents": list(approved_types)
        }

    @staticmethod
    async def get_pending_reviews(
        db: AsyncSession,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        取得待審核的文件列表（管理員用）
        """
        result = await db.execute(
            text("""
                SELECT id, name, type, verification_documents
                FROM organizations
                WHERE verification_documents IS NOT NULL
                AND verification_documents != '[]'
                ORDER BY updated_at DESC
                LIMIT :limit
            """),
            {"limit": limit}
        )
        orgs = result.fetchall()

        pending_list = []

        for org in orgs:
            docs = []
            if org.verification_documents:
                docs = org.verification_documents if isinstance(org.verification_documents, list) else json.loads(org.verification_documents or '[]')

            for doc in docs:
                if doc.get("status") in [VerificationStatus.PENDING.value, VerificationStatus.UNDER_REVIEW.value]:
                    pending_list.append({
                        "organization_id": str(org.id),
                        "organization_name": org.name,
                        "organization_type": org.type,
                        "document_type": doc.get("type"),
                        "document_url": doc.get("url"),
                        "document_number": doc.get("number"),
                        "submitted_at": doc.get("submitted_at"),
                        "status": doc.get("status")
                    })

        return pending_list

    @staticmethod
    async def check_expiring_documents(
        db: AsyncSession,
        days_before: int = 30
    ) -> List[Dict[str, Any]]:
        """
        檢查即將到期的文件（定期任務用）

        Args:
            db: 資料庫會話
            days_before: 提前幾天提醒

        Returns:
            即將到期的文件列表
        """
        now = datetime.utcnow()
        threshold = now + timedelta(days=days_before)

        result = await db.execute(
            text("""
                SELECT id, name, verification_documents
                FROM organizations
                WHERE verification_documents IS NOT NULL
                AND verification_documents != '[]'
                AND verified_at IS NOT NULL
            """)
        )
        orgs = result.fetchall()

        expiring_list = []

        for org in orgs:
            docs = []
            if org.verification_documents:
                docs = org.verification_documents if isinstance(org.verification_documents, list) else json.loads(org.verification_documents or '[]')

            for doc in docs:
                if doc.get("status") != VerificationStatus.APPROVED.value:
                    continue

                expiry_str = doc.get("expiry_date")
                if not expiry_str:
                    continue

                try:
                    expiry_date = datetime.fromisoformat(expiry_str)
                    if expiry_date <= threshold:
                        days_remaining = (expiry_date - now).days

                        expiring_list.append({
                            "organization_id": str(org.id),
                            "organization_name": org.name,
                            "document_type": doc.get("type"),
                            "expiry_date": expiry_str,
                            "days_remaining": days_remaining,
                            "is_expired": days_remaining < 0
                        })
                except Exception:
                    pass

        return expiring_list


# 單例實例
business_verification_service = BusinessVerificationService()
