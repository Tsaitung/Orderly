"""
井然 Orderly Platform - Unified Model Definitions

提供統一的 SQLAlchemy 基礎模型和 Mixin，確保所有微服務使用一致的資料模型結構。

Exports:
- Base: SQLAlchemy declarative base
- UnifiedBaseModel: 統一的基礎模型（含審計欄位、軟刪除）
- AuditMixin: 審計欄位 Mixin
- SoftDeleteMixin: 軟刪除 Mixin
"""

from .base import (
    Base,
    UnifiedBaseModel,
    AuditMixin,
    SoftDeleteMixin,
    MetadataMixin,
)

__all__ = [
    "Base",
    "UnifiedBaseModel",
    "AuditMixin",
    "SoftDeleteMixin",
    "MetadataMixin",
]
