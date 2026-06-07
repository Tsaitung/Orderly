"""
井然 Orderly Platform - Unified Base Model

統一的 SQLAlchemy 基礎模型，整合自 customer-hierarchy-service 的最佳實踐。
所有微服務的模型應繼承此基礎模型以確保一致性。

Features:
- String UUID 主鍵（與 6/8 服務一致）
- camelCase 時間戳欄位（與前端 API 契約一致）
- 審計欄位（created_by, updated_by）
- 軟刪除支援（is_active）
- 擴展元資料（extra_data JSONB）
- 內建審計追蹤
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy import Boolean, Column, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.hybrid import hybrid_property

from app.db.base import Base

logger = structlog.get_logger(__name__)


class AuditMixin:
    """
    審計欄位 Mixin

    提供 created_by 和 updated_by 欄位，用於追蹤資料變更者。
    """

    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)


class SoftDeleteMixin:
    """
    軟刪除 Mixin

    提供 is_active 欄位和軟刪除/還原方法。
    """

    is_active = Column(Boolean, nullable=False, default=True)

    @hybrid_property
    def is_deleted(self) -> bool:
        """檢查實體是否已軟刪除"""
        return not self.is_active

    def soft_delete(self, deleted_by: str) -> None:
        """
        軟刪除實體

        Args:
            deleted_by: 執行刪除的使用者 ID
        """
        self.is_active = False
        if hasattr(self, 'updated_by'):
            self.updated_by = deleted_by
        if hasattr(self, 'extra_data'):
            self.extra_data = self.extra_data or {}
            self.extra_data['deleted_at'] = datetime.utcnow().isoformat()
            self.extra_data['deleted_by'] = deleted_by

    def restore(self, restored_by: str) -> None:
        """
        還原軟刪除的實體

        Args:
            restored_by: 執行還原的使用者 ID
        """
        self.is_active = True
        if hasattr(self, 'updated_by'):
            self.updated_by = restored_by
        if hasattr(self, 'extra_data'):
            self.extra_data = self.extra_data or {}
            if 'deleted_at' in self.extra_data:
                del self.extra_data['deleted_at']
            if 'deleted_by' in self.extra_data:
                del self.extra_data['deleted_by']
            self.extra_data['restored_at'] = datetime.utcnow().isoformat()
            self.extra_data['restored_by'] = restored_by


class MetadataMixin:
    """
    元資料 Mixin

    提供 extra_data JSONB 欄位和操作方法。
    """

    extra_data = Column(JSONB, nullable=False, default=dict, server_default='{}')
    notes = Column(Text, nullable=True)

    def update_metadata(self, key: str, value: Any) -> None:
        """
        更新元資料欄位

        Args:
            key: 元資料鍵
            value: 元資料值
        """
        if self.extra_data is None:
            self.extra_data = {}
        self.extra_data[key] = value

    def get_metadata(self, key: str, default: Any = None) -> Any:
        """
        取得元資料欄位值

        Args:
            key: 元資料鍵
            default: 預設值

        Returns:
            元資料值或預設值
        """
        if self.extra_data is None:
            return default
        return self.extra_data.get(key, default)

    def remove_metadata(self, key: str) -> bool:
        """
        移除元資料欄位

        Args:
            key: 元資料鍵

        Returns:
            是否成功移除
        """
        if self.extra_data is None:
            return False
        if key in self.extra_data:
            del self.extra_data[key]
            return True
        return False


class UnifiedBaseModel(Base, AuditMixin, SoftDeleteMixin, MetadataMixin):
    """
    統一的基礎模型

    所有微服務的模型應繼承此類別以確保一致性。
    包含：
    - String UUID 主鍵
    - camelCase 時間戳欄位
    - 審計欄位
    - 軟刪除支援
    - 元資料支援

    Example:
        class User(UnifiedBaseModel):
            __tablename__ = "users"

            email = Column(String, nullable=False, unique=True)
            name = Column(String, nullable=False)
    """

    __abstract__ = True

    # 主鍵：String UUID
    id = Column(
        String,
        primary_key=True,
        unique=True,
        nullable=False,
        default=lambda: str(uuid.uuid4())
    )

    # 時間戳：camelCase 欄位名（與前端 API 契約一致）
    created_at = Column(
        "createdAt",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        "updatedAt",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    def __repr__(self) -> str:
        name = getattr(self, 'name', None) or getattr(self, 'title', None) or 'N/A'
        return f"<{self.__class__.__name__}(id={self.id}, name={name})>"

    def __str__(self) -> str:
        name = getattr(self, 'name', None) or getattr(self, 'title', None) or self.id
        return f"{self.__class__.__name__}: {name}"

    def to_dict(self, include_metadata: bool = True) -> Dict[str, Any]:
        """
        將模型轉換為字典

        Args:
            include_metadata: 是否包含 extra_data 欄位

        Returns:
            模型資料字典
        """
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)

            # 處理 datetime 序列化
            if isinstance(value, datetime):
                result[column.name] = value.isoformat()
            # 處理 JSONB 欄位
            elif column.name == 'extra_data' and not include_metadata:
                continue
            else:
                result[column.name] = value

        return result

    @classmethod
    def generate_id(cls) -> str:
        """
        產生新的 UUID

        Returns:
            新的 UUID 字串
        """
        return str(uuid.uuid4())

    def audit_log(
        self,
        action: str,
        user_id: str,
        details: Optional[Dict[str, Any]] = None,
        max_entries: int = 10
    ) -> None:
        """
        記錄審計資訊到 extra_data

        Args:
            action: 動作名稱（如 "create", "update", "delete"）
            user_id: 執行動作的使用者 ID
            details: 額外的審計詳情
            max_entries: 保留的最大審計條目數（預設 10）
        """
        audit_data = {
            'entity_type': self.__class__.__name__,
            'entity_id': self.id,
            'action': action,
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details or {}
        }

        # 更新 extra_data 中的審計追蹤
        self.extra_data = self.extra_data or {}
        if 'audit_trail' not in self.extra_data:
            self.extra_data['audit_trail'] = []

        self.extra_data['audit_trail'].append(audit_data)

        # 限制審計條目數量以防止元資料膨脹
        if len(self.extra_data['audit_trail']) > max_entries:
            self.extra_data['audit_trail'] = self.extra_data['audit_trail'][-max_entries:]

        logger.info(
            "Entity audit log",
            entity_type=self.__class__.__name__,
            entity_id=self.id,
            action=action,
            user_id=user_id
        )

    def get_audit_trail(self) -> List[Dict[str, Any]]:
        """
        取得審計追蹤記錄

        Returns:
            審計追蹤記錄列表
        """
        if self.extra_data is None:
            return []
        return self.extra_data.get('audit_trail', [])

    def set_created_by(self, user_id: str) -> None:
        """
        設定建立者（用於依賴注入時自動填充）

        Args:
            user_id: 建立者使用者 ID
        """
        self.created_by = user_id
        self.updated_by = user_id

    def set_updated_by(self, user_id: str) -> None:
        """
        設定更新者（用於依賴注入時自動填充）

        Args:
            user_id: 更新者使用者 ID
        """
        self.updated_by = user_id
