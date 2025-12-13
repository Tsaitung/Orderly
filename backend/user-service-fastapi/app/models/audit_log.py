"""
稽核日誌模型

記錄所有安全相關的事件
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, JSON
from enum import Enum as PyEnum

from app.models.base import Base


class AuditEventType(str, PyEnum):
    """稽核事件類型"""
    # 認證事件
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    REGISTER = "REGISTER"

    # 密碼事件
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    PASSWORD_RESET_REQUEST = "PASSWORD_RESET_REQUEST"
    PASSWORD_RESET_COMPLETE = "PASSWORD_RESET_COMPLETE"

    # MFA 事件
    MFA_ENABLE = "MFA_ENABLE"
    MFA_DISABLE = "MFA_DISABLE"
    MFA_VERIFY_SUCCESS = "MFA_VERIFY_SUCCESS"
    MFA_VERIFY_FAILED = "MFA_VERIFY_FAILED"
    MFA_BACKUP_CODE_USED = "MFA_BACKUP_CODE_USED"

    # OAuth 事件
    OAUTH_LINK = "OAUTH_LINK"
    OAUTH_UNLINK = "OAUTH_UNLINK"
    OAUTH_LOGIN = "OAUTH_LOGIN"

    # Super User 事件
    SUPER_USER_ACTIVATE = "SUPER_USER_ACTIVATE"
    SUPER_USER_DEACTIVATE = "SUPER_USER_DEACTIVATE"
    SUPER_USER_EXTEND = "SUPER_USER_EXTEND"
    SUPER_USER_EXPIRED = "SUPER_USER_EXPIRED"

    # Session 事件
    SESSION_CREATE = "SESSION_CREATE"
    SESSION_TERMINATE = "SESSION_TERMINATE"
    SESSION_TERMINATE_ALL = "SESSION_TERMINATE_ALL"

    # 驗證事件
    EMAIL_VERIFY = "EMAIL_VERIFY"
    PHONE_VERIFY = "PHONE_VERIFY"
    BUSINESS_DOCUMENT_SUBMIT = "BUSINESS_DOCUMENT_SUBMIT"
    BUSINESS_DOCUMENT_REVIEW = "BUSINESS_DOCUMENT_REVIEW"
    VERIFICATION_LEVEL_CHANGE = "VERIFICATION_LEVEL_CHANGE"

    # 權限事件
    ROLE_CHANGE = "ROLE_CHANGE"
    PERMISSION_CHANGE = "PERMISSION_CHANGE"

    # 帳號事件
    ACCOUNT_LOCK = "ACCOUNT_LOCK"
    ACCOUNT_UNLOCK = "ACCOUNT_UNLOCK"
    ACCOUNT_SUSPEND = "ACCOUNT_SUSPEND"
    ACCOUNT_REACTIVATE = "ACCOUNT_REACTIVATE"

    # 其他
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY"
    SECURITY_ALERT = "SECURITY_ALERT"


class AuditEventResult(str, PyEnum):
    """事件結果"""
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"
    PENDING = "PENDING"


class AuditLog(Base):
    """稽核日誌表 - 對應既有資料庫結構"""
    __tablename__ = "audit_logs"

    # 主鍵使用 Text 以匹配資料庫結構
    id = Column(Text, primary_key=True, default=lambda: str(uuid.uuid4()))

    # 事件資訊（新增欄位，有預設值）
    event_type = Column(String(50), nullable=True, default="", index=True)
    event_result = Column(String(20), nullable=True, default="SUCCESS")
    action = Column(Text, nullable=True)  # 詳細動作描述

    # 舊有 entity 欄位（資料庫已存在）
    entity_type = Column(Text, nullable=True)
    entity_id = Column(Text, nullable=True)

    # 關聯用戶（使用 Text 類型以相容既有的非 UUID 格式用戶 ID）
    user_id = Column(Text, nullable=True, index=True)
    user_email = Column(String(255), nullable=True)

    # 關聯組織（使用 Text 而非 UUID，避免類型轉換問題）
    organization_id = Column(Text, nullable=True)

    # 目標用戶（如果操作涉及其他用戶，使用 Text）
    target_user_id = Column(Text, nullable=True)
    target_user_email = Column(String(255), nullable=True)

    # 請求資訊
    ip_address = Column(Text, nullable=True)  # IPv6 最長 45 字元
    user_agent = Column(Text, nullable=True)
    request_id = Column(String(100), nullable=True)  # 請求追蹤 ID

    # 額外資料 - changes 是舊欄位，metadata 是新欄位
    changes = Column(JSON, nullable=True)
    event_metadata = Column("metadata", JSON, nullable=False, default={})

    # 時間戳
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    def __repr__(self):
        return f"<AuditLog {self.event_type} by {self.user_email} at {self.created_at}>"
