"""
井然 Orderly Platform - Unified CRUD Operations

提供統一的 CRUD 基礎類別，包含完整的增刪改查、軟刪除、批量操作等功能。

Exports:
- CRUDBase: 通用 CRUD 基礎類別
"""

from .base import CRUDBase

__all__ = ["CRUDBase"]
